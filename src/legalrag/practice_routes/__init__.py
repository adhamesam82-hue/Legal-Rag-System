"""One module per practice pillar, all attaching to one router.

Imported for their side effect: importing a module registers its routes on
the shared APIRouter. The order below is the order the sections appeared in
the single file this replaced, and it matters -- FastAPI resolves paths in
registration order.
"""
from legalrag.practice_routes._shared import router

from legalrag.practice_routes import clients  # noqa: F401
from legalrag.practice_routes import matters  # noqa: F401
from legalrag.practice_routes import cases  # noqa: F401
from legalrag.practice_routes import hearings  # noqa: F401
from legalrag.practice_routes import documents  # noqa: F401
from legalrag.practice_routes import powers_of_attorney  # noqa: F401
from legalrag.practice_routes import tasks  # noqa: F401
from legalrag.practice_routes import time_tracking  # noqa: F401
from legalrag.practice_routes import billing  # noqa: F401
from legalrag.practice_routes import imports  # noqa: F401
from legalrag.practice_routes import matter_contacts  # noqa: F401
from legalrag.practice_routes import expenses  # noqa: F401
from legalrag.practice_routes import communications  # noqa: F401
from legalrag.practice_routes import portals  # noqa: F401
from legalrag.practice_routes import trust  # noqa: F401
from legalrag.practice_routes import custom_fields  # noqa: F401
from legalrag.practice_routes import conflicts  # noqa: F401
from legalrag.practice_routes import activity  # noqa: F401

__all__ = ["router"]
