import redis
import json
from typing import Optional
from datetime import datetime
from core.settings import REDIS_URL

class CacheManager:
    """
    Redis caching for frequently accessed data
    """
    
    def __init__(self):
        self.redis = redis.from_url(REDIS_URL, decode_responses=True)
    
    def get_user_applications_today(self, user_id: str) -> Optional[int]:
        """Cache user's daily application count"""
        key = f"user:{user_id}:apps_today"
        value = self.redis.get(key)
        return int(value) if value else None
    
    def set_user_applications_today(self, user_id: str, count: int):
        """Set with 24-hour expiry"""
        key = f"user:{user_id}:apps_today"
        # Expire at midnight
        now = datetime.now()
        midnight = now.replace(hour=23, minute=59, second=59)
        seconds_until_midnight = int((midnight - now).total_seconds())
        self.redis.setex(key, seconds_until_midnight, count)
    
    def increment_user_applications(self, user_id: str):
        """Atomic increment"""
        key = f"user:{user_id}:apps_today"
        self.redis.incr(key)
    
    def cache_jobs_by_category(self, category: str, jobs: list):
        """Cache today's jobs for a category"""
        key = f"jobs:{category}:today"
        self.redis.setex(key, 3600, json.dumps(jobs))  # 1 hour cache
    
    def get_jobs_by_category(self, category: str) -> Optional[list]:
        """Get cached jobs"""
        key = f"jobs:{category}:today"
        value = self.redis.get(key)
        return json.loads(value) if value else None
