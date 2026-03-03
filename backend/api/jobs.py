from fastapi import APIRouter, HTTPException, Header
from core.firebase import db
from middleware.auth import verify_firebase_token
from google.cloud.firestore_v1.base_query import FieldFilter
from datetime import datetime

router = APIRouter(prefix="/api/jobs", tags=["jobs"])


@router.get("/")
async def get_jobs(
    category: str = None,
    limit: int = 20,
    authorization: str = Header(None),
):
    user_token = await verify_firebase_token(authorization)

    if not db:
        raise HTTPException(status_code=503, detail="Database unavailable")

    try:
        query = db.collection("jobs")
        if category:
            query = query.where(filter=FieldFilter("jobCategory", "==", category))

        docs = query.limit(min(limit, 100)).stream()

        # Filter response fields — do NOT expose recruiterEmail to regular users
        jobs = []
        for doc in docs:
            d = doc.to_dict()
            jobs.append({
                "jobId": d.get("jobId"),
                "title": d.get("title", ""),
                "company": d.get("company", ""),
                "jobCategory": d.get("jobCategory", ""),
                "scrapedAt": d.get("scrapedAt", ""),
                "linkedinUrl": d.get("linkedinUrl", ""),
            })
        return jobs
    except Exception as e:
        raise HTTPException(status_code=500, detail="Failed to fetch jobs")
