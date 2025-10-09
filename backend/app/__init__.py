"""
B9 Dashboard API Application Package
Central application module containing all business logic
"""

from app.config import Config, config
from app.version import API_VERSION


__version__ = API_VERSION
__all__ = ["Config", "config"]

# Application metadata
APP_NAME = "B9 Dashboard API"
APP_VERSION = __version__
APP_DESCRIPTION = "Backend API for B9 Dashboard - Reddit and Instagram automation"

# Export commonly used items for easier imports
from app.config import (  # noqa: E402
    API_VERSION,
    DATABASE_URL,
    IS_DEVELOPMENT,
    IS_PRODUCTION,
    LOG_LEVEL,
    OPENAI_API_KEY,
    SUPABASE_SERVICE_KEY,
    SUPABASE_URL,
)
