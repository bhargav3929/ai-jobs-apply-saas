from fastapi import APIRouter, HTTPException, Header
from core.firebase import db
from google.cloud.firestore_v1.base_query import FieldFilter
import firebase_admin.auth as auth
from services.cache import CacheManager
from services.optimized_queries import OptimizedQueries

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
    
    # 2. Get recent applications (limit 5)
    recent_apps_query = db.collection("applications") \
        .where(filter=FieldFilter("userId", "==", user_id)) \
        .order_by("sentAt", direction="DESCENDING") \
        .limit(5) \
        .stream()
    
    recent_applications = [app.to_dict() for app in recent_apps_query]
    
    # 3. Calculate next batch time (Mock logic or read from cron schedule/redis)
    # Simple logic: next hour?
    import datetime
    next_batch = (datetime.datetime.now() + datetime.timedelta(hours=1)).replace(minute=0, second=0, microsecond=0)
    
    return {
        "userName": user_data.get("name"),
        "applicationsToday": user_data.get("applicationsToday", 0),
        "applicationsThisWeek": user_data.get("applicationsThisWeek", 0),
        "applicationsThisMonth": user_data.get("applicationsThisMonth", 0),
        "applicationsTotal": user_data.get("applicationsTotal", 0),
        "isActive": user_data.get("isActive", False),
        "averageDaily": user_data.get("averageDaily", 20),
        "nextBatchTime": next_batch.isoformat(),
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
