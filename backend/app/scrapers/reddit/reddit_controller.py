#!/usr/bin/env python3
"""Reddit Scraper Controller - Process supervisor for scraper lifecycle"""

import asyncio
import logging
import os
import sys
from datetime import datetime, timezone
from typing import Any

from dotenv import load_dotenv


# Load environment variables
load_dotenv()

# Setup imports
current_dir = os.path.dirname(os.path.abspath(__file__))
if "/app/app/scrapers" in current_dir:
    api_root = os.path.join(current_dir, "..", "..", "..")
    sys.path.insert(0, api_root)
    from app.core.database.supabase_client import get_supabase_client
else:
    api_root = os.path.join(current_dir, "..", "..")
    sys.path.insert(0, api_root)
    from core.database.supabase_client import get_supabase_client  # type: ignore[no-redef]

CONTROLLER_VERSION = "2.1.0"
CHECK_INTERVAL = 30  # seconds

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")
logger = logging.getLogger(__name__)


class RedditController:
    """Manages scraper process lifecycle based on database control flag"""

    def __init__(self):
        self.supabase = get_supabase_client()
        assert self.supabase is not None, "Supabase client required"
        self.scraper = None
        self.scraper_task = None
        logger.info(f"🎛️  Reddit Controller v{CONTROLLER_VERSION} initialized")

    async def is_enabled(self):
        """Check if scraping is enabled in database"""
        try:
            result = (
                self.supabase.table("system_control")  # type: ignore[union-attr]
                .select("enabled")
                .eq("script_name", "reddit_scraper")
                .execute()
            )

            if result.data and len(result.data) > 0:
                return result.data[0].get("enabled", False)
            return False
        except Exception as e:
            logger.error(f"Failed to check enabled status: {e}")
            return False

    async def update_heartbeat(self):
        """Update heartbeat in database for monitoring"""
        try:
            (
                self.supabase.table("system_control")
                .update(
                    {  # type: ignore[union-attr]
                        "last_heartbeat": datetime.now(timezone.utc).isoformat(),
                        "pid": os.getpid(),
                        "status": "running" if self.scraper else "stopped",
                    }
                )
                .eq("script_name", "reddit_scraper")
                .execute()
            )
        except Exception as e:
            logger.error(f"Failed to update heartbeat: {e}")

    async def check_scraper_health(self):
        """Check if scraper is hung by monitoring last log timestamp (v2.1.0 watchdog)"""
        if not self.scraper:
            return True  # No scraper running, no health check needed

        try:
            # Get last log timestamp from system_logs
            result = (
                self.supabase.table("system_logs")  # type: ignore[union-attr]
                .select("timestamp")
                .eq("source", "reddit_scraper")
                .order("timestamp", desc=True)
                .limit(1)
                .execute()
            )

            if result.data and len(result.data) > 0:
                last_log_time = datetime.fromisoformat(
                    result.data[0]["timestamp"].replace("Z", "+00:00")
                )
                now = datetime.now(timezone.utc)
                idle_duration = (now - last_log_time).total_seconds()

                # If no logs for 10 minutes, scraper is likely hung
                if idle_duration > 600:  # 10 minutes
                    logger.warning(
                        f"⚠️  Scraper hung detected: no logs for {int(idle_duration / 60)} minutes"
                    )
                    logger.warning("🔄 Auto-restarting hung scraper...")

                    # Force restart
                    await self.stop_scraper()
                    await asyncio.sleep(5)  # Wait for cleanup
                    await self.start_scraper()

                    return False  # Health check failed, restarted

                # Log health check status for debugging
                if idle_duration > 300:  # Warn if idle > 5 minutes
                    logger.info(f"⏳ Scraper idle for {int(idle_duration / 60)} minutes (healthy)")

            return True  # Health check passed

        except Exception as e:
            logger.error(f"Failed to check scraper health: {e}")
            return True  # Don't restart on health check errors

    async def start_scraper(self):
        """Start the scraper"""
        logger.info("🚀 Starting scraper...")

        RedditScraper: Any = None  # noqa: N806  # Declare as variable to avoid type assignment error
        try:
            # Import using absolute path for standalone execution
            if "/app/app/scrapers" in current_dir:
                from app.scrapers.reddit.reddit_scraper import RedditScraper
            else:
                # Development - try relative import first, fallback to absolute
                try:
                    from .reddit_scraper import RedditScraper
                except ImportError:
                    import importlib.util

                    scraper_path = os.path.join(current_dir, "reddit_scraper.py")
                    spec = importlib.util.spec_from_file_location("reddit_scraper", scraper_path)
                    assert spec is not None
                    module = importlib.util.module_from_spec(spec)
                    spec.loader.exec_module(module)  # type: ignore[union-attr]
                    RedditScraper = module.RedditScraper  # noqa: N806

            self.scraper = RedditScraper(self.supabase)
            self.scraper_task = asyncio.create_task(self.scraper.run())
            logger.info("✅ Scraper started successfully")

        except Exception as e:
            logger.error(f"❌ Failed to start scraper: {e}")

            # Update database with error status
            try:
                (
                    self.supabase.table("system_control")
                    .update(
                        {  # type: ignore[union-attr]
                            "status": "error",
                            "last_error": str(e)[:500],
                            "stopped_at": datetime.now(timezone.utc).isoformat(),
                        }
                    )
                    .eq("script_name", "reddit_scraper")
                    .execute()
                )
            except Exception as db_error:
                logger.error(f"Failed to update error status: {db_error}")

            # Re-raise to be handled by controller
            raise

    async def stop_scraper(self):
        """Stop the running scraper"""
        logger.info("⏹️  Stopping scraper...")

        if self.scraper_task:
            self.scraper_task.cancel()
            from contextlib import suppress

            with suppress(asyncio.CancelledError):
                await self.scraper_task

        if self.scraper and hasattr(self.scraper, "stop"):
            await self.scraper.stop()

        self.scraper = None
        self.scraper_task = None
        logger.info("✅ Scraper stopped")

    async def run(self):
        """Main control loop - checks database every 30s, starts/stops scraper"""
        logger.info(f"▶️  Controller running (checking every {CHECK_INTERVAL}s)")

        try:
            while True:
                enabled = await self.is_enabled()

                # Start scraper if enabled and not running
                if enabled and not self.scraper:
                    await self.start_scraper()

                # Stop scraper if disabled and running
                elif not enabled and self.scraper:
                    await self.stop_scraper()

                # Check scraper health (watchdog for hung scrapers - v2.1.0)
                if enabled and self.scraper:
                    await self.check_scraper_health()

                # Update heartbeat
                await self.update_heartbeat()

                # Wait before next check
                await asyncio.sleep(CHECK_INTERVAL)

        except KeyboardInterrupt:
            logger.info("🛑 Shutdown signal received")
        except Exception as e:
            logger.error(f"❌ Controller error: {e}")
        finally:
            # Cleanup on shutdown
            if self.scraper:
                await self.stop_scraper()

            # Update final status
            try:
                (
                    self.supabase.table("system_control")
                    .update(
                        {  # type: ignore[union-attr]
                            "status": "stopped",
                            "pid": None,
                            "stopped_at": datetime.now(timezone.utc).isoformat(),
                        }
                    )
                    .eq("script_name", "reddit_scraper")
                    .execute()
                )
            except Exception as e:
                logger.error(f"Failed to update shutdown status: {e}")

            logger.info("✅ Controller shutdown complete")


async def main():
    controller = RedditController()
    await controller.run()


if __name__ == "__main__":
    asyncio.run(main())
