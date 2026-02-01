from fastapi import HTTPException, Request
from core.redis import redis_client

class RateLimiter:
    """
    Rate limiting using Redis
    """
    
    def __init__(self):
        self.redis = redis_client
    
    def check_rate_limit(self, identifier: str, max_requests: int, window: int):
        """
        Check if request is within rate limit
        """
        if not self.redis:
            # If Redis down, fail open (allow request) for resilience or logic choice
            return True
            
        key = f"rate_limit:{identifier}"
        try:
            current = self.redis.get(key)
            
            if current and int(current) >= max_requests:
                return False
            
            pipe = self.redis.pipeline()
            pipe.incr(key)
            pipe.expire(key, window)
            pipe.execute()
            
            return True
        except Exception:
            # On redis error, allow request
            return True


limiter = RateLimiter()

async def rate_limit_middleware(request: Request, call_next):
    """
    Apply rate limiting to all requests
    """
    
    # Get user ID from token or use IP
    identifier = request.client.host if request.client else "unknown"
    
    # 100 reqs per minute per IP
    if not limiter.check_rate_limit(identifier, max_requests=100, window=60):
        # We need to return a Response object or raise HTTP exception
        # But raising exception in middleware can be tricky depending on starlette version, 
        # usually simpler to return JSONResponse
        from fastapi.responses import JSONResponse
        return JSONResponse(status_code=429, content={"detail": "Rate limit exceeded"})
    
    response = await call_next(request)
    return response
