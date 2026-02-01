import asyncio
import uuid
from datetime import datetime, timedelta
from services.scraper import LinkedInScraper
from services.email_extractor import EmailExtractor
from services.job_classifier import JobClassifier
from services.batch_processor import BatchProcessor
from core.firebase import db
from utils.error_handler import ErrorHandler, ErrorType, log_error_to_db

async def main(category_limits=None):
    """
    Main scraping pipeline
    Runs at 8:00 AM daily
    category_limits: optional dict e.g. {"Software Developer": 5, "AI/ML Engineer": 3}
    """

    start_time = datetime.now()
    print(f"🚀 Starting daily scraping job at {start_time}")

    try:
        # Step 1: Scrape LinkedIn
        scraper = LinkedInScraper()
        if category_limits:
            raw_posts = await scraper.scrape_jobs_with_limits(category_limits)
        else:
            raw_posts = await scraper.scrape_jobs()
        
        print(f"📥 Received {len(raw_posts)} posts from Apify")
        
        # Step 2: Process posts in batches
        email_extractor = EmailExtractor()
        classifier = JobClassifier()
        
        async def process_post(post):
            try:
                # Generate URN if missing
                urn = post.get("urn") or f"urn:li:activity:{uuid.uuid4().hex}"
                
                # Extract email
                email = await email_extractor.extract_email(post.get("text", ""))
                if not email:
                    return None
                
                # Extract title, company, and category in one AI call
                text = post.get("text", "")
                author = post.get("author", {})
                occupation = author.get("occupation", "")

                extracted = await classifier.extract_job_info(text, occupation)
                title = extracted.get("title", text.split('\n')[0][:80])
                company = extracted.get("company", "Unknown")
                category = extracted.get("category", "Other")
                
                return {
                    "jobId": str(uuid.uuid4()),
                    "title": title,
                    "company": company,
                    "location": "Remote", # Default for now
                    "linkedinUrn": urn,
                    "linkedinUrl": post.get("url", ""),
                    "postText": post.get("text", ""),
                    "recruiterEmail": email,
                    "jobCategory": category,
                    "scrapedAt": datetime.now().isoformat(),
                    "appliedByUsers": [],
                    "applicationCount": 0,
                    "lastAppliedAt": None,
                    "createdAt": datetime.now().isoformat(),
                    "expiresAt": (datetime.now() + timedelta(days=2)).isoformat()
                }
            except Exception as e:
                print(f"Error processing post: {e}")
                return None
        
        # Use BatchProcessor
        processed_jobs = await BatchProcessor.process_posts_in_batches(raw_posts, process_post, batch_size=50)
        
        # Filter out None values
        valid_jobs = [job for job in processed_jobs if job is not None]
        
        print(f"✅ Processed {len(valid_jobs)} jobs with valid emails")
        
        if not db:
            print("❌ Database connection failed")
            return

        # Step 3: Remove duplicates
        existing_urns = set()
        query = db.collection("jobs") \
            .where("scrapedAt", ">=", datetime.now().replace(hour=0, minute=0, second=0).isoformat()) \
            .stream()
        
        for doc in query:
            job_data = doc.to_dict()
            if "linkedinUrn" in job_data:
                existing_urns.add(job_data["linkedinUrn"])
        
        new_jobs = [job for job in valid_jobs if job["linkedinUrn"] not in existing_urns]
        
        print(f"📝 {len(new_jobs)} new jobs to store (removed {len(valid_jobs) - len(new_jobs)} duplicates)")
        
        # Step 4: Batch write to Firestore using BatchProcessor
        total_written = BatchProcessor.batch_firestore_writes(new_jobs, "jobs", batch_size=400)
        
        # Step 5: Log results
        duration = (datetime.now() - start_time).seconds
        
        log_data = {
            "logId": str(uuid.uuid4()),
            "type": "scraping",
            "level": "info",
            "message": f"Daily scraping completed: {total_written} jobs stored",
            "metadata": {
                "postsScraped": len(raw_posts),
                "jobsWithEmail": len(valid_jobs),
                "jobsStored": total_written,
                "duration": f"{duration}s"
            },
            "timestamp": datetime.now().isoformat()
        }
        
        db.collection("system_logs").add(log_data)
        
        print(f"✨ Scraping complete in {duration}s")

    except Exception as e:
        print(f"❌ Critical Scraping Failure: {e}")
        log_error_to_db(ErrorType.SCRAPING_FAILED, e, {})

if __name__ == "__main__":
    asyncio.run(main())
