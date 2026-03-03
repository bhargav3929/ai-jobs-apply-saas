"""
Shared fixtures for E2E testing of JobAgent.ai backend API.

These tests hit the running FastAPI server via HTTP — they are NOT unit tests.
Requires:
  - Backend running on http://127.0.0.1:8001
  - Firebase/Firestore configured (or mocked via env)
  - ADMIN_USERNAME / ADMIN_PASSWORD env vars set for admin tests
"""

import os
import time
import base64
import pytest
import httpx

BASE_URL = os.getenv("TEST_API_URL", "http://127.0.0.1:8001")
API_URL = f"{BASE_URL}/api"
REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379")

# Admin credentials — must match backend env vars
ADMIN_USERNAME = os.getenv("TEST_ADMIN_USERNAME", "admin")
ADMIN_PASSWORD = os.getenv("TEST_ADMIN_PASSWORD", os.getenv("ADMIN_PASSWORD", ""))


@pytest.fixture(scope="session")
def api_url() -> str:
    return API_URL


@pytest.fixture(scope="session")
def base_url() -> str:
    return BASE_URL


@pytest.fixture(scope="session")
def client() -> httpx.Client:
    """Reusable httpx client for the test session."""
    with httpx.Client(base_url=BASE_URL, timeout=30.0) as c:
        yield c


@pytest.fixture(scope="session")
def admin_auth_header() -> str:
    """Basic Auth header for admin endpoints."""
    if not ADMIN_PASSWORD:
        pytest.skip("ADMIN_PASSWORD not set — skipping admin tests")
    credentials = base64.b64encode(
        f"{ADMIN_USERNAME}:{ADMIN_PASSWORD}".encode()
    ).decode()
    return f"Basic {credentials}"


@pytest.fixture(scope="session")
def bad_admin_auth_header() -> str:
    """Invalid Basic Auth header for negative tests."""
    credentials = base64.b64encode(b"wrong:wrong").decode()
    return f"Basic {credentials}"


@pytest.fixture
def fake_bearer_token() -> str:
    """An invalid Firebase Bearer token for negative auth tests."""
    return "Bearer fake_invalid_token_12345"


@pytest.fixture
def no_auth_headers() -> dict:
    """Headers with no authorization — for testing 401 responses."""
    return {"Content-Type": "application/json"}


@pytest.fixture
def sample_pdf_bytes() -> bytes:
    """Minimal valid PDF bytes for upload testing."""
    # Minimal PDF 1.4 that pypdf can parse (1 blank page)
    return (
        b"%PDF-1.4\n"
        b"1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n"
        b"2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj\n"
        b"3 0 obj<</Type/Page/MediaBox[0 0 612 792]/Parent 2 0 R>>endobj\n"
        b"xref\n0 4\n"
        b"0000000000 65535 f \n"
        b"0000000009 00000 n \n"
        b"0000000058 00000 n \n"
        b"0000000115 00000 n \n"
        b"trailer<</Size 4/Root 1 0 R>>\n"
        b"startxref\n190\n%%EOF\n"
    )


@pytest.fixture(scope="session", autouse=True)
def flush_rate_limits():
    """Clear Redis rate-limit keys before the test session starts."""
    try:
        import redis
        r = redis.from_url(REDIS_URL, decode_responses=True)
        # Delete all rate_limit:* keys
        keys = r.keys("rate_limit:*")
        if keys:
            r.delete(*keys)
    except Exception:
        pass  # Redis not available — rate limiter will fail-open
    yield


@pytest.fixture(autouse=True)
def throttle_requests():
    """Small delay between tests to avoid triggering the 100 req/min rate limit."""
    yield
    time.sleep(0.7)
