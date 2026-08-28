"""Per-caller request ceilings. T-004.

The limiter is tested directly with an injected clock rather than by sleeping,
so the window boundary is exercised exactly and the suite stays fast.
"""
from __future__ import annotations

import pytest

from legalrag import ratelimit
from legalrag.ratelimit import RateLimiter, caller_key, tier_for


class TestTierRouting:
    @pytest.mark.parametrize(
        "path",
        ["/api/ask", "/api/ask/stream", "/api/search", "/api/articles/12/explain"],
    )
    def test_paid_routes_get_the_strict_tier(self, path):
        assert tier_for(path) == "paid"

    @pytest.mark.parametrize(
        "path",
        ["/api/health", "/api/orgs/me", "/api/orgs/1/matters", "/api/instruments"],
    )
    def test_everything_else_is_normal(self, path):
        assert tier_for(path) == "normal"


class TestCallerKey:
    def test_a_signed_in_caller_is_keyed_by_their_token(self):
        key = caller_key("Bearer abc.def.ghi", "203.0.113.5")
        assert key.startswith("t:")

    def test_the_raw_token_never_appears_in_the_key(self):
        # The key reaches logs and error paths; the credential must not.
        key = caller_key("Bearer supersecret", None)
        assert "supersecret" not in key

    def test_two_tokens_do_not_share_a_budget(self):
        a = caller_key("Bearer aaa", None)
        b = caller_key("Bearer bbb", None)
        assert a != b

    def test_the_same_token_from_a_new_address_keeps_its_budget(self):
        assert caller_key("Bearer same", "1.1.1.1") == caller_key("Bearer same", "2.2.2.2")

    def test_an_anonymous_caller_falls_back_to_their_address(self):
        assert caller_key(None, "198.51.100.9") == "ip:198.51.100.9"

    def test_a_non_bearer_scheme_is_not_treated_as_identity(self):
        assert caller_key("Basic xyz", "203.0.113.5").startswith("ip:")


class TestWindow:
    def test_allows_up_to_the_limit(self):
        limiter = RateLimiter()
        for _ in range(5):
            allowed, _ = limiter.check("c", "paid", limit=5, now=100.0)
            assert allowed

    def test_refuses_past_the_limit(self):
        limiter = RateLimiter()
        for _ in range(5):
            limiter.check("c", "paid", limit=5, now=100.0)
        allowed, retry_after = limiter.check("c", "paid", limit=5, now=100.0)
        assert not allowed
        assert retry_after > 0

    def test_the_window_reopens(self):
        limiter = RateLimiter(window_seconds=60)
        for _ in range(5):
            limiter.check("c", "paid", limit=5, now=100.0)
        assert not limiter.check("c", "paid", limit=5, now=159.0)[0]
        assert limiter.check("c", "paid", limit=5, now=161.0)[0]

    def test_tiers_have_separate_budgets(self):
        """Exhausting the paid tier must not lock a caller out of the app."""
        limiter = RateLimiter()
        for _ in range(5):
            limiter.check("c", "paid", limit=5, now=100.0)
        assert not limiter.check("c", "paid", limit=5, now=100.0)[0]
        assert limiter.check("c", "normal", limit=50, now=100.0)[0]

    def test_callers_have_separate_budgets(self):
        limiter = RateLimiter()
        for _ in range(5):
            limiter.check("a", "paid", limit=5, now=100.0)
        assert not limiter.check("a", "paid", limit=5, now=100.0)[0]
        assert limiter.check("b", "paid", limit=5, now=100.0)[0]

    def test_retry_after_never_advises_zero(self):
        limiter = RateLimiter(window_seconds=60)
        limiter.check("c", "paid", limit=1, now=100.0)
        _, retry_after = limiter.check("c", "paid", limit=1, now=159.9)
        assert retry_after >= 1


class TestPruning:
    def test_expired_windows_are_dropped(self):
        limiter = RateLimiter(window_seconds=60)
        limiter.check("a", "paid", limit=5, now=100.0)
        limiter.check("b", "paid", limit=5, now=100.0)
        assert limiter.prune(now=200.0) == 2
        assert limiter._windows == {}

    def test_live_windows_survive_a_prune(self):
        limiter = RateLimiter(window_seconds=60)
        limiter.check("a", "paid", limit=5, now=100.0)
        assert limiter.prune(now=130.0) == 0

    def test_pruning_does_not_hand_back_a_spent_budget(self):
        limiter = RateLimiter(window_seconds=60)
        limiter.check("a", "paid", limit=1, now=100.0)
        limiter.prune(now=130.0)
        assert not limiter.check("a", "paid", limit=1, now=130.0)[0]


class TestConfiguredLimits:
    def test_defaults_apply_when_unset(self, monkeypatch):
        monkeypatch.delenv("LEGALOS_RATE_LIMIT_PAID", raising=False)
        monkeypatch.delenv("LEGALOS_RATE_LIMIT_NORMAL", raising=False)
        assert ratelimit.get_paid_limit() == ratelimit.DEFAULT_PAID_LIMIT
        assert ratelimit.get_normal_limit() == ratelimit.DEFAULT_NORMAL_LIMIT

    def test_the_paid_ceiling_is_the_stricter_one(self):
        assert ratelimit.DEFAULT_PAID_LIMIT < ratelimit.DEFAULT_NORMAL_LIMIT

    def test_an_override_is_honoured(self, monkeypatch):
        monkeypatch.setenv("LEGALOS_RATE_LIMIT_PAID", "7")
        assert ratelimit.get_paid_limit() == 7

    def test_a_nonsense_override_fails_loudly(self, monkeypatch):
        monkeypatch.setenv("LEGALOS_RATE_LIMIT_PAID", "lots")
        with pytest.raises(RuntimeError):
            ratelimit.get_paid_limit()

    def test_a_zero_ceiling_is_refused(self, monkeypatch):
        """Zero would lock everyone out; almost certainly a typo, not intent."""
        monkeypatch.setenv("LEGALOS_RATE_LIMIT_PAID", "0")
        with pytest.raises(RuntimeError):
            ratelimit.get_paid_limit()
