from fastapi import APIRouter, HTTPException, Header
from fastapi.responses import StreamingResponse
from io import BytesIO
from core.firebase import db
from api.users import verify_token
from services.resume_analyzer import ResumeAnalyzer
from datetime import datetime, timezone, timedelta
import logging
import re

logger = logging.getLogger("resume_api")
router = APIRouter(prefix="/api/resume", tags=["resume"])

analyzer = ResumeAnalyzer()


def _download_resume_bytes(user_id: str, resume_url: str) -> bytes:
    """Download the raw PDF bytes from storage."""
    if resume_url.startswith("gs://"):
        from firebase_admin import storage
        bucket = storage.bucket()
        blob_path = f"resumes/{user_id}/resume.pdf"
        blob = bucket.blob(blob_path)
        return blob.download_as_bytes()
    elif resume_url.startswith("firestore://"):
        import base64
        doc = db.collection("resumes").document(user_id).get()
        if not doc.exists:
            raise HTTPException(status_code=404, detail="Resume file not found in storage")
        return base64.b64decode(doc.to_dict()["content"])
    else:
        raise HTTPException(status_code=404, detail="Invalid resume URL format")


def _get_resume_text(user_id: str, resume_url: str, pdf_bytes: bytes | None = None) -> str:
    """Extract text from the user's resume PDF.

    Extraction order (best quality first):
      1. Mistral OCR — handles image-based PDFs, complex layouts (has retry logic)
      2. pymupdf (fitz) — handles more PDF types than pypdf
      3. pypdf — last resort, basic text-layer extraction

    Args:
        user_id: Firebase user ID (for logging).
        resume_url: Storage URL of the resume.
        pdf_bytes: Optional pre-downloaded PDF bytes to avoid double download.

    Returns:
        Extracted resume text.

    Raises:
        HTTPException: If no method could extract any text.
    """
    content = pdf_bytes or _download_resume_bytes(user_id, resume_url)
    ocr_attempted = False

    # 1. Try Mistral OCR first (handles image-based PDFs, complex layouts)
    try:
        from services.ocr_service import extract_text_with_ocr
        text = extract_text_with_ocr(content)
        ocr_attempted = True  # Only true if the API call was actually made
        if text.strip():
            logger.info(f"Using Mistral OCR text for user {user_id} ({len(text)} chars)")
            return text
        logger.warning(f"Mistral OCR returned empty text for user {user_id}")
    except ValueError:
        # API key not configured — OCR was not actually attempted
        logger.warning(f"OCR not available for user {user_id}: API key not configured")
    except Exception as e:
        ocr_attempted = True  # OCR was attempted but failed
        logger.warning(f"Mistral OCR failed for user {user_id}: {e}")

    # 2. Try pymupdf (fitz) — handles more formats than pypdf
    try:
        import fitz
        doc = fitz.open(stream=content, filetype="pdf")
        text = ""
        for page in doc:
            text += page.get_text() or ""
        doc.close()
        if text.strip():
            logger.info(f"Using pymupdf text for user {user_id} ({len(text)} chars)")
            return text
        logger.warning(f"pymupdf returned empty text for user {user_id}")
    except Exception as e:
        logger.warning(f"pymupdf extraction failed for user {user_id}: {e}")

    # 3. Fallback to pypdf
    try:
        from pypdf import PdfReader
        reader = PdfReader(BytesIO(content))
        text = ""
        for page in reader.pages:
            text += page.extract_text() or ""
        if text.strip():
            logger.info(f"Using pypdf text for user {user_id} ({len(text)} chars)")
            return text
    except Exception as e:
        logger.warning(f"pypdf extraction failed for user {user_id}: {e}")

    # All methods failed
    if ocr_attempted:
        detail = ("Could not extract text from PDF. OCR was attempted but failed. "
                   "The file may be corrupted or in an unsupported format.")
    else:
        detail = ("Could not extract text from PDF. The file may be image-based "
                   "and the OCR service is currently unavailable. Please try again later.")
    raise HTTPException(status_code=422, detail=detail)


@router.get("/analyze")
async def analyze_resume(authorization: str = Header(None), force: bool = False):
    """Comprehensive AI-powered resume analysis with caching."""
    user_token = await verify_token(authorization)
    user_id = user_token["uid"]

    if not db:
        raise HTTPException(status_code=503, detail="Database unavailable")

    # Load user document
    user_doc = db.collection("users").document(user_id).get()
    if not user_doc.exists:
        raise HTTPException(status_code=404, detail="User not found")

    user_data = user_doc.to_dict()
    resume_url = user_data.get("resumeUrl")
    if not resume_url:
        raise HTTPException(status_code=404, detail="No resume uploaded. Please upload a resume first.")

    job_category = user_data.get("jobCategory", "Software Developer")
    metadata = user_data.get("resumeMetadata", {})
    extracted_links = user_data.get("extractedLinks", {})

    # Check cache (skip if force=True)
    now = datetime.now(timezone.utc)
    if not force:
        try:
            cache_doc = db.collection("resume_analyses").document(user_id).get()
            if cache_doc.exists:
                cached = cache_doc.to_dict()
                cached_until = cached.get("cachedUntil", "")
                if cached_until and datetime.fromisoformat(cached_until) > now:
                    logger.info(f"Returning cached analysis for user {user_id}")
                    return cached
        except Exception as e:
            logger.warning(f"Cache check failed: {e}")

    # Download PDF bytes — always needed for structure extraction
    pdf_bytes = _download_resume_bytes(user_id, resume_url)

    # Use text override for AI scoring if present, otherwise extract text from PDF
    resume_text_override = user_data.get("resumeTextOverride")
    if resume_text_override and resume_text_override.strip():
        resume_text = resume_text_override
        logger.info(f"Using resumeTextOverride for user {user_id}")
    else:
        resume_text = _get_resume_text(user_id, resume_url, pdf_bytes=pdf_bytes)

    # ── NEW: Try structure-first pipeline (PyMuPDF extraction + scoring-only AI) ──
    # Always attempt structure extraction from the original PDF, even if
    # resumeTextOverride exists — the PDF is the source of truth for structure.
    structure = None
    analysis = None
    contact_info = {}

    if pdf_bytes:
        try:
            from services.pdf_structure_extractor import extract_pdf_structure
            structure = extract_pdf_structure(pdf_bytes)
            if structure and structure.get("sections"):
                logger.info(
                    f"Structure extraction succeeded for user {user_id}: "
                    f"{len(structure['sections'])} sections"
                )

                # Use scoring-only AI analysis (preserves exact structure)
                analysis = analyzer.score_sections(
                    sections=structure["sections"],
                    contact_info=structure["contactInfo"],
                    job_category=job_category,
                )

                # Preserve original header and section order from structure
                analysis["originalHeader"] = structure["originalHeader"]
                analysis["originalSectionOrder"] = structure["originalSectionOrder"]
                analysis["contactInfo"] = structure["contactInfo"]
                analysis["extractionMethod"] = "pymupdf_structure"

                contact_info = structure["contactInfo"]
                logger.info(f"Structure-first pipeline complete for user {user_id}")
        except Exception as e:
            logger.warning(f"Structure extraction failed, falling back to text analysis: {e}")
            structure = None
            analysis = None

    # ── FALLBACK: Use existing text-based pipeline if structure extraction didn't work ──
    if analysis is None:
        # AI-based contact extraction (vision or text)
        ai_contact = None
        try:
            if not pdf_bytes:
                pdf_bytes = _download_resume_bytes(user_id, resume_url)
            from services.ocr_service import extract_contact_with_vision
            ai_contact = extract_contact_with_vision(pdf_bytes)
            if ai_contact:
                logger.info(f"Vision contact extraction succeeded for user {user_id}")
        except Exception as e:
            logger.warning(f"Vision contact extraction failed: {e}")

        if not ai_contact:
            try:
                from services.ocr_service import extract_contact_with_ai
                ai_contact = extract_contact_with_ai(resume_text)
                if ai_contact:
                    logger.info(f"AI text contact extraction succeeded for user {user_id}")
            except Exception as e:
                logger.warning(f"AI text contact extraction failed: {e}")

        # Run full AI analysis (text-based)
        analysis = analyzer.analyze(resume_text, job_category)
        analysis["extractionMethod"] = "text_analysis"

        # Merge contact info: AI extraction > analysis contactInfo
        contact_info = analysis.get("contactInfo", {})
        if ai_contact:
            for field in ("name", "email", "phone", "location", "linkedin", "github"):
                ai_val = ai_contact.get(field)
                if ai_val:
                    contact_info[field] = ai_val
            ai_portfolio = ai_contact.get("portfolio")
            if ai_portfolio:
                contact_info["portfolio"] = ai_portfolio
            else:
                analysis_portfolio = contact_info.get("portfolio")
                if analysis_portfolio:
                    logger.info(f"Clearing suspicious portfolio URL from analysis: {analysis_portfolio}")
                    other = contact_info.get("otherLinks", [])
                    if analysis_portfolio not in other:
                        other.append(analysis_portfolio)
                    contact_info["otherLinks"] = other[:5]
                    contact_info["portfolio"] = None
            ai_others = ai_contact.get("otherLinks", [])
            existing_others = contact_info.get("otherLinks", [])
            merged_others = list({*existing_others, *ai_others})
            contact_info["otherLinks"] = merged_others[:5]

        analysis["contactInfo"] = contact_info

    logger.info(f"Final contact: name={contact_info.get('name')}, email={contact_info.get('email')}, "
                 f"phone={contact_info.get('phone')}, linkedin={contact_info.get('linkedin')}, "
                 f"github={contact_info.get('github')}, portfolio={contact_info.get('portfolio')}, "
                 f"method={analysis.get('extractionMethod')}")

    # ── Clean up false ATS issues now that we have real contact info ──
    if contact_info.get("email") or contact_info.get("phone") or contact_info.get("name"):
        false_positive_keywords = [
            "missing contact", "no contact", "contact information",
            "missing email", "no email", "email address",
            "missing phone", "no phone", "phone number",
            "missing candidate", "candidate name", "missing name",
            "missing location", "no location",
            "linkedin", "github", "profile url",
        ]
        analysis["atsIssues"] = [
            issue for issue in analysis.get("atsIssues", [])
            if not any(kw in issue.lower() for kw in false_positive_keywords)
        ]
        analysis["criticalImprovements"] = [
            imp for imp in analysis.get("criticalImprovements", [])
            if not any(kw in imp.lower() for kw in false_positive_keywords)
        ]
        ats = analysis.get("atsScore", 50)
        ats_boost = (15 if contact_info.get("email") else 0) + (10 if contact_info.get("phone") else 0)
        analysis["atsScore"] = min(100, ats + ats_boost)

    # Determine candidate name — AI extraction > user_data
    candidate_name = user_data.get("name", "")
    if contact_info.get("name"):
        candidate_name = contact_info["name"]

    # Merge all detected links with stored extractedLinks
    merged_links = {**extracted_links}
    if contact_info.get("github"):
        merged_links["github"] = contact_info["github"]
    if contact_info.get("linkedin"):
        merged_links["linkedin"] = contact_info["linkedin"]
    if contact_info.get("portfolio"):
        merged_links["portfolio"] = contact_info["portfolio"]

    # Build response
    cached_until = (now + timedelta(hours=1)).isoformat()
    response_data = {
        "analysis": analysis,
        "resumeText": resume_text[:10000],
        "candidateName": candidate_name,
        "contactInfo": contact_info,
        "metadata": {
            **metadata,
            "analyzedAt": now.isoformat(),
            "cachedUntil": cached_until,
        },
        "extractedLinks": merged_links,
        "jobCategory": job_category,
        "cachedUntil": cached_until,
    }

    # Cache the result
    try:
        db.collection("resume_analyses").document(user_id).set(response_data)
        logger.info(f"Cached analysis for user {user_id}")
    except Exception as e:
        logger.warning(f"Failed to cache analysis: {e}")

    return response_data


@router.post("/update-section")
async def update_section(data: dict, authorization: str = Header(None)):
    """Update or AI-enhance a specific resume section."""
    user_token = await verify_token(authorization)
    user_id = user_token["uid"]

    section = data.get("section")
    content = data.get("content", "")
    action = data.get("action", "replace")

    if not section:
        raise HTTPException(status_code=400, detail="Section name is required")

    if not content.strip():
        raise HTTPException(status_code=400, detail="Content cannot be empty")

    if action == "enhance":
        # Get user's job category for context
        user_doc = db.collection("users").document(user_id).get()
        job_category = user_doc.to_dict().get("jobCategory", "Software Developer") if user_doc.exists else "Software Developer"

        enhanced = analyzer.enhance_section(section, content, job_category)
        return {"success": True, "section": section, "updatedContent": enhanced, "action": "enhanced"}

    elif action == "replace":
        # Store the section override
        db.collection("resume_edits").document(user_id).set(
            {section: content, "updatedAt": datetime.now(timezone.utc).isoformat()},
            merge=True
        )

        # NOTE: Do NOT delete analysis cache here — regenerate_text needs
        # the cached analysis structure to properly rebuild the full resume
        # with edits substituted. Cache is invalidated by regenerate_text.

        return {"success": True, "section": section, "updatedContent": content, "action": "replaced"}

    else:
        raise HTTPException(status_code=400, detail="Action must be 'replace' or 'enhance'")


@router.post("/regenerate-text")
async def regenerate_text(authorization: str = Header(None)):
    """Combine original resume text with section edits, save as resumeTextOverride,
    and generate an updated PDF that replaces the original in Storage.

    Uses the cached analysis structure (which has the correct section names
    and displayNames) to reconstruct the full resume text with edits applied.
    This is far more reliable than regex-matching section headers.
    """
    user_token = await verify_token(authorization)
    user_id = user_token["uid"]

    user_doc = db.collection("users").document(user_id).get()
    if not user_doc.exists:
        raise HTTPException(status_code=404, detail="User not found")

    user_data = user_doc.to_dict()
    resume_url = user_data.get("resumeUrl")
    if not resume_url:
        raise HTTPException(status_code=404, detail="No resume uploaded")

    # Get section edits
    edits_doc = db.collection("resume_edits").document(user_id).get()
    edits = edits_doc.to_dict() if edits_doc.exists else {}
    edits.pop("updatedAt", None)

    if not edits:
        db.collection("users").document(user_id).set(
            {"resumeTextOverride": None, "updatedAt": datetime.now(timezone.utc).isoformat()},
            merge=True
        )
        return {"success": True, "message": "No edits to apply"}

    # Strategy: Use the cached analysis to rebuild the full text.
    # The analysis has each section's displayName and original content,
    # so we can reconstruct the resume with edits substituted in.
    combined_text = None
    final_sections = None  # Keep structured sections for PDF generation
    cached_contact_info = {}  # Contact info from cached analysis for PDF header
    cached_original_header = None  # Original header from structure extraction
    try:
        cache_doc = db.collection("resume_analyses").document(user_id).get()
        if cache_doc.exists:
            cached = cache_doc.to_dict()
            cached_contact_info = cached.get("contactInfo", {})
            cached_original_header = cached.get("analysis", {}).get("originalHeader")
            sections = cached.get("analysis", {}).get("sections", {})
            # Use originalSectionOrder to preserve the candidate's intended order
            # (Firestore maps don't guarantee key order)
            section_order = cached.get("analysis", {}).get("originalSectionOrder", list(sections.keys()))
            if sections:
                parts = []
                built_sections = {}
                for key in section_order:
                    sec = sections.get(key)
                    if not sec:
                        continue
                    display_name = sec.get("displayName", key.replace("_", " ").title())
                    # Use edited content if available, otherwise keep original
                    content = edits.get(key, sec.get("content", ""))
                    if content.strip():
                        parts.append(f"{display_name}\n{content}")
                        built_sections[key] = {
                            "displayName": display_name,
                            "content": content,
                        }
                if parts:
                    combined_text = "\n\n".join(parts)
                    final_sections = built_sections
                    logger.info(f"Rebuilt resume from {len(parts)} analysis sections for user {user_id}")
    except Exception as e:
        logger.warning(f"Could not use analysis cache for regeneration: {e}")

    # Fallback: if no cached analysis, use original text with best-effort replacement
    if not combined_text:
        original_text = _get_resume_text(user_id, resume_url)
        combined_text = original_text
        for section_name, section_content in edits.items():
            # Convert key back to probable heading: "professional_experience" → "Professional Experience"
            heading = section_name.replace("_", " ")
            # Try case-insensitive match for the heading followed by content
            pattern = re.compile(
                rf"^([ \t]*{re.escape(heading)}[ \t:]*)\n(.*?)(?=\n[ \t]*[A-Z][A-Za-z ]+[ \t:]*\n|\Z)",
                re.MULTILINE | re.DOTALL | re.IGNORECASE
            )
            match = pattern.search(combined_text)
            if match:
                replacement = f"{match.group(1)}\n{section_content}"
                combined_text = combined_text[:match.start()] + replacement + combined_text[match.end():]
            else:
                combined_text += f"\n\n{heading.upper()}\n{section_content}"
        logger.info(f"Rebuilt resume from original text + edits for user {user_id}")

    # Save text override to user document
    now = datetime.now(timezone.utc)
    db.collection("users").document(user_id).set(
        {
            "resumeTextOverride": combined_text[:15000],
            "resumeTextUpdatedAt": now.isoformat(),
            "updatedAt": now.isoformat(),
        },
        merge=True
    )

    # ── Generate optimized PDF and upload to Storage ────────────────
    pdf_updated = False
    try:
        from services.pdf_generator import generate_resume_pdf

        candidate_name = user_data.get("name", "")
        # Prefer AI-detected name from cached analysis (most reliable)
        if cached_contact_info.get("name"):
            candidate_name = cached_contact_info["name"]
        elif not candidate_name:
            # Fall back to regex-based extraction
            try:
                from services.ocr_service import extract_candidate_name
                candidate_name = extract_candidate_name(combined_text) or "Resume"
            except Exception:
                candidate_name = "Resume"

        # Build structured contact info dict for the PDF generator
        links = user_data.get("extractedLinks", {})
        contact_info_for_pdf = {
            "email": cached_contact_info.get("email") or user_data.get("email"),
            "phone": cached_contact_info.get("phone"),
            "location": cached_contact_info.get("location"),
            "linkedin": cached_contact_info.get("linkedin") or links.get("linkedin"),
            "github": cached_contact_info.get("github") or links.get("github"),
            "portfolio": cached_contact_info.get("portfolio") or links.get("portfolio"),
        }

        # Use structured sections if available, otherwise build from text
        if not final_sections:
            final_sections = {"resume_content": {"displayName": "Resume", "content": combined_text}}

        pdf_bytes = generate_resume_pdf(
            candidate_name=candidate_name,
            sections=final_sections,
            contact_info=contact_info_for_pdf,
        )

        # Upload to Firebase Storage (same path → overwrites original)
        if resume_url.startswith("gs://"):
            from firebase_admin import storage
            bucket = storage.bucket()
            blob_path = f"resumes/{user_id}/resume.pdf"
            blob = bucket.blob(blob_path)
            blob.upload_from_string(pdf_bytes, content_type="application/pdf")
            logger.info(f"Optimized PDF uploaded to Storage for user {user_id} ({len(pdf_bytes)} bytes)")
            pdf_updated = True
        elif resume_url.startswith("firestore://"):
            import base64
            db.collection("resumes").document(user_id).set({
                "content": base64.b64encode(pdf_bytes).decode("utf-8"),
                "filename": "resume.pdf",
                "content_type": "application/pdf",
                "size": len(pdf_bytes),
            })
            logger.info(f"Optimized PDF saved to Firestore fallback for user {user_id} ({len(pdf_bytes)} bytes)")
            pdf_updated = True

        # Update metadata so the UI reflects the new PDF
        if pdf_updated:
            db.collection("users").document(user_id).set(
                {
                    "resumeMetadata": {
                        "filename": "resume_optimized.pdf",
                        "size": len(pdf_bytes),
                        "uploadedAt": now.isoformat(),
                    }
                },
                merge=True,
            )

    except Exception as e:
        # PDF generation is best-effort — the text override is already saved,
        # so emails still use the optimized content in the prompt.
        logger.warning(f"PDF generation/upload failed (non-critical): {e}")

    # Invalidate analysis cache so next analyze call gets fresh scores
    try:
        db.collection("resume_analyses").document(user_id).delete()
    except Exception:
        pass

    logger.info(f"Resume text override saved for user {user_id} (length={len(combined_text)}, pdf_updated={pdf_updated})")
    msg = "Resume updated and PDF regenerated." if pdf_updated else "Resume text updated. PDF regeneration skipped."
    return {"success": True, "message": msg, "pdfUpdated": pdf_updated}


@router.get("/download-pdf")
async def download_pdf(authorization: str = Header(None)):
    """Generate the optimized resume as a downloadable PDF.

    Uses the cached analysis sections + any edits to build the PDF.
    Falls back to the stored PDF in Storage if no analysis is cached.
    """
    user_token = await verify_token(authorization)
    user_id = user_token["uid"]

    user_doc = db.collection("users").document(user_id).get()
    if not user_doc.exists:
        raise HTTPException(status_code=404, detail="User not found")

    user_data = user_doc.to_dict()
    resume_url = user_data.get("resumeUrl")
    if not resume_url:
        raise HTTPException(status_code=404, detail="No resume uploaded")

    # Try to build PDF from cached analysis (matches regenerate_text logic)
    final_sections = None
    cached_contact_info = {}
    cached_original_header = None
    try:
        cache_doc = db.collection("resume_analyses").document(user_id).get()
        if cache_doc.exists:
            cached = cache_doc.to_dict()
            cached_contact_info = cached.get("contactInfo", {})
            cached_original_header = cached.get("analysis", {}).get("originalHeader")
            sections = cached.get("analysis", {}).get("sections", {})

            # Apply any pending edits
            edits_doc = db.collection("resume_edits").document(user_id).get()
            edits = edits_doc.to_dict() if edits_doc.exists else {}
            edits.pop("updatedAt", None)

            # Use originalSectionOrder to preserve the candidate's intended order
            section_order = cached.get("analysis", {}).get("originalSectionOrder", list(sections.keys()))
            if sections:
                built = {}
                for key in section_order:
                    sec = sections.get(key)
                    if not sec:
                        continue
                    display_name = sec.get("displayName", key.replace("_", " ").title())
                    content = edits.get(key, sec.get("content", ""))
                    if content.strip():
                        built[key] = {"displayName": display_name, "content": content}
                if built:
                    final_sections = built
    except Exception as e:
        logger.warning(f"Could not load analysis cache for PDF download: {e}")

    if not final_sections:
        # No cached analysis — serve the stored PDF file directly
        try:
            pdf_bytes = _download_resume_bytes(user_id, resume_url)
            return StreamingResponse(
                BytesIO(pdf_bytes),
                media_type="application/pdf",
                headers={"Content-Disposition": "attachment; filename=resume.pdf"},
            )
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Could not retrieve resume: {e}")

    # Build candidate name
    candidate_name = cached_contact_info.get("name") or user_data.get("name", "Resume")

    # Build structured contact info dict for the PDF generator
    links = user_data.get("extractedLinks", {})
    contact_info_for_pdf = {
        "email": cached_contact_info.get("email") or user_data.get("email"),
        "phone": cached_contact_info.get("phone"),
        "location": cached_contact_info.get("location"),
        "linkedin": cached_contact_info.get("linkedin") or links.get("linkedin"),
        "github": cached_contact_info.get("github") or links.get("github"),
        "portfolio": cached_contact_info.get("portfolio") or links.get("portfolio"),
    }

    # Generate PDF
    from services.pdf_generator import generate_resume_pdf
    pdf_bytes = generate_resume_pdf(
        candidate_name=candidate_name,
        sections=final_sections,
        contact_info=contact_info_for_pdf,
    )

    safe_name = re.sub(r'[^\w\-]', '_', candidate_name)
    filename = f"{safe_name}_Resume.pdf"
    return StreamingResponse(
        BytesIO(pdf_bytes),
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
