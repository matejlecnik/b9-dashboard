"""
Cron Job API Endpoints
Protected endpoints for scheduled tasks triggered by Hetzner cron jobs

CRITICAL: CRON-001 - Log cleanup to prevent disk overflow
"""

import logging
import os
from typing import Optional

from fastapi import APIRouter, Header, HTTPException, Query

from app.jobs.cdn_to_r2_migration import (
    migrate_all,
    migrate_carousel_posts,
    migrate_profile_pictures,
    migrate_reels,
)
from app.jobs.log_cleanup import full_log_cleanup


logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/cron", tags=["cron"])


@router.post("/cleanup-logs")
async def trigger_log_cleanup(
    authorization: Optional[str] = Header(None),
    retention_days: int = Query(30, ge=1, le=365, description="Days to retain logs"),
):
    """
    Cleanup old logs from Supabase and local filesystem

    **Authentication:** Requires `Authorization: Bearer {CRON_SECRET}` header

    **Schedule:** Runs daily at 2 AM UTC (configured via Hetzner cron)

    **Args:**
    - retention_days: Number of days to keep logs (default: 30)

    **Returns:**
    - Cleanup statistics (deleted count, file sizes, etc.)

    **Example:**
    ```bash
    curl -X POST https://api.example.com/api/cron/cleanup-logs \\
      -H "Authorization: Bearer your-secret-here" \\
      -d "retention_days=30"
    ```
    """
    logger.info(f"🧹 Cron job triggered: cleanup-logs (retention: {retention_days} days)")

    # Verify authorization
    expected_token = os.getenv("CRON_SECRET")

    if not expected_token:
        logger.error("CRON_SECRET not configured")
        raise HTTPException(status_code=500, detail="Cron authentication not configured on server")

    # Check authorization header
    if not authorization:
        logger.warning("Missing Authorization header")
        raise HTTPException(status_code=401, detail="Missing Authorization header")

    # Verify Bearer token
    if not authorization.startswith("Bearer "):
        logger.warning("Invalid Authorization format")
        raise HTTPException(
            status_code=401, detail="Invalid Authorization format. Use 'Bearer {token}'"
        )

    token = authorization.replace("Bearer ", "")

    if token != expected_token:
        logger.warning("Invalid cron secret provided")
        raise HTTPException(status_code=401, detail="Invalid authentication token")

    # Run log cleanup
    try:
        result = await full_log_cleanup(retention_days=retention_days)

        # Log success
        if result["status"] == "success":
            logger.info(
                f"✅ Log cleanup completed successfully: "
                f"{result['supabase']['deleted']} DB logs, "
                f"{result['local']['deleted_files']} local files"
            )
        else:
            logger.warning(f"⚠️ Log cleanup completed with warnings: {result}")

        return {
            "status": "success",
            "message": f"Log cleanup completed (retention: {retention_days} days)",
            "results": result,
        }

    except Exception as e:
        logger.error(f"❌ Log cleanup failed: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Log cleanup failed: {e!s}") from e


@router.post("/migrate-cdn-to-r2")
async def migrate_cdn_to_r2(
    authorization: Optional[str] = Header(None),
    media_type: str = Query(
        "all", regex="^(profile|posts|reels|all)$", description="Media type to migrate"
    ),
    batch_size: int = Query(10, ge=1, le=50, description="Items to process per batch"),
):
    """
    Migrate Instagram CDN URLs to Cloudflare R2 storage

    **Authentication:** Requires `Authorization: Bearer {CRON_SECRET}` header

    **Args:**
    - media_type: Type to migrate (profile, posts, reels, or all)
    - batch_size: Number of items to process (default: 10, max: 50)

    **Returns:**
    - Migration statistics (total, migrated, failed, time)

    **Example:**
    ```bash
    curl -X POST https://api.example.com/api/cron/migrate-cdn-to-r2?media_type=all&batch_size=10 \\
      -H "Authorization: Bearer your-secret-here"
    ```

    **Note:** This operation:
    - Downloads media from Instagram CDN
    - Compresses (photos: 300KB, videos: 1.5MB @720p)
    - Uploads to R2 storage
    - Updates database (never overwrites existing R2 URLs)
    - Is idempotent (safe to run multiple times)
    """
    logger.info(f"🔄 CDN→R2 migration triggered: type={media_type}, batch={batch_size}")

    # Verify authorization (same pattern as cleanup-logs)
    expected_token = os.getenv("CRON_SECRET")

    if not expected_token:
        logger.error("CRON_SECRET not configured")
        raise HTTPException(status_code=500, detail="Cron authentication not configured on server")

    if not authorization:
        logger.warning("Missing Authorization header")
        raise HTTPException(status_code=401, detail="Missing Authorization header")

    if not authorization.startswith("Bearer "):
        logger.warning("Invalid Authorization format")
        raise HTTPException(
            status_code=401, detail="Invalid Authorization format. Use 'Bearer {token}'"
        )

    token = authorization.replace("Bearer ", "")

    if token != expected_token:
        logger.warning("Invalid cron secret provided")
        raise HTTPException(status_code=401, detail="Invalid authentication token")

    # Run migration
    try:
        if media_type == "all":
            result = migrate_all(batch_size)
        elif media_type == "profile":
            stats = migrate_profile_pictures(batch_size)
            result = {"success": True, "profile_pictures": stats.to_dict()}
        elif media_type == "posts":
            stats = migrate_carousel_posts(batch_size)
            result = {"success": True, "carousel_posts": stats.to_dict()}
        elif media_type == "reels":
            stats = migrate_reels(batch_size)
            result = {"success": True, "reels": stats.to_dict()}
        else:
            raise HTTPException(status_code=400, detail=f"Invalid media_type: {media_type}")

        # Log success
        if result.get("success"):
            logger.info(f"✅ CDN→R2 migration completed: {result}")
        else:
            logger.error(f"❌ CDN→R2 migration failed: {result}")

        return {
            "status": "success" if result.get("success") else "error",
            "message": f"CDN→R2 migration completed (type: {media_type}, batch: {batch_size})",
            "results": result,
        }

    except Exception as e:
        logger.error(f"❌ CDN→R2 migration failed: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Migration failed: {e!s}") from e


@router.get("/health")
async def cron_health():
    """
    Health check for cron service
    Verifies cron authentication is configured

    Returns:
    - status: "healthy" or "unhealthy"
    - configured: Whether CRON_SECRET is set
    """
    cron_secret_configured = bool(os.getenv("CRON_SECRET"))

    return {
        "status": "healthy" if cron_secret_configured else "unhealthy",
        "service": "cron-jobs",
        "cron_secret_configured": cron_secret_configured,
        "available_jobs": ["cleanup-logs", "migrate-cdn-to-r2"],
    }
