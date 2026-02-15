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


class _ResumePDF(FPDF):
    """Thin wrapper to set margins and disable auto headers/footers."""

    def header(self):
        pass  # no header

    def footer(self):
        pass  # no footer


def generate_resume_pdf(
    candidate_name: str,
    sections: dict,
    contact_info: str = "",
) -> bytes:
    """Return PDF bytes for the optimized resume.

    Parameters
    ----------
    candidate_name : str
        Displayed prominently at the top.
    sections : dict
        Mapping of section_key -> {"displayName": str, "content": str}.
        Order is preserved (Python 3.7+ dict ordering).
    contact_info : str, optional
        One-liner like "email@example.com  |  +1-234-567-8900  |  City, ST"
    """
    pdf = _ResumePDF(orientation="P", unit="mm", format="A4")
    pdf.set_auto_page_break(auto=True, margin=16)
    pdf.set_margins(MARGIN_LEFT, MARGIN_TOP, MARGIN_RIGHT)
    pdf.add_page()

    # ── Candidate Name ──────────────────────────────────────────────
    pdf.set_font("Helvetica", "B", 20)
    pdf.set_text_color(*CLR_NAME)
    pdf.cell(CONTENT_W, 10, candidate_name.strip(), align="C", new_x="LMARGIN", new_y="NEXT")

    # ── Contact line (optional) ─────────────────────────────────────
    if contact_info and contact_info.strip():
        pdf.set_font("Helvetica", "", 9)
        pdf.set_text_color(*CLR_CONTACT)
        pdf.cell(CONTENT_W, 5, contact_info.strip(), align="C", new_x="LMARGIN", new_y="NEXT")

    pdf.ln(3)

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
# Internal helpers
# ────────────────────────────────────────────────────────────────────

def _render_section(pdf: _ResumePDF, heading: str, content: str):
    """Render a single resume section with heading rule + body text."""
    # Heading
    pdf.set_font("Helvetica", "B", 11)
    pdf.set_text_color(*CLR_HEADING)
    pdf.cell(CONTENT_W, 7, heading.upper(), new_x="LMARGIN", new_y="NEXT")

    # Thin rule below heading
    y = pdf.get_y()
    pdf.set_draw_color(*CLR_RULE)
    pdf.set_line_width(0.3)
    pdf.line(MARGIN_LEFT, y, PAGE_W - MARGIN_RIGHT, y)
    pdf.ln(2)

    # Body text
    pdf.set_font("Helvetica", "", 10)
    pdf.set_text_color(*CLR_BODY)

    for line in content.split("\n"):
        stripped = line.strip()
        if not stripped:
            pdf.ln(2)
            continue

        # Detect bullet lines (-, *, •)
        is_bullet = bool(re.match(r'^[\-\*\u2022]\s', stripped))
        if is_bullet:
            # Indent bullet text
            bullet_text = re.sub(r'^[\-\*\u2022]\s*', '', stripped)
            pdf.set_x(MARGIN_LEFT + 4)
            pdf.set_font("Helvetica", "", 10)
            pdf.cell(4, 5, "-")
            pdf.multi_cell(CONTENT_W - 8, 5, _safe_text(bullet_text))
        else:
            pdf.set_x(MARGIN_LEFT)
            pdf.multi_cell(CONTENT_W, 5, _safe_text(stripped))

    pdf.ln(3)


def _safe_text(text: str) -> str:
    """Sanitise text for FPDF (latin-1 safe subset)."""
    # FPDF's built-in fonts only support latin-1; replace unsupported chars
    replacements = {
        "\u2013": "-",   # en-dash
        "\u2014": "--",  # em-dash
        "\u2018": "'",   # left single quote
        "\u2019": "'",   # right single quote
        "\u201c": '"',   # left double quote
        "\u201d": '"',   # right double quote
        "\u2026": "...", # ellipsis
        "\u00a0": " ",   # non-breaking space
        "\u2022": "-",   # bullet (fallback for multi_cell)
        "\u00b7": "-",   # middle dot
    }
    for orig, repl in replacements.items():
        text = text.replace(orig, repl)
    # Final safety: encode to latin-1, replacing anything left
    return text.encode("latin-1", errors="replace").decode("latin-1")
