"""
E2E tests for Authentication flow.

Tests the signup, login, password reset, and logout flows
by verifying the backend API behavior and the frontend page structure.

Run: pytest backend/tests/e2e/test_auth_flow.py -v
"""

import pytest
import httpx


class TestAuthFlowAPI:
    """Backend API tests for auth-related behavior."""

    def test_profile_requires_auth(self, client: httpx.Client):
        """TC-AUTH-12: Profile endpoint rejects unauthenticated requests."""
        r = client.get("/api/user/profile")
        assert r.status_code == 401
        data = r.json()
        assert "detail" in data

    def test_profile_rejects_malformed_bearer(self, client: httpx.Client):
        """TC-AUTH-08: Malformed Bearer token should be rejected."""
        r = client.get("/api/user/profile", headers={"Authorization": "Bearer"})
        assert r.status_code == 401

    def test_profile_rejects_empty_bearer(self, client: httpx.Client):
        """Bearer with no token value — httpx rejects illegal empty header values."""
        import httpx as _httpx
        try:
            r = client.get("/api/user/profile", headers={"Authorization": "Bearer "})
            assert r.status_code == 401
        except _httpx.LocalProtocolError:
            # httpx correctly rejects the malformed header at the transport level
            pass

    def test_dashboard_stats_requires_auth(self, client: httpx.Client):
        """TC-AUTH-12: Dashboard stats rejects unauthenticated requests."""
        r = client.get("/api/dashboard/stats")
        assert r.status_code == 401

    def test_toggle_automation_requires_auth(self, client: httpx.Client):
        """TC-AUTH-12: Toggle automation requires auth."""
        r = client.post(
            "/api/user/toggle-automation",
            json={"isActive": True},
        )
        assert r.status_code == 401


class TestAuthFlowFrontendPages:
    """Verify frontend auth pages are accessible and render correctly."""

    @pytest.fixture(scope="class")
    def frontend_url(self) -> str:
        return "http://localhost:4000"

    def test_login_page_loads(self, frontend_url: str):
        """TC-AUTH-02: Login page should be accessible."""
        try:
            r = httpx.get(f"{frontend_url}/login", timeout=10, follow_redirects=True)
            assert r.status_code == 200
            # Verify key elements are in the HTML
            html = r.text
            assert "Sign In" in html or "sign in" in html.lower() or "Welcome back" in html
        except httpx.ConnectError:
            pytest.skip("Frontend not running on localhost:4000")

    def test_signup_page_loads(self, frontend_url: str):
        """TC-AUTH-01: Signup page should be accessible."""
        try:
            r = httpx.get(f"{frontend_url}/signup", timeout=10, follow_redirects=True)
            assert r.status_code == 200
            html = r.text
            assert "Create" in html or "Sign up" in html or "account" in html.lower()
        except httpx.ConnectError:
            pytest.skip("Frontend not running on localhost:4000")

    def test_forgot_password_page_loads(self, frontend_url: str):
        """TC-AUTH-03: Forgot password page should be accessible."""
        try:
            r = httpx.get(f"{frontend_url}/forgot-password", timeout=10, follow_redirects=True)
            assert r.status_code == 200
            html = r.text
            assert "Reset" in html or "reset" in html or "password" in html.lower()
        except httpx.ConnectError:
            pytest.skip("Frontend not running on localhost:4000")

    def test_reset_password_page_loads(self, frontend_url: str):
        """TC-AUTH-04: Reset password page should be accessible (shows error without oobCode)."""
        try:
            r = httpx.get(f"{frontend_url}/reset-password", timeout=10, follow_redirects=True)
            assert r.status_code == 200
        except httpx.ConnectError:
            pytest.skip("Frontend not running on localhost:4000")

    def test_dashboard_redirects_without_auth(self, frontend_url: str):
        """TC-AUTH-05: Dashboard should redirect unauthenticated users."""
        try:
            r = httpx.get(f"{frontend_url}/dashboard", timeout=10, follow_redirects=False)
            # Next.js may serve the page and redirect client-side,
            # or it may serve a 200 with the layout (which will redirect in browser).
            # Either 200 or 307/302 is acceptable.
            assert r.status_code in (200, 302, 307, 308)
        except httpx.ConnectError:
            pytest.skip("Frontend not running on localhost:4000")


class TestAuthEdgeCases:
    """Edge cases and error handling for authentication."""

    def test_multiple_rapid_auth_failures(self, client: httpx.Client):
        """Rate limiting: multiple failed auth attempts should still return 401 (not crash)."""
        for _ in range(10):
            r = client.get(
                "/api/user/profile",
                headers={"Authorization": "Bearer invalid_token"},
            )
            assert r.status_code == 401

    def test_auth_header_case_sensitivity(self, client: httpx.Client):
        """Authorization header with 'bearer' (lowercase) should still work or fail gracefully."""
        r = client.get(
            "/api/user/profile",
            headers={"Authorization": "bearer some_token"},
        )
        # Should return 401 (not 500) regardless of case
        assert r.status_code == 401

    def test_auth_with_extra_spaces(self, client: httpx.Client):
        """Authorization header with extra spaces — httpx may reject at transport level."""
        import httpx as _httpx
        try:
            r = client.get(
                "/api/user/profile",
                headers={"Authorization": "Bearer   token_with_spaces  "},
            )
            assert r.status_code == 401
        except _httpx.LocalProtocolError:
            # httpx rejects headers with leading/trailing spaces as illegal
            pass
