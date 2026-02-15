from fastapi import APIRouter, HTTPException, Header, UploadFile, File
from core.firebase import db
from utils.encryption import encryptor
import uuid
import re
import json
import logging
import firebase_admin.auth as auth
from datetime import datetime, timezone
from openai import OpenAI
from core.settings import GROQ_API_KEY

logger = logging.getLogger("users_api")
router = APIRouter(prefix="/api/user", tags=["users"])

# Middleware-like dependency
async def verify_token(authorization: str = Header(None)):
    if not authorization:
        raise HTTPException(status_code=401, detail="No authorization header")
    try:
        token = authorization.split("Bearer ")[1]
        decoded = auth.verify_id_token(token)
        return decoded
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid token")

@router.get("/profile")
async def get_profile(authorization: str = Header(None)):
    user_token = await verify_token(authorization)
    user_id = user_token["uid"]
    
    if not db:
        raise HTTPException(status_code=503, detail="Database unavailable")

    doc = db.collection("users").document(user_id).get()
    if not doc.exists:
        raise HTTPException(status_code=404, detail="User not found")
    
    return doc.to_dict()

@router.post("/setup-smtp")
async def setup_smtp(data: dict, authorization: str = Header(None)):
    user = await verify_token(authorization)
    user_id = user["uid"]

    if not db:
        raise HTTPException(status_code=503, detail="Database unavailable")

    smtp_email = data.get("smtpEmail")
    smtp_password = data.get("smtpPassword")
    
    if not smtp_email or not smtp_password:
        raise HTTPException(status_code=400, detail="Missing fields")

    # Verify SMTP Connection BEFORE Saving
    try:
        from fastapi.concurrency import run_in_threadpool
        import smtplib
        import socket
        
        def test_smtp_connection():
            # Use STARTTLS on port 587 (Railway blocks port 465)
            with smtplib.SMTP('smtp.gmail.com', 587, timeout=10) as server:
                server.ehlo()
                server.starttls()
                server.ehlo()
                server.login(smtp_email, smtp_password)
                
        # Run blocking call in threadpool
        await run_in_threadpool(test_smtp_connection)
        
    except Exception as e:
        logger.warning(f"SMTP Verification Failed: {e}")
        # Improve error message for common issues
        msg = str(e)
        if "Username and Password not accepted" in msg:
            msg = "Invalid Email or App Password. Check credentials."
        elif "timeout" in msg.lower():
            msg = "Connection timed out. Check firewall or internet."
            
        raise HTTPException(status_code=400, detail=f"SMTP Failed: {msg}")

    # Encrypt password
    encrypted_password = encryptor.encrypt(smtp_password)
    
    db.collection("users").document(user_id).set({
        "smtpEmail": smtp_email,
        "smtpPassword": encrypted_password,
        "smtpTested": True,
        "updatedAt": datetime.now(timezone.utc).isoformat()
    }, merge=True)
    
    return {"success": True}

@router.post("/toggle-automation")
async def toggle_automation(data: dict, authorization: str = Header(None)):
    user = await verify_token(authorization)
    user_id = user["uid"]

    if not db:
        raise HTTPException(status_code=503, detail="Database unavailable")

    is_active = data.get("isActive", False)

    db.collection("users").document(user_id).set({
        "isActive": is_active,
        "updatedAt": datetime.now(timezone.utc).isoformat()
    }, merge=True)
    
    return {"success": True, "isActive": is_active}

@router.post("/upload-resume")
async def upload_resume(resume: UploadFile = File(...), authorization: str = Header(None)):
    user = await verify_token(authorization)
    
    if resume.content_type != "application/pdf":
        raise HTTPException(status_code=400, detail="Only PDF files allowed")

    from pypdf import PdfReader
    from io import BytesIO
    from firebase_admin import storage

    # Read file content
    content = await resume.read()

    # Validate file size (5MB max)
    if len(content) > 5 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="File too large. Maximum size is 5MB.")

    try:
        # 1. Parse content for text + skills + links
        # Extraction order: Mistral OCR → pymupdf → pypdf
        text = ""

        # 1a. Try Mistral OCR (best quality, handles image-based PDFs)
        try:
            from services.ocr_service import extract_text_with_ocr
            text = extract_text_with_ocr(content)
            if text.strip():
                logger.info(f"Resume text extracted via Mistral OCR ({len(text)} chars)")
        except Exception as ocr_err:
            logger.warning(f"Mistral OCR failed during upload: {ocr_err}")

        # 1b. Try pymupdf (fitz) — handles more formats than pypdf
        if not text.strip():
            try:
                import fitz
                doc = fitz.open(stream=content, filetype="pdf")
                fitz_text = ""
                for page in doc:
                    fitz_text += page.get_text() or ""
                doc.close()
                if fitz_text.strip():
                    text = fitz_text
                    logger.info(f"Resume text extracted via pymupdf ({len(text)} chars)")
            except Exception as fitz_err:
                logger.warning(f"pymupdf extraction failed during upload: {fitz_err}")

        # 1c. Fallback to pypdf
        if not text.strip():
            try:
                reader = PdfReader(BytesIO(content))
                for page in reader.pages:
                    text += page.extract_text() or ""
                if text.strip():
                    logger.info(f"Resume text extracted via pypdf ({len(text)} chars)")
            except Exception as pypdf_err:
                logger.warning(f"pypdf extraction failed during upload: {pypdf_err}")

        if not text.strip():
            logger.warning(f"All text extraction methods returned empty for user {user['uid']}")

        # Extract links using AI for accuracy (catches obfuscated/formatted links)
        extracted_links = _extract_links_from_resume(text)
        found_skills = _extract_skills_ai(text)

    except Exception as e:
        logger.error(f"Error parsing resume: {e}")
        found_skills = ["general"]
        extracted_links = {}

    # 2. Upload to Firebase Storage
    resume_url = ""
    storage_error = None
    try:
        bucket = storage.bucket()
        blob_path = f"resumes/{user['uid']}/resume.pdf"
        blob = bucket.blob(blob_path)
        blob.upload_from_string(content, content_type="application/pdf")
        resume_url = f"gs://{bucket.name}/{blob_path}"
        logger.info(f"Resume uploaded to Firebase Storage: {resume_url}")
    except Exception as e:
        storage_error = str(e)
        logger.error(f"Firebase Storage upload failed (bucket may not be enabled): {e}")
        import base64
        # Firestore document limit is ~1MB. Base64 adds ~33% overhead.
        # Only use Firestore fallback for files under 700KB to stay safe.
        if len(content) > 700 * 1024:
            logger.warning(f"File too large for Firestore fallback ({len(content)} bytes). Skipping fallback.")
            # Still save metadata without file content — user can re-upload later
            resume_url = ""
        else:
            resume_url = f"firestore://{user['uid']}/resume"
            try:
                if db:
                    db.collection("resumes").document(user['uid']).set({
                        "content": base64.b64encode(content).decode('utf-8'),
                        "filename": "resume.pdf",
                        "content_type": "application/pdf",
                        "size": len(content)
                    })
                    logger.info(f"Resume saved to Firestore fallback: {resume_url}")
            except Exception as fb_err:
                logger.error(f"Firestore fallback also failed: {fb_err}")
                resume_url = ""

    if not resume_url and storage_error:
        raise HTTPException(
            status_code=500,
            detail="Resume storage is temporarily unavailable. Please try again in a few minutes."
        )

    # 3. Save resumeUrl + extracted links + metadata to user document
    user_update = {
        "resumeUrl": resume_url,
        "resumeMetadata": {
            "filename": resume.filename,
            "size": len(content),
            "uploadedAt": datetime.now(timezone.utc).isoformat()
        }
    } if resume_url else {}

    if extracted_links:
        user_update["extractedLinks"] = extracted_links

    # Clear old resume override and edits from previous resume.
    # Use DELETE_FIELD to fully remove stale data (not just set to null).
    if resume_url:
        from google.cloud import firestore as firestore_client
        user_update["resumeTextOverride"] = firestore_client.DELETE_FIELD
        user_update["resumeTextUpdatedAt"] = firestore_client.DELETE_FIELD

    if user_update and db:
        # This write is CRITICAL — if it fails, the old resumeTextOverride
        # persists and analysis will use the OLD resume text.
        try:
            db.collection("users").document(user['uid']).update(user_update)
        except Exception as e:
            logger.critical(f"Failed to update user document after resume upload: {e}")
            raise HTTPException(
                status_code=500,
                detail="Resume file was saved but profile update failed. Please try uploading again."
            )

        # Invalidate old analysis cache so next visit gets fresh analysis
        try:
            db.collection("resume_analyses").document(user['uid']).delete()
        except Exception as e:
            logger.warning(f"Failed to delete analysis cache: {e}")

        # Clear old section edits (they belong to the previous resume)
        try:
            db.collection("resume_edits").document(user['uid']).delete()
        except Exception as e:
            logger.warning(f"Failed to delete section edits: {e}")

    return {
        "success": True,
        "resumeUrl": resume_url,
        "extracted_skills": found_skills or ["general"],
        "extracted_links": extracted_links,
        "metadata": user_update.get("resumeMetadata")
    }


@router.post("/delete-resume")
async def delete_resume(authorization: str = Header(None)):
    user = await verify_token(authorization)
    user_id = user["uid"]
    
    from firebase_admin import storage
    
    # 1. Try to delete from Cloud Storage
    try:
        bucket = storage.bucket()
        blob_path = f"resumes/{user_id}/resume.pdf"
        blob = bucket.blob(blob_path)
        if blob.exists():
            blob.delete()
            logger.info(f"Deleted resume blob: {blob_path}")
    except Exception as e:
        logger.warning(f"Error deleting from storage (could be ignored if file missing): {e}")

    # 1b. Also delete from Firestore fallback storage (resumes collection)
    if db:
        try:
            resume_doc = db.collection("resumes").document(user_id).get()
            if resume_doc.exists:
                db.collection("resumes").document(user_id).delete()
                logger.info(f"Deleted Firestore fallback resume for user: {user_id}")
        except Exception as e:
            logger.warning(f"Error deleting Firestore fallback resume: {e}")

    # 2. Clear fields in Firestore
    if db:
        try:
            from google.cloud import firestore

            ref = db.collection("users").document(user_id)
            ref.update({
                "resumeUrl": firestore.DELETE_FIELD,
                "resumeMetadata": firestore.DELETE_FIELD,
                "resumeTextOverride": firestore.DELETE_FIELD,
            })
        except Exception as e:
            logger.error(f"Error updating firestore on delete: {e}")
            raise HTTPException(status_code=500, detail="Failed to update database")

        # Invalidate analysis cache
        try:
            db.collection("resume_analyses").document(user_id).delete()
        except Exception:
            pass

        # Clear section edits
        try:
            db.collection("resume_edits").document(user_id).delete()
        except Exception:
            pass

    return {"success": True}


def _extract_links_from_resume(text: str) -> dict:
    """
    Extract portfolio/github/linkedin links from resume text.
    Uses regex first, then AI as fallback for obfuscated links.
    Returns dict like: {"github": "https://...", "portfolio": "https://..."}
    """
    links = {}

    # Regex: catch URLs with protocol prefix
    url_pattern = r'https?://[^\s,)>\]\"\']+|www\.[^\s,)>\]\"\']+'
    found_urls = re.findall(url_pattern, text, re.IGNORECASE)

    # Also catch bare domain URLs (no https:// prefix) — common in OCR output
    # Matches: linkedin.com/in/..., github.com/..., bhargavcodes.com, etc.
    bare_url_pattern = r'(?:linkedin\.com/in/[^\s,)>\]\"\']+|github\.com/[^\s,)>\]\"\']+|[a-zA-Z0-9][\w-]*\.(?:com|dev|io|me|tech|design|net|org|app)(?:/[^\s,)>\]\"\']*)?)'
    bare_urls = re.findall(bare_url_pattern, text, re.IGNORECASE)
    # Deduplicate: only add bare URLs not already covered by prefixed URLs
    prefixed_set = {u.lower().rstrip(".") for u in found_urls}
    for bu in bare_urls:
        bu_clean = bu.rstrip(".")
        # Skip if already found via the prefixed pattern
        if not any(bu_clean.lower() in p for p in prefixed_set):
            found_urls.append(bu_clean)

    for url in found_urls:
        url_lower = url.lower().rstrip(".")
        if "github.com" in url_lower and "github" not in links:
            clean = url.rstrip(".")
            links["github"] = clean if clean.startswith("http") else f"https://{clean}"
        elif "linkedin.com" in url_lower and "linkedin" not in links:
            clean = url.rstrip(".")
            links["linkedin"] = clean if clean.startswith("http") else f"https://{clean}"
        elif any(domain in url_lower for domain in [
            "vercel.app", "netlify.app", "herokuapp.com", "pages.dev",
            "github.io", "portfolio", "behance.net", "dribbble.com",
            ".dev", ".design", ".me", ".tech"
        ]) and "portfolio" not in links:
            clean = url.rstrip(".")
            links["portfolio"] = clean if clean.startswith("http") else f"https://{clean}"
        # NOTE: Don't blindly assign unknown URLs as portfolio — the AI analysis
        # contactInfo will correctly identify the real portfolio link.

    # If regex found nothing, try AI extraction
    if not links:
        try:
            client = OpenAI(
                api_key=GROQ_API_KEY,
                base_url="https://api.groq.com/openai/v1"
            )
            response = client.chat.completions.create(
                model="openai/gpt-oss-120b",
                messages=[
                    {
                        "role": "system",
                        "content": (
                            "Extract portfolio, github, and linkedin URLs from this resume text. "
                            "Return ONLY valid JSON: {\"github\": \"url or null\", \"portfolio\": \"url or null\", \"linkedin\": \"url or null\"}. "
                            "If no links found, return {\"github\": null, \"portfolio\": null, \"linkedin\": null}."
                        )
                    },
                    {"role": "user", "content": text[:3000]}
                ],
                temperature=0.0,
                max_tokens=150,
                response_format={"type": "json_object"}
            )
            result = json.loads(response.choices[0].message.content)
            if result.get("github"):
                links["github"] = result["github"]
            if result.get("portfolio"):
                links["portfolio"] = result["portfolio"]
            if result.get("linkedin"):
                links["linkedin"] = result["linkedin"]
        except Exception as e:
            logger.warning(f"AI link extraction failed: {e}")

    return links


def _extract_skills_ai(text: str) -> list:
    """Extract skills from resume text using AI for better accuracy."""
    try:
        client = OpenAI(
            api_key=GROQ_API_KEY,
            base_url="https://api.groq.com/openai/v1"
        )
        response = client.chat.completions.create(
            model="openai/gpt-oss-120b",
            messages=[
                {
                    "role": "system",
                    "content": (
                        "Extract the top technical skills from this resume. "
                        "Return ONLY a JSON array of skill strings, max 15 skills. "
                        "Example: [\"React\", \"Python\", \"AWS\", \"Docker\"]. "
                        "Focus on programming languages, frameworks, tools, and platforms."
                    )
                },
                {"role": "user", "content": text[:4000]}
            ],
            temperature=0.0,
            max_tokens=200,
            response_format={"type": "json_object"}
        )
        result = json.loads(response.choices[0].message.content)
        # Handle both {"skills": [...]} and [...] formats
        if isinstance(result, list):
            return result[:15]
        if isinstance(result, dict):
            for v in result.values():
                if isinstance(v, list):
                    return v[:15]
        return ["general"]
    except Exception as e:
        logger.warning(f"AI skill extraction failed: {e}")
        # Fallback to basic keyword matching
        keywords = ["python", "react", "javascript", "node.js", "aws", "docker",
                     "sql", "java", "typescript", "go", "rust", "kubernetes",
                     "mongodb", "postgresql", "redis", "git"]
        return [k for k in keywords if k.lower() in text.lower()] or ["general"]


@router.post("/save-links")
async def save_links(data: dict, authorization: str = Header(None)):
    """Save user's portfolio/github links (from onboarding step)."""
    user = await verify_token(authorization)
    user_id = user["uid"]

    if not db:
        raise HTTPException(status_code=503, detail="Database unavailable")

    github = data.get("github", "").strip()
    portfolio = data.get("portfolio", "").strip()

    links = {}
    if github:
        links["github"] = github
    if portfolio:
        links["portfolio"] = portfolio

    if not links:
        raise HTTPException(status_code=400, detail="At least one link is required")

    db.collection("users").document(user_id).set({
        "extractedLinks": links,
        "updatedAt": datetime.now(timezone.utc).isoformat()
    }, merge=True)

    return {"success": True, "links": links}
