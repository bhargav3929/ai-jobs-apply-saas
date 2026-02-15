"""
Generate a clean, ATS-friendly resume PDF from structured section data.

Uses fpdf2 — a lightweight pure-Python PDF generator.
The output deliberately avoids tables, columns, and graphics so it
passes every ATS parser cleanly.
"""

import logging
import re
from io import BytesIO
from fpdf import FPDF

logger = logging.getLogger("pdf_generator")

# Layout constants (all in mm)
PAGE_W = 210  # A4 width
MARGIN_LEFT = 18
MARGIN_RIGHT = 18
MARGIN_TOP = 16
CONTENT_W = PAGE_W - MARGIN_LEFT - MARGIN_RIGHT

# Colour palette (RGB)
CLR_NAME = (30, 30, 30)
CLR_CONTACT = (90, 90, 90)
CLR_HEADING = (45, 45, 45)
CLR_BODY = (50, 50, 50)
CLR_RULE = (180, 180, 180)

# Typography constants
NAME_SIZE = 18
CONTACT_SIZE = 8.5
HEADING_SIZE = 10.5
BODY_SIZE = 10
RULE_WIDTH = 0.25
SEPARATOR = "  |  "


class _ResumePDF(FPDF):
    """Thin wrapper to set margins and disable auto headers/footers."""

    def header(self):
        pass  # no header

    def footer(self):
        pass  # no footer


def generate_resume_pdf(
    candidate_name: str,
    sections: dict,
    contact_info: dict | str = "",
) -> bytes:
    """Return PDF bytes for the optimized resume.

    Parameters
    ----------
    candidate_name : str
        Displayed prominently at the top.
    sections : dict
        Mapping of section_key -> {"displayName": str, "content": str}.
        Order is preserved (Python 3.7+ dict ordering).
    contact_info : dict | str, optional
        Either a dict with keys like email/phone/location/linkedin/github/portfolio,
        or a string (legacy) that will be rendered line-by-line.
    """
    pdf = _ResumePDF(orientation="P", unit="mm", format="A4")
    pdf.set_auto_page_break(auto=True, margin=16)
    pdf.set_margins(MARGIN_LEFT, MARGIN_TOP, MARGIN_RIGHT)
    pdf.add_page()

    _render_header(pdf, candidate_name, contact_info)

    # ── Sections ────────────────────────────────────────────────────
    for key, sec in sections.items():
        display_name = sec.get("displayName", key.replace("_", " ").title())
        content = sec.get("content", "").strip()
        if not content:
            continue

        _render_section(pdf, display_name, content)

    # ── Serialize ───────────────────────────────────────────────────
    buf = BytesIO()
    pdf.output(buf)
    pdf_bytes = buf.getvalue()
    logger.info(f"Generated resume PDF: {len(pdf_bytes)} bytes, {pdf.page} page(s)")
    return pdf_bytes


# ────────────────────────────────────────────────────────────────────
# Header rendering
# ────────────────────────────────────────────────────────────────────

def _render_header(pdf: _ResumePDF, candidate_name: str, contact_info: dict | str):
    """Render candidate name + contact rows with smart line-breaking."""
    # ── Candidate Name ──────────────────────────────────────────────
    pdf.set_font("Helvetica", "B", NAME_SIZE)
    pdf.set_text_color(*CLR_NAME)
    pdf.cell(CONTENT_W, 9, _safe_text(candidate_name.strip()), align="C",
             new_x="LMARGIN", new_y="NEXT")

    # ── Contact rows ────────────────────────────────────────────────
    if not contact_info:
        pdf.ln(3)
        return

    pdf.set_font("Helvetica", "", CONTACT_SIZE)
    pdf.set_text_color(*CLR_CONTACT)
    max_width = CONTENT_W - 4  # small safety margin

    if isinstance(contact_info, dict):
        rows = _build_contact_rows(contact_info, pdf, max_width)
    else:
        # Legacy string path: split on newlines, wrap any overlong lines
        rows = []
        for line in str(contact_info).strip().split("\n"):
            line = line.strip()
            if line:
                rows.append(_safe_text(line))

    for row in rows:
        # If a single row still exceeds width, use multi_cell for wrapping
        row_width = pdf.get_string_width(row)
        if row_width > max_width:
            pdf.set_x(MARGIN_LEFT)
            pdf.multi_cell(CONTENT_W, 4, row, align="C")
        else:
            pdf.cell(CONTENT_W, 4.5, row, align="C",
                     new_x="LMARGIN", new_y="NEXT")

    pdf.ln(3)


def _build_contact_rows(contact: dict, pdf: _ResumePDF, max_width: float) -> list[str]:
    """Build width-aware contact rows from structured contact info.

    Groups fields by priority, measures each group, and splits rows
    that exceed the available width.
    """
    # Gather non-empty values in priority order
    essentials: list[str] = []
    links: list[str] = []

    for key in ("email", "phone", "location"):
        val = contact.get(key)
        if val and str(val).strip():
            essentials.append(str(val).strip())

    for key in ("linkedin", "github", "portfolio"):
        val = contact.get(key)
        if val and str(val).strip():
            links.append(str(val).strip())

    if not essentials and not links:
        return []

    # Try to fit each group on one row; split if too wide
    rows: list[str] = []
    for group in (essentials, links):
        if not group:
            continue
        rows.extend(_split_group_to_rows(group, pdf, max_width))

    return rows


def _split_group_to_rows(
    items: list[str], pdf: _ResumePDF, max_width: float
) -> list[str]:
    """Join items with ' | ' separator; split into multiple rows if needed."""
    sep = SEPARATOR
    # Try all on one line first
    full = sep.join(items)
    if pdf.get_string_width(_safe_text(full)) <= max_width:
        return [_safe_text(full)]

    # Greedily pack items into rows
    rows: list[str] = []
    current: list[str] = []
    for item in items:
        candidate = sep.join(current + [item])
        if current and pdf.get_string_width(_safe_text(candidate)) > max_width:
            rows.append(_safe_text(sep.join(current)))
            current = [item]
        else:
            current.append(item)
    if current:
        rows.append(_safe_text(sep.join(current)))
    return rows


# ────────────────────────────────────────────────────────────────────
# Section rendering
# ────────────────────────────────────────────────────────────────────

def _render_section(pdf: _ResumePDF, heading: str, content: str):
    """Render a single resume section with heading rule + body text."""
    # Heading
    pdf.set_font("Helvetica", "B", HEADING_SIZE)
    pdf.set_text_color(*CLR_HEADING)
    pdf.cell(CONTENT_W, 7, heading.upper(), new_x="LMARGIN", new_y="NEXT")

    # Thin rule below heading
    y = pdf.get_y()
    pdf.set_draw_color(*CLR_RULE)
    pdf.set_line_width(RULE_WIDTH)
    pdf.line(MARGIN_LEFT, y, PAGE_W - MARGIN_RIGHT, y)
    pdf.ln(2)

    # Body text
    pdf.set_font("Helvetica", "", BODY_SIZE)
    pdf.set_text_color(*CLR_BODY)

    bullet_indent = 4   # mm indent for bullet marker
    bullet_w = 3        # mm width of the bullet character cell
    wrap_w = CONTENT_W - bullet_indent - bullet_w  # text area for bullet lines

    for line in content.split("\n"):
        stripped = line.strip()
        if not stripped:
            pdf.ln(2)
            continue

        # Detect sub-bullets (indented bullets: "  - " or "  * " etc.)
        is_sub_bullet = bool(re.match(r'^\s{2,}[\-\*\u2022]\s', line))
        # Detect top-level bullets (-, *, •)
        is_bullet = bool(re.match(r'^[\-\*\u2022]\s', stripped))

        if is_sub_bullet or is_bullet:
            bullet_text = re.sub(r'^[\-\*\u2022]\s*', '', stripped)
            indent = bullet_indent + 4 if is_sub_bullet else bullet_indent
            text_w = CONTENT_W - indent - bullet_w

            pdf.set_x(MARGIN_LEFT + indent)
            pdf.cell(bullet_w, 5, "-")
            # multi_cell wraps, but we need wrapped lines to stay indented
            x_after_bullet = MARGIN_LEFT + indent + bullet_w
            _indented_multi_cell(pdf, text_w, 5, _safe_text(bullet_text), x_after_bullet)
        else:
            pdf.set_x(MARGIN_LEFT)
            pdf.multi_cell(CONTENT_W, 5, _safe_text(stripped))

    pdf.ln(4)


def _indented_multi_cell(
    pdf: _ResumePDF, w: float, h: float, text: str, indent_x: float
):
    """Render multi_cell text where wrapped continuation lines stay indented.

    FPDF's multi_cell resets X to the left margin on each new line.
    This wrapper detects line breaks and re-sets X before each continuation.
    """
    # Split text into words and manually wrap
    words = text.split(" ")
    current_line = ""
    for word in words:
        test = f"{current_line} {word}".strip()
        if pdf.get_string_width(test) > w and current_line:
            # Flush current line
            pdf.set_x(indent_x)
            pdf.cell(w, h, current_line, new_x="LMARGIN", new_y="NEXT")
            current_line = word
        else:
            current_line = test
    # Flush last line
    if current_line:
        pdf.set_x(indent_x)
        pdf.cell(w, h, current_line, new_x="LMARGIN", new_y="NEXT")


# ────────────────────────────────────────────────────────────────────
# Text sanitization
# ────────────────────────────────────────────────────────────────────

def _safe_text(text: str) -> str:
    """Sanitise text for FPDF (latin-1 safe subset)."""
    replacements = {
        "\u2013": "-",   # en-dash
        "\u2012": "-",   # figure dash
        "\u2014": "--",  # em-dash
        "\u2015": "--",  # horizontal bar
        "\u2018": "'",   # left single quote
        "\u2019": "'",   # right single quote
        "\u201c": '"',   # left double quote
        "\u201d": '"',   # right double quote
        "\u2026": "...", # ellipsis
        "\u00a0": " ",   # non-breaking space
        "\u2022": "-",   # bullet
        "\u00b7": "-",   # middle dot
        "\u25cf": "-",   # black circle
        "\u25cb": "-",   # white circle
        "\u25aa": "-",   # black small square
        "\u25ab": "-",   # white small square
        "\u2023": "-",   # triangular bullet
        "\u2043": "-",   # hyphen bullet
        "\u2219": "-",   # bullet operator
        "\u00e9": "e",   # é
        "\u00e8": "e",   # è
        "\u00ea": "e",   # ê
        "\u00f1": "n",   # ñ
        "\u00fc": "u",   # ü
        "\u00e0": "a",   # à
        "\u00e1": "a",   # á
        "\u00e2": "a",   # â
        "\u00f6": "o",   # ö
        "\u00e7": "c",   # ç
        "\u2011": "-",   # non-breaking hyphen
        "\u200b": "",    # zero-width space
        "\u200c": "",    # zero-width non-joiner
        "\u200d": "",    # zero-width joiner
        "\ufeff": "",    # BOM / zero-width no-break space
    }
    for orig, repl in replacements.items():
        text = text.replace(orig, repl)
    # Final safety: encode to latin-1, replacing anything left
    return text.encode("latin-1", errors="replace").decode("latin-1")
