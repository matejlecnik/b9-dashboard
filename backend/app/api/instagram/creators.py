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

import time
from datetime import datetime, timezone
from typing import Any, Dict, Optional

from fastapi import APIRouter, BackgroundTasks
from pydantic import BaseModel
from supabase import Client


# Import scraper and config
try:
    from app.core.config.r2_config import r2_config
    from app.scrapers.instagram.services.instagram_config import Config
    from app.scrapers.instagram.services.instagram_scraper import InstagramScraperUnified
except ImportError:
    # Fallback for different import paths
    from api_render.app.core.config.r2_config import r2_config  # type: ignore[no-redef]
    from api_render.app.scrapers.instagram.services.instagram_config import (  # type: ignore[no-redef]
        Config,
    )
    from api_render.app.scrapers.instagram.services.instagram_scraper import (  # type: ignore[no-redef]
        InstagramScraperUnified,
    )

# Import database singleton and unified logger
from app.core.database import get_db
from app.logging import get_logger


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


def create_scraper_instance() -> InstagramScraperUnified:
    """
    Create standalone scraper instance for manual creator addition

    This bypasses the system_control table checks that the main scraper uses,
    allowing us to use the same processing logic without running the full scraper.

    IMPORTANT: R2 uploads are disabled for manual additions to prevent timeout.
    Content is saved with CDN URLs which remain valid. R2 migration can happen
    via background job later.
    """
    try:
        # CRITICAL FIX: Disable R2 uploads BEFORE creating scraper (Bug #2)
        # Processing 70 reels with R2 upload takes 17-23 minutes but worker timeout is 2 minutes
        # Save content with CDN URLs instead - they remain valid indefinitely
        original_r2_enabled = r2_config.ENABLED if r2_config else False
        if r2_config:
            r2_config.ENABLED = False
            logger.info("✅ R2 uploads disabled for manual creator addition (prevents timeout)")

        scraper = InstagramScraperUnified()

        # Override should_continue() to always return True for manual additions
        # This prevents the scraper from checking system_control table
        scraper.should_continue = lambda: True  # type: ignore[method-assign]

        # Store original R2 state to potentially restore later
        scraper._original_r2_enabled = original_r2_enabled  # type: ignore[attr-defined]

        logger.info("Created standalone scraper instance for manual creator addition")
        return scraper
    except Exception as e:
        logger.error(f"Failed to create scraper instance: {e}")
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


@router.post("/add", response_model=CreatorAddResponse)
async def add_instagram_creator(request: CreatorAddRequest, background_tasks: BackgroundTasks):
    """
    Manually add Instagram creator with full "Ok" processing workflow

    This endpoint mimics the automated scraper's behavior:
    1. Fetches profile to get ig_user_id
    2. Creates/updates minimal database record
    3. Runs full processing (90 reels + 30 posts)
    4. Calculates comprehensive analytics
    5. Returns complete creator profile

    Response time: ~15-20 seconds (with rate limiting)
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
            existing_creator = existing_result if (existing_result.data and len(existing_result.data) > 0) else None
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

        # 6. Run FULL processing workflow (like the scraper does for "Ok" creators)
        logger.info(f"Starting full processing for @{username} (90 reels + 30 posts)...")
        await log_creator_addition(
            username,
            "full_processing_started",
            True,
            {
                "reels_to_fetch": Config.NEW_CREATOR_REELS_COUNT,
                "posts_to_fetch": Config.NEW_CREATOR_POSTS_COUNT,
            },
        )

        # Create creator object in the format process_creator() expects
        creator_obj = {"ig_user_id": ig_user_id, "username": username, "niche": request.niche}

        # Track API calls before processing
        api_calls_before = scraper.api_calls_made

        # Run the SAME processing workflow the scraper uses
        processing_success = await scraper.process_creator(creator_obj)

        # Calculate API calls used
        api_calls_used = scraper.api_calls_made - api_calls_before

        if not processing_success:
            await log_creator_addition(
                username,
                "processing_failed",
                False,
                error="Full processing workflow failed",
                details={"api_calls_used": api_calls_used},
            )
            return CreatorAddResponse(
                success=False,
                error="Processing failed - could not fetch creator content or calculate analytics",
            )

        await log_creator_addition(
            username, "processing_completed", True, {"api_calls_used": api_calls_used}
        )

        # 7. Fetch complete creator data from database
        final_creator = (
            _get_db()
            .table("instagram_creators")
            .select("*")
            .eq("ig_user_id", ig_user_id)
            .single()
            .execute()
        )

        if not final_creator or not hasattr(final_creator, "data") or not final_creator.data:
            await log_creator_addition(
                username,
                "final_fetch_failed",
                False,
                error="Creator processed but not found in database",
            )
            return CreatorAddResponse(
                success=False,
                error="Creator processing succeeded but failed to retrieve final data",
            )

        # 8. Calculate processing statistics
        processing_time = int(time.time() - start_time)

        stats = {
            "api_calls_used": api_calls_used,
            "reels_fetched": Config.NEW_CREATOR_REELS_COUNT,
            "posts_fetched": Config.NEW_CREATOR_POSTS_COUNT,
            "processing_time_seconds": processing_time,
        }

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

        # 9. Restore R2 configuration (important for other operations)
        if hasattr(scraper, '_original_r2_enabled') and r2_config:
            r2_config.ENABLED = scraper._original_r2_enabled
            logger.info(f"✅ R2 state restored to: {scraper._original_r2_enabled}")

        # 10. Return success response
        return CreatorAddResponse(success=True, creator=final_creator.data, stats=stats)

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

        # Restore R2 state even on error
        try:
            if 'scraper' in locals() and hasattr(scraper, '_original_r2_enabled') and r2_config:
                r2_config.ENABLED = scraper._original_r2_enabled
                logger.info(f"✅ R2 state restored after error to: {scraper._original_r2_enabled}")
        except:
            pass

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
