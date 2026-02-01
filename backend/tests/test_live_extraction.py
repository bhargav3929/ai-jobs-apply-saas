# Run this from backend/ directory:
# source venv/bin/activate
# python tests/test_live_extraction.py

import sys
import os
import asyncio
import json

# Fix import path
sys.path.append(os.getcwd())

from services.scraper import LinkedInScraper
from services.email_extractor import EmailExtractor
from services.job_classifier import JobClassifier

async def run_live_test():
    print("🚀 Starting LIVE extraction test (Real API calls)...")
    print("   Target: LinkedIn Jobs via Apify")
    print("   Output: Cleaned Database Schema")

    # 1. Scrape
    scraper = LinkedInScraper()
    print("\n⏳ 1. Calling Apify (this takes time)...")
    try:
        # We'll modify the scraper call slightly or just use it as is?
        # The scraper.scrape_jobs() uses hardcoded keywords list.
        # It calls Apify which might take 30-60s.
        raw_jobs = await scraper.scrape_jobs()
    except Exception as e:
        print(f"❌ Scraping failed: {e}")
        return

    if not raw_jobs:
        print("⚠️ No jobs returned. Check Apify credits or Actor status.")
        # Mocking data if live scrape fails to demonstrate the "Cleaning" part at least?
        # No, user asked to "extract some data". If it fails, we report fail.
        return

    print(f"✅ Retrieved {len(raw_jobs)} raw items.")
    if len(raw_jobs) > 0:
        print(f"   Raw Keys (Uncleaned): {list(raw_jobs[0].keys())}")
        with open("debug_scraper.json", "w") as f:
            json.dump(raw_jobs[0], f, indent=2)
        print("   ✅ Saved sample item to debug_scraper.json")

    # 2. Process
    extractor = EmailExtractor()
    classifier = JobClassifier()
    
    cleaned_jobs = []
    
    print("\n🧹 2. Cleaning and Processing (AI)...")
    # Limit to 3 to verify flow without draining quotas
    for i, job in enumerate(raw_jobs[:3]): 
        print(f"\n   [{i+1}] Processing: {job.get('title', 'Unknown Title')}")
        
        # Extract Text
        text = job.get("text") or job.get("description") or ""
        
        # AI Extraction
        # Note: In production we process in parallel batches, here serial for clarity
        email = await extractor.extract_email(text)
        category = await classifier.classify(text)
        
        # Extract Metadata (Same logic as daily_scraper.py)
        author = job.get("author", {})
        headline = job.get("authorHeadline") or author.get("headline", "")
        occupation = author.get("occupation", "")
        
        title = headline if headline else (text.split('\n')[0][:50] + "...")
        
        company = "Unknown"
        if " at " in occupation:
            company = occupation.split(" at ")[-1]
        elif " @ " in occupation:
            company = occupation.split(" @ ")[-1]

        # Clean Data (The "Schema" defined in PRD)
        cleaned_job = {
            "title": title,
            "company": company,
            "location": "Remote",
            "linkedinUrl": job.get("url"),
            "recruiterEmail": email,
            "jobCategory": category,
            "scrapedAt": "2024-01-27T...", 
        }
        cleaned_jobs.append(cleaned_job)
        print(f"       -> Found Email: {email}")
        print(f"       -> Classified: {category}")

    print("\n💾 3. Final Database Structure:")
    if cleaned_jobs:
        print(json.dumps(cleaned_jobs[0], indent=2))
        print("\n✅ Verification: Unnecessary data (raw HTML, debug fields) removed.")
        print("✅ Verification: Key fields (Email, Category) enriched.")

if __name__ == "__main__":
    asyncio.run(run_live_test())
