from fastapi import APIRouter, BackgroundTasks, HTTPException
from app.services.job_scraper import scrape_linkedin_jobs
from typing import Dict, Any
import uuid

router = APIRouter()

# In-memory task store for MVP
tasks: Dict[str, Dict[str, Any]] = {}

@router.post("/start-scrape")
async def start_scrape_task(keywords: str, location: str, background_tasks: BackgroundTasks):
    task_id = str(uuid.uuid4())
    tasks[task_id] = {"status": "running", "jobs": []}
    
    background_tasks.add_task(run_scrape, task_id, keywords, location)
    
    return {"task_id": task_id, "status": "started"}

@router.get("/status/{task_id}")
async def get_task_status(task_id: str):
    if task_id not in tasks:
        raise HTTPException(status_code=404, detail="Task not found")
    return tasks[task_id]

async def run_scrape(task_id: str, keywords: str, location: str):
    try:
        jobs = await scrape_linkedin_jobs(keywords, location)
        tasks[task_id]["status"] = "completed"
        tasks[task_id]["jobs"] = jobs
    except Exception as e:
        tasks[task_id]["status"] = "failed"
        tasks[task_id]["error"] = str(e)
