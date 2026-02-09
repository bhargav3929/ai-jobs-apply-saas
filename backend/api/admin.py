import asyncio
import base64
import os
from datetime import datetime, timedelta, timezone
from fastapi import APIRouter, HTTPException, Header, BackgroundTasks, Request
from core.firebase import db
from google.cloud.firestore_v1.base_query import FieldFilter

UTC = timezone.utc

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
            "disabledByAdmin": data.get("disabledByAdmin", False),
        })

    now_utc = datetime.now(UTC)
    today_midnight_utc = now_utc.replace(hour=0, minute=0, second=0, microsecond=0)

    apps_today = 0
    try:
        for a_doc in db.collection("applications").order_by("sentAt", direction="DESCENDING").stream():
            sent_at_str = a_doc.to_dict().get("sentAt", "")
            if not sent_at_str:
                continue
            try:
                if "+" in sent_at_str or sent_at_str.endswith("Z"):
                    sent_dt = datetime.fromisoformat(sent_at_str.replace("Z", "+00:00")).astimezone(UTC)
                else:
                    sent_dt = datetime.fromisoformat(sent_at_str).replace(tzinfo=UTC)
                if sent_dt >= today_midnight_utc:
                    apps_today += 1
                else:
                    break  # Since sorted DESC, no more today's entries
            except (ValueError, TypeError):
                continue
    except Exception:
        pass

    jobs_today = 0
    jobs_with_email = 0
    try:
        for j in db.collection("jobs").order_by("scrapedAt", direction="DESCENDING").stream():
            d = j.to_dict()
            scraped_str = d.get("scrapedAt", "")
            if not scraped_str:
                continue
            try:
                if "+" in scraped_str or scraped_str.endswith("Z"):
                    scraped_dt = datetime.fromisoformat(scraped_str.replace("Z", "+00:00")).astimezone(UTC)
                else:
                    scraped_dt = datetime.fromisoformat(scraped_str).replace(tzinfo=UTC)
                if scraped_dt >= today_midnight_utc:
                    jobs_today += 1
                    if d.get("recruiterEmail"):
                        jobs_with_email += 1
                else:
                    break  # Since sorted DESC, no more today's entries
            except (ValueError, TypeError):
                continue
    except Exception:
        pass

    return {
        "totalUsers": total_users,
        "activeUsers": active_users,
        "applicationsToday": apps_today,
        "jobsScrapedToday": jobs_today,
        "jobsWithEmail": jobs_with_email,
        "recentUsers": recent_users,
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
async def get_jobs(
    category: str = None,
    date_filter: str = "all",
    page: int = 1,
    page_size: int = 20,
    authorization: str = Header(None),
):
    verify_admin_basic(authorization)
    try:
        # Build date filter using proper UTC datetimes
        date_cutoff_dt = None
        now = datetime.now(UTC)
        if date_filter == "today":
            date_cutoff_dt = now.replace(hour=0, minute=0, second=0, microsecond=0)
        elif date_filter == "yesterday":
            date_cutoff_dt = (now - timedelta(days=1)).replace(hour=0, minute=0, second=0, microsecond=0)
        elif date_filter == "week":
            date_cutoff_dt = now - timedelta(days=7)

        def _parse_ts(ts_str: str) -> datetime | None:
            if not ts_str:
                return None
            try:
                if "+" in ts_str or ts_str.endswith("Z"):
                    return datetime.fromisoformat(ts_str.replace("Z", "+00:00")).astimezone(UTC)
                return datetime.fromisoformat(ts_str).replace(tzinfo=UTC)
            except (ValueError, TypeError):
                return None

        # Fetch all matching jobs (Firestore doesn't support offset natively)
        all_jobs = []
        category_breakdown = {}
        for j in db.collection("jobs").order_by("scrapedAt", direction="DESCENDING").stream():
            d = j.to_dict()
            scraped_at = d.get("scrapedAt", "")
            job_cat = d.get("jobCategory", "Other")

            # Date filter using proper datetime comparison
            if date_cutoff_dt:
                scraped_dt = _parse_ts(scraped_at)
                if not scraped_dt or scraped_dt < date_cutoff_dt:
                    continue

            # Track category breakdown before category filter
            category_breakdown[job_cat] = category_breakdown.get(job_cat, 0) + 1

            # Category filter
            if category and job_cat != category:
                continue

            all_jobs.append({
                "jobId": d.get("jobId"),
                "title": d.get("title", "")[:80],
                "company": d.get("company", "Unknown"),
                "recruiterEmail": d.get("recruiterEmail", ""),
                "jobCategory": job_cat,
                "applicationCount": d.get("applicationCount", 0),
                "scrapedAt": scraped_at,
                "linkedinUrl": d.get("linkedinUrl", ""),
                "postText": d.get("postText", "")[:300],
            })

        total = len(all_jobs)
        start = (page - 1) * page_size
        end = start + page_size
        return {
            "jobs": all_jobs[start:end],
            "total": total,
            "categoryBreakdown": category_breakdown,
        }
    except Exception as e:
        return {"error": str(e)}


@router.get("/applications")
async def get_applications(
    status: str = None,
    date_filter: str = "all",
    page: int = 1,
    page_size: int = 30,
    authorization: str = Header(None),
):
    verify_admin_basic(authorization)
    try:
        date_cutoff_dt = None
        now = datetime.now(UTC)
        if date_filter == "today":
            date_cutoff_dt = now.replace(hour=0, minute=0, second=0, microsecond=0)
        elif date_filter == "yesterday":
            date_cutoff_dt = (now - timedelta(days=1)).replace(hour=0, minute=0, second=0, microsecond=0)
        elif date_filter == "week":
            date_cutoff_dt = now - timedelta(days=7)

        def _parse_ts_app(ts_str: str) -> datetime | None:
            if not ts_str:
                return None
            try:
                if "+" in ts_str or ts_str.endswith("Z"):
                    return datetime.fromisoformat(ts_str.replace("Z", "+00:00")).astimezone(UTC)
                return datetime.fromisoformat(ts_str).replace(tzinfo=UTC)
            except (ValueError, TypeError):
                return None

        all_apps = []
        status_breakdown = {}
        for a in db.collection("applications").order_by("sentAt", direction="DESCENDING").stream():
            d = a.to_dict()
            sent_at = d.get("sentAt", "")
            app_status = d.get("status", "unknown")

            if date_cutoff_dt:
                sent_dt = _parse_ts_app(sent_at)
                if not sent_dt or sent_dt < date_cutoff_dt:
                    continue

            status_breakdown[app_status] = status_breakdown.get(app_status, 0) + 1

            if status and app_status != status:
                continue

            all_apps.append({
                "applicationId": d.get("applicationId"),
                "userId": d.get("userId", ""),
                "jobId": d.get("jobId", ""),
                "emailSubject": d.get("emailSubject", ""),
                "sentToEmail": d.get("sentToEmail", ""),
                "status": app_status,
                "sentAt": sent_at,
            })

        total = len(all_apps)
        start = (page - 1) * page_size
        end = start + page_size
        return {
            "applications": all_apps[start:end],
            "total": total,
            "statusBreakdown": status_breakdown,
        }
    except Exception as e:
        return {"error": str(e)}


@router.post("/users/{uid}/toggle-status")
async def toggle_user_status(uid: str, authorization: str = Header(None)):
    verify_admin_basic(authorization)
    if not db:
        raise HTTPException(status_code=503, detail="Database unavailable")

    user_ref = db.collection("users").document(uid)
    user_doc = user_ref.get()
    if not user_doc.exists:
        raise HTTPException(status_code=404, detail="User not found")

    current = user_doc.to_dict().get("disabledByAdmin", False)
    new_status = not current
    user_ref.update({"disabledByAdmin": new_status})

    action = "disabled" if new_status else "enabled"
    db.collection("system_logs").add({
        "type": "info", "level": "info",
        "message": f"Admin {action} user {uid}",
        "timestamp": datetime.now(UTC).isoformat(),
    })
    return {"success": True, "disabledByAdmin": new_status, "message": f"User {action}"}


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
        "timestamp": datetime.now(UTC).isoformat(),
    })
    return {"success": True, "message": "Scraping started in background. Check logs for progress."}


@router.post("/trigger/distribute")
async def trigger_distribute(background_tasks: BackgroundTasks, authorization: str = Header(None)):
    verify_admin_basic(authorization)
    background_tasks.add_task(_run_distributor)
    db.collection("system_logs").add({
        "type": "info", "level": "info",
        "message": "Manual distribution triggered by admin",
        "timestamp": datetime.now(UTC).isoformat(),
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
        "timestamp": datetime.now(UTC).isoformat(),
    })
    return {"success": True, "message": f"Deleted {deleted} jobs from database."}


@router.post("/emergency-stop")
async def emergency_stop(authorization: str = Header(None)):
    verify_admin_basic(authorization)
    from tasks.celery_app import celery_app

    purged = celery_app.control.purge()

    revoked = 0
    inspect = celery_app.control.inspect()
    for method in [inspect.active, inspect.reserved, inspect.scheduled]:
        try:
            result = method() or {}
            for tasks in result.values():
                for task in tasks:
                    task_id = task.get("id") or task.get("request", {}).get("id")
                    if task_id:
                        celery_app.control.revoke(task_id, terminate=True)
                        revoked += 1
        except Exception:
            pass

    db.collection("system_logs").add({
        "type": "warning", "level": "warning",
        "message": f"EMERGENCY STOP: purged {purged} pending, revoked {revoked} active/reserved tasks",
        "timestamp": datetime.now(UTC).isoformat(),
    })
    return {"success": True, "purged": purged, "revoked": revoked}
