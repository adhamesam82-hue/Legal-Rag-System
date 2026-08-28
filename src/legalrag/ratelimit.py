"""Per-caller request ceilings, applied in the app rather than at the proxy.

Why not Caddy: rate limiting is not in Caddy's standard build -- it needs the
caddy-ratelimit plugin and therefore a custom image built with xcaddy. That is
a second thing to build and keep current, and it buys a per-IP limit, which is
the weaker control here. Now that every paid route is authenticated (T-001),
the meaningful unit is the *caller*, not the address they happen to be behind:
one firm on one office NAT is many lawyers sharing an IP, and one abusive
account is one subject regardless of how many addresses it dials from.

State is in-process, which is correct for exactly as long as the deployment is
one API container -- which railway.json and the Hetzner compose stack both pin
it to, deliberately. A second replica makes each replica enforce its own share
of the ceiling. When the worker lands and Redis is in the stack anyway, move
the counters there; the interface here does not change.

Two tiers, because the costs are not comparable:

  * `paid`   -- routes that call an LLM or an embedding API. Each request
    costs real money, so the ceiling is low.
  * `normal` -- everything else. Postgres reads answering in single-digit
    milliseconds; the ceiling exists to stop a runaway client, not to ration.
"""
from __future__ import annotations

import hashlib
import json
import os
import threading
import time
from dataclasses import dataclass, field

# Requests per window, per caller, per tier.
DEFAULT_PAID_LIMIT = 30
DEFAULT_NORMAL_LIMIT = 300
WINDOW_SECONDS = 60

# Paths whose handlers reach a paid provider. Prefix match, checked longest
# first so a more specific rule can override a broader one later.
PAID_PREFIXES = (
    "/api/ask",
    "/api/search",
)
# Suffix rule for the per-article explain route, whose id sits mid-path.
PAID_SUFFIXES = ("/explain",)


def _limit_from_env(name: str, default: int) -> int:
    raw = os.environ.get(name)
    if not raw:
        return default
    try:
        value = int(raw)
    except ValueError:
        raise RuntimeError(f"{name} must be an integer, got {raw!r}") from None
    if value <= 0:
        raise RuntimeError(f"{name} must be positive")
    return value


def get_paid_limit() -> int:
    return _limit_from_env("LEGALOS_RATE_LIMIT_PAID", DEFAULT_PAID_LIMIT)


def get_normal_limit() -> int:
    return _limit_from_env("LEGALOS_RATE_LIMIT_NORMAL", DEFAULT_NORMAL_LIMIT)


def tier_for(path: str) -> str:
    """Which ceiling applies to this path."""
    if path.endswith(PAID_SUFFIXES):
        return "paid"
    if path.startswith(PAID_PREFIXES):
        return "paid"
    return "normal"


@dataclass
class _Window:
    started: float
    count: int


@dataclass
class RateLimiter:
    """Fixed-window counters keyed by (caller, tier).

    Fixed window rather than a sliding one on purpose: it costs one integer per
    caller instead of a timestamp per request, and the failure mode -- a caller
    fitting two windows' worth of requests around a boundary -- is irrelevant at
    a ceiling meant to stop runaway scripts rather than to meter billing.
    """

    window_seconds: int = WINDOW_SECONDS
    _windows: dict[tuple[str, str], _Window] = field(default_factory=dict)
    _lock: threading.Lock = field(default_factory=threading.Lock)

    def check(self, caller: str, tier: str, limit: int, now: float | None = None):
        """Record a request. Returns (allowed, retry_after_seconds)."""
        now = time.monotonic() if now is None else now
        key = (caller, tier)
        with self._lock:
            window = self._windows.get(key)
            if window is None or now - window.started >= self.window_seconds:
                self._windows[key] = _Window(started=now, count=1)
                return True, 0
            if window.count >= limit:
                return False, max(1, int(self.window_seconds - (now - window.started)) + 1)
            window.count += 1
            return True, 0

    def prune(self, now: float | None = None) -> int:
        """Drop windows that have expired. Returns how many were removed.

        Without this the dict grows one entry per caller seen, forever. Called
        opportunistically from the middleware rather than on a timer.
        """
        now = time.monotonic() if now is None else now
        with self._lock:
            stale = [
                key
                for key, window in self._windows.items()
                if now - window.started >= self.window_seconds
            ]
            for key in stale:
                del self._windows[key]
            return len(stale)

    def reset(self) -> None:
        with self._lock:
            self._windows.clear()


def caller_key(authorization: str | None, client_host: str | None) -> str:
    """Who to count against: the authenticated subject, else the address.

    Takes plain values rather than a request object so it can be called from
    raw ASGI scope, and tested without constructing one.

    The bearer token is used as an opaque identity here -- it is *not* verified
    at this point, and nothing is granted on the strength of it. That is safe
    because a forged token still buys nothing: the route's own dependency
    rejects it moments later. Using it as the counting key just means one
    signed-in caller cannot dodge their own ceiling by reconnecting from a new
    address, and cannot spend another caller's budget either.
    """
    scheme, _, token = (authorization or "").partition(" ")
    if scheme.lower() == "bearer" and token.strip():
        # Hashed so the raw token never reaches a log line or an error body.
        return "t:" + hashlib.sha256(token.strip().encode()).hexdigest()[:32]
    return "ip:" + (client_host or "unknown")


# Process-wide by design; see RateLimitMiddleware.__init__.
_shared = RateLimiter()


def reset_limits() -> None:
    """Clear every counter. For tests, and for a deliberate manual reset."""
    _shared.reset()


class RateLimitMiddleware:
    """Raw ASGI, deliberately not BaseHTTPMiddleware.

    BaseHTTPMiddleware wraps the response in an anyio task group, which
    deadlocks against a StreamingResponse that stays open for the length of an
    LLM generation -- exactly what /api/ask/stream is. Plain ASGI passes the
    send channel straight through, so a stream is untouched.
    """

    def __init__(self, app, prune_every: int = 500, limiter=None) -> None:
        self.app = app
        # The shared limiter by default: the ceiling is process-wide, so an
        # instance-private one would be a different ceiling per middleware
        # instance -- and would leave tests no way to clear it between cases.
        self.limiter = limiter if limiter is not None else _shared
        self.prune_every = prune_every
        self._since_prune = 0

    async def __call__(self, scope, receive, send):
        if scope.get("type") != "http":
            return await self.app(scope, receive, send)

        authorization = None
        for name, value in scope.get("headers") or ():
            if name == b"authorization":
                authorization = value.decode("latin-1")
                break
        client = scope.get("client")
        caller = caller_key(authorization, client[0] if client else None)

        tier = tier_for(scope.get("path", ""))
        limit = get_paid_limit() if tier == "paid" else get_normal_limit()
        allowed, retry_after = self.limiter.check(caller, tier, limit)

        # Housekeeping on a cadence: the sweep takes the lock, and taking it on
        # every request would serialise the whole app.
        self._since_prune += 1
        if self._since_prune >= self.prune_every:
            self._since_prune = 0
            self.limiter.prune()

        if not allowed:
            body = json.dumps(
                {"detail": "Too many requests. Try again shortly."}
            ).encode()
            await send(
                {
                    "type": "http.response.start",
                    "status": 429,
                    "headers": [
                        (b"content-type", b"application/json"),
                        (b"retry-after", str(retry_after).encode()),
                        (b"content-length", str(len(body)).encode()),
                    ],
                }
            )
            await send({"type": "http.response.body", "body": body})
            return

        await self.app(scope, receive, send)
