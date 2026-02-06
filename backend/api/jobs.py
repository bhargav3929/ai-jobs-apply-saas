from fastapi import APIRouter, HTTPException
from core.firebase import db
from google.cloud.firestore_v1.base_query import FieldFilter
from datetime import datetime

router = APIRouter(prefix="/api/jobs", tags=["jobs"])

@router.get("/")
async def get_jobs(category: str = None, limit: int = 20):
    query = db.collection("jobs")
    if category:
        query = query.where(filter=FieldFilter("jobCategory", "==", category))
    
    # Filter for active jobs (not older than 48h) usually
    docs = query.limit(limit).stream()
    return [doc.to_dict() for doc in docs]
