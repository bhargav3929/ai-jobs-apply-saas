"""Tests for services/ocr_service.py — extract_text_with_ocr() retry logic."""

import pytest
from unittest.mock import patch, MagicMock
import requests


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

FAKE_PDF = b"%PDF-1.4 fake pdf content"

OCR_SUCCESS_RESPONSE = {
    "pages": [
        {"markdown": "# John Smith\n\n**Software Engineer**\n\nExperience at Acme Corp"},
        {"markdown": "## Education\n\nBS Computer Science"},
    ]
}


def _make_response(status_code: int, json_data: dict | None = None, text: str = "") -> MagicMock:
    """Build a fake requests.Response."""
    resp = MagicMock(spec=requests.Response)
    resp.status_code = status_code
    resp.text = text or str(json_data)
    if json_data is not None:
        resp.json.return_value = json_data
    return resp


# ---------------------------------------------------------------------------
# Tests
# ---------------------------------------------------------------------------


class TestExtractTextWithOcr:
    """Unit tests for extract_text_with_ocr()."""

    @patch("services.ocr_service.time.sleep")  # skip real delays
    @patch("services.ocr_service.requests.post")
    @patch("services.ocr_service.MISTRAL_API_KEY", "test-key-123")
    def test_successful_extraction(self, mock_post, mock_sleep):
        """Successful OCR call returns cleaned, normalized text."""
        from services.ocr_service import extract_text_with_ocr

        mock_post.return_value = _make_response(200, OCR_SUCCESS_RESPONSE)

        result = extract_text_with_ocr(FAKE_PDF)

        assert "JOHN SMITH" in result  # markdown # heading → uppercase
        assert "Software Engineer" in result
        assert "EDUCATION" in result  # ## heading → uppercase
        mock_post.assert_called_once()
        mock_sleep.assert_not_called()

    @patch("services.ocr_service.time.sleep")
    @patch("services.ocr_service.requests.post")
    @patch("services.ocr_service.MISTRAL_API_KEY", "test-key-123")
    def test_retry_on_429_then_success(self, mock_post, mock_sleep):
        """HTTP 429 triggers retry; second attempt succeeds."""
        from services.ocr_service import extract_text_with_ocr

        mock_post.side_effect = [
            _make_response(429, text="Rate limit exceeded"),
            _make_response(200, OCR_SUCCESS_RESPONSE),
        ]

        result = extract_text_with_ocr(FAKE_PDF)

        assert "JOHN SMITH" in result
        assert mock_post.call_count == 2
        # Should have slept once (1.0s base delay)
        mock_sleep.assert_called_once_with(1.0)

    @patch("services.ocr_service.time.sleep")
    @patch("services.ocr_service.requests.post")
    @patch("services.ocr_service.MISTRAL_API_KEY", "test-key-123")
    def test_retry_on_500_then_success(self, mock_post, mock_sleep):
        """HTTP 500 triggers retry; second attempt succeeds."""
        from services.ocr_service import extract_text_with_ocr

        mock_post.side_effect = [
            _make_response(500, text="Internal server error"),
            _make_response(200, OCR_SUCCESS_RESPONSE),
        ]

        result = extract_text_with_ocr(FAKE_PDF)

        assert "JOHN SMITH" in result
        assert mock_post.call_count == 2
        mock_sleep.assert_called_once_with(1.0)

    @patch("services.ocr_service.time.sleep")
    @patch("services.ocr_service.requests.post")
    @patch("services.ocr_service.MISTRAL_API_KEY", "test-key-123")
    def test_immediate_failure_on_400(self, mock_post, mock_sleep):
        """HTTP 400 (non-retryable client error) fails immediately without retry."""
        from services.ocr_service import extract_text_with_ocr

        mock_post.return_value = _make_response(400, text="Bad request")

        with pytest.raises(Exception, match="HTTP 400"):
            extract_text_with_ocr(FAKE_PDF)

        mock_post.assert_called_once()
        mock_sleep.assert_not_called()

    @patch("services.ocr_service.time.sleep")
    @patch("services.ocr_service.requests.post")
    @patch("services.ocr_service.MISTRAL_API_KEY", "test-key-123")
    def test_immediate_failure_on_403(self, mock_post, mock_sleep):
        """HTTP 403 (forbidden) fails immediately without retry."""
        from services.ocr_service import extract_text_with_ocr

        mock_post.return_value = _make_response(403, text="Forbidden")

        with pytest.raises(Exception, match="HTTP 403"):
            extract_text_with_ocr(FAKE_PDF)

        mock_post.assert_called_once()
        mock_sleep.assert_not_called()

    @patch("services.ocr_service.time.sleep")
    @patch("services.ocr_service.requests.post")
    @patch("services.ocr_service.MISTRAL_API_KEY", "test-key-123")
    def test_all_retries_exhausted(self, mock_post, mock_sleep):
        """All 3 retry attempts fail with 500 → raises Exception."""
        from services.ocr_service import extract_text_with_ocr, MISTRAL_OCR_MAX_RETRIES

        mock_post.return_value = _make_response(500, text="Server error")

        with pytest.raises(Exception, match="HTTP 500"):
            extract_text_with_ocr(FAKE_PDF)

        assert mock_post.call_count == MISTRAL_OCR_MAX_RETRIES
        # Exponential backoff: sleep(1.0), sleep(2.0) — no sleep after last attempt
        assert mock_sleep.call_count == MISTRAL_OCR_MAX_RETRIES - 1

    @patch("services.ocr_service.time.sleep")
    @patch("services.ocr_service.requests.post")
    @patch("services.ocr_service.MISTRAL_API_KEY", "test-key-123")
    def test_exponential_backoff_delays(self, mock_post, mock_sleep):
        """Verify exponential backoff: 1s, 2s between retries."""
        from services.ocr_service import extract_text_with_ocr

        mock_post.return_value = _make_response(500, text="Server error")

        with pytest.raises(Exception):
            extract_text_with_ocr(FAKE_PDF)

        delays = [call.args[0] for call in mock_sleep.call_args_list]
        assert delays == [1.0, 2.0]

    @patch("services.ocr_service.requests.post")
    @patch("services.ocr_service.MISTRAL_API_KEY", "")
    def test_missing_api_key_raises_valueerror(self, mock_post):
        """Empty MISTRAL_API_KEY raises ValueError before any HTTP call."""
        from services.ocr_service import extract_text_with_ocr

        with pytest.raises(ValueError, match="MISTRAL_API_KEY"):
            extract_text_with_ocr(FAKE_PDF)

        mock_post.assert_not_called()

    @patch("services.ocr_service.requests.post")
    @patch("services.ocr_service.MISTRAL_API_KEY", None)
    def test_none_api_key_raises_valueerror(self, mock_post):
        """None MISTRAL_API_KEY raises ValueError."""
        from services.ocr_service import extract_text_with_ocr

        with pytest.raises(ValueError, match="MISTRAL_API_KEY"):
            extract_text_with_ocr(FAKE_PDF)

        mock_post.assert_not_called()

    @patch("services.ocr_service.time.sleep")
    @patch("services.ocr_service.requests.post")
    @patch("services.ocr_service.MISTRAL_API_KEY", "test-key-123")
    def test_timeout_retries_and_fails(self, mock_post, mock_sleep):
        """requests.Timeout is retried; all timeouts → raises Exception."""
        from services.ocr_service import extract_text_with_ocr, MISTRAL_OCR_MAX_RETRIES

        mock_post.side_effect = requests.exceptions.Timeout("Connection timed out")

        with pytest.raises(Exception, match="timed out"):
            extract_text_with_ocr(FAKE_PDF)

        assert mock_post.call_count == MISTRAL_OCR_MAX_RETRIES

    @patch("services.ocr_service.time.sleep")
    @patch("services.ocr_service.requests.post")
    @patch("services.ocr_service.MISTRAL_API_KEY", "test-key-123")
    def test_timeout_then_success(self, mock_post, mock_sleep):
        """Timeout on first attempt, success on second."""
        from services.ocr_service import extract_text_with_ocr

        mock_post.side_effect = [
            requests.exceptions.Timeout("timed out"),
            _make_response(200, OCR_SUCCESS_RESPONSE),
        ]

        result = extract_text_with_ocr(FAKE_PDF)

        assert "JOHN SMITH" in result
        assert mock_post.call_count == 2

    @patch("services.ocr_service.time.sleep")
    @patch("services.ocr_service.requests.post")
    @patch("services.ocr_service.MISTRAL_API_KEY", "test-key-123")
    def test_connection_error_retries(self, mock_post, mock_sleep):
        """ConnectionError is retried with backoff."""
        from services.ocr_service import extract_text_with_ocr, MISTRAL_OCR_MAX_RETRIES

        mock_post.side_effect = requests.exceptions.ConnectionError("DNS failure")

        with pytest.raises(Exception, match="connection error"):
            extract_text_with_ocr(FAKE_PDF)

        assert mock_post.call_count == MISTRAL_OCR_MAX_RETRIES

    @patch("services.ocr_service.time.sleep")
    @patch("services.ocr_service.requests.post")
    @patch("services.ocr_service.MISTRAL_API_KEY", "test-key-123")
    def test_empty_pages_raises(self, mock_post, mock_sleep):
        """OCR returns no pages → raises Exception."""
        from services.ocr_service import extract_text_with_ocr

        mock_post.return_value = _make_response(200, {"pages": []})

        with pytest.raises(Exception, match="no pages"):
            extract_text_with_ocr(FAKE_PDF)

    @patch("services.ocr_service.time.sleep")
    @patch("services.ocr_service.requests.post")
    @patch("services.ocr_service.MISTRAL_API_KEY", "test-key-123")
    def test_request_payload_structure(self, mock_post, mock_sleep):
        """Verify the request payload sent to Mistral OCR API."""
        from services.ocr_service import extract_text_with_ocr

        mock_post.return_value = _make_response(200, OCR_SUCCESS_RESPONSE)

        extract_text_with_ocr(FAKE_PDF)

        call_kwargs = mock_post.call_args
        payload = call_kwargs.kwargs.get("json") or call_kwargs[1].get("json")

        assert payload["model"] == "mistral-ocr-latest"
        assert payload["document"]["type"] == "document_url"
        assert payload["document"]["document_url"].startswith("data:application/pdf;base64,")
        # include_image_base64 should NOT be in payload (was removed)
        assert "include_image_base64" not in str(payload)

    @patch("services.ocr_service.time.sleep")
    @patch("services.ocr_service.requests.post")
    @patch("services.ocr_service.MISTRAL_API_KEY", "test-key-123")
    def test_authorization_header(self, mock_post, mock_sleep):
        """Verify Bearer token is sent in Authorization header."""
        from services.ocr_service import extract_text_with_ocr

        mock_post.return_value = _make_response(200, OCR_SUCCESS_RESPONSE)

        extract_text_with_ocr(FAKE_PDF)

        call_kwargs = mock_post.call_args
        headers = call_kwargs.kwargs.get("headers") or call_kwargs[1].get("headers")
        assert headers["Authorization"] == "Bearer test-key-123"
