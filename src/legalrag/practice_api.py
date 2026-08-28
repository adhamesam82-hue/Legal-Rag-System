"""The practice-management routes, split by pillar.

This file was 2,466 lines and 102 routes. It is now the seam that keeps
`from legalrag.practice_api import router` working for everything that
already imports it -- api.py, and the tests.

The routes themselves live in legalrag.practice_routes, one module per
pillar, all attaching to the same router.
"""
from __future__ import annotations

from legalrag.db import db
from legalrag.practice_routes import router

# Re-exported: `db` moved to legalrag.db so clerk.py could depend on the
# same callable and share one pooled connection per request with the route
# bodies. Kept here because callers import it from this module.
__all__ = ["router", "db"]
