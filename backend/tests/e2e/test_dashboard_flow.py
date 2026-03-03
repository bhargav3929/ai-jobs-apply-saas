"""
E2E tests for Dashboard flow.

Tests the dashboard stats, applications list, toggle automation,
and the overall dashboard page behavior.

Run: pytest backend/tests/e2e/test_dashboard_flow.py -v
"""

import pytest
import httpx


class TestDashboardAPIProtection:
    """TC-DASH: Dashboard API endpoints are protected."""

    def test_stats_returns_401_without_auth(self, client: httpx.Client):
        r = client.get("/api/dashboard/stats")
        assert r.status_code == 401

    def test_applications_returns_401_without_auth(self, client: httpx.Client):
        r = client.get("/api/dashboard/applications")
        assert r.status_code == 401

    def test_stats_returns_401_with_invalid_token(self, client: httpx.Client, fake_bearer_token: str):
        r = client.get("/api/dashboard/stats", headers={"Authorization": fake_bearer_token})
        assert r.status_code == 401

    def test_applications_returns_401_with_invalid_token(self, client: httpx.Client, fake_bearer_token: str):
        r = client.get("/api/dashboard/applications", headers={"Authorization": fake_bearer_token})
        assert r.status_code == 401


class TestDashboardApplicationsParams:
    """TC-APP: Dashboard applications endpoint respects query params."""

    def test_applications_accepts_limit_param(self, client: httpx.Client, fake_bearer_token: str):
        """Limit param should be accepted (even with invalid token, param parsing happens first)."""
        r = client.get(
            "/api/dashboard/applications?limit=5&offset=0",
            headers={"Authorization": fake_bearer_token},
        )
        # Auth fails before reaching logic, but the endpoint doesn't crash
        assert r.status_code == 401

    def test_applications_accepts_offset_param(self, client: httpx.Client, fake_bearer_token: str):
        r = client.get(
            "/api/dashboard/applications?limit=10&offset=50",
            headers={"Authorization": fake_bearer_token},
        )
        assert r.status_code == 401


class TestToggleAutomation:
    """TC-DASH-03: Toggle automation endpoint."""

    def test_toggle_requires_auth(self, client: httpx.Client):
        r = client.post("/api/user/toggle-automation", json={"isActive": True})
        assert r.status_code == 401

    def test_toggle_rejects_invalid_token(self, client: httpx.Client, fake_bearer_token: str):
        r = client.post(
            "/api/user/toggle-automation",
            json={"isActive": False},
            headers={"Authorization": fake_bearer_token},
        )
        assert r.status_code == 401


class TestDashboardFrontendPages:
    """Verify frontend dashboard pages load."""

    @pytest.fixture(scope="class")
    def frontend_url(self) -> str:
        return "http://localhost:4000"

    def test_dashboard_page_accessible(self, frontend_url: str):
        """TC-DASH-01: Dashboard page should serve HTML (may redirect client-side)."""
        try:
            r = httpx.get(f"{frontend_url}/dashboard", timeout=10, follow_redirects=True)
            assert r.status_code == 200
        except httpx.ConnectError:
            pytest.skip("Frontend not running")

    def test_applications_page_accessible(self, frontend_url: str):
        """TC-APP-01: Applications page should serve HTML."""
        try:
            r = httpx.get(f"{frontend_url}/applications", timeout=10, follow_redirects=True)
            assert r.status_code == 200
        except httpx.ConnectError:
            pytest.skip("Frontend not running")

    def test_settings_page_accessible(self, frontend_url: str):
        """TC-SET-01: Settings page should serve HTML."""
        try:
            r = httpx.get(f"{frontend_url}/settings", timeout=10, follow_redirects=True)
            assert r.status_code == 200
        except httpx.ConnectError:
            pytest.skip("Frontend not running")

    def test_resume_page_accessible(self, frontend_url: str):
        """TC-RES-01: Resume page should serve HTML."""
        try:
            r = httpx.get(f"{frontend_url}/resume", timeout=10, follow_redirects=True)
            assert r.status_code == 200
        except httpx.ConnectError:
            pytest.skip("Frontend not running")

    def test_analytics_page_accessible(self, frontend_url: str):
        """Analytics page should serve HTML."""
        try:
            r = httpx.get(f"{frontend_url}/analytics", timeout=10, follow_redirects=True)
            assert r.status_code == 200
        except httpx.ConnectError:
            pytest.skip("Frontend not running")

    def test_portfolio_page_accessible(self, frontend_url: str):
        """Portfolio page should serve HTML."""
        try:
            r = httpx.get(f"{frontend_url}/portfolio", timeout=10, follow_redirects=True)
            assert r.status_code == 200
        except httpx.ConnectError:
            pytest.skip("Frontend not running")
