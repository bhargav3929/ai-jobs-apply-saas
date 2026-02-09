from enum import Enum
from typing import Optional
import sentry_sdk
from datetime import datetime, timezone
import uuid
from core.firebase import db

class ErrorType(Enum):
    SMTP_AUTH_FAILED = "smtp_auth_failed"
    SMTP_CONNECTION_FAILED = "smtp_connection_failed"
    EMAIL_BOUNCED = "email_bounced"
    SCRAPING_FAILED = "scraping_failed"
    AI_API_FAILED = "ai_api_failed"
    DATABASE_ERROR = "database_error"
    RATE_LIMIT_EXCEEDED = "rate_limit_exceeded"
    UNKNOWN = "unknown"

def log_error_to_db(error_type: ErrorType, error: Exception, context: dict):
    """Log error to Firestore for tracking"""
    if not db:
        return
        
    try:
        db.collection("system_logs").add({
            "logId": str(uuid.uuid4()),
            "type": "error",
            "level": "error",
            "errorType": error_type.value,
            "message": str(error),
            "context": context,
            "timestamp": datetime.now(timezone.utc).isoformat()
        })
    except Exception:
        pass

class ErrorHandler:
    """
    Centralized error handling with categorization and retry logic
    """
    
    @staticmethod
    def handle(error: Exception, context: dict) -> dict:
        """
        Handle error based on type and determine retry strategy
        """
        
        error_type = ErrorHandler.classify_error(error)
        
        strategies = {
            ErrorType.SMTP_AUTH_FAILED: {
                "should_retry": False,
                "retry_delay": 0,
                "max_retries": 0,
                "notify_user": True,
                "notify_admin": False
            },
            ErrorType.SMTP_CONNECTION_FAILED: {
                "should_retry": True,
                "retry_delay": 300,
                "max_retries": 3,
                "notify_user": False,
                "notify_admin": True
            },
            ErrorType.EMAIL_BOUNCED: {
                "should_retry": False,
                "retry_delay": 0,
                "max_retries": 0,
                "notify_user": False,
                "notify_admin": False
            },
            ErrorType.SCRAPING_FAILED: {
                "should_retry": True,
                "retry_delay": 600,
                "max_retries": 3,
                "notify_user": False,
                "notify_admin": True
            },
            ErrorType.AI_API_FAILED: {
                "should_retry": True,
                "retry_delay": 60,
                "max_retries": 5,
                "notify_user": False,
                "notify_admin": True
            },
            ErrorType.DATABASE_ERROR: {
                "should_retry": True,
                "retry_delay": 120,
                "max_retries": 3,
                "notify_user": False,
                "notify_admin": True
            },
            ErrorType.RATE_LIMIT_EXCEEDED: {
                "should_retry": True,
                "retry_delay": 3600,
                "max_retries": 1,
                "notify_user": False,
                "notify_admin": True
            }
        }
        
        strategy = strategies.get(error_type, {
            "should_retry": False,
            "retry_delay": 0,
            "max_retries": 0,
            "notify_user": False,
            "notify_admin": True
        })
        
        # Log to Sentry
        sentry_sdk.capture_exception(error, contexts={"custom": context})
        
        # Log to database
        log_error_to_db(error_type, error, context)
        
        return strategy
    
    @staticmethod
    def classify_error(error: Exception) -> ErrorType:
        """Classify error based on exception type and message"""
        
        error_str = str(error).lower()
        
        if "authentication failed" in error_str or "535" in error_str:
            return ErrorType.SMTP_AUTH_FAILED
        
        if "connection refused" in error_str or "timed out" in error_str:
            return ErrorType.SMTP_CONNECTION_FAILED
        
        if "550" in error_str or "bounced" in error_str:
            return ErrorType.EMAIL_BOUNCED
        
        if "apify" in error_str or "scraping" in error_str:
            return ErrorType.SCRAPING_FAILED
        
        if "openai" in error_str or "groq" in error_str or "rate" in error_str:
            return ErrorType.AI_API_FAILED
        
        if "firestore" in error_str or "database" in error_str:
            return ErrorType.DATABASE_ERROR
        
        return ErrorType.UNKNOWN
