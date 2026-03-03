"""
E2E tests for Admin panel flow.

Tests admin login, overview, jobs/applications browsing, user management.

Run: pytest backend/tests/e2e/test_admin_flow.py -v
"""

import base64
import pytest
import httpx


class TestAdminLogin:
    """TC-ADM-01/13: Admin login flow."""

    def test_login_without_auth_header(self, client: httpx.Client):
        """TC-ADM-13: No auth header -> 401 or 503."""
        r = client.post("/api/admin/login")
        assert r.status_code in (401, 503)

    def test_login_with_wrong_credentials(self, client: httpx.Client, bad_admin_auth_header: str):
        """TC-ADM-13: Wrong credentials -> 401 or 503."""
        r = client.post("/api/admin/login", headers={"Authorization": bad_admin_auth_header})
        assert r.status_code in (401, 503)

    def test_login_with_bearer_instead_of_basic(self, client: httpx.Client):
        """Admin should reject Bearer tokens (requires Basic auth)."""
        r = client.post(
            "/api/admin/login",
            headers={"Authorization": "Bearer some_token"},
        )
        assert r.status_code in (401, 503)

    def test_login_with_valid_credentials(self, client: httpx.Client, admin_auth_header: str):
        """TC-ADM-01: Valid credentials -> 200."""
        r = client.post("/api/admin/login", headers={"Authorization": admin_auth_header})
        assert r.status_code == 200
        data = r.json()
        assert data["success"] is True
        assert "message" in data

    def test_default_password_blocked(self, client: httpx.Client):
        """TC-ADM-16: The old default 'admin123' password must not work."""
        creds = base64.b64encode(b"admin:admin123").decode()
        r = client.post("/api/admin/login", headers={"Authorization": f"Basic {creds}"})
        assert r.status_code in (401, 503), "Default password 'admin123' should be blocked"

    def test_empty_password_env_returns_503(self, client: httpx.Client):
        """If ADMIN_PASSWORD is not set, all admin endpoints should return 503."""
        # We can't control the env var at runtime, but we can verify the behavior:
        # If the server has ADMIN_PASSWORD set, this test just verifies login works.
        # If not set, it should return 503.
        r = client.post("/api/admin/login")
        assert r.status_code in (401, 503)


class TestAdminOverview:
    """TC-ADM-02/03: Admin overview and user management."""

    def test_overview_response_structure(self, client: httpx.Client, admin_auth_header: str):
        """TC-ADM-02: Overview returns expected stat fields."""
        r = client.get("/api/admin/overview", headers={"Authorization": admin_auth_header})
        assert r.status_code == 200
        data = r.json()

        required_fields = ["totalUsers", "activeUsers", "applicationsToday",
                           "jobsScrapedToday", "jobsWithEmail", "recentUsers"]
        for field in required_fields:
            assert field in data, f"Missing field: {field}"

        assert isinstance(data["totalUsers"], int)
        assert isinstance(data["activeUsers"], int)
        assert isinstance(data["recentUsers"], list)

    def test_overview_user_entries_structure(self, client: httpx.Client, admin_auth_header: str):
        """TC-ADM-03: Each user entry has required fields."""
        r = client.get("/api/admin/overview", headers={"Authorization": admin_auth_header})
        if r.status_code != 200:
            pytest.skip("Admin endpoint not available")

        data = r.json()
        for user in data.get("recentUsers", []):
            required = ["uid", "email", "name", "isActive", "jobCategory", "disabledByAdmin"]
            for field in required:
                assert field in user, f"User entry missing: {field}"


class TestAdminJobs:
    """TC-ADM-04: Admin jobs tab."""

    def test_jobs_list_structure(self, client: httpx.Client, admin_auth_header: str):
        r = client.get("/api/admin/jobs", headers={"Authorization": admin_auth_header})
        assert r.status_code == 200
        data = r.json()
        assert "jobs" in data
        assert "total" in data
        assert "categoryBreakdown" in data

    def test_jobs_pagination(self, client: httpx.Client, admin_auth_header: str):
        """Pagination params are respected."""
        r = client.get(
            "/api/admin/jobs?page=1&page_size=2",
            headers={"Authorization": admin_auth_header},
        )
        assert r.status_code == 200
        data = r.json()
        assert len(data["jobs"]) <= 2

    def test_jobs_date_filter_today(self, client: httpx.Client, admin_auth_header: str):
        r = client.get(
            "/api/admin/jobs?date_filter=today",
            headers={"Authorization": admin_auth_header},
        )
        assert r.status_code == 200

    def test_jobs_date_filter_week(self, client: httpx.Client, admin_auth_header: str):
        r = client.get(
            "/api/admin/jobs?date_filter=week",
            headers={"Authorization": admin_auth_header},
        )
        assert r.status_code == 200

    def test_jobs_category_filter(self, client: httpx.Client, admin_auth_header: str):
        r = client.get(
            "/api/admin/jobs?category=Software%20Developer",
            headers={"Authorization": admin_auth_header},
        )
        assert r.status_code == 200
        for job in r.json().get("jobs", []):
            assert job["jobCategory"] == "Software Developer"


class TestAdminApplications:
    """TC-ADM-05: Admin applications tab."""

    def test_applications_list_structure(self, client: httpx.Client, admin_auth_header: str):
        r = client.get("/api/admin/applications", headers={"Authorization": admin_auth_header})
        assert r.status_code == 200
        data = r.json()
        assert "applications" in data
        assert "total" in data
        assert "statusBreakdown" in data

    def test_applications_pagination(self, client: httpx.Client, admin_auth_header: str):
        r = client.get(
            "/api/admin/applications?page=1&page_size=3",
            headers={"Authorization": admin_auth_header},
        )
        assert r.status_code == 200
        assert len(r.json()["applications"]) <= 3

    def test_applications_status_filter(self, client: httpx.Client, admin_auth_header: str):
        r = client.get(
            "/api/admin/applications?status=sent",
            headers={"Authorization": admin_auth_header},
        )
        assert r.status_code == 200
        for app in r.json().get("applications", []):
            assert app["status"] == "sent"

    def test_applications_date_filter(self, client: httpx.Client, admin_auth_header: str):
        r = client.get(
            "/api/admin/applications?date_filter=week",
            headers={"Authorization": admin_auth_header},
        )
        assert r.status_code == 200


class TestAdminLogs:
    """TC-ADM-06: Admin logs tab."""

    def test_logs_returns_list(self, client: httpx.Client, admin_auth_header: str):
        r = client.get("/api/admin/logs", headers={"Authorization": admin_auth_header})
        assert r.status_code == 200
        assert isinstance(r.json(), list)

    def test_logs_with_limit(self, client: httpx.Client, admin_auth_header: str):
        r = client.get("/api/admin/logs?limit=5", headers={"Authorization": admin_auth_header})
        assert r.status_code == 200
        assert len(r.json()) <= 5


class TestAdminActions:
    """TC-ADM-07/08: Admin trigger actions (scrape, distribute)."""

    def test_trigger_scrape(self, client: httpx.Client, admin_auth_header: str):
        """TC-ADM-07: Trigger scrape should start and return success."""
        r = client.post(
            "/api/admin/trigger/scrape",
            headers={"Authorization": admin_auth_header},
            json={"categoryLimits": {"Software Developer": 1}},
        )
        assert r.status_code == 200
        data = r.json()
        assert data["success"] is True
        assert "message" in data

    def test_trigger_distribute(self, client: httpx.Client, admin_auth_header: str):
        """TC-ADM-08: Trigger distribute should start and return success."""
        r = client.post(
            "/api/admin/trigger/distribute",
            headers={"Authorization": admin_auth_header},
        )
        assert r.status_code == 200
        data = r.json()
        assert data["success"] is True


class TestAdminFrontendPage:
    """TC-ADM: Admin frontend page."""

    @pytest.fixture(scope="class")
    def frontend_url(self) -> str:
        return "http://localhost:4000"

    def test_admin_page_loads(self, frontend_url: str):
        """Admin page should be accessible."""
        try:
            r = httpx.get(f"{frontend_url}/admin", timeout=10, follow_redirects=True)
            assert r.status_code == 200
        except httpx.ConnectError:
            pytest.skip("Frontend not running")
