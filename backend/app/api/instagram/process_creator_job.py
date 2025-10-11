#!/usr/bin/env python3
"""
Background Job: Process Single Instagram Creator
Runs as independent subprocess - detached from API worker

This script is spawned by the manual creator addition endpoint and runs independently,
allowing the API worker to return immediately while processing continues in background.

Usage:
    python3 -m app.api.instagram.process_creator_job <username> <ig_user_id> [niche]

Example:
    python3 -m app.api.instagram.process_creator_job wendycutiiie 57362461637 "Beauty"
"""

import asyncio
import os
import sys
import time
from datetime import datetime, timezone
from typing import Optional

from app.core.database import get_db
from app.logging import get_logger
from app.scrapers.instagram.services.instagram_scraper import InstagramScraperUnified


# Initialize logger
logger = get_logger(__name__)


async def log_to_system(
    username: str,
    action: str,
    success: bool,
    details: Optional[dict] = None,
    error: Optional[str] = None,
):
    """Log to system_logs with source='creator_addition'"""
    try:
        db = get_db()
        context = {"username": username, "action": action, "success": success}
        if details:
            context.update(details)
        if error:
            context["error"] = error

        log_entry = {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "source": "creator_addition",
            "script_name": "process_creator_job",
            "level": "info" if success else "error",
            "message": f"Background job: {action} for @{username}"
            + (f" - {error}" if error else ""),
            "context": context,
        }

        db.table("system_logs").insert(log_entry).execute()

        if success:
            logger.info(f"Background job: {action} for @{username}")
        else:
            logger.error(f"Background job failed: {action} for @{username} - {error}")
    except Exception as e:
        logger.error(f"Failed to log: {e}")


async def process_creator_subprocess(username: str, ig_user_id: str, niche: Optional[str]):
    """
    Process creator in completely independent subprocess
    This runs detached from the API worker and can take as long as needed
    """
    start_time = time.time()

    try:
        logger.info(f"🔄 Subprocess started for @{username} (PID: {os.getpid()})")
        await log_to_system(username, "subprocess_started", True, {"pid": os.getpid()})

        # Create scraper instance
        scraper = InstagramScraperUnified()

        # Override should_continue() to always return True
        scraper.should_continue = lambda: True  # type: ignore[method-assign]

        # Override _log_to_system() to use source='creator_addition'

        def override_log(level: str, message: str, context: Optional[dict] = None):
            """Override scraper logging to use creator_addition source"""
            if level == "error":
                logger.error(message)
            elif level == "warning":
                logger.warning(message)
            elif level == "success":
                logger.info(f"✅ {message}")
            else:
                logger.info(message)

            try:
                if hasattr(scraper, "supabase") and scraper.supabase:
                    scraper.supabase.table("system_logs").insert(
                        {
                            "timestamp": datetime.now(timezone.utc).isoformat(),
                            "source": "creator_addition",
                            "script_name": "process_creator_job",
                            "level": level,
                            "message": message,
                            "context": context or {},
                        }
                    ).execute()
            except Exception as e:
                logger.error(f"Failed to log to system_logs: {e}")

        scraper._log_to_system = override_log  # type: ignore[method-assign]

        logger.info(f"Scraper initialized - use_modules: {scraper.use_modules}")
        await log_to_system(
            username, "scraper_initialized", True, {"use_modules": scraper.use_modules}
        )

        # Create creator object
        creator_obj = {"ig_user_id": ig_user_id, "username": username, "niche": niche}

        # Track API calls
        api_calls_before = scraper.api_calls_made

        # Run the SAME processing workflow the scraper uses
        logger.info(f"Calling process_creator() for @{username}")
        await log_to_system(username, "process_creator_called", True)

        processing_success = await scraper.process_creator(creator_obj)
        api_calls_used = scraper.api_calls_made - api_calls_before

        logger.info(f"process_creator() returned: {processing_success} for @{username}")
        await log_to_system(
            username,
            "process_creator_returned",
            processing_success,
            {"success": processing_success, "api_calls_used": api_calls_used},
        )

        if not processing_success:
            await log_to_system(
                username,
                "processing_failed",
                False,
                error="process_creator returned False",
            )
            logger.error(f"❌ Processing failed for @{username}")
            return 1  # Exit code 1 for failure

        # Fetch final creator data
        db = get_db()
        final_creator = (
            db.table("instagram_creators")
            .select("*")
            .eq("ig_user_id", ig_user_id)
            .single()
            .execute()
        )

        if final_creator and hasattr(final_creator, "data") and final_creator.data:
            data_summary = {
                "followers_count": final_creator.data.get("followers_count"),
                "avg_views_per_reel_cached": final_creator.data.get("avg_views_per_reel_cached"),
                "avg_engagement_cached": final_creator.data.get("avg_engagement_cached"),
                "has_analytics": final_creator.data.get("avg_views_per_reel_cached") is not None,
            }
            await log_to_system(username, "final_data_fetched", True, data_summary)

        processing_time = int(time.time() - start_time)

        # Log completion
        await log_to_system(
            username,
            "addition_completed",
            True,
            {
                "ig_user_id": ig_user_id,
                "api_calls": api_calls_used,
                "processing_time": processing_time,
                "followers": final_creator.data.get("followers_count", 0)
                if final_creator.data
                else 0,
                "engagement_rate": final_creator.data.get("avg_engagement_rate", 0)
                if final_creator.data
                else 0,
            },
        )

        logger.info(
            f"✅ Successfully processed @{username}: "
            f"{api_calls_used} API calls, {processing_time}s processing time"
        )
        return 0  # Exit code 0 for success

    except Exception as e:
        error_msg = str(e)
        logger.error(f"❌ Subprocess failed for @{username}: {error_msg}", exc_info=True)
        await log_to_system(
            username,
            "subprocess_error",
            False,
            error=error_msg,
            details={"error_type": type(e).__name__},
        )
        return 1  # Exit code 1 for failure


def main():
    """Entry point for subprocess"""
    if len(sys.argv) < 3:
        print("Usage: python3 process_creator_job.py <username> <ig_user_id> [niche]")
        sys.exit(1)

    username = sys.argv[1]
    ig_user_id = sys.argv[2]
    niche = sys.argv[3] if len(sys.argv) > 3 else None

    logger.info(f"🚀 Starting background job for @{username} (PID: {os.getpid()})")

    try:
        exit_code = asyncio.run(process_creator_subprocess(username, ig_user_id, niche))
        sys.exit(exit_code)
    except KeyboardInterrupt:
        logger.info("Job interrupted")
        sys.exit(130)
    except Exception as e:
        logger.error(f"Fatal error: {e}", exc_info=True)
        sys.exit(1)


if __name__ == "__main__":
    main()
