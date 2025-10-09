#!/usr/bin/env python3
"""
B9 Dashboard API - Hetzner Production Service
High-performance FastAPI application optimized for Hetzner CPX31 deployment with:
- Multi-worker Gunicorn + Uvicorn configuration (8 workers)
- Comprehensive monitoring and health checks
- Background job processing
- Enhanced security and error handling
- Real-time analytics and streaming
- Dynamic router discovery and loading
"""

import os

import uvicorn
from dotenv import load_dotenv
from fastapi import FastAPI


# Import Pydantic models


# Load environment variables first
load_dotenv()

# Import utilities and services
from app.logging import get_logger  # noqa: E402


# Create logger instance
logger = get_logger(__name__)

# Import lifespan manager
# Import server configuration
from app.config import HetznerServerConfig  # noqa: E402
from app.core.lifespan import create_lifespan_manager  # noqa: E402

# Import dynamic router loader
from app.core.router_loader import load_routers  # noqa: E402

# Import logging setup
from app.logging.setup import setup_logging  # noqa: E402

# Import middleware configuration
from app.middleware import configure_middleware  # noqa: E402

# Import services and routes using relative imports
from app.version import API_VERSION  # noqa: E402


# Import stats module for dependency injection
try:
    from app.api import stats as stats_module
except ImportError:
    stats_module = None

# Initialize server configuration
server_config = HetznerServerConfig.from_env()

# Configure logging for production
logger = setup_logging()

# Pydantic models moved to app/models/requests.py

# =============================================================================
# GLOBAL SERVICES (using dict refs for lifespan manager)
# =============================================================================

service_refs = {"tag_categorization": {"instance": None}, "supabase": {"instance": None}}


# Convenience accessors (backwards compatible)
def get_tag_categorization_service():
    return service_refs["tag_categorization"]["instance"]


def get_supabase():
    return service_refs["supabase"]["instance"]


# =============================================================================
# APPLICATION LIFESPAN
# =============================================================================

# Create lifespan manager with dependency injection
lifespan = create_lifespan_manager(
    tag_categorization_service_ref=service_refs["tag_categorization"],
    supabase_ref=service_refs["supabase"],
    stats_module=stats_module,
    stats_routes_available=stats_module is not None,
)

# =============================================================================
# FASTAPI APPLICATION
# =============================================================================

app = FastAPI(
    title="B9 Dashboard API",
    description="Production Reddit Analytics API for OnlyFans Marketing Intelligence",
    version=API_VERSION,
    docs_url="/docs" if os.getenv("ENVIRONMENT") != "production" else None,
    redoc_url="/redoc" if os.getenv("ENVIRONMENT") != "production" else None,
    lifespan=lifespan,
)

# =============================================================================
# ROUTER REGISTRATION
# =============================================================================

# Dynamically load and register all routers
logger.info("📍 Loading application routers...")
for router, _description in load_routers():
    app.include_router(router)

# =============================================================================
# MIDDLEWARE CONFIGURATION
# =============================================================================

# Configure all middleware (security, CORS, compression, monitoring)
configure_middleware(app)

# =============================================================================
# MAIN ENTRY POINT
# =============================================================================

if __name__ == "__main__":
    port = int(os.getenv("PORT", 8000))
    workers = int(os.getenv("API_WORKERS", 1))
    log_level = os.getenv("LOG_LEVEL", "info")

    logger.info(f"🚀 Starting B9 Dashboard API on port {port}")

    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=port,
        workers=workers,
        log_level=log_level.lower(),
        access_log=True,
        use_colors=True,
        reload=False,  # Disabled for production
    )
