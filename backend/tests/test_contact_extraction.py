"""Tests for contact extraction portfolio validation.

Verifies that _validate_portfolio_url() correctly distinguishes personal
portfolio URLs from project URLs, and that the merging logic in resume.py
is conservative about portfolio values.
"""

import pytest
from services.ocr_service import _validate_portfolio_url


# ---------------------------------------------------------------------------
# _validate_portfolio_url tests
# ---------------------------------------------------------------------------


class TestValidatePortfolioUrl:
    """Unit tests for the portfolio URL validation heuristic."""

    def test_project_url_moved_to_other_links(self):
        """URL like 'mycourierdesk.com' for candidate 'John Smith' is a project URL."""
        contact = {
            "name": "John Smith",
            "portfolio": "https://mycourierdesk.com",
            "otherLinks": [],
        }
        result = _validate_portfolio_url(contact)

        assert result["portfolio"] is None
        assert "https://mycourierdesk.com" in result["otherLinks"]

    def test_name_matching_url_kept_as_portfolio(self):
        """URL like 'johnsmith.dev' for candidate 'John Smith' is a valid portfolio."""
        contact = {
            "name": "John Smith",
            "portfolio": "https://johnsmith.dev",
            "otherLinks": [],
        }
        result = _validate_portfolio_url(contact)

        assert result["portfolio"] == "https://johnsmith.dev"

    def test_partial_name_match_kept(self):
        """URL containing first name is kept (e.g., 'john.dev' for 'John Smith')."""
        contact = {
            "name": "John Smith",
            "portfolio": "https://john.dev",
            "otherLinks": [],
        }
        result = _validate_portfolio_url(contact)

        assert result["portfolio"] == "https://john.dev"

    def test_github_io_always_valid(self):
        """github.io URLs are always valid as portfolio regardless of name match."""
        contact = {
            "name": "John Smith",
            "portfolio": "https://randomname.github.io",
            "otherLinks": [],
        }
        result = _validate_portfolio_url(contact)

        assert result["portfolio"] == "https://randomname.github.io"

    def test_netlify_app_always_valid(self):
        """netlify.app URLs are always valid as portfolio."""
        contact = {
            "name": "John Smith",
            "portfolio": "https://my-portfolio.netlify.app",
            "otherLinks": [],
        }
        result = _validate_portfolio_url(contact)

        assert result["portfolio"] == "https://my-portfolio.netlify.app"

    def test_vercel_app_always_valid(self):
        """vercel.app URLs are always valid as portfolio."""
        contact = {
            "name": "Jane Doe",
            "portfolio": "https://portfolio.vercel.app",
            "otherLinks": [],
        }
        result = _validate_portfolio_url(contact)

        assert result["portfolio"] == "https://portfolio.vercel.app"

    def test_about_me_always_valid(self):
        """about.me URLs are always valid as portfolio."""
        contact = {
            "name": "Jane Doe",
            "portfolio": "https://about.me/janedoe",
            "otherLinks": [],
        }
        result = _validate_portfolio_url(contact)

        assert result["portfolio"] == "https://about.me/janedoe"

    def test_null_portfolio_unchanged(self):
        """Null portfolio stays null (no crash)."""
        contact = {
            "name": "John Smith",
            "portfolio": None,
            "otherLinks": [],
        }
        result = _validate_portfolio_url(contact)

        assert result["portfolio"] is None

    def test_empty_name_skips_validation(self):
        """If name is empty, validation is skipped (can't compare)."""
        contact = {
            "name": "",
            "portfolio": "https://randomproject.com",
            "otherLinks": [],
        }
        result = _validate_portfolio_url(contact)

        # Can't validate without a name, so portfolio stays
        assert result["portfolio"] == "https://randomproject.com"

    def test_taskmanager_io_is_project_url(self):
        """URL like 'taskmanager.io' in project description is a project URL."""
        contact = {
            "name": "Bhargav Kumar",
            "portfolio": "https://taskmanager.io",
            "otherLinks": [],
        }
        result = _validate_portfolio_url(contact)

        assert result["portfolio"] is None
        assert "https://taskmanager.io" in result["otherLinks"]

    def test_no_duplicate_in_other_links(self):
        """If portfolio URL is already in otherLinks, don't add it again."""
        contact = {
            "name": "John Smith",
            "portfolio": "https://mycourierdesk.com",
            "otherLinks": ["https://mycourierdesk.com"],
        }
        result = _validate_portfolio_url(contact)

        assert result["portfolio"] is None
        assert result["otherLinks"].count("https://mycourierdesk.com") == 1

    def test_www_prefix_stripped_for_matching(self):
        """www. prefix in URL domain doesn't affect name matching."""
        contact = {
            "name": "John Smith",
            "portfolio": "https://www.johnsmith.com",
            "otherLinks": [],
        }
        result = _validate_portfolio_url(contact)

        assert result["portfolio"] == "https://www.johnsmith.com"

    def test_short_name_parts_ignored(self):
        """Name parts shorter than 3 chars are ignored to avoid false matches."""
        contact = {
            "name": "Li Bo",
            "portfolio": "https://randomapp.com",
            "otherLinks": [],
        }
        result = _validate_portfolio_url(contact)

        # "li" and "bo" are < 3 chars, so no name match is possible.
        # Since we can't validate the URL belongs to the candidate,
        # it gets moved to otherLinks as a precaution.
        assert result["portfolio"] is None
        assert "https://randomapp.com" in result["otherLinks"]

    def test_other_links_capped_at_five(self):
        """otherLinks should not exceed 5 entries after moving portfolio."""
        contact = {
            "name": "John Smith",
            "portfolio": "https://projectapp.com",
            "otherLinks": [f"https://link{i}.com" for i in range(5)],
        }
        result = _validate_portfolio_url(contact)

        assert result["portfolio"] is None
        assert len(result["otherLinks"]) <= 5
