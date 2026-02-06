from datetime import datetime
from core.firebase import db
from .alerts import AlertSystem

# Reuse admin email sender for now if we notify user via email
# Or we might want a separate method for user notifications.
# The PRD example used send_admin_email to notify user, which implies using the admin SMTP credentials
# to send a notification TO the user.

alerts = AlertSystem()

def send_admin_email(to_email: str, subject: str, body: str):
    """
    Send email from admin account to user (or admin)
    """
    alerts.send_alert(subject, body, priority="medium")
    # Actually AlertSystem.send_alert sends TO admin_email.
    # We need a method to send TO an arbitrary user.
    # Let's add it to AlertSystem or just implement raw SMTP here using admin creds.
    
    import smtplib
    from email.mime.text import MIMEText
    from core.settings import ADMIN_SMTP_HOST, ADMIN_SMTP_USER, ADMIN_SMTP_PASS
    
    if not ADMIN_SMTP_USER:
        return

    msg = MIMEText(body)
    msg['Subject'] = subject
    msg['From'] = ADMIN_SMTP_USER
    msg['To'] = to_email
    
    try:
        with smtplib.SMTP_SSL(ADMIN_SMTP_HOST, 465) as server:
            server.login(ADMIN_SMTP_USER, ADMIN_SMTP_PASS)
            server.send_message(msg)
    except Exception as e:
        print(f"Failed to send notification: {e}")

async def notify_user_smtp_failed(user_id: str, error_message: str):
    """
    Notify user their SMTP credentials failed
    """
    if not db:
        return

    user_doc = db.collection("users").document(user_id).get()
    if not user_doc.exists:
        return
        
    user = user_doc.to_dict()
    
    # Update user status
    db.collection("users").document(user_id).update({
        "isActive": False,
        "smtpLastError": error_message,
        "smtpTested": False
    })
    
    # Send notification email (via admin SMTP)
    subject = "⚠️ Action Required: SMTP Connection Failed"
    body = f"""
Hi {user.get('name', 'User')},

We encountered an issue with your email configuration:

Error: {error_message}

Your automation has been paused. Please:

1. Go to Settings → Email Configuration
2. Update your SMTP password (use app-specific password)
3. Test the connection
4. Reactivate automation

Need help? Reply to this email.

Best regards,
JobApply Team
"""
    
    send_admin_email(user.get('email'), subject, body)

async def notify_admin_scraping_failed(error: Exception):
    """
    Alert admin when daily scraping fails
    """
    from core.settings import ADMIN_EMAIL
    
    subject = "🚨 CRITICAL: LinkedIn Scraping Failed"
    body = f"""
Scraping job failed at {datetime.now().isoformat()}

Error: {str(error)}

Action needed:
- Check Apify status
- Check API credits
- Review logs in admin dashboard

System Impact:
- No new jobs scraped today
- Users won't receive applications
"""
    
    if ADMIN_EMAIL:
        send_admin_email(ADMIN_EMAIL, subject, body)
