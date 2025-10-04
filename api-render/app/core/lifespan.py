"""
Application Lifespan Manager
Handles FastAPI startup and shutdown logic with service initialization
"""

import os
import time
import logging
from contextlib import asynccontextmanager
from typing import Optional, Dict, Any
from fastapi import FastAPI
from app.services.ai_categorizer import TagCategorizationService
from app.utils import health_monitor
from app.core.database import get_db
from app.logging import get_logger

logger = get_logger(__name__)


def create_lifespan_manager(
    tag_categorization_service_ref: Dict[str, Any],
    supabase_ref: Dict[str, Any],
    stats_module: Optional[Any] = None,
    stats_routes_available: bool = False
):
    """
    Factory function to create a lifespan context manager with dependency injection

    Args:
        tag_categorization_service_ref: Dict to store service reference {'instance': None}
        supabase_ref: Dict to store Supabase client reference {'instance': None}
        stats_module: Optional stats module for service injection
        stats_routes_available: Whether stats routes are available

    Returns:
        Async context manager for FastAPI lifespan
    """

    @asynccontextmanager
    async def lifespan(app: FastAPI):
        """Application lifespan manager with enhanced initialization"""

        logger.info("🚀 Starting B9 Dashboard API (Render Optimized)")
        logger.info(
            "Starting B9 Dashboard API",
            context={"environment": os.getenv("ENVIRONMENT", "development")}
        )
        startup_start = time.time()

        try:
            # Validate environment variables
            required_env_vars = ["SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY", "OPENAI_API_KEY"]
            missing_vars = [var for var in required_env_vars if not os.getenv(var)]

            if missing_vars:
                raise Exception(f"Missing required environment variables: {missing_vars}")

            supabase_url = os.getenv("SUPABASE_URL")
            supabase_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
            openai_key = os.getenv("OPENAI_API_KEY")

            # Initialize Supabase client with error handling (using singleton)
            try:
                supabase_ref['instance'] = get_db()
                logger.info("✅ Supabase client initialized (singleton)")
            except Exception as e:
                logger.error(f"❌ Supabase initialization failed: {e}", exc_info=True)
                raise

            # Initialize utilities
            logger.info("🔧 Initializing utilities...")

            # Initialize services
            logger.info("⚙️  Initializing services...")

            tag_categorization_service_ref['instance'] = TagCategorizationService(
                supabase_ref['instance'],
                openai_key
            )

            # Set categorization service in stats module if available
            if stats_routes_available and stats_module:
                stats_module.set_categorization_service(tag_categorization_service_ref['instance'])

            logger.info("✅ All services initialized")

            # Register health check dependencies
            health_monitor.register_dependency('supabase', health_monitor.check_supabase_health)
            health_monitor.register_dependency('openai', health_monitor.check_openai_health)

            # Don't auto-start scraper - it can be controlled via API endpoints
            logger.info("📝 Scraper auto-start disabled - use /api/scraper/start endpoint to control")

            startup_time = time.time() - startup_start
            logger.info(f"🎯 B9 Dashboard API ready in {startup_time:.2f}s")
            logger.info(
                f"API startup complete",
                duration_ms=int(startup_time * 1000),
                context={
                    "cache_enabled": False,
                    "rate_limiting_enabled": False,
                    "services": ["categorization", "user"],
                    "startup_time_seconds": startup_time
                }
            )

            # Log startup
            logger.info(f"Services initialized: categorization, user")
            logger.info("Cache disabled, Rate limiting disabled")

        except Exception as e:
            logger.error(
                f"❌ Failed to initialize B9 Dashboard API: {e}",
                context={"error": str(e)},
                exc_info=True
            )
            raise

        yield

        # Cleanup
        logger.info("🛑 Shutting down B9 Dashboard API...")
        logger.info("API shutdown initiated")
        cleanup_start = time.time()

        try:
            # Cleanup complete
            cleanup_time = time.time() - cleanup_start
            logger.info(f"✅ Cleanup completed in {cleanup_time:.2f}s")
            logger.info(
                "API shutdown complete",
                duration_ms=int(cleanup_time * 1000)
            )
            # Flush any remaining logs
            logger.flush()

        except Exception as e:
            logger.error(f"Error during cleanup: {e}", exc_info=True)

    return lifespan
