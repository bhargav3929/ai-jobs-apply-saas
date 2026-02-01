from fastapi import APIRouter, Depends, HTTPException
from app.services.firebase import get_firestore_client
from app.models.schemas import DashboardStats, JobApplication
from typing import List
from datetime import datetime

router = APIRouter()

@router.get("/stats", response_model=DashboardStats)
async def get_stats(user_id: str):
    # Dummy data for now until we have real data in Firestore
    return DashboardStats(
        applications_today=14,
        total_applications=2140,
        pending_queue=6,
        last_sync=datetime.now()
    )

@router.get("/recent-activity", response_model=List[JobApplication])
async def get_recent_activity(user_id: str):
    # Dummy data
    return [
        JobApplication(
            id="1",
            role="Senior React Developer",
            company="TechFlow Inc.",
            status="Sent",
            sent_at=datetime.now(),
            job_url="https://www.linkedin.com/jobs/view/123456789"
        ),
        JobApplication(
            id="2",
            role="Frontend Engineer",
            company="Stripe",
            status="Sent",
            sent_at=datetime.now(),
            job_url="https://www.linkedin.com/jobs/view/987654321"
        )
    ]
