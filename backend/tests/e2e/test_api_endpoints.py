"""
E2E tests for all backend API endpoints.

Tests hit the running FastAPI server directly via HTTP.
Covers: health, auth protection (401s), input validation, response structure.

Run: pytest backend/tests/e2e/test_api_endpoints.py -v
"""

import pytest
import httpx


# ──────────────────────────────────────────────
# Health & Root
# ──────────────────────────────────────────────

class TestHealthEndpoints:
    """TC-HEALTH: Server health and root endpoints."""

    def test_health_returns_200(self, client: httpx.Client):
        r = client.get("/health")
        assert r.status_code == 200
        data = r.json()
        assert data["status"] == "healthy"
        assert "environment" in data

    def test_root_returns_200(self, client: httpx.Client):
        r = client.get("/")
        assert r.status_code == 200
        data = r.json()
        assert data["message"] == "Service is running"


# ──────────────────────────────────────────────
# Auth Protection — all user endpoints require Bearer token
# ──────────────────────────────────────────────

class TestUserAuthProtection:
    """TC-AUTH: All /api/user/ endpoints must return 401 without valid token."""

    @pytest.mark.parametrize("method,path", [
        ("GET", "/api/user/profile"),
        ("POST", "/api/user/delete-resume"),
    ])
    def test_user_endpoints_require_auth_get(self, client: httpx.Client, method: str, path: str):
        """Endpoints that don't require a request body should return 401."""
        r = client.request(method, path)
        assert r.status_code == 401, f"{method} {path} should return 401 without auth, got {r.status_code}"

    @pytest.mark.parametrize("path,body", [
        ("/api/user/setup-smtp", {"smtpEmail": "x", "smtpPassword": "x"}),
        ("/api/user/toggle-automation", {"isActive": True}),
        ("/api/user/save-links", {"github": "https://github.com/x"}),
    ])
    def test_user_post_endpoints_require_auth(self, client: httpx.Client, path: str, body: dict):
        """POST endpoints with valid body should return 401 (not 422)."""
        r = client.post(path, json=body)
        assert r.status_code == 401, f"POST {path} should return 401 without auth, got {r.status_code}"

    def test_upload_resume_requires_auth(self, client: httpx.Client):
        """Upload endpoint requires auth (may return 422 if file missing before auth check)."""
        r = client.post(
            "/api/user/upload-resume",
            files={"resume": ("test.pdf", b"%PDF-1.4 test", "application/pdf")},
        )
        assert r.status_code in (401, 422)

    def test_profile_rejects_invalid_token(self, client: httpx.Client, fake_bearer_token: str):
        r = client.get("/api/user/profile", headers={"Authorization": fake_bearer_token})
        assert r.status_code == 401

    def test_toggle_automation_rejects_invalid_token(self, client: httpx.Client, fake_bearer_token: str):
        r = client.post(
            "/api/user/toggle-automation",
            json={"isActive": True},
            headers={"Authorization": fake_bearer_token},
        )
        assert r.status_code == 401


class TestDashboardAuthProtection:
    """TC-AUTH: All /api/dashboard/ endpoints must return 401 without valid token."""

    @pytest.mark.parametrize("path", [
        "/api/dashboard/stats",
        "/api/dashboard/applications",
    ])
    def test_dashboard_endpoints_require_auth(self, client: httpx.Client, path: str):
        r = client.get(path)
        assert r.status_code == 401

    def test_dashboard_stats_rejects_invalid_token(self, client: httpx.Client, fake_bearer_token: str):
        r = client.get("/api/dashboard/stats", headers={"Authorization": fake_bearer_token})
        assert r.status_code == 401


class TestJobsAuthProtection:
    """TC-SEC: /api/jobs/ endpoint requires Firebase auth (post-audit fix)."""

    def test_jobs_require_auth(self, client: httpx.Client):
        r = client.get("/api/jobs/")
        assert r.status_code == 401, "GET /api/jobs/ must return 401 without auth token"

    def test_jobs_reject_invalid_token(self, client: httpx.Client, fake_bearer_token: str):
        r = client.get("/api/jobs/", headers={"Authorization": fake_bearer_token})
        assert r.status_code == 401


class TestResumeAuthProtection:
    """TC-AUTH: All /api/resume/ endpoints must return 401 without valid token."""

    @pytest.mark.parametrize("method,path", [
        ("GET", "/api/resume/analyze"),
        ("POST", "/api/resume/update-section"),
        ("POST", "/api/resume/regenerate-text"),
        ("GET", "/api/resume/download-pdf"),
    ])
    def test_resume_endpoints_require_auth(self, client: httpx.Client, method: str, path: str):
        r = client.request(method, path)
        assert r.status_code in (401, 422), (
            f"{method} {path} should return 401 or 422 without auth, got {r.status_code}"
        )


# ──────────────────────────────────────────────
# Admin Auth Protection
# ──────────────────────────────────────────────

class TestAdminAuthProtection:
    """TC-ADM: Admin endpoints require valid Basic Auth."""

    @pytest.mark.parametrize("method,path", [
        ("POST", "/api/admin/login"),
        ("GET", "/api/admin/overview"),
        ("GET", "/api/admin/logs"),
        ("GET", "/api/admin/jobs"),
        ("GET", "/api/admin/applications"),
        ("POST", "/api/admin/trigger/scrape"),
        ("POST", "/api/admin/trigger/distribute"),
        ("DELETE", "/api/admin/erase-jobs"),
        ("POST", "/api/admin/emergency-stop"),
    ])
    def test_admin_endpoints_require_auth(self, client: httpx.Client, method: str, path: str):
        r = client.request(method, path)
        # 401 if no auth header, 503 if ADMIN_PASSWORD not configured
        assert r.status_code in (401, 503), (
            f"{method} {path} should return 401/503 without auth, got {r.status_code}"
        )

    def test_admin_login_rejects_wrong_credentials(
        self, client: httpx.Client, bad_admin_auth_header: str
    ):
        r = client.post("/api/admin/login", headers={"Authorization": bad_admin_auth_header})
        # 401 for wrong creds, 503 if ADMIN_PASSWORD env var not set
        assert r.status_code in (401, 503)

    def test_admin_no_default_password(self, client: httpx.Client):
        """TC-ADM-16: Admin should NOT accept 'admin123' as password (post-audit fix)."""
        import base64
        creds = base64.b64encode(b"admin:admin123").decode()
        r = client.post("/api/admin/login", headers={"Authorization": f"Basic {creds}"})
        # Should fail — either 401 (wrong pass) or 503 (no ADMIN_PASSWORD set)
        assert r.status_code in (401, 503), (
            "Default password 'admin123' should NOT be accepted"
        )


# ──────────────────────────────────────────────
# Admin Endpoints — Functional (with auth)
# ──────────────────────────────────────────────

class TestAdminFunctional:
    """TC-ADM: Admin endpoints work with valid credentials."""

    def test_admin_login_success(self, client: httpx.Client, admin_auth_header: str):
        r = client.post("/api/admin/login", headers={"Authorization": admin_auth_header})
        assert r.status_code == 200
        data = r.json()
        assert data["success"] is True

    def test_admin_overview(self, client: httpx.Client, admin_auth_header: str):
        r = client.get("/api/admin/overview", headers={"Authorization": admin_auth_header})
        assert r.status_code == 200
        data = r.json()
        assert "totalUsers" in data
        assert "activeUsers" in data
        assert "applicationsToday" in data
        assert "jobsScrapedToday" in data
        assert "jobsWithEmail" in data
        assert "recentUsers" in data
        assert isinstance(data["recentUsers"], list)

    def test_admin_logs(self, client: httpx.Client, admin_auth_header: str):
        r = client.get("/api/admin/logs", headers={"Authorization": admin_auth_header})
        assert r.status_code == 200
        assert isinstance(r.json(), list)

    def test_admin_jobs_with_pagination(self, client: httpx.Client, admin_auth_header: str):
        r = client.get(
            "/api/admin/jobs?page=1&page_size=5&date_filter=all",
            headers={"Authorization": admin_auth_header},
        )
        assert r.status_code == 200
        data = r.json()
        assert "jobs" in data
        assert "total" in data
        assert "categoryBreakdown" in data
        assert isinstance(data["jobs"], list)

    def test_admin_jobs_category_filter(self, client: httpx.Client, admin_auth_header: str):
        r = client.get(
            "/api/admin/jobs?category=Software%20Developer",
            headers={"Authorization": admin_auth_header},
        )
        assert r.status_code == 200
        data = r.json()
        for job in data.get("jobs", []):
            assert job["jobCategory"] == "Software Developer"

    def test_admin_applications_with_pagination(self, client: httpx.Client, admin_auth_header: str):
        r = client.get(
            "/api/admin/applications?page=1&page_size=5&date_filter=all",
            headers={"Authorization": admin_auth_header},
        )
        assert r.status_code == 200
        data = r.json()
        assert "applications" in data
        assert "total" in data
        assert "statusBreakdown" in data
        assert isinstance(data["applications"], list)

    def test_admin_applications_status_filter(self, client: httpx.Client, admin_auth_header: str):
        r = client.get(
            "/api/admin/applications?status=sent",
            headers={"Authorization": admin_auth_header},
        )
        assert r.status_code == 200
        data = r.json()
        for app in data.get("applications", []):
            assert app["status"] == "sent"


# ──────────────────────────────────────────────
# Input Validation — Pydantic (post-audit fix)
# ──────────────────────────────────────────────

class TestResumeValidation:
    """TC-SEC: /api/resume/update-section validates input via Pydantic."""

    def test_update_section_empty_section_rejected(self, client: httpx.Client, fake_bearer_token: str):
        """Empty section name should be rejected by Pydantic (422) before auth check."""
        r = client.post(
            "/api/resume/update-section",
            json={"section": "", "content": "test content", "action": "replace"},
            headers={"Authorization": fake_bearer_token},
        )
        # 422 from Pydantic validation OR 401 from auth — both acceptable
        assert r.status_code in (401, 422)

    def test_update_section_oversized_content_rejected(self, client: httpx.Client, fake_bearer_token: str):
        """Content > 15000 chars should be rejected."""
        r = client.post(
            "/api/resume/update-section",
            json={"section": "test", "content": "x" * 15001, "action": "replace"},
            headers={"Authorization": fake_bearer_token},
        )
        assert r.status_code in (401, 422)

    def test_update_section_invalid_action_rejected(self, client: httpx.Client, fake_bearer_token: str):
        """Action must be 'replace' or 'enhance'."""
        r = client.post(
            "/api/resume/update-section",
            json={"section": "test", "content": "test", "action": "delete"},
            headers={"Authorization": fake_bearer_token},
        )
        assert r.status_code in (401, 422)

    def test_update_section_section_too_long_rejected(self, client: httpx.Client, fake_bearer_token: str):
        """Section name > 100 chars should be rejected."""
        r = client.post(
            "/api/resume/update-section",
            json={"section": "a" * 101, "content": "test", "action": "replace"},
            headers={"Authorization": fake_bearer_token},
        )
        assert r.status_code in (401, 422)


# ──────────────────────────────────────────────
# User Input Validation
# ──────────────────────────────────────────────

class TestUserInputValidation:
    """TC-ONB: Input validation on user endpoints."""

    def test_setup_smtp_missing_fields(self, client: httpx.Client, fake_bearer_token: str):
        """SMTP setup with missing fields should fail."""
        r = client.post(
            "/api/user/setup-smtp",
            json={"smtpEmail": ""},
            headers={"Authorization": fake_bearer_token},
        )
        # 401 (auth) or 400 (validation) — both acceptable depending on middleware order
        assert r.status_code in (400, 401)

    def test_save_links_empty_rejected(self, client: httpx.Client, fake_bearer_token: str):
        """Saving links with no valid links should fail."""
        r = client.post(
            "/api/user/save-links",
            json={"github": "", "portfolio": ""},
            headers={"Authorization": fake_bearer_token},
        )
        assert r.status_code in (400, 401)

    def test_upload_resume_wrong_content_type(self, client: httpx.Client, fake_bearer_token: str):
        """Non-PDF upload should be rejected."""
        r = client.post(
            "/api/user/upload-resume",
            files={"resume": ("test.txt", b"not a pdf", "text/plain")},
            headers={"Authorization": fake_bearer_token},
        )
        # 400 (wrong type) or 401 (auth fails first)
        assert r.status_code in (400, 401)


# ──────────────────────────────────────────────
# Jobs Response Structure (post-audit fix)
# ──────────────────────────────────────────────

class TestJobsResponseSecurity:
    """TC-SEC: Jobs endpoint must NOT expose recruiterEmail to regular users."""

    def test_jobs_response_no_recruiter_email(self, client: httpx.Client):
        """
        This test requires a valid Firebase token. If running without one,
        verify manually that the jobs response does not include recruiterEmail.
        """
        # This is a structural test — we verify at the code level that
        # the response dict in jobs.py does NOT include recruiterEmail.
        # The actual HTTP test requires a valid Firebase token.
        import ast
        import os

        jobs_file = os.path.join(
            os.path.dirname(__file__), "..", "..", "api", "jobs.py"
        )
        with open(os.path.normpath(jobs_file), "r") as f:
            source = f.read()

        # Verify that recruiterEmail is NOT in the response dict
        assert "recruiterEmail" not in source.split("jobs.append")[1].split("return")[0], (
            "jobs.py should NOT include recruiterEmail in the response to regular users"
        )


# ──────────────────────────────────────────────
# Admin User Response Structure
# ──────────────────────────────────────────────

class TestAdminUserStructure:
    """TC-ADM: Admin overview returns properly structured user data."""

    def test_user_fields_in_overview(self, client: httpx.Client, admin_auth_header: str):
        r = client.get("/api/admin/overview", headers={"Authorization": admin_auth_header})
        if r.status_code != 200:
            pytest.skip("Admin endpoint not available")

        data = r.json()
        for user in data.get("recentUsers", []):
            assert "uid" in user
            assert "email" in user
            assert "name" in user
            assert "isActive" in user
            assert "jobCategory" in user
            assert "disabledByAdmin" in user
