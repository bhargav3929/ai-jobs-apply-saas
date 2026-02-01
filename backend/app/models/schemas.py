from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime

class UserBase(BaseModel):
    uid: str
    email: str
    name: Optional[str] = None

class JobApplication(BaseModel):
    id: str
    role: str
    company: str
    platform: str = "LinkedIn"
    status: str
    sent_at: datetime
    job_url: Optional[str] = None
    
class DashboardStats(BaseModel):
    applications_today: int
    total_applications: int
    pending_queue: int
    last_sync: datetime

class TaskStatus(BaseModel):
    task_id: str
    status: str
    progress: int
    message: Optional[str] = None
