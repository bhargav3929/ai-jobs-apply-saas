"""
Test Stage 3: Queue a single email via Celery and verify it sends.
Run: python -m scripts.test_celery_send

PREREQUISITE: Celery worker must be running:
  celery -A tasks.celery_app worker --loglevel=info
"""
import sys, os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from datetime import datetime
from core.firebase import db
from tasks.email_tasks import send_application_email

def main():
    print("=== STAGE 3 TEST: Celery Email Sending ===\n")

    # Find the test job
    user_id = "Nn3ZoXOqjyQzqNHhRsIsOggS7o92"
    today_start = datetime.now().replace(hour=0, minute=0, second=0).isoformat()

    jobs = list(db.collection("jobs").where("scrapedAt", ">=", today_start).stream())
    if not jobs:
        print("❌ No jobs found. Run test_scrape_minimal.py first")
        return

    job_data = jobs[0].to_dict()
    job_id = job_data["jobId"]
    print(f"Using job: {job_data['title']}")
    print(f"  → Recruiter email: {job_data['recruiterEmail']}")
    print(f"  → Job ID: {job_id}")

    # Queue the task with 0 delay (immediate)
    print(f"\nQueuing email task via Celery (no delay)...")
    result = send_application_email.apply_async(
        args=[user_id, job_id],
        countdown=0
    )
    print(f"  Task ID: {result.id}")
    print(f"  Status: {result.status}")

    print(f"\n⏳ Waiting for result (up to 120s)...")
    try:
        task_result = result.get(timeout=120)
        print(f"\n✅ Task result: {task_result}")
    except Exception as e:
        print(f"\n❌ Task failed or timed out: {e}")
        print("Check the Celery worker terminal for detailed error logs.")

if __name__ == "__main__":
    main()
