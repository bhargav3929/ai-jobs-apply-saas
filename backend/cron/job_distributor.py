import logging
import random
from datetime import datetime, timedelta, timezone
from core.firebase import db
from google.cloud.firestore_v1.base_query import FieldFilter
from tasks.email_tasks import send_application_email
from services.distribution_engine import DistributionEngine

logger = logging.getLogger("job_distributor")

# Stagger offsets for shared jobs (seconds)
# Position 0: no extra delay
# Position 1: +3-4 hours later
# Position 2: +6-8 hours later
STAGGER_RANGES = [
    (0, 0),
    (3 * 3600, 4 * 3600),
    (6 * 3600, 8 * 3600),
]


def main():
    """
    Distribute jobs to users
    Runs at 9:00 AM daily
    """

    logger.info("========================================")
    logger.info("=== STARTING JOB DISTRIBUTION ===")
    logger.info(f"=== Time: {datetime.now(timezone.utc).isoformat()} ===")
    logger.info("========================================")

    if not db:
        logger.error("DB not connected — aborting distribution")
        return

    # Step 1: Get active users
    logger.info("Step 1: Fetching active users...")
    users_ref = db.collection("users")
    users = users_ref \
        .where(filter=FieldFilter("isActive", "==", True)) \
        .where(filter=FieldFilter("subscriptionStatus", "==", "active")) \
        .stream()

    users_by_category = {}
    total_users = 0
    skipped_disabled = 0
    for user in users:
        user_data = user.to_dict()
        user_data["uid"] = user.id

        # Skip users disabled by admin
        if user_data.get("disabledByAdmin", False):
            skipped_disabled += 1
            logger.info(f"  SKIPPED (disabledByAdmin): uid={user.id}, name={user_data.get('name')}")
            continue

        category = user_data.get("jobCategory", "Other")
        if category not in users_by_category:
            users_by_category[category] = []
        users_by_category[category].append(user_data)
        total_users += 1
        logger.info(f"  User: uid={user.id}, name={user_data.get('name')}, category={category}, smtpEmail={user_data.get('smtpEmail')}, hasSmtpPassword={'smtpPassword' in user_data}")

    if skipped_disabled:
        logger.info(f"Skipped {skipped_disabled} admin-disabled users")

    logger.info(f"Found {total_users} active users across {len(users_by_category)} categories: {list(users_by_category.keys())}")

    if total_users == 0:
        logger.warning("No active users found — nothing to distribute")
        return

    # Step 2: Get today's jobs
    logger.info("Step 2: Fetching today's jobs...")
    today_start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
    logger.info(f"  Filtering jobs scrapedAt >= {today_start.isoformat()}")
    jobs_ref = db.collection("jobs")
    jobs = jobs_ref \
        .where(filter=FieldFilter("scrapedAt", ">=", today_start.isoformat())) \
        .stream()

    jobs_by_category = {}
    total_jobs = 0
    jobs_without_email = 0
    for job in jobs:
        job_data = job.to_dict()
        category = job_data.get("jobCategory", "Other")
        has_email = bool(job_data.get("recruiterEmail", "").strip())
        if not has_email:
            jobs_without_email += 1
            logger.warning(f"  Job {job_data.get('jobId', job.id)} has NO recruiterEmail — skipping")
            continue
        if category not in jobs_by_category:
            jobs_by_category[category] = []
        jobs_by_category[category].append(job_data)
        total_jobs += 1

    logger.info(f"Found {total_jobs} jobs ({jobs_without_email} without recruiterEmail) across categories: {list(jobs_by_category.keys())}")

    if total_jobs == 0:
        logger.warning("No jobs found for today — nothing to distribute")
        return

    # Step 3: Distribute and queue emails
    logger.info("Step 3: Running distribution engine...")
    distributor = DistributionEngine()
    total_queued = 0

    all_categories = set(users_by_category.keys()) | set(jobs_by_category.keys())

    for category in all_categories:
        category_users = users_by_category.get(category, [])
        category_jobs = jobs_by_category.get(category, [])

        if not category_users or not category_jobs:
            logger.info(f"Category '{category}': skipped (users={len(category_users)}, jobs={len(category_jobs)})")
            continue

        ratio = len(category_jobs) / len(category_users)
        logger.info(f"Category '{category}': users={len(category_users)}, jobs={len(category_jobs)}, ratio={ratio:.1f}")

        assignments = distributor.distribute(category_users, category_jobs)

        # Queue emails with staggered scheduling
        for user_id, assigned_jobs in assignments.items():
            logger.info(f"  User {user_id}: assigned {len(assigned_jobs)} jobs")

            # Per-user random offset so users don't all start simultaneously (0-10 min)
            user_offset = random.randint(0, 600)

            for i, job in enumerate(assigned_jobs):
                # Production: 2-5 minutes between each email per user
                base_delay = random.randint(120, 300) * (i + 1)

                # Stagger for shared jobs
                share_position = job.get("_share_position", 0)
                stagger_idx = min(share_position, len(STAGGER_RANGES) - 1)
                low, high = STAGGER_RANGES[stagger_idx]
                stagger = random.randint(low, high) if high > 0 else 0

                delay_seconds = user_offset + base_delay + stagger
                delay_minutes = delay_seconds / 60

                job_id = job.get("jobId", "unknown")
                recruiter = job.get("recruiterEmail", "NONE")
                logger.info(f"    Queuing: job={job_id}, to={recruiter}, delay={delay_minutes:.0f}min (base={base_delay/60:.0f}min + stagger={stagger/60:.0f}min), sharePos={share_position}")

                send_application_email.apply_async(
                    args=[user_id, job_id],
                    countdown=delay_seconds
                )

                total_queued += 1

    logger.info("========================================")
    logger.info(f"=== DISTRIBUTION COMPLETE: {total_queued} emails queued ===")
    logger.info("========================================")

if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(name)s] %(levelname)s: %(message)s")
    main()
