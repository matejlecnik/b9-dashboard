#!/usr/bin/env python3
"""
B9 Dashboard API - Render Production Service
High-performance FastAPI application optimized for Render deployment with:
- Redis caching and rate limiting
- Comprehensive monitoring and health checks
- Background job processing
- Enhanced security and error handling
- Real-time analytics and streaming
"""

import os
import logging
import time
import json
from typing import List, Optional, Dict, Any
from datetime import datetime, timezone
from fastapi import FastAPI, HTTPException, Query, Request, Depends
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from contextlib import asynccontextmanager
from pydantic import BaseModel
from dotenv import load_dotenv

# Import Pydantic models
from app.models.requests import (
    CategorizationRequest,
    SingleSubredditRequest,
    ScrapingRequest,
    UserDiscoveryRequest,
    BackgroundJobRequest
)
from supabase import create_client
import uvicorn

# Load environment variables first
load_dotenv()

# Import utilities and services
from app.utils import health_monitor, request_timer
from app.logging import get_logger

# Create logger instance
logger = get_logger(__name__)
# Import version
from app.version import API_VERSION
# Import services and routes using relative imports
from app.services.ai_categorizer import TagCategorizationService
from app.services.subreddit_api import fetch_subreddit
from app.api.reddit.users import router as user_router
# Import lifespan manager
from app.core.lifespan import create_lifespan_manager
# Import middleware configuration
from app.middleware import configure_middleware
# Import logging setup
from app.logging.setup import setup_logging

# Optional Instagram route imports
try:
    from app.api.instagram.scraper import router as instagram_scraper_router
    INSTAGRAM_SCRAPER_ROUTES_AVAILABLE = True
except ImportError:
    INSTAGRAM_SCRAPER_ROUTES_AVAILABLE = False
    instagram_scraper_router = None

try:
    from app.api.instagram.related_creators import router as instagram_related_router
    INSTAGRAM_RELATED_ROUTES_AVAILABLE = True
except ImportError:
    INSTAGRAM_RELATED_ROUTES_AVAILABLE = False
    instagram_related_router = None

try:
    from app.api.instagram.creators import router as instagram_creators_router
    INSTAGRAM_CREATORS_ROUTES_AVAILABLE = True
except ImportError:
    INSTAGRAM_CREATORS_ROUTES_AVAILABLE = False
    instagram_creators_router = None

# Reddit scraper route imports
try:
    from app.api.reddit.scraper import router as reddit_scraper_router
    REDDIT_SCRAPER_ROUTES_AVAILABLE = True
except ImportError:
    REDDIT_SCRAPER_ROUTES_AVAILABLE = False
    reddit_scraper_router = None

# AI Categorization route imports
try:
    from app.api.ai.categorization import router as categorization_router
    CATEGORIZATION_ROUTES_AVAILABLE = True
except ImportError:
    CATEGORIZATION_ROUTES_AVAILABLE = False
    categorization_router = None

# Cron job route imports
try:
    from app.api.cron import router as cron_router
    CRON_ROUTES_AVAILABLE = True
except ImportError:
    CRON_ROUTES_AVAILABLE = False
    cron_router = None

# Health check route imports
try:
    from app.api.health import router as health_router
    HEALTH_ROUTES_AVAILABLE = True
except ImportError:
    HEALTH_ROUTES_AVAILABLE = False
    health_router = None

# Background jobs route imports
try:
    from app.jobs.background import router as jobs_router
    JOBS_ROUTES_AVAILABLE = True
except ImportError:
    JOBS_ROUTES_AVAILABLE = False
    jobs_router = None

# Stats route imports
try:
    from app.api import stats as stats_module
    stats_router = stats_module.router
    STATS_ROUTES_AVAILABLE = True
except ImportError:
    STATS_ROUTES_AVAILABLE = False
    stats_router = None
    stats_module = None

# Subreddit fetcher route imports
try:
    from app.api.reddit.subreddits import router as subreddits_router
    SUBREDDITS_ROUTES_AVAILABLE = True
except ImportError:
    SUBREDDITS_ROUTES_AVAILABLE = False
    subreddits_router = None

# Root endpoint route imports
try:
    from app.api.root import router as root_router
    ROOT_ROUTES_AVAILABLE = True
except ImportError:
    ROOT_ROUTES_AVAILABLE = False
    root_router = None

# Instagram scraper now uses subprocess architecture via instagram_scraper_routes.py
# Control is done via Supabase system_control table only
INSTAGRAM_SCRAPER_AVAILABLE = False  # Thread-based scraper disabled

# Configure logging for production
logger = setup_logging()

# Pydantic models moved to app/models/requests.py

# =============================================================================
# GLOBAL SERVICES (using dict refs for lifespan manager)
# =============================================================================

service_refs = {
    'tag_categorization': {'instance': None},
    'supabase': {'instance': None}
}

# Convenience accessors (backwards compatible)
def get_tag_categorization_service():
    return service_refs['tag_categorization']['instance']

def get_supabase():
    return service_refs['supabase']['instance']

# =============================================================================
# APPLICATION LIFESPAN
# =============================================================================

# Create lifespan manager with dependency injection
lifespan = create_lifespan_manager(
    tag_categorization_service_ref=service_refs['tag_categorization'],
    supabase_ref=service_refs['supabase'],
    stats_module=stats_module if STATS_ROUTES_AVAILABLE else None,
    stats_routes_available=STATS_ROUTES_AVAILABLE
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
    lifespan=lifespan
)

# =============================================================================
# MIDDLEWARE CONFIGURATION
# =============================================================================

# Include routers
app.include_router(user_router)

# Include Instagram routes if available
if INSTAGRAM_SCRAPER_ROUTES_AVAILABLE:
    app.include_router(instagram_scraper_router)
    logger.info("✅ Instagram scraper routes registered")
else:
    logger.warning("⚠️ Instagram scraper routes not available")

if INSTAGRAM_RELATED_ROUTES_AVAILABLE:
    app.include_router(instagram_related_router)
    logger.info("✅ Instagram related creators routes registered")
else:
    logger.warning("⚠️ Instagram related creators routes not available")

if INSTAGRAM_CREATORS_ROUTES_AVAILABLE:
    app.include_router(instagram_creators_router)
    logger.info("✅ Instagram creator addition routes registered")
else:
    logger.warning("⚠️ Instagram creator addition routes not available")

# Include Reddit scraper routes if available
if REDDIT_SCRAPER_ROUTES_AVAILABLE:
    app.include_router(reddit_scraper_router)
    logger.info("✅ Reddit scraper routes registered")
else:
    logger.warning("⚠️ Reddit scraper routes not available")

# Include AI categorization routes if available
if CATEGORIZATION_ROUTES_AVAILABLE:
    app.include_router(categorization_router)
    logger.info("✅ AI categorization routes registered")
else:
    logger.warning("⚠️ AI categorization routes not available")

# Include cron job routes if available
if CRON_ROUTES_AVAILABLE:
    app.include_router(cron_router)
    logger.info("✅ Cron job routes registered")
else:
    logger.warning("⚠️ Cron job routes not available")

# Include health check routes if available
if HEALTH_ROUTES_AVAILABLE:
    app.include_router(health_router)
    logger.info("✅ Health check routes registered")
else:
    logger.warning("⚠️ Health check routes not available")

# Include background jobs routes if available
if JOBS_ROUTES_AVAILABLE:
    app.include_router(jobs_router)
    logger.info("✅ Background jobs routes registered")
else:
    logger.warning("⚠️ Background jobs routes not available")

# Include stats routes if available
if STATS_ROUTES_AVAILABLE:
    app.include_router(stats_router)
    logger.info("✅ Stats routes registered")
else:
    logger.warning("⚠️ Stats routes not available")

# Include subreddits routes if available
if SUBREDDITS_ROUTES_AVAILABLE:
    app.include_router(subreddits_router)
    logger.info("✅ Subreddits routes registered")
else:
    logger.warning("⚠️ Subreddits routes not available")

# Include root endpoint if available
if ROOT_ROUTES_AVAILABLE:
    app.include_router(root_router)
    logger.info("✅ Root endpoint registered")
else:
    logger.warning("⚠️ Root endpoint not available")

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
        reload=False  # Disabled for production
    )