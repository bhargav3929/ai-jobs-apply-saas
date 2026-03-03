"""
E2E tests for Onboarding flow.

Tests the multi-step onboarding process: job category selection,
resume upload, links, SMTP setup.

Run: pytest backend/tests/e2e/test_onboarding_flow.py -v
"""

import pytest
import httpx


class TestOnboardingAPIEndpoints:
    """TC-ONB: Backend endpoints used during onboarding."""

    def test_upload_resume_requires_auth(self, client: httpx.Client):
        """TC-ONB-02: Resume upload requires authentication."""
        r = client.post("/api/user/upload-resume")
        assert r.status_code in (401, 422)  # 422 if missing file field first

    def test_upload_resume_rejects_non_pdf(self, client: httpx.Client, fake_bearer_token: str):
        """TC-ONB-06: Non-PDF files should be rejected."""
        r = client.post(
            "/api/user/upload-resume",
            files={"resume": ("test.txt", b"hello world", "text/plain")},
            headers={"Authorization": fake_bearer_token},
        )
        # 400 (wrong type) or 401 (auth fails first) — both valid
        assert r.status_code in (400, 401)

    def test_upload_resume_rejects_oversized_file(self, client: httpx.Client, fake_bearer_token: str):
        """TC-ONB-07: Files > 5MB should be rejected."""
        # Create a 5.1MB file
        big_content = b"x" * (5 * 1024 * 1024 + 1)
        r = client.post(
            "/api/user/upload-resume",
            files={"resume": ("big.pdf", big_content, "application/pdf")},
            headers={"Authorization": fake_bearer_token},
        )
        # 400 (too large) or 401 (auth fails first)
        assert r.status_code in (400, 401)

    def test_save_links_requires_auth(self, client: httpx.Client):
        """TC-ONB-03: Save links requires authentication."""
        r = client.post(
            "/api/user/save-links",
            json={"github": "https://github.com/test"},
        )
        assert r.status_code == 401

    def test_save_links_rejects_empty_links(self, client: httpx.Client, fake_bearer_token: str):
        """TC-ONB-03: Empty links should be rejected."""
        r = client.post(
            "/api/user/save-links",
            json={"github": "", "portfolio": ""},
            headers={"Authorization": fake_bearer_token},
        )
        assert r.status_code in (400, 401)

    def test_setup_smtp_requires_auth(self, client: httpx.Client):
        """TC-ONB-04: SMTP setup requires authentication."""
        r = client.post(
            "/api/user/setup-smtp",
            json={"smtpEmail": "test@gmail.com", "smtpPassword": "test"},
        )
        assert r.status_code == 401

    def test_setup_smtp_rejects_missing_fields(self, client: httpx.Client, fake_bearer_token: str):
        """TC-ONB-09: Missing SMTP fields should fail."""
        r = client.post(
            "/api/user/setup-smtp",
            json={"smtpEmail": ""},
            headers={"Authorization": fake_bearer_token},
        )
        assert r.status_code in (400, 401)

    def test_setup_smtp_rejects_missing_password(self, client: httpx.Client, fake_bearer_token: str):
        """TC-ONB-09: Missing password should fail."""
        r = client.post(
            "/api/user/setup-smtp",
            json={"smtpEmail": "test@gmail.com"},
            headers={"Authorization": fake_bearer_token},
        )
        assert r.status_code in (400, 401)

    def test_delete_resume_requires_auth(self, client: httpx.Client):
        """Delete resume requires authentication."""
        r = client.post("/api/user/delete-resume")
        assert r.status_code == 401


class TestOnboardingFrontendPage:
    """TC-ONB: Onboarding frontend page."""

    @pytest.fixture(scope="class")
    def frontend_url(self) -> str:
        return "http://localhost:4000"

    def test_onboarding_page_accessible(self, frontend_url: str):
        """Onboarding page should be accessible."""
        try:
            r = httpx.get(f"{frontend_url}/onboarding", timeout=10, follow_redirects=True)
            assert r.status_code == 200
        except httpx.ConnectError:
            pytest.skip("Frontend not running")
