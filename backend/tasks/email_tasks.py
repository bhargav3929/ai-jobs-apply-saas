import logging
from celery import Celery
from celery.exceptions import MaxRetriesExceededError
import smtplib
from datetime import datetime
import uuid
import redis
from firebase_admin import firestore
from google.cloud.firestore_v1.base_query import FieldFilter

from .celery_app import celery_app
from core.firebase import db
from core.settings import REDIS_URL
from services.email_generator import generate_email_with_ai
from services.smtp_sender import send_via_smtp
from utils.encryption import encryptor
from utils.error_handler import log_error_to_db, ErrorType

redis_client = redis.from_url(REDIS_URL)

logger = logging.getLogger("email_tasks")

@celery_app.task(bind=True, max_retries=3, default_retry_delay=300)
def send_application_email(self, user_id: str, job_id: str):
    """
    Production-ready email sending with retries
    """
    task_id = self.request.id
    retry_num = self.request.retries
    logger.info(f"[{task_id}] === START send_application_email === user={user_id} job={job_id} retry={retry_num}")

    try:
        if not db:
            logger.error(f"[{task_id}] Firestore not initialized!")
            raise Exception("Firestore not initialized")

        # Acquire Redis lock to prevent duplicate execution by multiple workers
        lock_key = f"email_lock:{user_id}:{job_id}"
        if not redis_client.set(lock_key, task_id, nx=True, ex=600):
            logger.info(f"[{task_id}] SKIPPED (duplicate) — another worker already processing user={user_id} job={job_id}")
            return {"status": "skipped", "reason": "duplicate_lock"}
        logger.info(f"[{task_id}] Lock acquired: {lock_key}")

        # Fetch user
        logger.info(f"[{task_id}] Fetching user document: {user_id}")
        user_doc = db.collection("users").document(user_id).get()
        if not user_doc.exists:
            logger.warning(f"[{task_id}] User {user_id} NOT FOUND in Firestore")
            return {"status": "failed", "reason": "user_not_found"}
        user = user_doc.to_dict()
        logger.info(f"[{task_id}] User found: name={user.get('name')}, smtpEmail={user.get('smtpEmail')}, hasSmtpPassword={'smtpPassword' in user}, resumeUrl={bool(user.get('resumeUrl'))}")

        # Fetch job
        logger.info(f"[{task_id}] Fetching job document: {job_id}")
        job_doc = db.collection("jobs").document(job_id).get()
        if not job_doc.exists:
            logger.warning(f"[{task_id}] Job {job_id} NOT FOUND in Firestore")
            return {"status": "failed", "reason": "job_not_found"}
        job = job_doc.to_dict()
        logger.info(f"[{task_id}] Job found: title={job.get('title', 'N/A')[:60]}, category={job.get('jobCategory')}, recruiterEmail={job.get('recruiterEmail')}")

        # Validate recruiter email
        recipient = job.get("recruiterEmail", "").strip()
        if not recipient or "@" not in recipient:
            logger.error(f"[{task_id}] INVALID recruiterEmail: '{recipient}' for job {job_id}")
            log_error_to_db(ErrorType.EMAIL_BOUNCED, Exception(f"Missing or invalid recruiterEmail for job {job_id}"), {"userId": user_id, "jobId": job_id})
            return {"status": "failed", "reason": "no_recruiter_email"}
        logger.info(f"[{task_id}] Recipient validated: {recipient}")

        # Check duplicate
        logger.info(f"[{task_id}] Checking for duplicate application...")
        existing = db.collection("applications") \
            .where(filter=FieldFilter("userId", "==", user_id)) \
            .where(filter=FieldFilter("jobId", "==", job_id)) \
            .limit(1).get()

        if existing:
            logger.info(f"[{task_id}] DUPLICATE — user {user_id} already applied to job {job_id}. Skipping.")
            return {"status": "skipped", "reason": "already_applied"}
        logger.info(f"[{task_id}] No duplicate found, proceeding.")

        # Generate email
        logger.info(f"[{task_id}] Generating email with AI...")
        email_content = generate_email_with_ai(user, job)
        logger.info(f"[{task_id}] Email generated: subject='{email_content.get('subject', '')[:80]}', bodyLength={len(email_content.get('body', ''))}, templateId={email_content.get('templateId')}")

        # Decrypt password
        logger.info(f"[{task_id}] Decrypting SMTP password...")
        try:
            password = encryptor.decrypt(user["smtpPassword"])
            logger.info(f"[{task_id}] Password decrypted successfully (length={len(password)})")
        except KeyError:
            logger.error(f"[{task_id}] User {user_id} has NO 'smtpPassword' field in Firestore!")
            return {"status": "failed", "reason": "smtp_password_missing"}
        except Exception as decrypt_err:
            logger.error(f"[{task_id}] Password decryption FAILED: {decrypt_err}")
            log_error_to_db(ErrorType.SMTP_AUTH_FAILED, decrypt_err, {"userId": user_id, "reason": "decrypt_failed"})
            return {"status": "failed", "reason": "smtp_password_decrypt_failed"}

        # Send via SMTP
        logger.info(f"[{task_id}] Sending email via SMTP: from={user['smtpEmail']} to={recipient}")
        smtp_result = send_via_smtp(
            user_smtp=user["smtpEmail"],
            user_password=password,
            recipient=recipient,
            subject=email_content["subject"],
            body=email_content["body"],
            resume_url=user.get("resumeUrl")
        )
        logger.info(f"[{task_id}] SMTP result: success={smtp_result['success']}, response={smtp_result.get('response')}, error={smtp_result.get('error')}")

        # Log application to Firestore
        app_id = str(uuid.uuid4())
        app_data = {
            "applicationId": app_id,
            "userId": user_id,
            "jobId": job_id,
            "emailSubject": email_content["subject"],
            "emailBody": email_content["body"],
            "templateId": email_content.get("templateId"),
            "sentAt": datetime.now().isoformat(),
            "sentToEmail": recipient,
            "status": "sent" if smtp_result["success"] else "failed",
            "smtpResponse": smtp_result.get("response", ""),
            "errorMessage": smtp_result.get("error"),
            "retryCount": self.request.retries
        }

        logger.info(f"[{task_id}] Saving application record: {app_id}")
        db.collection("applications").add(app_data)

        if smtp_result["success"]:
            logger.info(f"[{task_id}] SUCCESS — Updating job and user stats...")
            # Update job
            db.collection("jobs").document(job_id).set({
                "appliedByUsers": firestore.ArrayUnion([user_id]),
                "applicationCount": firestore.Increment(1),
                "lastAppliedAt": datetime.now().isoformat()
            }, merge=True)

            # Update user stats
            db.collection("users").document(user_id).set({
                "applicationsToday": firestore.Increment(1),
                "applicationsTotal": firestore.Increment(1),
                "lastApplicationSentAt": datetime.now().isoformat()
            }, merge=True)

            logger.info(f"[{task_id}] === COMPLETE (SUCCESS) === user={user_id} job={job_id} to={recipient}")
            return {"status": "success"}
        else:
            error_msg = str(smtp_result.get("error", ""))
            logger.error(f"[{task_id}] SMTP FAILED: {error_msg}")

            if "Authentication" in error_msg or "535" in error_msg:
                logger.error(f"[{task_id}] AUTH ERROR — not retrying. User {user_id} needs to update SMTP credentials.")
                log_error_to_db(ErrorType.SMTP_AUTH_FAILED, Exception(error_msg), {"userId": user_id})
                return {"status": "failed", "reason": "smtp_auth"}

            # For non-auth SMTP errors, raise to trigger Celery retry
            logger.warning(f"[{task_id}] Non-auth SMTP error — will retry.")
            raise Exception(f"SMTP send failed: {error_msg}")

    except smtplib.SMTPAuthenticationError as e:
        # SMTP credentials invalid - don't retry
        logger.error(f"[{task_id}] SMTPAuthenticationError: {e}")
        log_error_to_db(ErrorType.SMTP_AUTH_FAILED, e, {"userId": user_id, "jobId": job_id})
        return {"status": "failed", "reason": "smtp_auth"}

    except Exception as e:
        logger.error(f"[{task_id}] EXCEPTION: {type(e).__name__}: {e}")
        # Retry on other errors
        try:
            next_retry = retry_num + 1
            countdown = 60 * (2 ** retry_num)
            logger.warning(f"[{task_id}] Scheduling retry {next_retry}/3 in {countdown}s...")
            raise self.retry(exc=e, countdown=countdown)
        except MaxRetriesExceededError:
            logger.error(f"[{task_id}] MAX RETRIES EXCEEDED — giving up on user={user_id} job={job_id}")
            log_error_to_db(ErrorType.UNKNOWN, e, {"userId": user_id, "jobId": job_id})
            return {"status": "failed", "reason": "max_retries"}
