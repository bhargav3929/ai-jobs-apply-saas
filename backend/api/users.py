from fastapi import APIRouter, HTTPException, Header, UploadFile, File
from core.firebase import db
from utils.encryption import encryptor
import uuid
import re
import json
import firebase_admin.auth as auth
from datetime import datetime
from openai import OpenAI
from core.settings import GROQ_API_KEY

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
        print(f"SMTP Verification Failed: {e}")
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
        "updatedAt": datetime.now().isoformat()
    }, merge=True)
    
    return {"success": True}

@router.post("/toggle-automation")
async def toggle_automation(data: dict, authorization: str = Header(None)):
    user = await verify_token(authorization)
    user_id = user["uid"]
    
    is_active = data.get("isActive", False)
    
    db.collection("users").document(user_id).set({
        "isActive": is_active,
        "updatedAt": datetime.now().isoformat()
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
        reader = PdfReader(BytesIO(content))
        text = ""
        for page in reader.pages:
            text += page.extract_text()

        # Extract links using AI for accuracy (catches obfuscated/formatted links)
        extracted_links = _extract_links_from_resume(text)
        found_skills = _extract_skills_ai(text)

    except Exception as e:
        print(f"Error parsing resume: {e}")
        found_skills = ["general"]
        extracted_links = {}

    # 2. Upload to Firebase Storage
    resume_url = ""
    try:
        bucket = storage.bucket()
        blob_path = f"resumes/{user['uid']}/resume.pdf"
        blob = bucket.blob(blob_path)
        blob.upload_from_string(content, content_type="application/pdf")
        resume_url = f"gs://{bucket.name}/{blob_path}"
        print(f"Resume uploaded to Firebase Storage: {resume_url}")
    except Exception as e:
        print(f"Firebase Storage upload failed (bucket may not be enabled): {e}")
        import base64
        resume_url = f"firestore://{user['uid']}/resume"
        try:
            if db:
                db.collection("resumes").document(user['uid']).set({
                    "content": base64.b64encode(content).decode('utf-8'),
                    "filename": "resume.pdf",
                    "content_type": "application/pdf",
                    "size": len(content)
                })
                print(f"Resume saved to Firestore fallback: {resume_url}")
        except Exception as fb_err:
            print(f"Firestore fallback also failed: {fb_err}")

    # 3. Save resumeUrl + extracted links + metadata to user document
    user_update = {
        "resumeUrl": resume_url,
        "resumeMetadata": {
            "filename": resume.filename,
            "size": len(content),
            "uploadedAt": datetime.now().isoformat()
        }
    } if resume_url else {}
    
    if extracted_links:
        user_update["extractedLinks"] = extracted_links
        
    if user_update and db:
        try:
            db.collection("users").document(user['uid']).set(user_update, merge=True)
        except Exception as e:
            print(f"Failed to update user document: {e}")

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
            print(f"Deleted resume blob: {blob_path}")
    except Exception as e:
        print(f"Error deleting from storage (could be ignored if file missing): {e}")

    # 1b. Also delete from Firestore fallback storage (resumes collection)
    if db:
        try:
            resume_doc = db.collection("resumes").document(user_id).get()
            if resume_doc.exists:
                db.collection("resumes").document(user_id).delete()
                print(f"Deleted Firestore fallback resume for user: {user_id}")
        except Exception as e:
            print(f"Error deleting Firestore fallback resume: {e}")

    # 2. Clear fields in Firestore
    if db:
        try:
            # We use FieldValue.delete() to remove specific fields
            # But firebase-admin-python uses update({field: firestore.DELETE_FIELD})
            from google.cloud import firestore
            
            ref = db.collection("users").document(user_id)
            ref.update({
                "resumeUrl": firestore.DELETE_FIELD,
                "resumeMetadata": firestore.DELETE_FIELD
                # We KEEP extractedLinks and extractedSkills as the user might want to keep the profile data
            })
        except Exception as e:
            print(f"Error updating firestore on delete: {e}")
            raise HTTPException(status_code=500, detail="Failed to update database")
            
    return {"success": True}


def _extract_links_from_resume(text: str) -> dict:
    """
    Extract portfolio/github/linkedin links from resume text.
    Uses regex first, then AI as fallback for obfuscated links.
    Returns dict like: {"github": "https://...", "portfolio": "https://..."}
    """
    links = {}

    # Regex: catch common URL patterns
    url_pattern = r'https?://[^\s,)>\]\"\']+|www\.[^\s,)>\]\"\']+'
    found_urls = re.findall(url_pattern, text, re.IGNORECASE)

    for url in found_urls:
        url_lower = url.lower()
        if "github.com" in url_lower and "github" not in links:
            links["github"] = url.rstrip(".")
        elif "linkedin.com" in url_lower:
            pass  # Skip linkedin, not needed for emails
        elif any(domain in url_lower for domain in [
            "vercel.app", "netlify.app", "herokuapp.com", "pages.dev",
            "github.io", "portfolio", "behance.net", "dribbble.com",
            ".dev", ".design", ".me", ".io", ".tech"
        ]) and "portfolio" not in links:
            links["portfolio"] = url.rstrip(".")
        elif "portfolio" not in links and "github" not in links:
            # Could be a personal site
            links["portfolio"] = url.rstrip(".")

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
                            "Extract portfolio and github URLs from this resume text. "
                            "Return ONLY valid JSON: {\"github\": \"url or null\", \"portfolio\": \"url or null\"}. "
                            "Do NOT include LinkedIn URLs. If no links found, return {\"github\": null, \"portfolio\": null}."
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
        except Exception as e:
            print(f"AI link extraction failed: {e}")

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
        print(f"AI skill extraction failed: {e}")
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
        "updatedAt": datetime.now().isoformat()
    }, merge=True)

    return {"success": True, "links": links}
