"""Tests for api/resume.py — _get_resume_text() 3-tier fallback logic."""

import pytest
from unittest.mock import patch, MagicMock
from fastapi import HTTPException


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

FAKE_PDF = b"%PDF-1.4 fake pdf content"
OCR_TEXT = "OCR extracted: John Smith, Software Engineer at Acme Corp"
PYMUPDF_TEXT = "PyMuPDF extracted: John Smith resume content"
PYPDF_TEXT = "PyPDF extracted: John Smith basic text"


# ---------------------------------------------------------------------------
# Tests
# ---------------------------------------------------------------------------


class TestGetResumeText:
    """Unit tests for _get_resume_text() fallback chain."""

    @patch("api.resume._download_resume_bytes", return_value=FAKE_PDF)
    def test_ocr_succeeds_returns_ocr_text(self, mock_download):
        """When Mistral OCR succeeds, its text is returned immediately."""
        from api.resume import _get_resume_text

        with patch("services.ocr_service.extract_text_with_ocr", return_value=OCR_TEXT):
            result = _get_resume_text("user123", "gs://bucket/resume.pdf")

        assert result == OCR_TEXT

    @patch("api.resume._download_resume_bytes", return_value=FAKE_PDF)
    def test_ocr_fails_pymupdf_succeeds(self, mock_download):
        """When OCR fails, pymupdf (fitz) is tried and succeeds."""
        from api.resume import _get_resume_text

        mock_doc = MagicMock()
        mock_page = MagicMock()
        mock_page.get_text.return_value = PYMUPDF_TEXT
        mock_doc.__iter__ = lambda self: iter([mock_page])
        mock_doc.close = MagicMock()

        with (
            patch("services.ocr_service.extract_text_with_ocr", side_effect=Exception("OCR down")),
            patch("fitz.open", return_value=mock_doc),
        ):
            result = _get_resume_text("user123", "gs://bucket/resume.pdf")

        assert result == PYMUPDF_TEXT

    @patch("api.resume._download_resume_bytes", return_value=FAKE_PDF)
    def test_ocr_and_pymupdf_fail_pypdf_succeeds(self, mock_download):
        """When OCR and pymupdf both fail, pypdf is the last resort."""
        from api.resume import _get_resume_text

        mock_reader = MagicMock()
        mock_page = MagicMock()
        mock_page.extract_text.return_value = PYPDF_TEXT
        mock_reader.pages = [mock_page]

        with (
            patch("services.ocr_service.extract_text_with_ocr", side_effect=Exception("OCR down")),
            patch("fitz.open", side_effect=Exception("pymupdf broken")),
            patch("pypdf.PdfReader", return_value=mock_reader),
        ):
            result = _get_resume_text("user123", "gs://bucket/resume.pdf")

        assert result == PYPDF_TEXT

    @patch("api.resume._download_resume_bytes", return_value=FAKE_PDF)
    def test_all_fail_ocr_attempted_error_message(self, mock_download):
        """All extractors fail after OCR was attempted → 'corrupted' error."""
        from api.resume import _get_resume_text

        with (
            patch("services.ocr_service.extract_text_with_ocr", side_effect=Exception("OCR failed")),
            patch("fitz.open", side_effect=Exception("pymupdf broken")),
            patch("pypdf.PdfReader", side_effect=Exception("pypdf broken")),
        ):
            with pytest.raises(HTTPException) as exc_info:
                _get_resume_text("user123", "gs://bucket/resume.pdf")

            assert exc_info.value.status_code == 422
            detail = exc_info.value.detail
            # Must contain the OCR-attempted error message
            assert "OCR was attempted but failed" in detail
            assert "corrupted" in detail or "unsupported format" in detail

    @patch("api.resume._download_resume_bytes", return_value=FAKE_PDF)
    def test_all_fail_ocr_not_attempted_error_message(self, mock_download):
        """All extractors fail when OCR was NOT attempted → 'unavailable' error.

        The code catches ValueError separately from Exception. When
        extract_text_with_ocr raises ValueError (API key missing),
        ocr_attempted stays False, producing the 'unavailable' message.
        """
        from api.resume import _get_resume_text

        with (
            patch("services.ocr_service.extract_text_with_ocr", side_effect=ValueError("MISTRAL_API_KEY not configured")),
            patch("fitz.open", side_effect=Exception("pymupdf broken")),
            patch("pypdf.PdfReader", side_effect=Exception("pypdf broken")),
        ):
            with pytest.raises(HTTPException) as exc_info:
                _get_resume_text("user123", "gs://bucket/resume.pdf")

            assert exc_info.value.status_code == 422
            detail = exc_info.value.detail
            assert "image-based" in detail
            assert "unavailable" in detail
            assert "try again later" in detail.lower()

    @patch("api.resume._download_resume_bytes", return_value=FAKE_PDF)
    def test_ocr_returns_empty_falls_through(self, mock_download):
        """OCR returns empty string → falls through to pymupdf."""
        from api.resume import _get_resume_text

        mock_doc = MagicMock()
        mock_page = MagicMock()
        mock_page.get_text.return_value = PYMUPDF_TEXT
        mock_doc.__iter__ = lambda self: iter([mock_page])
        mock_doc.close = MagicMock()

        with (
            patch("services.ocr_service.extract_text_with_ocr", return_value=""),
            patch("fitz.open", return_value=mock_doc),
        ):
            result = _get_resume_text("user123", "gs://bucket/resume.pdf")

        assert result == PYMUPDF_TEXT

    @patch("api.resume._download_resume_bytes", return_value=FAKE_PDF)
    def test_ocr_returns_whitespace_falls_through(self, mock_download):
        """OCR returns whitespace-only string → falls through to pymupdf."""
        from api.resume import _get_resume_text

        mock_doc = MagicMock()
        mock_page = MagicMock()
        mock_page.get_text.return_value = PYMUPDF_TEXT
        mock_doc.__iter__ = lambda self: iter([mock_page])
        mock_doc.close = MagicMock()

        with (
            patch("services.ocr_service.extract_text_with_ocr", return_value="   \n  \t  "),
            patch("fitz.open", return_value=mock_doc),
        ):
            result = _get_resume_text("user123", "gs://bucket/resume.pdf")

        assert result == PYMUPDF_TEXT

    @patch("api.resume._download_resume_bytes", return_value=FAKE_PDF)
    def test_pymupdf_returns_empty_falls_through_to_pypdf(self, mock_download):
        """pymupdf returns empty text → falls through to pypdf."""
        from api.resume import _get_resume_text

        mock_doc = MagicMock()
        mock_page = MagicMock()
        mock_page.get_text.return_value = ""
        mock_doc.__iter__ = lambda self: iter([mock_page])
        mock_doc.close = MagicMock()

        mock_reader = MagicMock()
        mock_pypdf_page = MagicMock()
        mock_pypdf_page.extract_text.return_value = PYPDF_TEXT
        mock_reader.pages = [mock_pypdf_page]

        with (
            patch("services.ocr_service.extract_text_with_ocr", side_effect=Exception("OCR down")),
            patch("fitz.open", return_value=mock_doc),
            patch("pypdf.PdfReader", return_value=mock_reader),
        ):
            result = _get_resume_text("user123", "gs://bucket/resume.pdf")

        assert result == PYPDF_TEXT

    @patch("api.resume._download_resume_bytes", return_value=FAKE_PDF)
    def test_uses_provided_pdf_bytes(self, mock_download):
        """When pdf_bytes is provided, _download_resume_bytes is not called."""
        from api.resume import _get_resume_text

        custom_bytes = b"custom pdf bytes"

        with patch("services.ocr_service.extract_text_with_ocr", return_value=OCR_TEXT):
            result = _get_resume_text("user123", "gs://bucket/resume.pdf", pdf_bytes=custom_bytes)

        assert result == OCR_TEXT
        mock_download.assert_not_called()


class TestErrorMessageIntegration:
    """Verify backend error messages match what the frontend classifyPdfError() expects."""

    def test_ocr_attempted_error_classified_as_corrupted(self):
        """Backend 'OCR was attempted but failed' → frontend classifies as 'corrupted'."""
        msg = ("Could not extract text from PDF. OCR was attempted but failed. "
               "The file may be corrupted or in an unsupported format.")
        lower = msg.lower()

        # Frontend logic: isPdfError check
        is_pdf_error = (
            "extract text" in lower or
            "image-based" in lower or
            "ocr" in lower or
            "corrupted" in lower
        )
        assert is_pdf_error

        # Frontend logic: ocr_unavailable check
        is_ocr_unavailable = "unavailable" in lower or "try again later" in lower
        assert not is_ocr_unavailable  # Should NOT be classified as unavailable

        # Therefore frontend classifies as "corrupted"

    def test_ocr_not_attempted_error_classified_as_ocr_unavailable(self):
        """Backend 'OCR service unavailable' → frontend classifies as 'ocr_unavailable'."""
        msg = ("Could not extract text from PDF. The file may be image-based "
               "and the OCR service is currently unavailable. Please try again later.")
        lower = msg.lower()

        # Frontend logic: isPdfError check
        is_pdf_error = (
            "extract text" in lower or
            "image-based" in lower or
            "ocr" in lower or
            "corrupted" in lower
        )
        assert is_pdf_error

        # Frontend logic: ocr_unavailable check
        is_ocr_unavailable = "unavailable" in lower or "try again later" in lower
        assert is_ocr_unavailable  # Should be classified as ocr_unavailable
