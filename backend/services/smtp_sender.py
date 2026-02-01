import logging
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from email.mime.application import MIMEApplication
from google.cloud import storage

logger = logging.getLogger("smtp_sender")

def send_via_smtp(user_smtp: str, user_password: str, recipient: str,
                  subject: str, body: str, resume_url: str) -> dict:
    """
    Send email via user's SMTP with resume attachment
    """
    logger.info(f"=== SMTP SEND START === from={user_smtp} to={recipient} subject='{subject[:60]}'")

    try:
        resume_bytes = None
        if resume_url:
            logger.info(f"Resume URL provided: {resume_url[:100]}")
            try:
                if resume_url.startswith("gs://"):
                    logger.info("Downloading resume from Google Cloud Storage...")
                    storage_client = storage.Client()
                    path_parts = resume_url[5:].split("/", 1)
                    if len(path_parts) < 2 or not path_parts[1]:
                        raise ValueError(f"Invalid gs:// URL format: {resume_url}")
                    bucket_name = path_parts[0]
                    blob_name = path_parts[1]
                    logger.info(f"GCS bucket={bucket_name}, blob={blob_name}")
                    bucket = storage_client.bucket(bucket_name)
                    blob = bucket.blob(blob_name)
                    resume_bytes = blob.download_as_bytes()
                    logger.info(f"Resume downloaded: {len(resume_bytes)} bytes")
                elif resume_url.startswith("firestore://"):
                    logger.info("Downloading resume from Firestore...")
                    import base64
                    from core.firebase import db
                    parts = resume_url.split("://")[1].split("/")
                    if not parts or not parts[0]:
                        raise ValueError(f"Invalid firestore:// URL format: {resume_url}")
                    user_id = parts[0]
                    resume_doc = db.collection("resumes").document(user_id).get()
                    if resume_doc.exists:
                        resume_data = resume_doc.to_dict()
                        resume_bytes = base64.b64decode(resume_data["content"])
                        logger.info(f"Resume from Firestore: {len(resume_bytes)} bytes")
                    else:
                        logger.warning(f"Resume document not found in Firestore for user {user_id}")
                else:
                    logger.warning(f"Unknown resume URL scheme: {resume_url[:30]}...")
            except Exception as e:
                logger.error(f"Resume download FAILED: {type(e).__name__}: {e}")
        else:
            logger.info("No resume URL provided — sending without attachment")

        # Create email
        msg = MIMEMultipart()
        msg['From'] = user_smtp
        msg['To'] = recipient
        msg['Subject'] = subject

        # Attach body
        msg.attach(MIMEText(body, 'plain'))
        logger.info(f"Email body attached (length={len(body)})")

        # Attach resume if available
        if resume_bytes:
            attachment = MIMEApplication(resume_bytes, _subtype="pdf")
            attachment.add_header('Content-Disposition', 'attachment', filename='resume.pdf')
            msg.attach(attachment)
            logger.info(f"Resume PDF attached ({len(resume_bytes)} bytes)")
        else:
            logger.warning("No resume attached to email")

        # Send via SMTP
        logger.info("Connecting to smtp.gmail.com:465 (SSL)...")
        with smtplib.SMTP_SSL('smtp.gmail.com', 465) as server:
            logger.info("Connected. Logging in...")
            server.login(user_smtp, user_password)
            logger.info("Login successful. Sending message...")
            server.send_message(msg)
            logger.info("Message sent successfully!")

        logger.info(f"=== SMTP SEND SUCCESS === from={user_smtp} to={recipient}")
        return {"success": True, "response": "250 OK"}

    except smtplib.SMTPAuthenticationError as e:
        logger.error(f"=== SMTP AUTH FAILED === from={user_smtp}: {e}")
        return {"success": False, "error": str(e)}
    except smtplib.SMTPRecipientsRefused as e:
        logger.error(f"=== SMTP RECIPIENT REFUSED === to={recipient}: {e}")
        return {"success": False, "error": str(e)}
    except smtplib.SMTPException as e:
        logger.error(f"=== SMTP ERROR === {type(e).__name__}: {e}")
        return {"success": False, "error": str(e)}
    except Exception as e:
        logger.error(f"=== SMTP UNEXPECTED ERROR === {type(e).__name__}: {e}")
        return {"success": False, "error": str(e)}
