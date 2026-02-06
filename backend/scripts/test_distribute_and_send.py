"""
Test Stage 2 (distribution) and Stage 3 (email sending via Celery).
Run: python -m scripts.test_distribute_and_send
"""
import sys, os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from datetime import datetime
from core.firebase import db

def check_user_data():
    """Check if the user has all required fields for the pipeline."""
    print("=== STAGE 2 TEST: Job Distribution ===\n")
    print("[1/3] Checking user data in Firestore...")

    users = db.collection("users").where("isActive", "==", True).stream()
    user_list = []
    for u in users:
        data = u.to_dict()
        data["uid"] = u.id
        user_list.append(data)
        print(f"   Found active user: {data.get('name', 'N/A')} ({u.id})")
        print(f"     jobCategory: {data.get('jobCategory', '⚠️ MISSING')}")
        print(f"     smtpEmail: {data.get('smtpEmail', '⚠️ MISSING')}")
        print(f"     smtpPassword: {'✅ present' if data.get('smtpPassword') else '⚠️ MISSING'}")
        print(f"     resumeUrl: {data.get('resumeUrl', '⚠️ MISSING')}")
        print(f"     subscriptionStatus: {data.get('subscriptionStatus', '⚠️ MISSING')}")
        print(f"     isActive: {data.get('isActive')}")

    if not user_list:
        print("   ❌ No active users found!")
        print("   Make sure your user has isActive=true in Firestore")
        return None

    return user_list

def check_jobs():
    """Check today's jobs."""
    print("\n[2/3] Checking today's jobs in Firestore...")
    today_start = datetime.now().replace(hour=0, minute=0, second=0).isoformat()
    jobs = db.collection("jobs").where("scrapedAt", ">=", today_start).stream()

    job_list = []
    for j in jobs:
        data = j.to_dict()
        job_list.append(data)
        print(f"   Job: {data.get('title', 'N/A')[:50]}")
        print(f"     category: {data.get('jobCategory')}, email: {data.get('recruiterEmail')}")

    if not job_list:
        print("   ❌ No jobs found for today!")
        print("   Run test_scrape_minimal.py first")
        return None

    return job_list

def test_distribution(users, jobs):
    """Test the distribution engine."""
    print("\n[3/3] Testing distribution engine...")
    from services.distribution_engine import DistributionEngine

    engine = DistributionEngine()

    # Group by category
    from collections import defaultdict
    users_by_cat = defaultdict(list)
    jobs_by_cat = defaultdict(list)

    for u in users:
        users_by_cat[u.get("jobCategory", "Other")].append(u)
    for j in jobs:
        jobs_by_cat[j.get("jobCategory", "Other")].append(j)

    total_assigned = 0
    all_assignments = {}

    for cat in set(list(users_by_cat.keys()) + list(jobs_by_cat.keys())):
        cat_users = users_by_cat.get(cat, [])
        cat_jobs = jobs_by_cat.get(cat, [])
        if not cat_users or not cat_jobs:
            continue

        print(f"\n   Category '{cat}': {len(cat_users)} users, {len(cat_jobs)} jobs")
        assignments = engine.distribute(cat_users, cat_jobs)

        for uid, assigned_jobs in assignments.items():
            all_assignments[uid] = assigned_jobs
            total_assigned += len(assigned_jobs)
            print(f"     User {uid[:12]}...: {len(assigned_jobs)} jobs assigned")
            for aj in assigned_jobs:
                print(f"       → {aj.get('title', 'N/A')[:40]} → {aj.get('recruiterEmail')}")

    print(f"\n   Total assignments: {total_assigned}")

    if total_assigned == 0:
        print("   ⚠️ No jobs assigned! Check if user jobCategory matches any job's jobCategory")
        # Show what categories exist
        print(f"   User categories: {list(users_by_cat.keys())}")
        print(f"   Job categories: {list(jobs_by_cat.keys())}")

    return all_assignments

if __name__ == "__main__":
    users = check_user_data()
    if not users:
        print("\n⚠️ Fix user data first. Ensure the user has: isActive=true, subscriptionStatus='active', jobCategory set")
        exit(1)

    jobs = check_jobs()
    if not jobs:
        exit(1)

    assignments = test_distribution(users, jobs)

    if assignments and any(len(v) > 0 for v in assignments.values()):
        print("\n=== STAGE 2 COMPLETE ===")
        print("Distribution works! Next: test Celery email sending.")
        print("\nTo test Stage 3 (Celery), run these commands in separate terminals:")
        print("  Terminal 1: celery -A tasks.celery_app worker --loglevel=info")
        print("  Terminal 2: python -m scripts.test_celery_send")
    else:
        print("\n⚠️ Distribution produced no assignments. See issues above.")
