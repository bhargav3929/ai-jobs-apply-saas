"""Tests for portfolio URL validation in OCR contact extraction.

Verifies that _validate_portfolio_url() correctly distinguishes personal
portfolio websites from project/product URLs, moving suspicious ones to
otherLinks.
"""

import pytest
from services.ocr_service import _validate_portfolio_url


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _make_contact(
    name: str | None = "John Smith",
    portfolio: str | None = None,
    other_links: list[str] | None = None,
) -> dict:
    """Build a minimal contact dict for testing."""
    return {
        "name": name,
        "email": "test@example.com",
        "phone": "+1-555-0100",
        "location": "New York, NY",
        "linkedin": None,
        "github": None,
        "portfolio": portfolio,
        "otherLinks": other_links or [],
    }


# ---------------------------------------------------------------------------
# Tests: portfolio kept (valid personal sites)
# ---------------------------------------------------------------------------


class TestPortfolioKept:
    """Cases where the portfolio URL should remain as-is."""

    def test_portfolio_matches_candidate_name(self):
        """Domain contains the candidate's name -- clearly personal."""
        contact = _make_contact(name="John Smith", portfolio="https://johnsmith.com")
        result = _validate_portfolio_url(contact)

        assert result["portfolio"] == "https://johnsmith.com"
        assert "https://johnsmith.com" not in result["otherLinks"]

    def test_portfolio_matches_first_name(self):
        """Domain contains the candidate's first name (>=3 chars)."""
        contact = _make_contact(name="John Smith", portfolio="https://john.dev")
        result = _validate_portfolio_url(contact)

        assert result["portfolio"] == "https://john.dev"

    def test_portfolio_matches_last_name(self):
        """Domain contains the candidate's last name."""
        contact = _make_contact(name="John Smith", portfolio="https://smith.io")
        result = _validate_portfolio_url(contact)

        assert result["portfolio"] == "https://smith.io"

    def test_github_io_always_kept(self):
        """github.io is a known personal platform -- kept regardless of name."""
        contact = _make_contact(name="Jane Doe", portfolio="https://janedoe.github.io")
        result = _validate_portfolio_url(contact)

        assert result["portfolio"] == "https://janedoe.github.io"

    def test_github_io_unrelated_name_still_kept(self):
        """github.io is kept even when domain doesn't match candidate name."""
        contact = _make_contact(name="Jane Doe", portfolio="https://randomuser.github.io")
        result = _validate_portfolio_url(contact)

        assert result["portfolio"] == "https://randomuser.github.io"

    def test_netlify_app_always_kept(self):
        """netlify.app is a known platform -- always kept."""
        contact = _make_contact(name="Alice Brown", portfolio="https://myportfolio.netlify.app")
        result = _validate_portfolio_url(contact)

        assert result["portfolio"] == "https://myportfolio.netlify.app"

    def test_vercel_app_always_kept(self):
        """vercel.app is a known platform -- always kept."""
        contact = _make_contact(name="Bob Lee", portfolio="https://bobsite.vercel.app")
        result = _validate_portfolio_url(contact)

        assert result["portfolio"] == "https://bobsite.vercel.app"

    def test_about_me_always_kept(self):
        """about.me is a known portfolio platform -- always kept."""
        contact = _make_contact(name="Charlie Kim", portfolio="https://about.me/charliekim")
        result = _validate_portfolio_url(contact)

        assert result["portfolio"] == "https://about.me/charliekim"

    def test_pages_dev_always_kept(self):
        """pages.dev (Cloudflare Pages) is a known platform -- always kept."""
        contact = _make_contact(name="Test User", portfolio="https://mysite.pages.dev")
        result = _validate_portfolio_url(contact)

        assert result["portfolio"] == "https://mysite.pages.dev"

    def test_wordpress_com_always_kept(self):
        """wordpress.com is a known platform -- always kept."""
        contact = _make_contact(name="Test User", portfolio="https://myblog.wordpress.com")
        result = _validate_portfolio_url(contact)

        assert result["portfolio"] == "https://myblog.wordpress.com"

    def test_dev_to_always_kept(self):
        """dev.to is a known platform -- always kept."""
        contact = _make_contact(name="Test User", portfolio="https://dev.to/testuser")
        result = _validate_portfolio_url(contact)

        assert result["portfolio"] == "https://dev.to/testuser"


# ---------------------------------------------------------------------------
# Tests: portfolio moved to otherLinks (suspicious project URLs)
# ---------------------------------------------------------------------------


class TestPortfolioMovedToOtherLinks:
    """Cases where the portfolio URL is suspicious and should be moved."""

    def test_project_url_moved(self):
        """Domain unrelated to candidate name -- treated as project URL."""
        contact = _make_contact(name="John Smith", portfolio="https://mycourierdesk.com")
        result = _validate_portfolio_url(contact)

        assert result["portfolio"] is None
        assert "https://mycourierdesk.com" in result["otherLinks"]

    def test_another_project_url_moved(self):
        """Another unrelated domain -- moved to otherLinks."""
        contact = _make_contact(name="Jane Doe", portfolio="https://taskmanager.io")
        result = _validate_portfolio_url(contact)

        assert result["portfolio"] is None
        assert "https://taskmanager.io" in result["otherLinks"]

    def test_product_url_moved(self):
        """Product-like domain unrelated to name -- moved."""
        contact = _make_contact(name="Alice Brown", portfolio="https://weatherdashboard.com")
        result = _validate_portfolio_url(contact)

        assert result["portfolio"] is None
        assert "https://weatherdashboard.com" in result["otherLinks"]

    def test_moved_url_not_duplicated_in_other_links(self):
        """If the URL is already in otherLinks, don't add it again."""
        contact = _make_contact(
            name="John Smith",
            portfolio="https://mycourierdesk.com",
            other_links=["https://mycourierdesk.com"],
        )
        result = _validate_portfolio_url(contact)

        assert result["portfolio"] is None
        assert result["otherLinks"].count("https://mycourierdesk.com") == 1

    def test_other_links_capped_at_five(self):
        """otherLinks should not exceed 5 entries after moving portfolio."""
        contact = _make_contact(
            name="John Smith",
            portfolio="https://projectsite.com",
            other_links=[f"https://link{i}.com" for i in range(5)],
        )
        result = _validate_portfolio_url(contact)

        assert result["portfolio"] is None
        assert len(result["otherLinks"]) <= 5


# ---------------------------------------------------------------------------
# Tests: edge cases (null, empty, no name)
# ---------------------------------------------------------------------------


class TestPortfolioEdgeCases:
    """Edge cases for portfolio validation."""

    def test_portfolio_is_none(self):
        """Portfolio is None -- no changes, early return."""
        contact = _make_contact(name="John Smith", portfolio=None)
        result = _validate_portfolio_url(contact)

        assert result["portfolio"] is None
        assert result["otherLinks"] == []

    def test_portfolio_is_empty_string(self):
        """Portfolio is empty string -- treated as falsy, early return."""
        contact = _make_contact(name="John Smith", portfolio="")
        result = _validate_portfolio_url(contact)

        assert result["portfolio"] == ""
        assert result["otherLinks"] == []

    def test_name_is_none_allows_all_portfolios(self):
        """When candidate name is None, can't validate -- all portfolios allowed."""
        contact = _make_contact(name=None, portfolio="https://randomproject.com")
        result = _validate_portfolio_url(contact)

        assert result["portfolio"] == "https://randomproject.com"

    def test_name_is_empty_allows_all_portfolios(self):
        """When candidate name is empty string, can't validate -- portfolio kept."""
        contact = _make_contact(name="", portfolio="https://randomproject.com")
        result = _validate_portfolio_url(contact)

        assert result["portfolio"] == "https://randomproject.com"

    def test_short_name_parts_ignored(self):
        """Name parts shorter than 3 chars are ignored for matching.

        Candidate 'Jo Li' has no parts >= 3 chars, so no name matching
        is possible. The function filters to parts >= 3, so with an empty
        list it falls through to the 'no match' branch.
        """
        contact = _make_contact(name="Jo Li", portfolio="https://randomsite.com")
        result = _validate_portfolio_url(contact)

        # Both name parts are < 3 chars, so domain_matches_name is False
        # and the portfolio gets moved to otherLinks
        assert result["portfolio"] is None
        assert "https://randomsite.com" in result["otherLinks"]

    def test_www_prefix_stripped(self):
        """www. prefix in portfolio URL domain is stripped for comparison."""
        contact = _make_contact(name="John Smith", portfolio="https://www.johnsmith.com")
        result = _validate_portfolio_url(contact)

        assert result["portfolio"] == "https://www.johnsmith.com"

    def test_hyphenated_name_parts_split(self):
        """Hyphenated names (Mary-Jane) are split into parts for matching."""
        contact = _make_contact(name="Mary-Jane Watson", portfolio="https://maryjane.dev")
        result = _validate_portfolio_url(contact)

        # "mary" (4 chars >= 3) should match "maryjane" domain_base
        assert result["portfolio"] == "https://maryjane.dev"

    def test_contact_without_other_links_key(self):
        """Contact dict missing otherLinks key -- should not crash."""
        contact = {
            "name": "John Smith",
            "portfolio": "https://randomproject.com",
        }
        result = _validate_portfolio_url(contact)

        assert result["portfolio"] is None
        assert "https://randomproject.com" in result["otherLinks"]

    def test_original_dict_is_mutated(self):
        """Function mutates and returns the same dict (not a copy)."""
        contact = _make_contact(name="John Smith", portfolio="https://projectsite.com")
        result = _validate_portfolio_url(contact)

        assert result is contact
        assert contact["portfolio"] is None
