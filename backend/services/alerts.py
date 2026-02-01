import smtplib
from email.mime.text import MIMEText
import os
from datetime import datetime
from core.firebase import db
from core.redis import redis_client
from core.settings import ADMIN_EMAIL, ADMIN_SMTP_HOST, ADMIN_SMTP_USER, ADMIN_SMTP_PASS
from utils.logger import CustomLogger

logger = CustomLogger("alert_system")

class AlertSystem:
    """
    Send alerts to admin for critical issues
    """
    
    def __init__(self):
        self.admin_email = ADMIN_EMAIL
        self.smtp_host = ADMIN_SMTP_HOST
        self.smtp_user = ADMIN_SMTP_USER
        self.smtp_pass = ADMIN_SMTP_PASS
    
    def send_alert(self, subject: str, body: str, priority: str = "medium"):
        """
        Send email alert to admin
        
        Args:
            subject: Email subject
            body: Email body
            priority: low | medium | high | critical
        """
        if not self.admin_email or not self.smtp_user:
            logger.warning("Admin email settings not configured, skipping alert.")
            return

        emoji_map = {
            "low": "ℹ️",
            "medium": "⚠️",
            "high": "🚨",
            "critical": "🔥"
        }
        
        full_subject = f"{emoji_map.get(priority, 'ℹ️')} {subject}"
        
        msg = MIMEText(body)
        msg['Subject'] = full_subject
        msg['From'] = self.smtp_user
        msg['To'] = self.admin_email
        
        try:
            # Note: Port 465 for SSL
            with smtplib.SMTP_SSL(self.smtp_host, 465) as server:
                server.login(self.smtp_user, self.smtp_pass)
                server.send_message(msg)
        except Exception as e:
            logger.error(f"Failed to send alert: {e}")

alerts = AlertSystem()

def check_system_health():
    """
    Run health checks and alert if issues
    """
    if not db:
        return

    # Check 1: Scraping ran today
    today = datetime.now().replace(hour=0, minute=0, second=0)
    scraping_logs = db.collection("system_logs") \
        .where("type", "==", "scraping") \
        .where("timestamp", ">=", today.isoformat()) \
        .limit(1).get()
    
    if not scraping_logs:
        alerts.send_alert(
            "Scraping Failed Today",
            "No scraping logs found for today. Check cron jobs.",
            priority="critical"
        )
    
    # Check 2: Email queue backlog
    if redis_client:
        try:
            queue_length = redis_client.llen("celery")
            if queue_length > 1000:
                alerts.send_alert(
                    "Email Queue Backlog",
                    f"Queue has {queue_length} pending emails. Check Celery workers.",
                    priority="high"
                )
        except Exception:
            pass
