"""Tests for ResumeAnalyzer.score_sections() and _fallback_scoring().

Mocks the Groq API (OpenAI-compatible client) to verify that:
- Section names, content, and order are preserved exactly
- Scores and suggestions are added from the AI response
- Fallback scoring preserves structure when AI fails
"""

import json
import pytest
from unittest.mock import patch, MagicMock
from services.resume_analyzer import ResumeAnalyzer


# ── Fixtures ─────────────────────────────────────────────────────────


@pytest.fixture
def analyzer():
    """Create a ResumeAnalyzer with a mocked OpenAI client."""
    with patch("services.resume_analyzer.GROQ_API_KEY", "test-key"):
        with patch("services.resume_analyzer.OpenAI"):
            a = ResumeAnalyzer()
            return a


@pytest.fixture
def sample_sections():
    """Sections as returned by extract_pdf_structure()."""
    return [
        {
            "key": "professional_summary",
            "displayName": "PROFESSIONAL SUMMARY",
            "content": "Experienced engineer with 5 years of Python and cloud expertise.",
            "page": 1,
        },
        {
            "key": "work_experience",
            "displayName": "WORK EXPERIENCE",
            "content": "Software Engineer at TechCorp (2019-2024)\n- Built microservices handling 10k rps",
            "page": 1,
        },
        {
            "key": "education",
            "displayName": "EDUCATION",
            "content": "B.Tech Computer Science, IIT Hyderabad, 2019",
            "page": 1,
        },
    ]


@pytest.fixture
def sample_contact_info():
    return {
        "name": "John Doe",
        "email": "john@example.com",
        "phone": "+91 9876543210",
        "location": "Hyderabad, India",
        "linkedin": "https://linkedin.com/in/johndoe",
        "github": "https://github.com/johndoe",
        "portfolio": None,
        "otherLinks": [],
    }


def _mock_ai_response(sections: list[dict], overall: int = 72, ats: int = 80) -> str:
    """Build a realistic AI JSON response for the given sections."""
    scored = {}
    for sec in sections:
        scored[sec["key"]] = {
            "displayName": sec["displayName"],
            "content": sec.get("content", ""),
            "score": 75,
            "reasoning": f"Good content in {sec['displayName']}",
            "suggestions": [
                {"text": "Add more metrics", "priority": "high"},
                {"text": "Use stronger action verbs", "priority": "medium"},
            ],
        }
    return json.dumps({
        "sections": scored,
        "overallScore": overall,
        "atsScore": ats,
        "atsIssues": ["Could use more keywords"],
        "keywordsFound": ["Python", "FastAPI"],
        "keywordsMissing": ["Kubernetes"],
        "industryBenchmark": {
            "category": "Software Developer",
            "averageScore": 62,
            "percentile": 68,
            "topSkillsInDemand": ["Python", "AWS"],
        },
        "strengthHighlights": ["Strong technical depth"],
        "criticalImprovements": ["Add quantified results"],
    })


# ── Tests: score_sections() with mocked AI ──────────────────────────


class TestScoreSections:
    """Verify score_sections() preserves structure and adds scores."""

    def test_section_names_preserved(self, analyzer, sample_sections, sample_contact_info):
        """AI must not rename sections."""
        ai_response = _mock_ai_response(sample_sections)
        mock_message = MagicMock()
        mock_message.content = ai_response
        mock_choice = MagicMock()
        mock_choice.message = mock_message
        mock_response = MagicMock()
        mock_response.choices = [mock_choice]
        analyzer.client.chat.completions.create.return_value = mock_response

        result = analyzer.score_sections(sample_sections, sample_contact_info, "Software Developer")

        for sec in sample_sections:
            key = sec["key"]
            assert key in result["sections"], f"Section '{key}' missing from result"
            assert result["sections"][key]["displayName"] == sec["displayName"]

    def test_section_content_preserved(self, analyzer, sample_sections, sample_contact_info):
        """AI must not modify content — content comes from extractor, not AI."""
        ai_response = _mock_ai_response(sample_sections)
        mock_message = MagicMock()
        mock_message.content = ai_response
        mock_choice = MagicMock()
        mock_choice.message = mock_message
        mock_response = MagicMock()
        mock_response.choices = [mock_choice]
        analyzer.client.chat.completions.create.return_value = mock_response

        result = analyzer.score_sections(sample_sections, sample_contact_info, "Software Developer")

        for sec in sample_sections:
            key = sec["key"]
            assert result["sections"][key]["content"] == sec["content"]

    def test_section_order_preserved(self, analyzer, sample_sections, sample_contact_info):
        """originalSectionOrder must match the input sections order."""
        ai_response = _mock_ai_response(sample_sections)
        mock_message = MagicMock()
        mock_message.content = ai_response
        mock_choice = MagicMock()
        mock_choice.message = mock_message
        mock_response = MagicMock()
        mock_response.choices = [mock_choice]
        analyzer.client.chat.completions.create.return_value = mock_response

        result = analyzer.score_sections(sample_sections, sample_contact_info, "Software Developer")

        expected_order = [sec["key"] for sec in sample_sections]
        assert result["originalSectionOrder"] == expected_order

    def test_scores_added(self, analyzer, sample_sections, sample_contact_info):
        """Each section should have a numeric score between 0-100."""
        ai_response = _mock_ai_response(sample_sections)
        mock_message = MagicMock()
        mock_message.content = ai_response
        mock_choice = MagicMock()
        mock_choice.message = mock_message
        mock_response = MagicMock()
        mock_response.choices = [mock_choice]
        analyzer.client.chat.completions.create.return_value = mock_response

        result = analyzer.score_sections(sample_sections, sample_contact_info, "Software Developer")

        for sec in sample_sections:
            key = sec["key"]
            score = result["sections"][key]["score"]
            assert isinstance(score, int)
            assert 0 <= score <= 100

    def test_suggestions_added(self, analyzer, sample_sections, sample_contact_info):
        """Each section should have suggestions from the AI."""
        ai_response = _mock_ai_response(sample_sections)
        mock_message = MagicMock()
        mock_message.content = ai_response
        mock_choice = MagicMock()
        mock_choice.message = mock_message
        mock_response = MagicMock()
        mock_response.choices = [mock_choice]
        analyzer.client.chat.completions.create.return_value = mock_response

        result = analyzer.score_sections(sample_sections, sample_contact_info, "Software Developer")

        for sec in sample_sections:
            key = sec["key"]
            suggestions = result["sections"][key]["suggestions"]
            assert isinstance(suggestions, list)
            assert len(suggestions) > 0
            for s in suggestions:
                assert s["priority"] in ("high", "medium", "low")

    def test_contact_info_passed_through(self, analyzer, sample_sections, sample_contact_info):
        """contactInfo should be preserved from input, not from AI."""
        ai_response = _mock_ai_response(sample_sections)
        mock_message = MagicMock()
        mock_message.content = ai_response
        mock_choice = MagicMock()
        mock_choice.message = mock_message
        mock_response = MagicMock()
        mock_response.choices = [mock_choice]
        analyzer.client.chat.completions.create.return_value = mock_response

        result = analyzer.score_sections(sample_sections, sample_contact_info, "Software Developer")

        assert result["contactInfo"]["email"] == "john@example.com"
        assert result["contactInfo"]["phone"] == "+91 9876543210"

    def test_top_level_fields_present(self, analyzer, sample_sections, sample_contact_info):
        """Overall scores, ATS, keywords, benchmark should be present."""
        ai_response = _mock_ai_response(sample_sections, overall=72, ats=80)
        mock_message = MagicMock()
        mock_message.content = ai_response
        mock_choice = MagicMock()
        mock_choice.message = mock_message
        mock_response = MagicMock()
        mock_response.choices = [mock_choice]
        analyzer.client.chat.completions.create.return_value = mock_response

        result = analyzer.score_sections(sample_sections, sample_contact_info, "Software Developer")

        assert "overallScore" in result
        assert "atsScore" in result
        assert "atsIssues" in result
        assert "keywordsFound" in result
        assert "keywordsMissing" in result
        assert "industryBenchmark" in result
        assert "strengthHighlights" in result
        assert "criticalImprovements" in result

    def test_score_clamped_0_100(self, analyzer, sample_sections, sample_contact_info):
        """Scores outside 0-100 should be clamped."""
        # Modify AI response to have out-of-range scores
        scored = {}
        for sec in sample_sections:
            scored[sec["key"]] = {
                "displayName": sec["displayName"],
                "content": sec["content"],
                "score": 150,  # Out of range
                "reasoning": "test",
                "suggestions": [],
            }
        ai_json = json.dumps({
            "sections": scored,
            "overallScore": -10,
            "atsScore": 200,
            "atsIssues": [],
            "keywordsFound": [],
            "keywordsMissing": [],
            "industryBenchmark": {"category": "test", "averageScore": 62, "percentile": 300, "topSkillsInDemand": []},
            "strengthHighlights": [],
            "criticalImprovements": [],
        })
        mock_message = MagicMock()
        mock_message.content = ai_json
        mock_choice = MagicMock()
        mock_choice.message = mock_message
        mock_response = MagicMock()
        mock_response.choices = [mock_choice]
        analyzer.client.chat.completions.create.return_value = mock_response

        result = analyzer.score_sections(sample_sections, sample_contact_info, "Software Developer")

        for sec in sample_sections:
            assert 0 <= result["sections"][sec["key"]]["score"] <= 100
        assert 0 <= result["overallScore"] <= 100
        assert 0 <= result["atsScore"] <= 100

    def test_invalid_suggestion_priority_defaults_to_medium(self, analyzer, sample_sections, sample_contact_info):
        """If AI returns invalid priority, it should default to medium."""
        scored = {}
        for sec in sample_sections:
            scored[sec["key"]] = {
                "displayName": sec["displayName"],
                "content": sec["content"],
                "score": 60,
                "reasoning": "test",
                "suggestions": [{"text": "fix something", "priority": "critical"}],  # invalid
            }
        ai_json = json.dumps({
            "sections": scored,
            "overallScore": 60,
            "atsScore": 60,
            "atsIssues": [],
            "keywordsFound": [],
            "keywordsMissing": [],
            "industryBenchmark": {"category": "test", "averageScore": 62, "percentile": 50, "topSkillsInDemand": []},
            "strengthHighlights": [],
            "criticalImprovements": [],
        })
        mock_message = MagicMock()
        mock_message.content = ai_json
        mock_choice = MagicMock()
        mock_choice.message = mock_message
        mock_response = MagicMock()
        mock_response.choices = [mock_choice]
        analyzer.client.chat.completions.create.return_value = mock_response

        result = analyzer.score_sections(sample_sections, sample_contact_info, "Software Developer")

        for sec in sample_sections:
            for s in result["sections"][sec["key"]]["suggestions"]:
                assert s["priority"] in ("high", "medium", "low")


# ── Tests: _fallback_scoring() ───────────────────────────────────────


class TestFallbackScoring:
    """Verify _fallback_scoring() preserves structure exactly."""

    def test_preserves_section_names(self, analyzer, sample_sections, sample_contact_info):
        result = analyzer._fallback_scoring(sample_sections, sample_contact_info, "Software Developer")

        for sec in sample_sections:
            key = sec["key"]
            assert key in result["sections"]
            assert result["sections"][key]["displayName"] == sec["displayName"]

    def test_preserves_section_content(self, analyzer, sample_sections, sample_contact_info):
        result = analyzer._fallback_scoring(sample_sections, sample_contact_info, "Software Developer")

        for sec in sample_sections:
            key = sec["key"]
            assert result["sections"][key]["content"] == sec["content"]

    def test_preserves_section_order(self, analyzer, sample_sections, sample_contact_info):
        result = analyzer._fallback_scoring(sample_sections, sample_contact_info, "Software Developer")

        expected_order = [sec["key"] for sec in sample_sections]
        assert result["originalSectionOrder"] == expected_order

    def test_provides_basic_scores(self, analyzer, sample_sections, sample_contact_info):
        result = analyzer._fallback_scoring(sample_sections, sample_contact_info, "Software Developer")

        for sec in sample_sections:
            score = result["sections"][sec["key"]]["score"]
            assert isinstance(score, int)
            assert score > 0

    def test_contact_info_preserved(self, analyzer, sample_sections, sample_contact_info):
        result = analyzer._fallback_scoring(sample_sections, sample_contact_info, "Software Developer")

        assert result["contactInfo"] == sample_contact_info

    def test_has_overall_and_ats_scores(self, analyzer, sample_sections, sample_contact_info):
        result = analyzer._fallback_scoring(sample_sections, sample_contact_info, "Software Developer")

        assert "overallScore" in result
        assert "atsScore" in result
        assert isinstance(result["overallScore"], int)
        assert isinstance(result["atsScore"], int)

    def test_thin_content_gets_lower_score(self, analyzer, sample_contact_info):
        """Sections with very little content should score lower."""
        thin_sections = [
            {"key": "skills", "displayName": "SKILLS", "content": "Python", "page": 1},
            {"key": "experience", "displayName": "EXPERIENCE", "content": "Worked at Corp for 5 years doing many things across multiple teams.", "page": 1},
        ]
        result = analyzer._fallback_scoring(thin_sections, sample_contact_info, "Software Developer")

        # "Python" has < 50 chars, should get lower score
        assert result["sections"]["skills"]["score"] < result["sections"]["experience"]["score"]

    def test_empty_sections_list(self, analyzer, sample_contact_info):
        """Empty sections list should still return valid structure."""
        result = analyzer._fallback_scoring([], sample_contact_info, "Software Developer")

        assert result["sections"] == {}
        assert result["originalSectionOrder"] == []
        assert result["overallScore"] == 45
        assert result["contactInfo"] == sample_contact_info

    def test_ai_failure_triggers_fallback(self, analyzer, sample_sections, sample_contact_info):
        """When AI raises an exception, score_sections should fall back."""
        analyzer.client.chat.completions.create.side_effect = Exception("API down")

        result = analyzer.score_sections(sample_sections, sample_contact_info, "Software Developer")

        # Should still return valid structure
        assert "sections" in result
        assert "overallScore" in result
        for sec in sample_sections:
            assert sec["key"] in result["sections"]
            assert result["sections"][sec["key"]]["content"] == sec["content"]

    def test_json_parse_error_triggers_fallback(self, analyzer, sample_sections, sample_contact_info):
        """When AI returns invalid JSON, should fall back."""
        mock_message = MagicMock()
        mock_message.content = "not valid json {{{{"
        mock_choice = MagicMock()
        mock_choice.message = mock_message
        mock_response = MagicMock()
        mock_response.choices = [mock_choice]
        analyzer.client.chat.completions.create.return_value = mock_response

        result = analyzer.score_sections(sample_sections, sample_contact_info, "Software Developer")

        # Fallback should preserve structure
        for sec in sample_sections:
            assert sec["key"] in result["sections"]
            assert result["sections"][sec["key"]]["displayName"] == sec["displayName"]
