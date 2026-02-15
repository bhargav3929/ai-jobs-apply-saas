"""
Deterministic PDF structure extraction using PyMuPDF.

Extracts the exact header, contact information, and sections from a resume PDF
by analysing font metadata (size, weight, flags) — no AI involved.
"""

import logging
import re
from collections import Counter
from typing import Any

import fitz  # PyMuPDF

logger = logging.getLogger("pdf_structure_extractor")

# ── Regex patterns for contact parsing ────────────────────────────────
_EMAIL_RE = re.compile(r"[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}")
_PHONE_RE = re.compile(r"(?<!\d)(\+?\d[\d\s\-().]{6,15}\d)(?!\d)")
# Patterns that look like phone numbers but aren't
_PHONE_FALSE_POSITIVE_RE = re.compile(
    r"^\d{4}\s*[-–]\s*\d{4}$"          # year range: 2019-2023
    r"|^\d{4}\s*[-–]\s*(?:present|current|now)"  # 2020-present
    r"|^\d\.\d{1,2}\s*/\s*\d\.\d$"     # GPA: 3.85/4.0
    r"|\b(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\b",  # dates
    re.IGNORECASE,
)
_LINKEDIN_RE = re.compile(r"(?:https?://)?(?:www\.)?linkedin\.com/in/[\w\-]+/?", re.IGNORECASE)
_GITHUB_RE = re.compile(r"(?:https?://)?(?:www\.)?github\.com/[\w\-]+/?", re.IGNORECASE)
_URL_RE = re.compile(r"https?://[^\s,;|]+", re.IGNORECASE)


def extract_pdf_structure(pdf_bytes: bytes) -> dict:
    """Extract structured representation from a resume PDF using PyMuPDF.

    Analyses font size, weight, and position of every text span to detect
    headings, the header area, and section boundaries without AI.

    Args:
        pdf_bytes: Raw bytes of the PDF file.

    Returns:
        Dictionary with keys: originalHeader, contactInfo, sections,
        originalSectionOrder, extractionMethod, pageCount.

    Raises:
        ValueError: If the PDF cannot be opened or has no text content.
    """
    try:
        doc = fitz.open(stream=pdf_bytes, filetype="pdf")
    except Exception as exc:
        raise ValueError(f"Could not open PDF: {exc}") from exc

    try:
        if doc.page_count == 0:
            raise ValueError("PDF has no pages")

        # Step 1: Collect all spans with metadata across all pages
        all_spans = _collect_spans(doc)
        if not all_spans:
            raise ValueError("PDF contains no extractable text")

        # Step 2: Determine body font size (most common size)
        body_size = _determine_body_size(all_spans)

        # Step 3: Build lines once (used by heading detection, header, and sections)
        all_lines = _build_lines(all_spans)

        # Step 4: Detect section headings
        headings = _detect_headings(all_lines, body_size)

        # Step 5: Identify header area & extract contact info
        original_header, contact_info, header_y = _extract_header(
            all_lines, headings, doc
        )

        # Step 6: Map content between headings into sections
        sections, section_order = _map_sections(all_lines, headings, header_y)

        page_count = doc.page_count
    finally:
        doc.close()

    # Step 7: Handle edge case — no sections detected
    if not sections:
        full_text = "\n".join(s["text"] for s in all_spans if s["text"].strip())
        sections = [
            {
                "key": "resume_content",
                "displayName": "Resume Content",
                "content": full_text,
                "page": 1,
            }
        ]
        section_order = ["resume_content"]

    return {
        "originalHeader": original_header,
        "contactInfo": contact_info,
        "sections": sections,
        "originalSectionOrder": section_order,
        "extractionMethod": "pymupdf_structure",
        "pageCount": page_count,
    }


# ─────────────────────────────────────────────────────────────────────
# Internal helpers
# ─────────────────────────────────────────────────────────────────────

def _collect_spans(doc: fitz.Document) -> list[dict]:
    """Extract every text span from all pages with positional metadata.

    Returns a list sorted by (page, y0, x0) to handle multi-column layouts.
    """
    spans: list[dict] = []
    for page_idx, page in enumerate(doc):
        data = page.get_text("dict")
        for block in data.get("blocks", []):
            if block.get("type") != 0:
                continue  # skip image blocks
            for line in block.get("lines", []):
                line_spans = line.get("spans", [])
                for span in line_spans:
                    text = span.get("text", "")
                    if not text.strip():
                        continue
                    bbox = span.get("bbox", (0, 0, 0, 0))
                    spans.append({
                        "text": text,
                        "font": span.get("font", ""),
                        "size": round(span.get("size", 0), 1),
                        "flags": span.get("flags", 0),
                        "bbox": bbox,
                        "y0": bbox[1],
                        "x0": bbox[0],
                        "page": page_idx,
                        # Pre-compute line-level info
                        "line_bbox": line.get("bbox", bbox),
                    })

    # Sort by page, then y (top→bottom), then x (left→right)
    spans.sort(key=lambda s: (s["page"], s["y0"], s["x0"]))
    return spans


def _determine_body_size(spans: list[dict]) -> float:
    """Return the most common font size, assumed to be body text."""
    size_counter: Counter[float] = Counter()
    for s in spans:
        # Weight by text length so short heading spans don't dominate
        size_counter[s["size"]] += len(s["text"])
    if not size_counter:
        return 10.0
    return size_counter.most_common(1)[0][0]


def _is_bold(span: dict) -> bool:
    """Check if a span is bold via both flag bits and font name."""
    if span["flags"] & 16:
        return True
    font_lower = span["font"].lower()
    if "bold" in font_lower:
        return True
    return False


def _is_heading(span: dict, body_size: float, line_text: str) -> bool:
    """Determine whether a span is a section heading.

    Heading criteria (any of):
    1. Font size >= body_size * 1.2 AND bold AND standalone line
    2. Bold AND ALL_CAPS AND standalone line < 60 chars
    3. Font size >= body_size * 1.2 AND ALL_CAPS AND standalone line < 60 chars
    """
    text = line_text.strip()
    if not text or len(text) > 80:
        return False

    bold = _is_bold(span)
    size = span["size"]
    larger = size >= body_size * 1.2
    # ALL_CAPS: at least 2 alpha chars and all alpha are uppercase
    alpha_chars = [c for c in text if c.isalpha()]
    all_caps = len(alpha_chars) >= 2 and all(c.isupper() for c in alpha_chars)

    # Filter out single-word entries that are likely names/labels in body text
    # unless they are significantly larger
    word_count = len(text.split())

    if larger and bold:
        return True
    if bold and all_caps and len(text) < 60:
        return True
    if larger and all_caps and len(text) < 60 and word_count <= 6:
        return True

    return False


def _build_lines(spans: list[dict]) -> list[dict]:
    """Group consecutive spans on the same line (same page, similar y0).

    Returns a list of line dicts with merged text and the representative span
    (largest/boldest for heading detection).
    """
    if not spans:
        return []

    lines: list[dict] = []
    current_line_spans: list[dict] = [spans[0]]

    for s in spans[1:]:
        prev = current_line_spans[-1]
        # Same line if same page and y-positions within 3pt
        same_line = (
            s["page"] == prev["page"]
            and abs(s["y0"] - prev["y0"]) < 3.0
        )
        if same_line:
            current_line_spans.append(s)
        else:
            lines.append(_merge_line_spans(current_line_spans))
            current_line_spans = [s]

    if current_line_spans:
        lines.append(_merge_line_spans(current_line_spans))

    return lines


def _merge_line_spans(line_spans: list[dict]) -> dict:
    """Merge spans belonging to the same line into a single line dict."""
    text = " ".join(s["text"] for s in line_spans).strip()
    # Use the span with the largest font size as the representative
    rep = max(line_spans, key=lambda s: (s["size"], _is_bold(s)))
    return {
        "text": text,
        "rep_span": rep,
        "page": rep["page"],
        "y0": min(s["y0"] for s in line_spans),
        "x0": min(s["x0"] for s in line_spans),
        "spans": line_spans,
    }


def _is_section_name(text: str) -> bool:
    """Check if text looks like a standard resume section heading.

    Used to distinguish real section headings from the candidate's name
    which may also be large/bold/ALL_CAPS in the header area.
    """
    normalized = text.strip().lower()
    # Common resume section heading keywords
    section_keywords = {
        "summary", "objective", "profile", "experience", "work",
        "education", "skills", "technical", "projects", "project",
        "certifications", "certification", "achievements", "awards",
        "publications", "research", "volunteer", "extracurricular",
        "languages", "interests", "hobbies", "references", "activities",
        "training", "employment", "professional", "academic", "coursework",
        "leadership", "portfolio", "competencies", "expertise",
        "qualifications", "additional", "honors", "affiliations",
        "accomplishments", "highlights", "overview", "areas",
    }
    words = set(re.split(r"[\s&/]+", normalized))
    return bool(words & section_keywords)


def _detect_headings(lines: list[dict], body_size: float) -> list[dict]:
    """Return an ordered list of detected section headings.

    Filters out name-like headings in the header area (page 0, before
    the first real section heading).

    Args:
        lines: Pre-built line dicts from _build_lines().
        body_size: The detected body font size.

    Each heading dict: {text, page, y0, key, displayName}.
    """
    raw_headings: list[dict] = []

    for line in lines:
        text = line["text"].strip()
        if not text:
            continue
        rep = line["rep_span"]
        if _is_heading(rep, body_size, text):
            key = _heading_to_key(text)
            raw_headings.append({
                "text": text,
                "displayName": text,
                "key": key,
                "page": line["page"],
                "y0": line["y0"],
            })

    # Filter: on page 0, headings before the first "real section name"
    # are part of the header (candidate name, subtitle, etc.)
    first_section_idx = None
    for i, h in enumerate(raw_headings):
        if h["page"] == 0 and _is_section_name(h["text"]):
            first_section_idx = i
            break

    if first_section_idx is not None and first_section_idx > 0:
        # Collect header-area heading texts (candidate name, subtitle)
        header_heading_texts = {
            h["text"].strip().lower() for h in raw_headings[:first_section_idx]
        }
        # Drop header-area headings (name, title, etc.)
        raw_headings = raw_headings[first_section_idx:]
    elif first_section_idx is None:
        header_heading_texts = set()
        # No recognized section names found — keep all headings as-is
    else:
        header_heading_texts = set()

    # Filter out candidate name repeated on subsequent pages (common in
    # multi-page resumes where the name appears at the top of each page)
    if header_heading_texts:
        raw_headings = [
            h for h in raw_headings
            if h["text"].strip().lower() not in header_heading_texts
            or _is_section_name(h["text"])
        ]

    return raw_headings


def _heading_to_key(heading_text: str) -> str:
    """Convert a heading string to a snake_case key.

    'TECHNICAL SKILLS' -> 'technical_skills'
    'Education & Achievements' -> 'education_&_achievements'
    """
    key = heading_text.strip().lower()
    # Replace whitespace with underscores
    key = re.sub(r"\s+", "_", key)
    # Remove characters that aren't alphanumeric, underscore, or ampersand
    key = re.sub(r"[^\w&]", "_", key)
    # Collapse multiple underscores
    key = re.sub(r"_+", "_", key)
    key = key.strip("_")
    return key


def _extract_header(
    lines: list[dict],
    headings: list[dict],
    doc: fitz.Document,
) -> tuple[str, dict, float]:
    """Extract the header area (everything above the first heading on page 1).

    Args:
        lines: Pre-built line dicts from _build_lines().
        headings: Detected headings list.
        doc: PyMuPDF Document (for page dimensions).

    Returns:
        (original_header_text, contact_info_dict, first_heading_y)
    """
    # Find first heading on page 0 (first page)
    first_heading_y = None
    for h in headings:
        if h["page"] == 0:
            first_heading_y = h["y0"]
            break

    if first_heading_y is None:
        # No headings on page 1 — use top 20% of page as header estimate
        if doc.page_count > 0:
            page_height = doc[0].rect.height
            first_heading_y = page_height * 0.20
        else:
            first_heading_y = 150.0  # fallback

    # Collect header lines (page 0, above first heading)
    header_lines: list[dict] = []
    for line in lines:
        if line["page"] == 0 and line["y0"] < first_heading_y:
            header_lines.append(line)

    header_text = "\n".join(l["text"] for l in header_lines)
    contact_info = _parse_contact_info(header_text, header_lines)

    return header_text, contact_info, first_heading_y


def _parse_contact_info(header_text: str, header_lines: list[dict]) -> dict:
    """Parse contact information from the header area.

    Args:
        header_text: The concatenated header text.
        header_lines: Line dicts from the header for font-size analysis.

    Returns:
        Contact info dict with name, email, phone, location, linkedin, github,
        portfolio, otherLinks.
    """
    contact: dict[str, Any] = {
        "name": None,
        "email": None,
        "phone": None,
        "location": None,
        "linkedin": None,
        "github": None,
        "portfolio": None,
        "otherLinks": [],
    }

    # Name: largest or boldest text in the header area
    if header_lines:
        name_line = max(
            header_lines,
            key=lambda l: (l["rep_span"]["size"], _is_bold(l["rep_span"])),
        )
        raw_name = name_line["text"].strip()
        # Clean up: remove any email/phone/URL that might be on the same line
        raw_name = _EMAIL_RE.sub("", raw_name)
        raw_name = _PHONE_RE.sub("", raw_name)
        raw_name = _URL_RE.sub("", raw_name)
        raw_name = re.sub(r"[|,]+", " ", raw_name).strip()
        if raw_name and len(raw_name) < 80:
            # Title-case if ALL CAPS
            if raw_name.isupper():
                contact["name"] = raw_name.title()
            else:
                contact["name"] = raw_name

    # Email
    email_match = _EMAIL_RE.search(header_text)
    if email_match:
        contact["email"] = email_match.group()

    # Phone (with false-positive filtering)
    for phone_match in _PHONE_RE.finditer(header_text):
        candidate = phone_match.group(1).strip()
        if not _PHONE_FALSE_POSITIVE_RE.search(candidate):
            # Extra check: must have at least 7 digits
            digit_count = sum(c.isdigit() for c in candidate)
            if digit_count >= 7:
                contact["phone"] = candidate
                break

    # LinkedIn
    linkedin_match = _LINKEDIN_RE.search(header_text)
    if linkedin_match:
        url = linkedin_match.group()
        if not url.startswith("http"):
            url = "https://" + url
        contact["linkedin"] = url

    # GitHub
    github_match = _GITHUB_RE.search(header_text)
    if github_match:
        url = github_match.group()
        if not url.startswith("http"):
            url = "https://" + url
        contact["github"] = url

    # Other URLs (portfolio, etc.)
    all_urls = _URL_RE.findall(header_text)
    known = set()
    if contact["linkedin"]:
        known.add(contact["linkedin"])
    if contact["github"]:
        known.add(contact["github"])

    other_links: list[str] = []
    for url in all_urls:
        url_clean = url.rstrip("/.,;)")
        if url_clean in known:
            continue
        known.add(url_clean)
        # Classify as portfolio if it looks like a personal site
        if not contact["portfolio"] and not any(
            d in url_clean.lower()
            for d in ["linkedin.com", "github.com", "mailto:", "google.com"]
        ):
            contact["portfolio"] = url_clean
        else:
            other_links.append(url_clean)

    contact["otherLinks"] = other_links[:5]

    # Location heuristic: text near separators (|, comma) that isn't
    # email/phone/URL and looks like a city/state
    _extract_location(header_text, contact)

    return contact


def _extract_location(header_text: str, contact: dict) -> None:
    """Try to identify a location string from the header text."""
    # Remove known contact items from text
    text = header_text
    if contact.get("email"):
        text = text.replace(contact["email"], "")
    if contact.get("phone"):
        text = text.replace(contact["phone"], "")
    if contact.get("linkedin"):
        text = text.replace(contact["linkedin"], "")
    if contact.get("github"):
        text = text.replace(contact["github"], "")
    if contact.get("name"):
        text = text.replace(contact["name"], "")
        # Also remove ALL CAPS version
        text = text.replace(contact["name"].upper(), "")

    # Split on common separators and look for location-like fragments
    fragments = re.split(r"[|\n]+", text)

    # Skip fragments that contain common non-location resume words
    skip_words = {
        "engineer", "developer", "manager", "analyst", "designer",
        "software", "senior", "junior", "experience", "years",
        "built", "led", "team", "skills", "summary", "objective",
    }

    # Try "City, State/Country" patterns first (highest confidence)
    city_state_re = re.compile(r"\b[A-Z][\w\s]+,\s*[A-Z][\w\s]+\b")
    country_re = re.compile(
        r"\b(?:India|USA|UK|Canada|Australia|Germany|France|Singapore|Dubai|"
        r"Hyderabad|Bangalore|Chennai|Mumbai|Delhi|Pune|Kolkata|"
        r"New York|San Francisco|London|Berlin|Toronto|Seattle|Austin|"
        r"Boston|Chicago|Los Angeles|Remote)\b",
        re.IGNORECASE,
    )

    for frag in fragments:
        frag = frag.strip()
        if not frag or len(frag) < 3 or len(frag) > 60:
            continue
        if "@" in frag or "http" in frag.lower() or "www." in frag.lower():
            continue
        digit_ratio = sum(c.isdigit() for c in frag) / max(len(frag), 1)
        if digit_ratio > 0.4:
            continue
        frag_lower = frag.lower()
        if any(w in frag_lower for w in skip_words):
            continue

        # Try city, state pattern first
        match = city_state_re.search(frag)
        if match:
            contact["location"] = match.group().strip()
            return
        # Then try known city/country names
        match = country_re.search(frag)
        if match:
            contact["location"] = frag.strip()
            return


def _map_sections(
    lines: list[dict],
    headings: list[dict],
    header_y: float,
) -> tuple[list[dict], list[str]]:
    """Map content between headings into sections.

    Args:
        lines: Pre-built line dicts from _build_lines().
        headings: Detected heading list with page/y0.
        header_y: The y-coordinate boundary of the header on page 0.

    Returns:
        (sections_list, section_order) where each section has key, displayName,
        content, and page.
    """
    if not headings:
        return [], []

    sections: list[dict] = []
    section_order: list[str] = []
    used_keys: set[str] = set()

    for i, heading in enumerate(headings):
        # Determine content boundaries
        h_page = heading["page"]
        h_y = heading["y0"]

        # Next heading boundary (or end of document)
        if i + 1 < len(headings):
            next_h = headings[i + 1]
            end_page = next_h["page"]
            end_y = next_h["y0"]
        else:
            end_page = float("inf")
            end_y = float("inf")

        # Collect lines between this heading and the next
        content_lines: list[str] = []
        for line in lines:
            lp = line["page"]
            ly = line["y0"]

            # Skip lines before this heading
            if lp < h_page:
                continue
            if lp == h_page and ly <= h_y + 2:
                continue

            # Skip header area on page 0
            if lp == 0 and ly < header_y:
                continue

            # Stop at next heading
            if lp > end_page:
                break
            if lp == end_page and ly >= end_y - 1:
                break

            text = line["text"].strip()
            if text:
                content_lines.append(text)

        content = "\n".join(content_lines)
        key = heading["key"]

        # Deduplicate keys (e.g., two sections named "PROJECTS")
        original_key = key
        counter = 2
        while key in used_keys:
            key = f"{original_key}_{counter}"
            counter += 1
        used_keys.add(key)

        sections.append({
            "key": key,
            "displayName": heading["displayName"],
            "content": content,
            "page": h_page + 1,  # 1-indexed for display
        })
        section_order.append(key)

    return sections, section_order
