from datetime import datetime, timedelta
from core.firebase import db

def main():
    """
    Cleanup old jobs (older than 48 hours)
    Runs at Midnight daily
    """
    print("🧹 Starting cleanup job...")
    
    if not db:
        return

    # Delete jobs older than 2 days
    cutoff = (datetime.now() - timedelta(hours=48)).isoformat()
    
    jobs = db.collection("jobs") \
        .where("scrapedAt", "<", cutoff) \
        .stream()
    
    batch = db.batch()
    count = 0
    deleted = 0
    
    for job in jobs:
        batch.delete(job.reference)
        count += 1
        
        if count >= 400:
            batch.commit()
            deleted += count
            count = 0
            batch = db.batch()
            print(f"🗑️ Deleted batch of {deleted} jobs")
            
    if count > 0:
        batch.commit()
        deleted += count
    
    print(f"✅ Cleanup complete: {deleted} old jobs removed")

if __name__ == "__main__":
    main()
