"""
Minimal scrape test - uses 1 keyword, 3 results max to save Apify credits.
Run: python -m scripts.test_scrape_minimal
"""
import sys, os, asyncio, uuid
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from datetime import datetime, timedelta
from apify_client import ApifyClient
from core.settings import APIFY_API_TOKEN, APIFY_ACTOR_ID
from core.firebase import db
from services.email_extractor import EmailExtractor
from services.job_classifier import JobClassifier

async def main():
    print("=== STAGE 1 TEST: Minimal LinkedIn Scrape ===\n")

    # --- Step 1: Scrape with MINIMAL settings ---
    print("[1/4] Scraping LinkedIn (1 keyword, limit 3)...")
    client = ApifyClient(APIFY_API_TOKEN)

    run_input = {
        "deepScrape": False,
        "limitPerSource": 3,
        "rawData": False,
        "urls": [
            "https://www.linkedin.com/search/results/content/?datePosted=%22past-24h%22&keywords=hiring%20software%20developer"
        ]
    }

    try:
        run = client.actor(APIFY_ACTOR_ID).call(run_input=run_input)
        dataset_id = run.get("defaultDatasetId")
        if not dataset_id:
            print("❌ No dataset returned from Apify")
            return
        raw_posts = client.dataset(dataset_id).list_items().items
        print(f"   Got {len(raw_posts)} posts from Apify\n")
    except Exception as e:
        print(f"❌ Apify error: {e}")
        return

    if not raw_posts:
        print("❌ No posts returned. Check Apify actor/token.")
        return

    # Print a sample post structure
    print("[DEBUG] Sample post keys:", list(raw_posts[0].keys()) if raw_posts else "N/A")

    # --- Step 2: Extract emails ---
    print("\n[2/4] Extracting emails...")
    extractor = EmailExtractor()
    jobs_with_email = []

    for i, post in enumerate(raw_posts[:5]):  # max 5
        text = post.get("text", "")
        email = await extractor.extract_email(text)
        status = f"✅ {email}" if email else "⬚ no email"
        print(f"   Post {i+1}: {status}")
        if email:
            jobs_with_email.append({"post": post, "email": email})

    print(f"\n   {len(jobs_with_email)} posts have emails out of {len(raw_posts)}")

    if not jobs_with_email:
        print("\n⚠️  No emails found in scraped posts. This is normal - many LinkedIn posts don't have emails.")
        print("   The pipeline will only process posts with recruiter emails.")
        print("   For testing Stage 2+, I'll create a synthetic job entry.\n")

        # Create a synthetic job for testing the rest of the pipeline
        synthetic_job = {
            "jobId": str(uuid.uuid4()),
            "title": "Test Software Developer Role",
            "company": "Test Company",
            "location": "Remote",
            "linkedinUrn": f"urn:li:activity:test-{uuid.uuid4().hex[:8]}",
            "linkedinUrl": "https://linkedin.com/test",
            "postText": "We are hiring a software developer with React and Python experience. Send your resume to hr@testcompany.com",
            "recruiterEmail": "bhargavcodes4@gmail.com",  # Send to yourself for testing
            "jobCategory": "Software Developer",
            "scrapedAt": datetime.now().isoformat(),
            "appliedByUsers": [],
            "applicationCount": 0,
            "lastAppliedAt": None,
            "createdAt": datetime.now().isoformat(),
            "expiresAt": (datetime.now() + timedelta(days=2)).isoformat()
        }

        if db:
            db.collection("jobs").document(synthetic_job["jobId"]).set(synthetic_job)
            print(f"   ✅ Created synthetic test job: {synthetic_job['jobId']}")
            print(f"   Recruiter email set to: bhargavcodes4@gmail.com (yourself)")
        return

    # --- Step 3: Classify jobs ---
    print("\n[3/4] Classifying jobs with AI...")
    classifier = JobClassifier()

    stored_jobs = []
    for item in jobs_with_email:
        post = item["post"]
        text = post.get("text", "")
        category = await classifier.classify(text)

        author = post.get("author", {})
        headline = post.get("authorHeadline") or author.get("headline", "")
        occupation = author.get("occupation", "")
        company = "Unknown"
        if " at " in occupation:
            company = occupation.split(" at ")[-1]

        job = {
            "jobId": str(uuid.uuid4()),
            "title": headline or text[:50],
            "company": company,
            "location": "Remote",
            "linkedinUrn": post.get("urn", f"urn:li:activity:{uuid.uuid4().hex}"),
            "linkedinUrl": post.get("url", ""),
            "postText": text,
            "recruiterEmail": item["email"],
            "jobCategory": category,
            "scrapedAt": datetime.now().isoformat(),
            "appliedByUsers": [],
            "applicationCount": 0,
            "lastAppliedAt": None,
            "createdAt": datetime.now().isoformat(),
            "expiresAt": (datetime.now() + timedelta(days=2)).isoformat()
        }
        stored_jobs.append(job)
        print(f"   → {category}: {job['title'][:40]}... → {item['email']}")

    # --- Step 4: Store in Firestore ---
    print(f"\n[4/4] Storing {len(stored_jobs)} jobs in Firestore...")
    if db:
        for job in stored_jobs:
            db.collection("jobs").document(job["jobId"]).set(job)
        print(f"   ✅ Stored {len(stored_jobs)} jobs")
    else:
        print("   ❌ DB not available")

    print("\n=== STAGE 1 COMPLETE ===")
    print(f"Summary: {len(raw_posts)} scraped → {len(jobs_with_email)} with emails → {len(stored_jobs)} stored")

if __name__ == "__main__":
    asyncio.run(main())
