"""
Cron Job API Endpoints
Protected endpoints for scheduled tasks triggered by Render cron jobs

CRITICAL: CRON-001 - Log cleanup to prevent disk overflow
"""

import os
import logging
from fastapi import APIRouter, Header, HTTPException, Query
from typing import Optional
from app.jobs.log_cleanup import full_log_cleanup

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/cron", tags=["cron"])


@router.post("/cleanup-logs")
async def trigger_log_cleanup(
    authorization: Optional[str] = Header(None),
    retention_days: int = Query(30, ge=1, le=365, description="Days to retain logs")
):
    """
    Cleanup old logs from Supabase and local filesystem

    **Authentication:** Requires `Authorization: Bearer {CRON_SECRET}` header

    **Schedule:** Runs daily at 2 AM UTC (configured in render.yaml)

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
        raise HTTPException(
            status_code=500,
            detail="Cron authentication not configured on server"
        )

    # Check authorization header
    if not authorization:
        logger.warning("Missing Authorization header")
        raise HTTPException(
            status_code=401,
            detail="Missing Authorization header"
        )

    # Verify Bearer token
    if not authorization.startswith("Bearer "):
        logger.warning("Invalid Authorization format")
        raise HTTPException(
            status_code=401,
            detail="Invalid Authorization format. Use 'Bearer {token}'"
        )

    token = authorization.replace("Bearer ", "")

    if token != expected_token:
        logger.warning("Invalid cron secret provided")
        raise HTTPException(
            status_code=401,
            detail="Invalid authentication token"
        )

    # Run log cleanup
    try:
        result = await full_log_cleanup(retention_days=retention_days)

        # Log success
        if result['status'] == 'success':
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
            "results": result
        }

    except Exception as e:
        logger.error(f"❌ Log cleanup failed: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Log cleanup failed: {str(e)}"
        )


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
        "available_jobs": [
            "cleanup-logs"
        ]
    }
