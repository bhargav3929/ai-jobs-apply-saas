"""Tests for the PyMuPDF PDF structure extractor.

Creates test PDFs with known structure using fpdf2, then verifies
that extract_pdf_structure() correctly identifies headers, sections,
contact info, and section order.
"""

import pytest
from fpdf import FPDF
from services.pdf_structure_extractor import extract_pdf_structure


# ── Helpers ──────────────────────────────────────────────────────────


def _build_resume_pdf(
    *,
    name: str = "JOHN DOE",
    contact_line: str = "johndoe@email.com | +91 9876543210 | linkedin.com/in/johndoe | github.com/johndoe | Hyderabad, India",
    sections: list[tuple[str, str]] | None = None,
    name_size: float = 22,
    heading_size: float = 14,
    body_size: float = 10,
    name_bold: bool = True,
    heading_bold: bool = True,
) -> bytes:
    """Create a simple one-page resume PDF with the given structure.

    Args:
        name: Candidate name rendered at the top.
        contact_line: Contact info line below the name.
        sections: List of (HEADING, body_text) tuples.
        name_size / heading_size / body_size: Font sizes.
        name_bold / heading_bold: Whether to bold name/headings.

    Returns:
        PDF bytes.
    """
    if sections is None:
        sections = [
            ("PROFESSIONAL SUMMARY", "Experienced software engineer with 5 years of experience."),
            ("WORK EXPERIENCE", "Software Engineer at TechCorp (2019-2024)\n- Built microservices\n- Led team of 4"),
            ("EDUCATION", "B.Tech Computer Science, IIT Hyderabad, 2019"),
            ("TECHNICAL SKILLS", "Python, FastAPI, React, PostgreSQL, Docker, AWS"),
        ]

    pdf = FPDF()
    pdf.add_page()
    pdf.set_auto_page_break(auto=True, margin=15)

    # Name
    pdf.set_font("Helvetica", "B" if name_bold else "", int(name_size))
    pdf.cell(0, 12, name, new_x="LMARGIN", new_y="NEXT", align="C")

    # Contact line
    pdf.set_font("Helvetica", "", int(body_size))
    pdf.cell(0, 6, contact_line, new_x="LMARGIN", new_y="NEXT", align="C")
    pdf.ln(6)

    # Sections
    for heading, body in sections:
        pdf.set_font("Helvetica", "B" if heading_bold else "", int(heading_size))
        pdf.cell(0, 8, heading, new_x="LMARGIN", new_y="NEXT")
        pdf.set_font("Helvetica", "", int(body_size))
        for line in body.split("\n"):
            pdf.cell(0, 5, line.strip(), new_x="LMARGIN", new_y="NEXT")
        pdf.ln(4)

    return pdf.output()


# ── Tests: Basic extraction ──────────────────────────────────────────


class TestExtractPdfStructure:
    """Core tests for extract_pdf_structure()."""

    def test_returns_expected_top_level_keys(self):
        pdf_bytes = _build_resume_pdf()
        result = extract_pdf_structure(pdf_bytes)
        assert "originalHeader" in result
        assert "contactInfo" in result
        assert "sections" in result
        assert "originalSectionOrder" in result
        assert "extractionMethod" in result
        assert "pageCount" in result

    def test_extraction_method_is_pymupdf(self):
        pdf_bytes = _build_resume_pdf()
        result = extract_pdf_structure(pdf_bytes)
        assert result["extractionMethod"] == "pymupdf_structure"

    def test_page_count(self):
        pdf_bytes = _build_resume_pdf()
        result = extract_pdf_structure(pdf_bytes)
        assert result["pageCount"] == 1

    def test_original_header_captures_name(self):
        pdf_bytes = _build_resume_pdf(name="JANE SMITH")
        result = extract_pdf_structure(pdf_bytes)
        assert "JANE SMITH" in result["originalHeader"] or "Jane Smith" in result["originalHeader"]

    def test_original_header_captures_contact_line(self):
        pdf_bytes = _build_resume_pdf(
            contact_line="test@example.com | +1 555-123-4567"
        )
        result = extract_pdf_structure(pdf_bytes)
        assert "test@example.com" in result["originalHeader"]


# ── Tests: Section detection ─────────────────────────────────────────


class TestSectionDetection:
    """Verify section headings are detected and content is mapped."""

    def test_section_headings_detected(self):
        sections = [
            ("EDUCATION", "B.Tech CS, 2019"),
            ("PROJECTS", "Built a web app with React"),
            ("SKILLS", "Python, JavaScript, SQL"),
        ]
        pdf_bytes = _build_resume_pdf(sections=sections)
        result = extract_pdf_structure(pdf_bytes)

        section_names = [s["displayName"] for s in result["sections"]]
        assert "EDUCATION" in section_names
        assert "PROJECTS" in section_names
        assert "SKILLS" in section_names

    def test_section_content_mapped_correctly(self):
        sections = [
            ("EDUCATION", "B.Tech Computer Science from MIT"),
            ("SKILLS", "Python and JavaScript"),
        ]
        pdf_bytes = _build_resume_pdf(sections=sections)
        result = extract_pdf_structure(pdf_bytes)

        # Find the EDUCATION section
        edu_sections = [s for s in result["sections"] if "education" in s["key"]]
        assert len(edu_sections) >= 1
        assert "B.Tech" in edu_sections[0]["content"] or "MIT" in edu_sections[0]["content"]

    def test_section_order_matches_pdf(self):
        sections = [
            ("TECHNICAL SKILLS", "Python, React"),
            ("WORK EXPERIENCE", "Engineer at Corp"),
            ("EDUCATION", "B.Tech 2019"),
        ]
        pdf_bytes = _build_resume_pdf(sections=sections)
        result = extract_pdf_structure(pdf_bytes)

        order = result["originalSectionOrder"]
        # The order should reflect the PDF order
        assert len(order) == len(sections)
        # The keys should be in the same order as the PDF headings
        assert "technical_skills" in order[0]
        assert "work_experience" in order[1] or "experience" in order[1]
        assert "education" in order[2]

    def test_section_keys_are_snake_case(self):
        sections = [
            ("PROFESSIONAL EXPERIENCE", "5 years at Corp"),
            ("TECHNICAL SKILLS", "Python, Java"),
        ]
        pdf_bytes = _build_resume_pdf(sections=sections)
        result = extract_pdf_structure(pdf_bytes)

        for sec in result["sections"]:
            key = sec["key"]
            assert " " not in key, f"Key '{key}' contains spaces"
            assert key == key.lower(), f"Key '{key}' is not lowercase"

    def test_display_name_preserved_exactly(self):
        sections = [
            ("WORK EXPERIENCE", "Engineer at Corp"),
            ("EDUCATION", "B.Tech 2019"),
        ]
        pdf_bytes = _build_resume_pdf(sections=sections)
        result = extract_pdf_structure(pdf_bytes)

        display_names = {s["displayName"] for s in result["sections"]}
        assert "WORK EXPERIENCE" in display_names
        assert "EDUCATION" in display_names


# ── Tests: Contact info parsing ──────────────────────────────────────


class TestContactInfoParsing:
    """Verify contact info is extracted from the header area."""

    def test_email_extracted(self):
        pdf_bytes = _build_resume_pdf(
            contact_line="john@example.com | +91 9876543210"
        )
        result = extract_pdf_structure(pdf_bytes)
        assert result["contactInfo"]["email"] == "john@example.com"

    def test_phone_with_country_code(self):
        pdf_bytes = _build_resume_pdf(
            contact_line="john@test.com | +91 9876543210"
        )
        result = extract_pdf_structure(pdf_bytes)
        phone = result["contactInfo"]["phone"]
        assert phone is not None
        assert "91" in phone
        assert "9876543210" in phone

    def test_linkedin_url(self):
        pdf_bytes = _build_resume_pdf(
            contact_line="john@test.com | linkedin.com/in/johndoe"
        )
        result = extract_pdf_structure(pdf_bytes)
        linkedin = result["contactInfo"]["linkedin"]
        assert linkedin is not None
        assert "linkedin.com/in/johndoe" in linkedin

    def test_github_url(self):
        pdf_bytes = _build_resume_pdf(
            contact_line="john@test.com | github.com/johndoe"
        )
        result = extract_pdf_structure(pdf_bytes)
        github = result["contactInfo"]["github"]
        assert github is not None
        assert "github.com/johndoe" in github

    def test_name_extracted(self):
        pdf_bytes = _build_resume_pdf(name="ALICE WONDERLAND")
        result = extract_pdf_structure(pdf_bytes)
        name = result["contactInfo"]["name"]
        assert name is not None
        # ALL CAPS name should be title-cased or preserved
        assert "Alice" in name or "ALICE" in name

    def test_all_contact_fields_present(self):
        """Verify the contactInfo dict has all expected keys."""
        pdf_bytes = _build_resume_pdf()
        result = extract_pdf_structure(pdf_bytes)
        ci = result["contactInfo"]
        expected_keys = {"name", "email", "phone", "location", "linkedin", "github", "portfolio", "otherLinks"}
        assert expected_keys.issubset(set(ci.keys()))


# ── Tests: Edge cases ────────────────────────────────────────────────


class TestEdgeCases:
    """Edge cases and error handling."""

    def test_empty_bytes_raises_value_error(self):
        with pytest.raises(ValueError, match="Could not open PDF"):
            extract_pdf_structure(b"")

    def test_invalid_pdf_raises_value_error(self):
        with pytest.raises(ValueError):
            extract_pdf_structure(b"not a real pdf file at all")

    def test_empty_pdf_no_pages(self):
        """A valid PDF structure but with no text should raise ValueError."""
        # Create a PDF with a blank page (no text at all)
        pdf = FPDF()
        pdf.add_page()
        # Don't write any text
        pdf_bytes = pdf.output()
        with pytest.raises(ValueError, match="no extractable text"):
            extract_pdf_structure(pdf_bytes)

    def test_no_headings_fallback_single_section(self):
        """When no headings are detected, should produce a fallback section."""
        # Create a PDF with only body-size text, no bold/large headings
        pdf = FPDF()
        pdf.add_page()
        pdf.set_font("Helvetica", "", 10)
        pdf.cell(0, 5, "just some plain body text here", new_x="LMARGIN", new_y="NEXT")
        pdf.cell(0, 5, "another line of normal text", new_x="LMARGIN", new_y="NEXT")
        pdf.cell(0, 5, "and a third line for good measure", new_x="LMARGIN", new_y="NEXT")
        pdf_bytes = pdf.output()

        result = extract_pdf_structure(pdf_bytes)
        # Should have at least one section (fallback)
        assert len(result["sections"]) >= 1
        assert result["originalSectionOrder"]

    def test_single_section_resume(self):
        """Resume with only one section heading."""
        sections = [("SKILLS", "Python, JavaScript, Docker")]
        pdf_bytes = _build_resume_pdf(sections=sections)
        result = extract_pdf_structure(pdf_bytes)

        skill_sections = [s for s in result["sections"] if "skill" in s["key"]]
        assert len(skill_sections) >= 1

    def test_sections_list_not_empty_for_normal_resume(self):
        pdf_bytes = _build_resume_pdf()
        result = extract_pdf_structure(pdf_bytes)
        assert len(result["sections"]) > 0

    def test_section_has_page_field(self):
        pdf_bytes = _build_resume_pdf()
        result = extract_pdf_structure(pdf_bytes)
        for sec in result["sections"]:
            assert "page" in sec
            assert isinstance(sec["page"], int)
            assert sec["page"] >= 1

    def test_multiple_sections_same_name_deduplicated(self):
        """Two sections with the same heading should get unique keys."""
        sections = [
            ("PROJECTS", "Project A: built a web app"),
            ("PROJECTS", "Project B: built a mobile app"),
        ]
        pdf_bytes = _build_resume_pdf(sections=sections)
        result = extract_pdf_structure(pdf_bytes)

        keys = [s["key"] for s in result["sections"]]
        # All keys should be unique
        assert len(keys) == len(set(keys))
