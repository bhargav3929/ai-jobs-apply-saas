from datetime import datetime, timedelta, timezone
from core.firebase import db

def main():
    """
    Cleanup old jobs (older than 48 hours) and reset daily stats.
    Runs at Midnight daily.
    """
    print("Starting cleanup job...")

    if not db:
        return

    # --- Reset applicationsToday for all users ---
    print("Resetting applicationsToday for all users...")
    users_reset = 0
    for user_doc in db.collection("users").stream():
        user_data = user_doc.to_dict()
        if user_data.get("applicationsToday", 0) > 0:
            user_doc.reference.update({"applicationsToday": 0})
            users_reset += 1
    print(f"Reset applicationsToday for {users_reset} users")

    # --- Delete jobs older than 2 days ---
    cutoff = (datetime.now(timezone.utc) - timedelta(hours=48)).isoformat()

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
            print(f"Deleted batch of {deleted} jobs")

    if count > 0:
        batch.commit()
        deleted += count

    print(f"Cleanup complete: {deleted} old jobs removed, {users_reset} user stats reset")

if __name__ == "__main__":
    main()
