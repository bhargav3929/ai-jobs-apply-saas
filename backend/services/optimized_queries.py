from core.firebase import db
from datetime import datetime
from .cache import CacheManager
import json

class OptimizedQueries:
    """
    Optimized Firestore queries with pagination and caching
    """
    
    @staticmethod
    def get_active_users_batch(batch_size: int = 100):
        """
        Generator to fetch active users in batches
        Reduces memory usage for large user base
        """
        if not db:
            return []
            
        last_doc = None
        
        while True:
            query = db.collection("users") \
                .where("isActive", "==", True) \
                .where("subscriptionStatus", "==", "active") \
                .limit(batch_size)
            
            if last_doc:
                query = query.start_after(last_doc)
            
            docs = list(query.stream())
            
            if not docs:
                break
            
            yield [doc.to_dict() for doc in docs]
            last_doc = docs[-1]
    
    @staticmethod
    def get_jobs_with_cache(category: str, use_cache: bool = True):
        """
        Get jobs with Redis caching
        """
        
        cache = CacheManager()
        
        if use_cache:
            try:
                cached = cache.get_jobs_by_category(category)
                if cached:
                    return cached
            except Exception:
                pass # Cache failure shouldn't break app
        
        if not db:
            return []

        # Fetch from Firestore
        today_start = datetime.now().replace(hour=0, minute=0, second=0)
        jobs = db.collection("jobs") \
            .where("jobCategory", "==", category) \
            .where("scrapedAt", ">=", today_start.isoformat()) \
            .stream()
        
        job_list = [job.to_dict() for job in jobs]
        
        # Cache for 1 hour
        try:
            cache.cache_jobs_by_category(category, job_list)
        except Exception:
            pass
        
        return job_list
