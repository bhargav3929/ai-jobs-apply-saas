import smtplib
from email.message import EmailMessage
import logging
from typing import Dict, Any, Optional

logger = logging.getLogger(__name__)

class EmailService:
    @staticmethod
    def verify_connection(email: str, password: str, server: str = "smtp.gmail.com", port: int = 465) -> Dict[str, Any]:
        """
        Verifies SMTP credentials by attempting to connect and login.
        Returns a dictionary with success status and message.
        """
        try:
            logger.info(f"Attempting to connect to SMTP server: {server}:{port}")
            
            # Create SMTP connection
            # Using SMTP_SSL for port 465 (standard for Gmail)
            if port == 465:
                smtp = smtplib.SMTP_SSL(server, port, timeout=10)
            else:
                # For port 587 (TLS), utilize starttls
                smtp = smtplib.SMTP(server, port, timeout=10)
                smtp.starttls()
            
            # Login
            smtp.login(email, password)
            smtp.quit()
            
            logger.info("SMTP connection verified successfully")
            return {
                "success": True, 
                "message": "Connection successful"
            }
            
        except smtplib.SMTPAuthenticationError as e:
            logger.error(f"SMTP Authentication Error: {str(e)}")
            return {
                "success": False, 
                "message": "Authentication failed. Please check your email and app password."
            }
        except smtplib.SMTPConnectError as e:
            logger.error(f"SMTP Connection Error: {str(e)}")
            return {
                "success": False, 
                "message": f"Could not connect to server {server}. Check your internet connection or server settings."
            }
        except Exception as e:
            logger.error(f"SMTP Error: {str(e)}")
            return {
                "success": False, 
                "message": f"Connection failed: {str(e)}"
            }

    @staticmethod
    def send_email(
        to_email: str, 
        subject: str, 
        body: str, 
        smtp_email: str, 
        smtp_password: str,
        smtp_server: str = "smtp.gmail.com",
        smtp_port: int = 465,
        attachment_path: Optional[str] = None
    ) -> bool:
        """
        Sends an email using the provided SMTP credentials.
        """
        try:
            msg = EmailMessage()
            msg.set_content(body)
            msg["Subject"] = subject
            msg["From"] = smtp_email
            msg["To"] = to_email
            
            if attachment_path:
                # Logic to add attachment would go here
                pass

            if smtp_port == 465:
                with smtplib.SMTP_SSL(smtp_server, smtp_port) as smtp:
                    smtp.login(smtp_email, smtp_password)
                    smtp.send_message(msg)
            else:
                with smtplib.SMTP(smtp_server, smtp_port) as smtp:
                    smtp.starttls()
                    smtp.login(smtp_email, smtp_password)
                    smtp.send_message(msg)
            
            logger.info(f"Email sent successfully to {to_email}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to send email to {to_email}: {str(e)}")
            return False
