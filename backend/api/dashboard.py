from datetime import datetime, timedelta, timezone
from fastapi import APIRouter, HTTPException, Header
from core.firebase import db
from google.cloud.firestore_v1.base_query import FieldFilter
import firebase_admin.auth as auth

# Use UTC everywhere for consistency — Railway runs in UTC, timestamps stored in UTC
UTC = timezone.utc
# Indian Standard Time (UTC+5:30) — only used for user-facing batch schedule
IST = timezone(timedelta(hours=5, minutes=30))

router = APIRouter(prefix="/api/dashboard", tags=["dashboard"])

async def verify_token(authorization: str = Header(None)):
    if not authorization:
        raise HTTPException(status_code=401, detail="No authorization header")
    try:
        token = authorization.split("Bearer ")[1]
        decoded = auth.verify_id_token(token)
        return decoded
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid token")


def _parse_sent_at(sent_at_str: str) -> datetime | None:
    """Parse a sentAt ISO string into a UTC-aware datetime, handling multiple formats."""
    if not sent_at_str:
        return None
    try:
        # Handle timezone-aware strings (e.g. "2026-02-09T14:30:00+00:00")
        if "+" in sent_at_str or sent_at_str.endswith("Z"):
            dt = datetime.fromisoformat(sent_at_str.replace("Z", "+00:00"))
            return dt.astimezone(UTC)
        # Handle naive strings (legacy data without timezone) — assume UTC (Railway server time)
        dt = datetime.fromisoformat(sent_at_str)
        return dt.replace(tzinfo=UTC)
    except (ValueError, TypeError):
        return None


@router.get("/stats")
async def get_dashboard_stats(authorization: str = Header(None)):
    user_token = await verify_token(authorization)
    user_id = user_token["uid"]

    if not db:
        raise HTTPException(status_code=503, detail="Database unavailable")

    # 1. Get user document
    user_doc = db.collection("users").document(user_id).get()
    if not user_doc.exists:
        raise HTTPException(status_code=404, detail="User not found")
    user_data = user_doc.to_dict()

    # 2. Compute all metrics using proper datetime comparisons (UTC)
    now = datetime.now(UTC)
    today_midnight = now.replace(hour=0, minute=0, second=0, microsecond=0)
    yesterday_midnight = today_midnight - timedelta(days=1)
    week_ago = now - timedelta(days=7)
    month_ago = now - timedelta(days=30)

    apps_today = 0
    apps_yesterday = 0
    apps_this_week = 0
    apps_this_month = 0
    apps_total = 0
    recent_applications = []

    for app_doc in db.collection("applications") \
            .where(filter=FieldFilter("userId", "==", user_id)) \
            .order_by("sentAt", direction="DESCENDING") \
            .stream():
        data = app_doc.to_dict()
        sent_at_str = data.get("sentAt", "")
        apps_total += 1

        sent_dt = _parse_sent_at(sent_at_str)
        if sent_dt:
            if sent_dt >= today_midnight:
                apps_today += 1
            elif sent_dt >= yesterday_midnight:
                apps_yesterday += 1
            if sent_dt >= week_ago:
                apps_this_week += 1
            if sent_dt >= month_ago:
                apps_this_month += 1

        if len(recent_applications) < 5:
            recent_applications.append(data)

    # Calculate average daily sends from account age
    created_at = user_data.get("createdAt")
    if created_at and apps_total > 0:
        try:
            created_dt = datetime.fromisoformat(created_at.replace("Z", "+00:00"))
            created_dt_utc = created_dt.astimezone(UTC)
            account_age_days = max((now - created_dt_utc).days, 1)
            average_daily = round(apps_total / account_age_days, 1)
        except (ValueError, TypeError):
            average_daily = 0
    else:
        average_daily = 0

    # 3. Next batch time (distribution runs at 9 AM IST = 3:30 AM UTC daily)
    now_ist = now.astimezone(IST)
    next_batch_ist = now_ist.replace(hour=9, minute=0, second=0, microsecond=0)
    if now_ist >= next_batch_ist:
        next_batch_ist = next_batch_ist + timedelta(days=1)

    return {
        "userName": user_data.get("name"),
        "applicationsToday": apps_today,
        "applicationsYesterday": apps_yesterday,
        "applicationsThisWeek": apps_this_week,
        "applicationsThisMonth": apps_this_month,
        "applicationsTotal": apps_total,
        "isActive": user_data.get("isActive", False),
        "averageDaily": average_daily,
        "nextBatchTime": next_batch_ist.isoformat(),
        "recentApplications": recent_applications
    }

@router.get("/applications")
async def get_applications(limit: int = 50, offset: int = 0, authorization: str = Header(None)):
    user_token = await verify_token(authorization)
    user_id = user_token["uid"]

    apps = db.collection("applications") \
        .where(filter=FieldFilter("userId", "==", user_id)) \
        .order_by("sentAt", direction="DESCENDING") \
        .offset(offset) \
        .limit(limit) \
        .stream()

    results = []
    job_cache: dict = {}
    for app in apps:
        data = app.to_dict()
        # Enrich with linkedinUrl from the job document
        job_id = data.get("jobId")
        if job_id and job_id not in job_cache:
            try:
                job_doc = db.collection("jobs").document(job_id).get()
                job_cache[job_id] = job_doc.to_dict() if job_doc.exists else {}
            except Exception:
                job_cache[job_id] = {}
        job_data = job_cache.get(job_id, {})
        data["linkedinUrl"] = job_data.get("linkedinUrl")
        data["recruiterEmail"] = job_data.get("recruiterEmail")
        results.append(data)

    return results
