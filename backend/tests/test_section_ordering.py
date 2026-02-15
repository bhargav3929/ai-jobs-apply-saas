"""Tests for section ordering preservation in resume analysis.

Verifies that _validate_analysis() preserves original section order and
populates the originalSectionOrder field correctly.
"""

import pytest
from services.resume_analyzer import ResumeAnalyzer


@pytest.fixture
def analyzer():
    return ResumeAnalyzer()


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _make_analysis(section_keys: list[str], section_order: list[str] | None = None) -> dict:
    """Build a minimal AI analysis result with given section keys in order."""
    sections = {}
    for key in section_keys:
        sections[key] = {
            "displayName": key.replace("_", " ").title(),
            "content": f"Content for {key}",
            "score": 70,
            "reasoning": "Test",
            "suggestions": [],
        }
    result = {
        "sections": sections,
        "contactInfo": {"name": "Test User"},
        "overallScore": 70,
        "atsScore": 70,
        "atsIssues": [],
        "keywordsFound": [],
        "keywordsMissing": [],
        "industryBenchmark": {},
        "strengthHighlights": [],
        "criticalImprovements": [],
    }
    if section_order is not None:
        result["sectionOrder"] = section_order
    return result


# ---------------------------------------------------------------------------
# Tests
# ---------------------------------------------------------------------------


class TestSectionOrderPreservation:
    """Verify that _validate_analysis() preserves original section order."""

    def test_standard_order_preserved(self, analyzer):
        """Standard order (summary -> experience -> education) stays intact."""
        keys = ["professional_summary", "work_experience", "education"]
        result = _make_analysis(keys)
        validated = analyzer._validate_analysis(result, "Software Developer")

        assert list(validated["sections"].keys()) == keys
        assert validated["originalSectionOrder"] == keys

    def test_nonstandard_order_preserved(self, analyzer):
        """Non-standard order (education -> experience -> summary) is NOT reordered."""
        keys = ["education", "work_experience", "professional_summary"]
        result = _make_analysis(keys)
        validated = analyzer._validate_analysis(result, "Software Developer")

        assert list(validated["sections"].keys()) == keys
        assert validated["originalSectionOrder"] == keys

    def test_unusual_sections_stay_in_place(self, analyzer):
        """Unusual sections like hackathons or publications keep their position."""
        keys = ["professional_summary", "hackathons", "publications", "education", "skills"]
        result = _make_analysis(keys)
        validated = analyzer._validate_analysis(result, "Software Developer")

        assert list(validated["sections"].keys()) == keys
        assert validated["originalSectionOrder"] == keys

    def test_ai_section_order_field_used(self, analyzer):
        """When AI returns sectionOrder, it's used to reorder sections dict."""
        # Sections dict might not be in the right order (JSON parsing),
        # but sectionOrder explicitly specifies the intended order
        keys_in_dict = ["skills", "education", "experience"]
        intended_order = ["experience", "skills", "education"]
        result = _make_analysis(keys_in_dict, section_order=intended_order)
        validated = analyzer._validate_analysis(result, "Software Developer")

        assert list(validated["sections"].keys()) == intended_order
        assert validated["originalSectionOrder"] == intended_order

    def test_section_order_mismatch_falls_back(self, analyzer):
        """If sectionOrder doesn't match section keys, falls back to dict order."""
        keys = ["summary", "experience", "education"]
        # sectionOrder has a key that doesn't exist in sections
        wrong_order = ["summary", "nonexistent", "education"]
        result = _make_analysis(keys, section_order=wrong_order)
        validated = analyzer._validate_analysis(result, "Software Developer")

        # Should fall back to original dict key order since sets don't match
        assert list(validated["sections"].keys()) == keys
        assert validated["originalSectionOrder"] == keys

    def test_original_section_order_field_always_present(self, analyzer):
        """originalSectionOrder is always populated after validation."""
        result = _make_analysis(["a", "b", "c"])
        validated = analyzer._validate_analysis(result, "Software Developer")

        assert "originalSectionOrder" in validated
        assert isinstance(validated["originalSectionOrder"], list)
        assert len(validated["originalSectionOrder"]) == 3

    def test_empty_sections_produces_empty_order(self, analyzer):
        """Empty sections dict produces empty originalSectionOrder."""
        result = _make_analysis([])
        validated = analyzer._validate_analysis(result, "Software Developer")

        assert validated["originalSectionOrder"] == []

    def test_enforce_section_order_not_called(self, analyzer):
        """_enforce_section_order is no longer called during validation.

        The education-first order should NOT be reordered to put experience first.
        """
        keys = ["education", "projects", "professional_summary", "work_experience"]
        result = _make_analysis(keys)
        validated = analyzer._validate_analysis(result, "Software Developer")

        # If _enforce_section_order were called, experience would move to index 0
        # and summary to index 0. Instead, education should stay first.
        assert list(validated["sections"].keys())[0] == "education"
        assert validated["originalSectionOrder"][0] == "education"
