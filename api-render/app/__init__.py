"""
B9 Dashboard API Application Package
Central application module containing all business logic
"""

from app.config import config, Config
from app.version import API_VERSION

__version__ = API_VERSION
__all__ = ["config", "Config"]

# Application metadata
APP_NAME = "B9 Dashboard API"
APP_VERSION = __version__
APP_DESCRIPTION = "Backend API for B9 Dashboard - Reddit and Instagram automation"

# Export commonly used items for easier imports
from app.config import (
    DATABASE_URL,
    OPENAI_API_KEY,
    SUPABASE_URL,
    SUPABASE_SERVICE_KEY,
    IS_PRODUCTION,
    IS_DEVELOPMENT,
    LOG_LEVEL,
    API_VERSION
)