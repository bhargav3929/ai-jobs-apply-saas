import asyncio
import base64
import os
from datetime import datetime
from fastapi import APIRouter, HTTPException, Header, BackgroundTasks, Request
from core.firebase import db
from google.cloud.firestore_v1.base_query import FieldFilter

router = APIRouter(prefix="/api/admin", tags=["admin"])

ADMIN_USERNAME = os.getenv("ADMIN_USERNAME", "admin")
ADMIN_PASSWORD = os.getenv("ADMIN_PASSWORD", "admin123")


def verify_admin_basic(authorization: str = Header(None)):
    if not authorization:
        raise HTTPException(status_code=401, detail="No authorization header")
    try:
        scheme, credentials = authorization.split(" ", 1)
        if scheme.lower() != "basic":
            raise HTTPException(status_code=401, detail="Use Basic auth")
        decoded = base64.b64decode(credentials).decode("utf-8")
        username, password = decoded.split(":", 1)
        if username != ADMIN_USERNAME or password != ADMIN_PASSWORD:
            raise HTTPException(status_code=401, detail="Invalid credentials")
    except (ValueError, Exception):
        raise HTTPException(status_code=401, detail="Invalid authorization header")


@router.post("/login")
async def admin_login(authorization: str = Header(None)):
    verify_admin_basic(authorization)
    return {"success": True, "message": "Authenticated"}


@router.get("/overview")
async def get_admin_stats(authorization: str = Header(None)):
    verify_admin_basic(authorization)

    if not db:
        raise HTTPException(status_code=503, detail="Database unavailable")

    total_users = 0
    active_users = 0
    recent_users = []

    for u in db.collection("users").stream():
        total_users += 1
        data = u.to_dict()
        if data.get("isActive"):
            active_users += 1
        recent_users.append({
            "uid": u.id,
            "email": data.get("smtpEmail") or data.get("email", ""),
            "name": data.get("name", "Unknown"),
            "isActive": data.get("isActive", False),
            "jobCategory": data.get("jobCategory", "N/A"),
            "applicationsToday": data.get("applicationsToday", 0),
            "applicationsTotal": data.get("applicationsTotal", 0),
        })

    today_start = datetime.now().replace(hour=0, minute=0, second=0).isoformat()
    apps_today = 0
    try:
        for _ in db.collection("applications").where(filter=FieldFilter("sentAt", ">=", today_start)).stream():
            apps_today += 1
    except Exception:
        pass

    jobs_today = 0
    jobs_with_email = 0
    try:
        for j in db.collection("jobs").where(filter=FieldFilter("scrapedAt", ">=", today_start)).stream():
            jobs_today += 1
            if j.to_dict().get("recruiterEmail"):
                jobs_with_email += 1
    except Exception:
        pass

    return {
        "totalUsers": total_users,
        "activeUsers": active_users,
        "applicationsToday": apps_today,
        "jobsScrapedToday": jobs_today,
        "jobsWithEmail": jobs_with_email,
        "recentUsers": recent_users[-10:],
    }


@router.get("/logs")
async def get_logs(limit: int = 50, authorization: str = Header(None)):
    verify_admin_basic(authorization)
    try:
        logs_ref = db.collection("system_logs").order_by(
            "timestamp", direction="DESCENDING"
        ).limit(limit)
        return [log.to_dict() for log in logs_ref.stream()]
    except Exception as e:
        return {"error": str(e)}


@router.get("/jobs")
async def get_jobs(limit: int = 20, authorization: str = Header(None)):
    verify_admin_basic(authorization)
    try:
        jobs_ref = db.collection("jobs").order_by(
            "scrapedAt", direction="DESCENDING"
        ).limit(limit)
        results = []
        for j in jobs_ref.stream():
            d = j.to_dict()
            results.append({
                "jobId": d.get("jobId"),
                "title": d.get("title", "")[:80],
                "company": d.get("company", "Unknown"),
                "recruiterEmail": d.get("recruiterEmail", ""),
                "jobCategory": d.get("jobCategory", "Other"),
                "applicationCount": d.get("applicationCount", 0),
                "scrapedAt": d.get("scrapedAt", ""),
                "linkedinUrl": d.get("linkedinUrl", ""),
                "postText": d.get("postText", "")[:300],
            })
        return results
    except Exception as e:
        return {"error": str(e)}


@router.get("/applications")
async def get_applications(limit: int = 30, authorization: str = Header(None)):
    verify_admin_basic(authorization)
    try:
        apps_ref = db.collection("applications").order_by(
            "sentAt", direction="DESCENDING"
        ).limit(limit)
        results = []
        for a in apps_ref.stream():
            d = a.to_dict()
            results.append({
                "applicationId": d.get("applicationId"),
                "userId": d.get("userId", ""),
                "jobId": d.get("jobId", ""),
                "emailSubject": d.get("emailSubject", ""),
                "sentToEmail": d.get("sentToEmail", ""),
                "status": d.get("status", "unknown"),
                "sentAt": d.get("sentAt", ""),
            })
        return results
    except Exception as e:
        return {"error": str(e)}


def _run_scraper(category_limits=None):
    from cron.daily_scraper import main as scraper_main
    asyncio.run(scraper_main(category_limits=category_limits))


def _run_distributor():
    from cron.job_distributor import main as distributor_main
    distributor_main()


@router.post("/trigger/scrape")
async def trigger_scrape(request: Request, background_tasks: BackgroundTasks, authorization: str = Header(None)):
    verify_admin_basic(authorization)
    category_limits = None
    try:
        body = await request.json()
        category_limits = body.get("categoryLimits")
    except Exception:
        pass
    background_tasks.add_task(_run_scraper, category_limits)
    db.collection("system_logs").add({
        "type": "info", "level": "info",
        "message": f"Manual scrape triggered by admin (limits: {category_limits or 'default'})",
        "timestamp": datetime.now().isoformat(),
    })
    return {"success": True, "message": "Scraping started in background. Check logs for progress."}


@router.post("/trigger/distribute")
async def trigger_distribute(background_tasks: BackgroundTasks, authorization: str = Header(None)):
    verify_admin_basic(authorization)
    background_tasks.add_task(_run_distributor)
    db.collection("system_logs").add({
        "type": "info", "level": "info",
        "message": "Manual distribution triggered by admin",
        "timestamp": datetime.now().isoformat(),
    })
    return {"success": True, "message": "Distribution started in background. Emails will be queued via Celery."}


@router.delete("/erase-jobs")
async def erase_jobs_database(authorization: str = Header(None)):
    verify_admin_basic(authorization)
    if not db:
        raise HTTPException(status_code=503, detail="Database unavailable")

    deleted = 0
    batch = db.batch()
    batch_count = 0

    for doc in db.collection("jobs").stream():
        batch.delete(doc.reference)
        batch_count += 1
        deleted += 1
        if batch_count >= 400:
            batch.commit()
            batch = db.batch()
            batch_count = 0

    if batch_count > 0:
        batch.commit()

    db.collection("system_logs").add({
        "type": "warning", "level": "warning",
        "message": f"Admin erased jobs database: {deleted} jobs deleted",
        "timestamp": datetime.now().isoformat(),
    })
    return {"success": True, "message": f"Deleted {deleted} jobs from database."}
