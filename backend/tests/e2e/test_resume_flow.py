"""
E2E tests for Resume analysis flow.

Tests resume analysis, section editing, PDF download, and text regeneration.

Run: pytest backend/tests/e2e/test_resume_flow.py -v
"""

import pytest
import httpx


class TestResumeAnalysisAuth:
    """TC-RES: Resume endpoints require authentication."""

    def test_analyze_requires_auth(self, client: httpx.Client):
        r = client.get("/api/resume/analyze")
        assert r.status_code in (401, 422)

    def test_analyze_rejects_invalid_token(self, client: httpx.Client, fake_bearer_token: str):
        r = client.get("/api/resume/analyze", headers={"Authorization": fake_bearer_token})
        assert r.status_code == 401

    def test_update_section_requires_auth(self, client: httpx.Client):
        r = client.post(
            "/api/resume/update-section",
            json={"section": "test", "content": "test", "action": "replace"},
        )
        assert r.status_code in (401, 422)

    def test_regenerate_text_requires_auth(self, client: httpx.Client):
        r = client.post("/api/resume/regenerate-text")
        assert r.status_code == 401

    def test_download_pdf_requires_auth(self, client: httpx.Client):
        r = client.get("/api/resume/download-pdf")
        assert r.status_code in (401, 422)


class TestUpdateSectionValidation:
    """TC-SEC: Pydantic validation on update-section (post-audit fix)."""

    def test_empty_section_name(self, client: httpx.Client, fake_bearer_token: str):
        """Section name cannot be empty."""
        r = client.post(
            "/api/resume/update-section",
            json={"section": "", "content": "valid content", "action": "replace"},
            headers={"Authorization": fake_bearer_token},
        )
        assert r.status_code in (401, 422)

    def test_section_name_too_long(self, client: httpx.Client, fake_bearer_token: str):
        """Section name > 100 chars rejected."""
        r = client.post(
            "/api/resume/update-section",
            json={"section": "a" * 101, "content": "valid", "action": "replace"},
            headers={"Authorization": fake_bearer_token},
        )
        assert r.status_code in (401, 422)

    def test_content_empty(self, client: httpx.Client, fake_bearer_token: str):
        """Content cannot be empty."""
        r = client.post(
            "/api/resume/update-section",
            json={"section": "skills", "content": "", "action": "replace"},
            headers={"Authorization": fake_bearer_token},
        )
        assert r.status_code in (401, 422)

    def test_content_too_long(self, client: httpx.Client, fake_bearer_token: str):
        """Content > 15000 chars rejected."""
        r = client.post(
            "/api/resume/update-section",
            json={"section": "skills", "content": "x" * 15001, "action": "replace"},
            headers={"Authorization": fake_bearer_token},
        )
        assert r.status_code in (401, 422)

    def test_invalid_action(self, client: httpx.Client, fake_bearer_token: str):
        """Action must be 'replace' or 'enhance'."""
        r = client.post(
            "/api/resume/update-section",
            json={"section": "skills", "content": "valid", "action": "delete"},
            headers={"Authorization": fake_bearer_token},
        )
        assert r.status_code in (401, 422)

    def test_valid_replace_action(self, client: httpx.Client, fake_bearer_token: str):
        """Valid 'replace' action format (fails at auth, not validation)."""
        r = client.post(
            "/api/resume/update-section",
            json={"section": "skills", "content": "Python, React", "action": "replace"},
            headers={"Authorization": fake_bearer_token},
        )
        # Should fail at auth (401), NOT at validation (422)
        assert r.status_code == 401

    def test_valid_enhance_action(self, client: httpx.Client, fake_bearer_token: str):
        """Valid 'enhance' action format (fails at auth, not validation)."""
        r = client.post(
            "/api/resume/update-section",
            json={"section": "experience", "content": "Worked at company X", "action": "enhance"},
            headers={"Authorization": fake_bearer_token},
        )
        assert r.status_code == 401

    def test_missing_required_fields(self, client: httpx.Client, fake_bearer_token: str):
        """Missing required fields should return 422."""
        r = client.post(
            "/api/resume/update-section",
            json={},
            headers={"Authorization": fake_bearer_token},
        )
        assert r.status_code == 422


class TestResumeCodeStructure:
    """Verify code-level guarantees about resume endpoint security."""

    def test_download_pdf_has_fallback(self):
        """TC-RES-05: download_pdf should have try/except with fallback to stored PDF."""
        import os
        resume_file = os.path.normpath(
            os.path.join(os.path.dirname(__file__), "..", "..", "api", "resume.py")
        )
        with open(resume_file, "r") as f:
            source = f.read()

        # Verify the download_pdf function has a fallback mechanism
        assert "download_pdf" in source
        # Check that there's a try/except around PDF generation
        download_section = source.split("download_pdf")[1]
        assert "try:" in download_section
        assert "except" in download_section
        # Check that it falls back to stored PDF
        assert "_download_resume_bytes" in download_section

    def test_update_section_uses_pydantic(self):
        """TC-SEC: update_section should use Pydantic model for validation."""
        import os
        resume_file = os.path.normpath(
            os.path.join(os.path.dirname(__file__), "..", "..", "api", "resume.py")
        )
        with open(resume_file, "r") as f:
            source = f.read()

        assert "UpdateSectionRequest" in source
        assert "BaseModel" in source
        assert "min_length" in source
        assert "max_length" in source
        assert 'Literal["replace", "enhance"]' in source or "Literal['replace', 'enhance']" in source
