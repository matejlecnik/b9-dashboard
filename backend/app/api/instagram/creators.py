#!/usr/bin/env python3
"""
Instagram Creator Manual Addition Endpoint
Allows manual addition of creators with full "Ok" processing workflow

Mimics the automated scraper's process_creator() workflow:
- Fetches profile data (1 API call)
- Fetches 90 reels (~8 API calls)
- Fetches 30 posts (~3 API calls)
- Calculates 40+ analytics metrics
- Updates database with complete creator profile
"""

import subprocess
import sys
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, Optional

from fastapi import APIRouter
from pydantic import BaseModel
from supabase import Client

# Import database singleton and unified logger
from app.core.database import get_db
from app.logging import get_logger

# Import scraper and config from unified location
from app.scrapers.instagram.services.instagram_config import Config
from app.scrapers.instagram.services.instagram_scraper import InstagramScraperUnified


# Initialize router
router = APIRouter(prefix="/api/instagram/creator", tags=["instagram-creators"])

# Use unified logger
logger = get_logger(__name__)


# Module-level database client accessor (uses singleton)
def _get_db() -> Client:
    """Get database client for module-level functions"""
    return get_db()


# =============================================================================
# PYDANTIC MODELS
# =============================================================================


class CreatorAddRequest(BaseModel):
    """Request model for adding a creator"""

    username: str  # Instagram username (@ optional)
    niche: Optional[str] = None  # User-provided niche (e.g., "Fitness", "Beauty")


class CreatorAddResponse(BaseModel):
    """Response model for creator addition"""

    success: bool
    creator: Optional[Dict[str, Any]] = None
    stats: Optional[Dict[str, Any]] = None  # API calls, content fetched, processing time
    error: Optional[str] = None


# =============================================================================
# HELPER FUNCTIONS
# =============================================================================


async def process_creator_background(
    username: str, ig_user_id: str, niche: Optional[str], start_time: float
):
    """
    Process creator in background task - runs independently of HTTP request

    This function runs the same process_creator() workflow as the Instagram scraper,
    logging everything to system_logs for real-time monitoring.
    """
    try:
        logger.info(f"🔄 Background processing started for @{username}")

        # Create scraper instance
        scraper = create_scraper_instance()

        # Create creator object
        creator_obj = {"ig_user_id": ig_user_id, "username": username, "niche": niche}

        # Track API calls before processing
        api_calls_before = scraper.api_calls_made

        # Log start of processing
        await log_creator_addition(
            username,
            "background_process_started",
            True,
            {"api_calls_before": api_calls_before},
        )

        # Run the SAME processing workflow the scraper uses
        logger.info(f"Calling process_creator() for @{username}")
        processing_success = await scraper.process_creator(creator_obj)
        logger.info(f"process_creator() returned: {processing_success} for @{username}")

        # Calculate API calls used
        api_calls_used = scraper.api_calls_made - api_calls_before

        # Log completion of processing
        await log_creator_addition(
            username,
            "background_process_returned",
            processing_success,
            {
                "success": processing_success,
                "api_calls_used": api_calls_used,
                "api_calls_after": scraper.api_calls_made,
            },
        )

        if not processing_success:
            await log_creator_addition(
                username,
                "processing_failed",
                False,
                error="Full processing workflow failed",
                details={"api_calls_used": api_calls_used},
            )
            return

        # Fetch complete creator data from database
        await log_creator_addition(
            username, "fetching_final_data", True, {"ig_user_id": ig_user_id}
        )

        final_creator = (
            _get_db()
            .table("instagram_creators")
            .select("*")
            .eq("ig_user_id", ig_user_id)
            .single()
            .execute()
        )

        # Log what we got from database
        if final_creator and hasattr(final_creator, "data") and final_creator.data:
            data_summary = {
                "followers_count": final_creator.data.get("followers_count"),
                "avg_views_per_reel_cached": final_creator.data.get("avg_views_per_reel_cached"),
                "avg_engagement_cached": final_creator.data.get("avg_engagement_cached"),
                "has_analytics": final_creator.data.get("avg_views_per_reel_cached") is not None,
            }
            await log_creator_addition(
                username,
                "final_data_fetched",
                True,
                data_summary,
            )

        if not final_creator or not hasattr(final_creator, "data") or not final_creator.data:
            await log_creator_addition(
                username,
                "final_fetch_failed",
                False,
                error="Creator processed but not found in database",
            )
            return

        # Calculate processing time
        processing_time = int(time.time() - start_time)

        # Log final completion
        await log_creator_addition(
            username,
            "addition_completed",
            True,
            details={
                "ig_user_id": ig_user_id,
                "api_calls": api_calls_used,
                "processing_time": processing_time,
                "followers": final_creator.data.get("followers_count", 0),
                "engagement_rate": final_creator.data.get("avg_engagement_rate", 0),
            },
        )

        logger.info(
            f"✅ Successfully added creator @{username}: "
            f"{api_calls_used} API calls, {processing_time}s processing time"
        )

    except Exception as e:
        error_msg = str(e)
        logger.error(f"❌ Background processing failed for @{username}: {error_msg}", exc_info=True)

        await log_creator_addition(
            username,
            "addition_error",
            False,
            error=error_msg,
            details={"error_type": type(e).__name__},
        )


def create_scraper_instance() -> InstagramScraperUnified:
    """
    Create standalone scraper instance for manual creator addition

    This bypasses the system_control table checks that the main scraper uses,
    allowing us to use the same processing logic without running the full scraper.

    CRITICAL: Overrides _log_to_system() to use source='creator_addition' so ALL logs
    from the background process appear under the same source for easy monitoring.
    """
    try:
        scraper = InstagramScraperUnified()

        # DIAGNOSTIC: Log initialization status
        logger.info(f"Scraper initialized - use_modules: {scraper.use_modules}")
        if scraper.use_modules:
            logger.info(
                "✅ Modular architecture active (using storage_module, analytics_module, api_module)"
            )
        else:
            logger.warning("⚠️ Modular architecture NOT active - using monolithic methods")

        # Verify critical components
        if not hasattr(scraper, "supabase") or not scraper.supabase:
            logger.error("❌ CRITICAL: Scraper missing supabase client!")
            raise Exception("Scraper initialization failed: missing supabase client")

        # Override should_continue() to always return True for manual additions
        # This prevents the scraper from checking system_control table
        scraper.should_continue = lambda: True  # type: ignore[method-assign]

        # Override _log_to_system() to use source='creator_addition' instead of 'instagram_scraper'
        # This ensures ALL logs from background processing appear under creator_addition

        def override_log(level: str, message: str, context: Optional[Dict] = None):
            """Override scraper logging to use creator_addition source"""
            # Console log (same as original)
            if level == "error":
                logger.error(message)
            elif level == "warning":
                logger.warning(message)
            elif level == "success":
                logger.info(f"✅ {message}")
            else:
                logger.info(message)

            # Supabase log with creator_addition source
            try:
                if hasattr(scraper, "supabase") and scraper.supabase:
                    scraper.supabase.table("system_logs").insert(
                        {
                            "timestamp": datetime.now(timezone.utc).isoformat(),
                            "source": "creator_addition",  # Override to creator_addition
                            "script_name": "creators_api",
                            "level": level,
                            "message": message,
                            "context": context or {},
                        }
                    ).execute()
            except Exception as e:
                logger.error(f"Failed to log to system_logs: {e}")

        scraper._log_to_system = override_log  # type: ignore[method-assign]

        logger.info("✅ Created standalone scraper instance for manual creator addition")
        return scraper
    except Exception as e:
        logger.error(f"❌ Failed to create scraper instance: {e}", exc_info=True)
        raise


async def log_creator_addition(
    username: str,
    action: str,
    success: bool,
    details: Optional[Dict[str, Any]] = None,
    error: Optional[str] = None,
):
    """
    Log creator addition actions to Supabase system_logs

    Args:
        username: Instagram username
        action: Action being performed (e.g., 'fetch_started', 'profile_fetched')
        success: Whether the action succeeded
        details: Additional context data
        error: Error message if failed
    """
    try:
        # Prepare context with all relevant details
        context = {"username": username, "action": action, "success": success}
        if details:
            context.update(details)
        if error:
            context["error"] = error

        # Log to unified system_logs table
        log_entry = {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "source": "creator_addition",
            "script_name": "creators_api",
            "level": "info" if success else "error",
            "message": f"Manual creator add: {action} for @{username}"
            + (f" - {error}" if error else ""),
            "context": context,
        }

        _get_db().table("system_logs").insert(log_entry).execute()

        # Also log to Python logger
        if success:
            logger.info(f"Creator addition: {action} for @{username}")
        else:
            logger.error(f"Creator addition failed: {action} for @{username} - {error}")
    except Exception as e:
        logger.error(f"Failed to log creator addition: {e}")


# =============================================================================
# API ENDPOINTS
# =============================================================================


@router.post("/add", response_model=CreatorAddResponse, status_code=202)
async def add_instagram_creator(request: CreatorAddRequest):
    """
    Manually add Instagram creator with full "Ok" processing workflow (ASYNC)

    This endpoint immediately returns 202 Accepted and processes in background:
    1. Fetches profile to get ig_user_id (< 1 second)
    2. Creates/updates minimal database record
    3. Queues background processing (90 reels + 30 posts)
    4. Returns immediately with status

    Background processing takes 2-5 minutes and logs everything to system_logs.
    Poll system_logs with source='creator_addition' to monitor progress.

    Response time: ~1-2 seconds (immediate return)
    Background time: ~2-5 minutes (depends on media size)
    API calls: ~12 (1 profile + 8 reels + 3 posts)
    Cost: ~$0.00036 per creator
    """
    start_time = time.time()

    # 1. Validate and sanitize username
    username = request.username.strip().replace("@", "")

    if not username:
        await log_creator_addition(
            username, "validation_failed", False, error="Username is required"
        )
        return CreatorAddResponse(success=False, error="Username is required")

    logger.info(f"Starting manual addition for @{username} with niche: {request.niche or 'None'}")

    try:
        # 2. Create standalone scraper instance
        await log_creator_addition(username, "scraper_init", True, {"source": "manual_add"})

        scraper = create_scraper_instance()

        # 3. Fetch profile to get ig_user_id (CRITICAL - we need this ID)
        await log_creator_addition(username, "profile_fetch_started", True)

        profile_data = await scraper._fetch_profile(username)

        if not profile_data:
            await log_creator_addition(
                username,
                "profile_fetch_failed",
                False,
                error="Profile not found - username may be invalid, private, or doesn't exist",
            )
            return CreatorAddResponse(success=False, error="Username not found or private account")

        # Extract ig_user_id from profile data
        ig_user_id = profile_data.get("id")

        if not ig_user_id:
            await log_creator_addition(
                username,
                "ig_user_id_missing",
                False,
                error="Failed to extract Instagram user ID from profile",
            )
            return CreatorAddResponse(
                success=False, error="Failed to get Instagram user ID from profile"
            )

        await log_creator_addition(
            username,
            "profile_fetched",
            True,
            {"ig_user_id": ig_user_id, "followers": profile_data.get("follower_count", 0)},
        )

        logger.info(
            f"Profile fetched: @{username} (ID: {ig_user_id}, {profile_data.get('follower_count', 0):,} followers)"
        )

        # 4. Check if creator already exists in database
        try:
            existing_result = (
                _get_db()
                .table("instagram_creators")
                .select("id, ig_user_id, username, review_status")
                .eq("username", username)
                .execute()
            )
            # Check if we got results
            existing_creator = (
                existing_result
                if (existing_result.data and len(existing_result.data) > 0)
                else None
            )
        except Exception as e:
            logger.warning(f"Error checking for existing creator @{username}: {e}")
            existing_creator = None

        if existing_creator and existing_creator.data and len(existing_creator.data) > 0:
            logger.info(
                f"Creator @{username} already exists (ID: {existing_creator.data[0]['id']}), will update"
            )
            await log_creator_addition(
                username,
                "existing_creator_found",
                True,
                {
                    "existing_id": existing_creator.data[0]["id"],
                    "current_review_status": existing_creator.data[0].get("review_status"),
                },
            )

        # 5. INSERT or UPDATE minimal creator record
        if not existing_creator or not existing_creator.data or len(existing_creator.data) == 0:
            # Create new creator record
            initial_data = {
                "ig_user_id": ig_user_id,
                "username": username,
                "niche": request.niche,
                "review_status": "ok",  # CRITICAL - marks for ongoing scraper updates
                "discovery_source": "manual_add",
                "discovery_date": datetime.now(timezone.utc).isoformat(),
                "created_at": datetime.now(timezone.utc).isoformat(),
            }

            insert_result = _get_db().table("instagram_creators").insert(initial_data).execute()

            if not insert_result or not hasattr(insert_result, "data") or not insert_result.data:
                await log_creator_addition(
                    username,
                    "database_insert_failed",
                    False,
                    error="Failed to insert creator record",
                )
                return CreatorAddResponse(
                    success=False, error="Failed to create creator record in database"
                )

            await log_creator_addition(
                username, "creator_inserted", True, {"ig_user_id": ig_user_id}
            )
            logger.info(f"Created new creator record for @{username}")
        else:
            # Update existing creator (ensure review_status is 'ok')
            update_data = {
                "niche": request.niche,
                "review_status": "ok",  # Ensure it's marked as 'ok'
                "updated_at": datetime.now(timezone.utc).isoformat(),
            }

            _get_db().table("instagram_creators").update(update_data).eq(
                "ig_user_id", ig_user_id
            ).execute()

            await log_creator_addition(
                username, "creator_updated", True, {"ig_user_id": ig_user_id}
            )
            logger.info(f"Updated existing creator record for @{username}")

        # 6. Spawn subprocess for background processing (truly independent)
        logger.info(f"Spawning subprocess for @{username} (90 reels + 30 posts)...")
        await log_creator_addition(
            username,
            "spawning_subprocess",
            True,
            {
                "reels_to_fetch": Config.NEW_CREATOR_REELS_COUNT,
                "posts_to_fetch": Config.NEW_CREATOR_POSTS_COUNT,
                "estimated_time_minutes": "2-5",
            },
        )

        # Get path to subprocess script
        script_path = Path(__file__).parent / "process_creator_job.py"

        # Spawn subprocess (detached from parent process)
        subprocess_args = [sys.executable, str(script_path), username, ig_user_id]
        if request.niche:
            subprocess_args.append(request.niche)

        try:
            process = subprocess.Popen(
                subprocess_args,
                start_new_session=True,  # CRITICAL: Detaches from parent process
                stdout=subprocess.PIPE,  # Capture output for debugging
                stderr=subprocess.PIPE,
                cwd=Path(__file__).parent.parent.parent,  # Set working directory to backend/
            )
            logger.info(f"Subprocess PID: {process.pid}, args: {subprocess_args}")
        except Exception as subprocess_error:
            logger.error(f"Failed to spawn subprocess: {subprocess_error}", exc_info=True)
            await log_creator_addition(
                username,
                "subprocess_spawn_failed",
                False,
                error=str(subprocess_error),
            )
            return CreatorAddResponse(
                success=False,
                error=f"Failed to spawn background process: {subprocess_error}",
            )

        logger.info(f"✅ Subprocess spawned for @{username} (detached, will run independently)")

        # 7. Return 202 Accepted immediately
        response_time = int(time.time() - start_time)

        logger.info(
            f"✅ Creator @{username} processing in independent subprocess "
            f"(response time: {response_time}s, estimated completion: 2-5 minutes)"
        )

        return CreatorAddResponse(
            success=True,
            creator={
                "username": username,
                "ig_user_id": ig_user_id,
                "status": "processing",
                "niche": request.niche,
            },
            stats={
                "response_time_seconds": response_time,
                "status": "subprocess_spawned",
                "estimated_completion_minutes": "2-5",
                "monitor_progress": "Poll system_logs with source='creator_addition'",
            },
        )

    except Exception as e:
        error_msg = str(e)
        logger.error(f"Error adding creator @{username}: {error_msg}")

        # Log error
        await log_creator_addition(
            username,
            "addition_error",
            False,
            error=error_msg,
            details={"error_type": type(e).__name__},
        )

        return CreatorAddResponse(success=False, error=f"An error occurred: {error_msg}")


@router.get("/health")
async def health_check():
    """Health check endpoint for creator addition routes"""
    try:
        # Verify Config is accessible
        Config.validate()

        return {
            "status": "healthy",
            "service": "instagram_creator_addition",
            "rapidapi_configured": bool(Config.RAPIDAPI_KEY),
            "new_creator_config": {
                "reels_count": Config.NEW_CREATOR_REELS_COUNT,
                "posts_count": Config.NEW_CREATOR_POSTS_COUNT,
            },
        }
    except Exception as e:
        return {"status": "unhealthy", "service": "instagram_creator_addition", "error": str(e)}
