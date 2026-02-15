import base64
import json
import logging
import re
import time
import requests
from openai import OpenAI
from core.settings import MISTRAL_API_KEY, GROQ_API_KEY

logger = logging.getLogger("ocr_service")

MISTRAL_OCR_URL = "https://api.mistral.ai/v1/ocr"
MISTRAL_OCR_MAX_RETRIES = 3
MISTRAL_OCR_BASE_DELAY = 1.0  # seconds, doubled on each retry


def _normalize_markdown(text: str) -> str:
    """Post-process Mistral OCR markdown to produce cleaner resume text.

    - Converts markdown headers (# / ## / ###) to uppercase plain-text headings
    - Strips bold/italic markers while keeping the text
    - Normalizes bullet points to consistent format
    - Removes excessive blank lines
    - Preserves the overall reading order and structure
    """
    lines = text.split("\n")
    cleaned = []

    for line in lines:
        stripped = line.strip()

        # Convert markdown headers to plain text section headers
        header_match = re.match(r'^(#{1,4})\s+(.+)$', stripped)
        if header_match:
            heading_text = header_match.group(2)
            # Remove any trailing markdown artifacts
            heading_text = re.sub(r'\s*[#]+\s*$', '', heading_text)
            # Remove bold/italic from heading
            heading_text = re.sub(r'\*{1,3}(.+?)\*{1,3}', r'\1', heading_text)
            cleaned.append(heading_text.upper())
            continue

        # Strip bold markers (**text** or __text__)
        stripped = re.sub(r'\*{2}(.+?)\*{2}', r'\1', stripped)
        stripped = re.sub(r'_{2}(.+?)_{2}', r'\1', stripped)

        # Strip italic markers (*text* or _text_) — careful not to hit bullet points
        stripped = re.sub(r'(?<!\w)\*([^*]+?)\*(?!\w)', r'\1', stripped)

        # Normalize bullet points: -, *, + → •
        stripped = re.sub(r'^[\-\*\+]\s+', '• ', stripped)

        # Remove image references ![...](...) from OCR artifacts
        stripped = re.sub(r'!\[.*?\]\(.*?\)', '', stripped)

        # Remove horizontal rules
        if re.match(r'^[-_*]{3,}\s*$', stripped):
            continue

        cleaned.append(stripped)

    # Collapse runs of 3+ blank lines into 2
    result = "\n".join(cleaned)
    result = re.sub(r'\n{3,}', '\n\n', result)

    return result.strip()


def extract_candidate_name(resume_text: str) -> str | None:
    """Try to extract the candidate's name from the top of the resume text.

    Strategy: The name is typically the first non-empty, non-header line that
    looks like a person's name (2-4 capitalized words, no special characters).
    """
    # Section header keywords — used for substring matching to catch
    # both single-word ("SKILLS") and multi-word ("PROFESSIONAL SUMMARY") headers
    SECTION_KEYWORDS = [
        "summary", "objective", "experience", "education", "skills",
        "contact", "profile", "resume", "projects", "certifications",
        "achievements", "awards", "publications", "volunteer",
        "training", "interests", "hobbies", "references", "technical",
        "competencies", "qualifications", "employment", "work",
        "coursework", "activities", "overview", "introduction",
        "professional", "relevant", "recent", "additional", "core",
        "academic", "career", "personal", "key", "other",
    ]

    def _is_section_header(text: str) -> bool:
        """Check if a line looks like a section header rather than a name.
        Every word in the line must match (or contain) a known section keyword."""
        words = text.lower().split()
        if not words:
            return False
        return all(
            any(kw in word for kw in SECTION_KEYWORDS)
            for word in words
        )

    lines = resume_text.strip().split("\n")

    for line in lines[:10]:  # Look in the first 10 lines (handles scrambled OCR)
        stripped = line.strip()
        if not stripped:
            continue

        # Skip lines that look like contact info
        if "@" in stripped or re.search(r'\d{5,}', stripped):
            continue
        # Skip lines that look like URLs
        if "http" in stripped.lower() or "www." in stripped.lower():
            continue
        # Skip lines that look like addresses (contain numbers)
        if re.search(r'\d+\s+\w+\s+(street|st|ave|road|rd|blvd|lane|dr)\b', stripped, re.I):
            continue
        # Skip lines with labels like "Email:", "Phone:", "LinkedIn:", etc.
        if re.match(r'^(email|phone|linkedin|github|portfolio|address|location)\s*:', stripped, re.I):
            continue
        # Skip section headers (both single-word and multi-word)
        if _is_section_header(stripped):
            continue

        # Name pattern: 2-4 words, primarily letters, possibly with dots or hyphens
        name_match = re.match(r'^[A-Z][a-zA-Z.\'-]+(?:\s+[A-Z][a-zA-Z.\'-]+){1,3}$', stripped)
        if name_match:
            # If all uppercase, title-case for display (e.g. "JOHN SMITH" → "John Smith")
            if stripped == stripped.upper():
                return stripped.title()
            return stripped

        # Also match ALL CAPS names (common in resumes, e.g. "BHARGAV K")
        caps_match = re.match(r'^[A-Z][A-Z.\'\- ]+$', stripped)
        if caps_match and 4 < len(stripped) < 50:
            # Reject if it looks like a section header
            if _is_section_header(stripped):
                continue
            # Title-case it for display
            return stripped.title()

    return None


def extract_text_with_ocr(pdf_bytes: bytes) -> str:
    """Extract text from a PDF using Mistral OCR API (vision-based).

    Retries up to MISTRAL_OCR_MAX_RETRIES times with exponential backoff
    on transient errors (5xx, timeouts, rate limits).

    Args:
        pdf_bytes: Raw PDF file content.

    Returns:
        Cleaned text with normalized formatting.

    Raises:
        ValueError: If the API key is not configured.
        Exception: If OCR fails after all retries.
    """
    if not MISTRAL_API_KEY:
        raise ValueError("MISTRAL_API_KEY not configured")

    b64_content = base64.b64encode(pdf_bytes).decode("utf-8")
    data_url = f"data:application/pdf;base64,{b64_content}"

    payload = {
        "model": "mistral-ocr-latest",
        "document": {
            "type": "document_url",
            "document_url": data_url
        },
    }

    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {MISTRAL_API_KEY}"
    }

    last_error: Exception | None = None
    for attempt in range(1, MISTRAL_OCR_MAX_RETRIES + 1):
        try:
            logger.info(f"Calling Mistral OCR API attempt {attempt}/{MISTRAL_OCR_MAX_RETRIES} "
                        f"(pdf size={len(pdf_bytes)} bytes)")
            response = requests.post(
                MISTRAL_OCR_URL, json=payload, headers=headers, timeout=90
            )

            # Non-retryable client errors (4xx except 429)
            if 400 <= response.status_code < 500 and response.status_code != 429:
                error_detail = response.text[:500]
                logger.error(f"Mistral OCR client error: HTTP {response.status_code} - {error_detail}")
                raise Exception(f"Mistral OCR API error: HTTP {response.status_code}")

            # Retryable: 429 (rate limit) or 5xx (server error)
            if response.status_code == 429 or response.status_code >= 500:
                error_detail = response.text[:300]
                logger.warning(f"Mistral OCR retryable error on attempt {attempt}: "
                               f"HTTP {response.status_code} - {error_detail}")
                last_error = Exception(f"Mistral OCR API error: HTTP {response.status_code}")
                if attempt < MISTRAL_OCR_MAX_RETRIES:
                    delay = MISTRAL_OCR_BASE_DELAY * (2 ** (attempt - 1))
                    logger.info(f"Retrying Mistral OCR in {delay:.1f}s...")
                    time.sleep(delay)
                    continue
                raise last_error

            # Success
            result = response.json()
            pages = result.get("pages", [])

            if not pages:
                raise Exception("Mistral OCR returned no pages")

            raw_text = "\n\n".join(page.get("markdown", "") for page in pages)
            logger.info(f"Mistral OCR raw: {len(raw_text)} chars from {len(pages)} pages")

            cleaned_text = _normalize_markdown(raw_text)

            name = extract_candidate_name(cleaned_text)
            if name:
                logger.info(f"Detected candidate name: {name}")

            logger.info(f"Mistral OCR cleaned: {len(cleaned_text)} chars")
            return cleaned_text

        except requests.exceptions.Timeout:
            last_error = Exception("Mistral OCR API timed out after 90s")
            logger.warning(f"Mistral OCR timeout on attempt {attempt}/{MISTRAL_OCR_MAX_RETRIES}")
            if attempt < MISTRAL_OCR_MAX_RETRIES:
                delay = MISTRAL_OCR_BASE_DELAY * (2 ** (attempt - 1))
                logger.info(f"Retrying Mistral OCR in {delay:.1f}s...")
                time.sleep(delay)
                continue

        except requests.exceptions.ConnectionError as e:
            last_error = Exception(f"Mistral OCR connection error: {e}")
            logger.warning(f"Mistral OCR connection error on attempt {attempt}: {e}")
            if attempt < MISTRAL_OCR_MAX_RETRIES:
                delay = MISTRAL_OCR_BASE_DELAY * (2 ** (attempt - 1))
                logger.info(f"Retrying Mistral OCR in {delay:.1f}s...")
                time.sleep(delay)
                continue

        except Exception:
            # Non-retryable errors (client 4xx, parse errors, etc.) — re-raise immediately
            raise

    # All retries exhausted
    raise last_error or Exception("Mistral OCR failed after all retries")


def _validate_portfolio_url(contact: dict) -> dict:
    """Check if the portfolio URL is likely a project URL rather than a personal site.

    If the portfolio domain doesn't relate to the candidate's name and looks
    like a product/project, moves it to otherLinks and sets portfolio to null.
    """
    portfolio = contact.get("portfolio")
    if not portfolio:
        return contact

    name = (contact.get("name") or "").lower().strip()
    if not name:
        return contact

    try:
        from urllib.parse import urlparse
        parsed = urlparse(portfolio)
        domain = parsed.netloc.lower().replace("www.", "")
        # Strip TLD for comparison (e.g., "johndoe.com" -> "johndoe")
        domain_base = domain.rsplit(".", 1)[0] if "." in domain else domain
    except Exception:
        return contact

    # Known personal portfolio hosting platforms — always valid as portfolio
    personal_platforms = [
        "github.io", "netlify.app", "vercel.app", "pages.dev",
        "about.me", "carrd.co", "wixsite.com", "wordpress.com",
        "squarespace.com", "webflow.io", "dev.to", "hashnode.dev",
    ]
    if any(platform in domain for platform in personal_platforms):
        return contact

    # Check if any part of the candidate's name appears in the domain
    name_parts = [p for p in re.split(r'[\s.\-]+', name) if len(p) >= 3]
    domain_matches_name = any(part in domain_base for part in name_parts)

    if not domain_matches_name:
        # Domain doesn't relate to candidate's name — likely a project URL
        logger.info(f"Portfolio URL '{portfolio}' doesn't match candidate name '{name}' — moving to otherLinks")
        other = contact.get("otherLinks", [])
        if portfolio not in other:
            other.append(portfolio)
        contact["otherLinks"] = other[:5]
        contact["portfolio"] = None

    return contact


def extract_contact_with_vision(pdf_bytes: bytes) -> dict | None:
    """Extract contact info from resume PDF using Groq vision model (Llama 4 Scout).

    Converts the first page to a JPEG image and sends it to the vision model
    with a structured extraction prompt. This is far more accurate than
    text-based extraction because it can see the visual layout of the header.

    Returns a dict with: name, email, phone, location, linkedin, github,
    portfolio, otherLinks — or None if vision extraction fails.
    """
    if not GROQ_API_KEY:
        logger.warning("GROQ_API_KEY not configured, skipping vision extraction")
        return None

    try:
        import fitz  # PyMuPDF
    except ImportError:
        logger.warning("pymupdf not installed, skipping vision extraction")
        return None

    try:
        # Render first page to JPEG
        doc = fitz.open(stream=pdf_bytes, filetype="pdf")
        page = doc[0]
        # 2x zoom for better readability (default 72dpi → 144dpi)
        mat = fitz.Matrix(2.0, 2.0)
        pix = page.get_pixmap(matrix=mat)
        img_bytes = pix.tobytes("jpeg")
        doc.close()

        if len(img_bytes) > 4_000_000:
            # Groq base64 limit is 4MB — retry at lower resolution
            doc = fitz.open(stream=pdf_bytes, filetype="pdf")
            pix = doc[0].get_pixmap()
            img_bytes = pix.tobytes("jpeg")
            doc.close()

        b64_image = base64.b64encode(img_bytes).decode("utf-8")
        logger.info(f"Vision extraction: rendered page 1 to JPEG ({len(img_bytes)} bytes)")

        # Send to Groq Llama 4 Scout vision model
        client = OpenAI(
            api_key=GROQ_API_KEY,
            base_url="https://api.groq.com/openai/v1"
        )

        response = client.chat.completions.create(
            model="meta-llama/llama-4-scout-17b-16e-instruct",
            messages=[
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "text",
                            "text": """Look at this resume image and extract ALL contact information you can see.

Return ONLY valid JSON with this exact structure:
{
  "name": "The candidate's full name exactly as shown",
  "email": "email address or null",
  "phone": "COMPLETE phone number with country code exactly as shown (e.g. +91 7093707113) or null",
  "location": "city, state/country or null",
  "linkedin": "full LinkedIn URL or null",
  "github": "full GitHub URL or null",
  "portfolio": "personal website/portfolio URL or null",
  "otherLinks": ["any other URLs visible in the resume"]
}

IMPORTANT RULES:
- Extract the NAME exactly as displayed (preserve casing)
- PHONE NUMBER (CRITICAL): Extract the COMPLETE phone number INCLUDING the country code prefix (+91, +1, +44, etc.). Do NOT strip the country code. If you see "+91 7093707113", return "+91 7093707113" — NOT just "7093707113".
- LINKEDIN (CRITICAL): Look carefully in the header/contact area for LinkedIn URLs. They often appear as "LinkedIn: linkedin.com/in/username" or just "linkedin.com/in/username". Extract the full URL and add https:// prefix if missing. Return as "https://linkedin.com/in/username".
- GITHUB (CRITICAL): Look carefully in the header/contact area for GitHub URLs. They often appear as "GitHub: github.com/username" or just "github.com/username". Extract the full URL and add https:// prefix if missing. Return as "https://github.com/username".
- For ALL URLs: include the full URL as shown. If no https:// prefix is visible, add it.

PORTFOLIO vs PROJECT URLs (CRITICAL):
- Portfolio/personal website is ONLY found in the HEADER or CONTACT SECTION of the resume (the top area, near name/email/phone)
- URLs that appear INSIDE experience descriptions, project descriptions, or body sections are PROJECT URLs — put them in otherLinks, NOT portfolio
- If a URL appears next to a project name or company name or job title, it is a PROJECT URL, not a portfolio
- Common personal portfolio patterns: firstname.dev, firstnamelastname.com, about.me/name, firstname.github.io
- If a URL domain does NOT relate to the candidate's name and is NOT in the header/contact area, it is a PROJECT URL
- When in doubt, set portfolio to null and put the URL in otherLinks

- Look at the HEADER area carefully — name, email, phone, and links are usually at the top
- Return null for any field you cannot find
- Return ONLY the JSON, no other text"""
                        },
                        {
                            "type": "image_url",
                            "image_url": {
                                "url": f"data:image/jpeg;base64,{b64_image}"
                            }
                        }
                    ]
                }
            ],
            temperature=0.0,
            max_tokens=500,
            response_format={"type": "json_object"}
        )

        raw = response.choices[0].message.content.strip()
        result = json.loads(raw)

        # Normalize: ensure all URL fields have https:// prefix
        for field in ("linkedin", "github", "portfolio"):
            val = result.get(field)
            if val and not val.startswith("http"):
                result[field] = f"https://{val}"

        # Normalize otherLinks
        other = result.get("otherLinks", [])
        if not isinstance(other, list):
            other = []
        result["otherLinks"] = [
            (l if l.startswith("http") else f"https://{l}")
            for l in other[:5] if isinstance(l, str) and l.strip()
        ]

        # Validate portfolio URL — move suspicious project URLs to otherLinks
        result = _validate_portfolio_url(result)

        logger.info(f"Vision extraction result: name={result.get('name')}, "
                     f"email={result.get('email')}, phone={result.get('phone')}, "
                     f"linkedin={result.get('linkedin')}, github={result.get('github')}, "
                     f"portfolio={result.get('portfolio')}")
        return result

    except Exception as e:
        logger.warning(f"Vision-based contact extraction failed: {e}")
        return None


def extract_contact_with_ai(resume_text: str) -> dict | None:
    """Extract contact info from resume text using a focused AI call.

    This is the fallback when vision extraction isn't available (e.g. pymupdf
    not installed). Uses a dedicated Groq call with a laser-focused prompt
    that ONLY extracts contact info — no section analysis, no scoring.

    Returns same dict structure as extract_contact_with_vision, or None.
    """
    if not GROQ_API_KEY:
        return None

    try:
        client = OpenAI(
            api_key=GROQ_API_KEY,
            base_url="https://api.groq.com/openai/v1"
        )

        response = client.chat.completions.create(
            model="meta-llama/llama-4-scout-17b-16e-instruct",
            messages=[
                {
                    "role": "system",
                    "content": """You are a contact information extractor. Your ONLY job is to find contact details in resume text.

The text below was extracted from a PDF using OCR. The extraction may have SCRAMBLED the reading order — contact info that appears in the PDF header might be scattered anywhere in the text. Phone numbers might be split across lines. URLs might lack https:// prefixes.

Search the ENTIRE text thoroughly. Return ONLY valid JSON:
{
  "name": "Full name or null",
  "email": "email@example.com or null",
  "phone": "COMPLETE phone number with country code (e.g. +91 7093707113) or null",
  "location": "city, state/country or null",
  "linkedin": "Full LinkedIn URL (e.g. https://linkedin.com/in/username) or null",
  "github": "Full GitHub URL (e.g. https://github.com/username) or null",
  "portfolio": "personal website URL or null",
  "otherLinks": ["other URLs"]
}

RULES:
- For name: Look for a standalone line with 2-4 capitalized words (often ALL CAPS)
- For email: Look for anything with @ symbol
- PHONE (CRITICAL): Look for digit sequences (7-15 digits, may have +, spaces, hyphens). ALWAYS preserve the international country code prefix (+91, +1, +44, etc.). If you see "+91 7093707113", return "+91 7093707113" — do NOT strip the "+91".
- LINKEDIN (CRITICAL): Search the ENTIRE text for any mention of "linkedin.com/in/". Often appears as "LinkedIn: linkedin.com/in/username" or just the URL. Return the full URL with https:// prefix.
- GITHUB (CRITICAL): Search the ENTIRE text for any mention of "github.com/". Often appears as "GitHub: github.com/username" or just the URL. Return the full URL with https:// prefix.
- For all URLs: Add https:// prefix if missing

PORTFOLIO vs PROJECT URLs (CRITICAL):
- Portfolio URL should appear near the TOP of the text, near name/email/phone — NOT in the middle of a job or project description
- If a URL is surrounded by project description text or appears under a company/project heading, it is a PROJECT URL — put it in otherLinks
- Common personal portfolio patterns: firstname.dev, firstnamelastname.com, about.me/name, firstname.github.io
- If the URL domain does NOT relate to the candidate's name, it is very likely a project URL, not a portfolio
- When in doubt, set portfolio to null and put the URL in otherLinks
- Return null for anything you truly cannot find"""
                },
                {
                    "role": "user",
                    "content": f"Extract ALL contact information from this resume text:\n\n{resume_text[:6000]}"
                }
            ],
            temperature=0.0,
            max_tokens=500,
            response_format={"type": "json_object"}
        )

        raw = response.choices[0].message.content.strip()
        result = json.loads(raw)

        # Normalize URLs
        for field in ("linkedin", "github", "portfolio"):
            val = result.get(field)
            if val and not val.startswith("http"):
                result[field] = f"https://{val}"

        other = result.get("otherLinks", [])
        if not isinstance(other, list):
            other = []
        result["otherLinks"] = [
            (l if l.startswith("http") else f"https://{l}")
            for l in other[:5] if isinstance(l, str) and l.strip()
        ]

        # Validate portfolio URL — move suspicious project URLs to otherLinks
        result = _validate_portfolio_url(result)

        logger.info(f"AI text contact extraction: name={result.get('name')}, "
                     f"email={result.get('email')}, phone={result.get('phone')}, "
                     f"linkedin={result.get('linkedin')}, github={result.get('github')}, "
                     f"portfolio={result.get('portfolio')}")
        return result

    except Exception as e:
        logger.warning(f"AI text contact extraction failed: {e}")
        return None
