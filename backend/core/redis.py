import redis
from core.settings import REDIS_URL

try:
    redis_client = redis.from_url(REDIS_URL, decode_responses=True)
except Exception as e:
    print(f"Warning: Redis connection failed: {e}")
    redis_client = None
