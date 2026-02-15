"""Tests for the full analysis pipeline in analyze_resume().

Verifies that:
- Structure extraction success routes through score_sections()
- Structure extraction failure falls back to text-based analyze()
- originalHeader is stored in the cached analysis
- The pipeline handles various failure modes gracefully
"""

import pytest
from unittest.mock import patch, MagicMock, AsyncMock


# ── Helpers ──────────────────────────────────────────────────────────


def _make_structure_result():
    """Build a realistic extract_pdf_structure() return value."""
    return {
        "originalHeader": "JOHN DOE\njohn@example.com | +91 9876543210 | Hyderabad",
        "contactInfo": {
            "name": "John Doe",
            "email": "john@example.com",
            "phone": "+91 9876543210",
            "location": "Hyderabad, India",
            "linkedin": None,
            "github": None,
            "portfolio": None,
            "otherLinks": [],
        },
        "sections": [
            {
                "key": "professional_summary",
                "displayName": "PROFESSIONAL SUMMARY",
                "content": "Experienced engineer with 5 years of expertise.",
                "page": 1,
            },
            {
                "key": "work_experience",
                "displayName": "WORK EXPERIENCE",
                "content": "Software Engineer at TechCorp (2019-2024)",
                "page": 1,
            },
        ],
        "originalSectionOrder": ["professional_summary", "work_experience"],
        "extractionMethod": "pymupdf_structure",
        "pageCount": 1,
    }


def _make_score_result(sections, contact_info):
    """Build a realistic score_sections() return value."""
    scored = {}
    for sec in sections:
        scored[sec["key"]] = {
            "displayName": sec["displayName"],
            "content": sec["content"],
            "score": 70,
            "reasoning": "Good content",
            "suggestions": [{"text": "Add metrics", "priority": "high"}],
        }
    return {
        "sections": scored,
        "originalSectionOrder": [sec["key"] for sec in sections],
        "contactInfo": contact_info,
        "overallScore": 70,
        "atsScore": 75,
        "atsIssues": [],
        "keywordsFound": ["Python"],
        "keywordsMissing": ["Kubernetes"],
        "industryBenchmark": {
            "category": "Software Developer",
            "averageScore": 62,
            "percentile": 65,
            "topSkillsInDemand": ["Python"],
        },
        "strengthHighlights": ["Strong experience"],
        "criticalImprovements": ["Add certifications"],
    }


def _make_analyze_result():
    """Build a realistic analyze() (text pipeline) return value."""
    return {
        "sections": {
            "professional_summary": {
                "displayName": "Professional Summary",
                "content": "Experienced engineer.",
                "score": 65,
                "reasoning": "Brief",
                "suggestions": [],
            },
        },
        "originalSectionOrder": ["professional_summary"],
        "contactInfo": {
            "name": "John Doe",
            "email": "john@example.com",
            "phone": None,
            "location": None,
            "linkedin": None,
            "github": None,
            "portfolio": None,
            "otherLinks": [],
        },
        "overallScore": 65,
        "atsScore": 60,
        "atsIssues": [],
        "keywordsFound": ["Python"],
        "keywordsMissing": [],
        "industryBenchmark": {
            "category": "Software Developer",
            "averageScore": 62,
            "percentile": 55,
            "topSkillsInDemand": [],
        },
        "strengthHighlights": [],
        "criticalImprovements": [],
    }


# ── Tests: Structure-first pipeline ──────────────────────────────────


class TestStructureFirstPipeline:
    """Verify the structure-first (PyMuPDF -> score_sections) flow."""

    @pytest.mark.asyncio
    async def test_structure_success_calls_score_sections(self):
        """When structure extraction succeeds, score_sections should be called."""
        structure = _make_structure_result()
        score_result = _make_score_result(structure["sections"], structure["contactInfo"])

        with (
            patch("api.resume.verify_token", new_callable=AsyncMock, return_value={"uid": "user1"}),
            patch("api.resume.db") as mock_db,
            patch("services.pdf_structure_extractor.extract_pdf_structure", return_value=structure) as mock_extract,
            patch.object(
                MagicMock(), "score_sections", return_value=score_result
            ),
            patch("api.resume.analyzer") as mock_analyzer,
            patch("api.resume._download_resume_bytes", return_value=b"fake-pdf-bytes"),
        ):
            mock_analyzer.score_sections.return_value = score_result

            # Setup Firestore mocks
            user_doc = MagicMock()
            user_doc.exists = True
            user_doc.to_dict.return_value = {
                "resumeUrl": "gs://bucket/resume.pdf",
                "jobCategory": "Software Developer",
                "resumeMetadata": {},
                "extractedLinks": {},
            }
            cache_doc = MagicMock()
            cache_doc.exists = False

            mock_db.collection.return_value.document.return_value.get.side_effect = [
                user_doc,   # users collection
                cache_doc,  # resume_analyses cache check
            ]
            mock_db.collection.return_value.document.return_value.set.return_value = None

            from api.resume import analyze_resume
            result = await analyze_resume(authorization="Bearer test-token")

            # score_sections should have been called (not analyze)
            mock_analyzer.score_sections.assert_called_once()
            mock_analyzer.analyze.assert_not_called()

    @pytest.mark.asyncio
    async def test_structure_success_stores_original_header(self):
        """originalHeader from structure extraction must be in the result."""
        structure = _make_structure_result()
        score_result = _make_score_result(structure["sections"], structure["contactInfo"])

        with (
            patch("api.resume.verify_token", new_callable=AsyncMock, return_value={"uid": "user1"}),
            patch("api.resume.db") as mock_db,
            patch("services.pdf_structure_extractor.extract_pdf_structure", return_value=structure),
            patch("api.resume.analyzer") as mock_analyzer,
            patch("api.resume._download_resume_bytes", return_value=b"fake-pdf-bytes"),
        ):
            mock_analyzer.score_sections.return_value = score_result

            user_doc = MagicMock()
            user_doc.exists = True
            user_doc.to_dict.return_value = {
                "resumeUrl": "gs://bucket/resume.pdf",
                "jobCategory": "Software Developer",
                "resumeMetadata": {},
                "extractedLinks": {},
            }
            cache_doc = MagicMock()
            cache_doc.exists = False

            mock_db.collection.return_value.document.return_value.get.side_effect = [
                user_doc,
                cache_doc,
            ]
            mock_db.collection.return_value.document.return_value.set.return_value = None

            from api.resume import analyze_resume
            result = await analyze_resume(authorization="Bearer test-token")

            analysis = result["analysis"]
            assert "originalHeader" in analysis
            assert "JOHN DOE" in analysis["originalHeader"]

    @pytest.mark.asyncio
    async def test_structure_success_sets_extraction_method(self):
        """extractionMethod should be 'pymupdf_structure' on success."""
        structure = _make_structure_result()
        score_result = _make_score_result(structure["sections"], structure["contactInfo"])

        with (
            patch("api.resume.verify_token", new_callable=AsyncMock, return_value={"uid": "user1"}),
            patch("api.resume.db") as mock_db,
            patch("services.pdf_structure_extractor.extract_pdf_structure", return_value=structure),
            patch("api.resume.analyzer") as mock_analyzer,
            patch("api.resume._download_resume_bytes", return_value=b"fake-pdf-bytes"),
        ):
            mock_analyzer.score_sections.return_value = score_result

            user_doc = MagicMock()
            user_doc.exists = True
            user_doc.to_dict.return_value = {
                "resumeUrl": "gs://bucket/resume.pdf",
                "jobCategory": "Software Developer",
                "resumeMetadata": {},
                "extractedLinks": {},
            }
            cache_doc = MagicMock()
            cache_doc.exists = False

            mock_db.collection.return_value.document.return_value.get.side_effect = [
                user_doc,
                cache_doc,
            ]
            mock_db.collection.return_value.document.return_value.set.return_value = None

            from api.resume import analyze_resume
            result = await analyze_resume(authorization="Bearer test-token")

            assert result["analysis"]["extractionMethod"] == "pymupdf_structure"


# ── Tests: Fallback to text pipeline ─────────────────────────────────


class TestFallbackToTextPipeline:
    """When structure extraction fails, the text pipeline should be used."""

    @pytest.mark.asyncio
    async def test_structure_failure_falls_back_to_analyze(self):
        """If extract_pdf_structure raises, analyze() text pipeline should run."""
        analyze_result = _make_analyze_result()

        with (
            patch("api.resume.verify_token", new_callable=AsyncMock, return_value={"uid": "user1"}),
            patch("api.resume.db") as mock_db,
            patch("services.pdf_structure_extractor.extract_pdf_structure", side_effect=ValueError("no headings")),
            patch("api.resume.analyzer") as mock_analyzer,
            patch("api.resume._download_resume_bytes", return_value=b"fake-pdf-bytes"),
            patch("api.resume._get_resume_text", return_value="John Doe\nSoftware Engineer"),
            # Mock out the vision/AI contact extraction to avoid import issues
            patch("services.ocr_service.extract_contact_with_vision", side_effect=Exception("skip")),
        ):
            mock_analyzer.analyze.return_value = analyze_result
            mock_analyzer.score_sections.return_value = None

            user_doc = MagicMock()
            user_doc.exists = True
            user_doc.to_dict.return_value = {
                "resumeUrl": "gs://bucket/resume.pdf",
                "jobCategory": "Software Developer",
                "resumeMetadata": {},
                "extractedLinks": {},
            }
            cache_doc = MagicMock()
            cache_doc.exists = False

            mock_db.collection.return_value.document.return_value.get.side_effect = [
                user_doc,
                cache_doc,
            ]
            mock_db.collection.return_value.document.return_value.set.return_value = None

            from api.resume import analyze_resume
            result = await analyze_resume(authorization="Bearer test-token")

            # analyze() (text pipeline) should have been called
            mock_analyzer.analyze.assert_called_once()
            # extraction method should indicate text_analysis
            assert result["analysis"]["extractionMethod"] == "text_analysis"

    @pytest.mark.asyncio
    async def test_text_override_still_uses_structure_extraction(self):
        """When resumeTextOverride is set, structure extraction is still attempted
        because the PDF is the source of truth for structure/layout."""
        structure = _make_structure_result()
        score_result = _make_score_result(structure["sections"], structure["contactInfo"])

        with (
            patch("api.resume.verify_token", new_callable=AsyncMock, return_value={"uid": "user1"}),
            patch("api.resume.db") as mock_db,
            patch("services.pdf_structure_extractor.extract_pdf_structure", return_value=structure) as mock_extract,
            patch("api.resume.analyzer") as mock_analyzer,
            patch("api.resume._download_resume_bytes", return_value=b"fake-pdf-bytes"),
        ):
            mock_analyzer.score_sections.return_value = score_result

            user_doc = MagicMock()
            user_doc.exists = True
            user_doc.to_dict.return_value = {
                "resumeUrl": "gs://bucket/resume.pdf",
                "jobCategory": "Software Developer",
                "resumeMetadata": {},
                "extractedLinks": {},
                "resumeTextOverride": "Manually edited resume text here",
            }
            cache_doc = MagicMock()
            cache_doc.exists = False

            mock_db.collection.return_value.document.return_value.get.side_effect = [
                user_doc,
                cache_doc,
            ]
            mock_db.collection.return_value.document.return_value.set.return_value = None

            from api.resume import analyze_resume
            result = await analyze_resume(authorization="Bearer test-token")

            # Structure extraction SHOULD be called even with text override
            mock_extract.assert_called_once()
            # score_sections used instead of text-based analyze
            mock_analyzer.score_sections.assert_called_once()
            mock_analyzer.analyze.assert_not_called()


# ── Tests: Response structure ────────────────────────────────────────


class TestResponseStructure:
    """Verify the response has all expected fields regardless of pipeline."""

    @pytest.mark.asyncio
    async def test_response_has_required_fields(self):
        """Response should have analysis, resumeText, candidateName, etc."""
        structure = _make_structure_result()
        score_result = _make_score_result(structure["sections"], structure["contactInfo"])

        with (
            patch("api.resume.verify_token", new_callable=AsyncMock, return_value={"uid": "user1"}),
            patch("api.resume.db") as mock_db,
            patch("services.pdf_structure_extractor.extract_pdf_structure", return_value=structure),
            patch("api.resume.analyzer") as mock_analyzer,
            patch("api.resume._download_resume_bytes", return_value=b"fake-pdf-bytes"),
            patch("api.resume._get_resume_text", return_value="John Doe\nResume text"),
        ):
            mock_analyzer.score_sections.return_value = score_result

            user_doc = MagicMock()
            user_doc.exists = True
            user_doc.to_dict.return_value = {
                "resumeUrl": "gs://bucket/resume.pdf",
                "jobCategory": "Software Developer",
                "resumeMetadata": {},
                "extractedLinks": {},
                "name": "John Doe",
            }
            cache_doc = MagicMock()
            cache_doc.exists = False

            mock_db.collection.return_value.document.return_value.get.side_effect = [
                user_doc,
                cache_doc,
            ]
            mock_db.collection.return_value.document.return_value.set.return_value = None

            from api.resume import analyze_resume
            result = await analyze_resume(authorization="Bearer test-token")

            assert "analysis" in result
            assert "resumeText" in result
            assert "candidateName" in result
            assert "contactInfo" in result
            assert "metadata" in result
            assert "extractedLinks" in result
            assert "jobCategory" in result
            assert "cachedUntil" in result

    @pytest.mark.asyncio
    async def test_candidate_name_from_contact_info(self):
        """candidateName should prefer AI-detected name from contactInfo."""
        structure = _make_structure_result()
        score_result = _make_score_result(structure["sections"], structure["contactInfo"])

        with (
            patch("api.resume.verify_token", new_callable=AsyncMock, return_value={"uid": "user1"}),
            patch("api.resume.db") as mock_db,
            patch("services.pdf_structure_extractor.extract_pdf_structure", return_value=structure),
            patch("api.resume.analyzer") as mock_analyzer,
            patch("api.resume._download_resume_bytes", return_value=b"fake-pdf-bytes"),
            patch("api.resume._get_resume_text", return_value="John Doe\nResume text"),
        ):
            mock_analyzer.score_sections.return_value = score_result

            user_doc = MagicMock()
            user_doc.exists = True
            user_doc.to_dict.return_value = {
                "resumeUrl": "gs://bucket/resume.pdf",
                "jobCategory": "Software Developer",
                "resumeMetadata": {},
                "extractedLinks": {},
                "name": "Different Name",  # user_data name
            }
            cache_doc = MagicMock()
            cache_doc.exists = False

            mock_db.collection.return_value.document.return_value.get.side_effect = [
                user_doc,
                cache_doc,
            ]
            mock_db.collection.return_value.document.return_value.set.return_value = None

            from api.resume import analyze_resume
            result = await analyze_resume(authorization="Bearer test-token")

            # Should use the name from contactInfo (extracted from PDF), not user_data
            assert result["candidateName"] == "John Doe"
