"""
Instagram Scraper Background Task Handler
Manages the Instagram scraper execution as a background task
"""
import asyncio
import logging
from typing import Optional
from datetime import datetime
import threading

from services.instagram.unified_scraper import InstagramScraperUnified
from services.instagram.instagram_config import Config

logger = logging.getLogger(__name__)

# Global scraper instance
_scraper_instance: Optional[InstagramScraperUnified] = None
_scraper_thread: Optional[threading.Thread] = None


def get_scraper_instance() -> Optional[InstagramScraperUnified]:
    """Get the current scraper instance"""
    global _scraper_instance
    return _scraper_instance


def is_scraper_running() -> bool:
    """Check if scraper is currently running"""
    global _scraper_thread
    return _scraper_thread and _scraper_thread.is_alive()


def start_instagram_scraper() -> dict:
    """Start the Instagram scraper in a background thread"""
    global _scraper_instance, _scraper_thread

    try:
        # Check if already running
        if is_scraper_running():
            return {
                "success": False,
                "message": "Scraper is already running",
                "status": "running"
            }

        # Validate configuration
        Config.validate()

        # Create new scraper instance
        _scraper_instance = InstagramScraperUnified()

        # Create and start thread
        _scraper_thread = threading.Thread(
            target=_run_scraper,
            name="instagram-scraper",
            daemon=True
        )
        _scraper_thread.start()

        logger.info("Instagram scraper started successfully")

        return {
            "success": True,
            "message": "Scraper started successfully",
            "status": "running",
            "config": {
                "workers": Config.MAX_WORKERS,
                "requests_per_second": Config.REQUESTS_PER_SECOND,
                "concurrent_creators": Config.CONCURRENT_CREATORS,
                "batch_size": Config.BATCH_SIZE
            }
        }

    except Exception as e:
        logger.error(f"Failed to start Instagram scraper: {e}")
        return {
            "success": False,
            "message": f"Failed to start scraper: {str(e)}",
            "status": "error"
        }


def stop_instagram_scraper() -> dict:
    """Stop the Instagram scraper"""
    global _scraper_instance, _scraper_thread

    try:
        if not is_scraper_running():
            return {
                "success": False,
                "message": "Scraper is not running",
                "status": "stopped"
            }

        # Signal scraper to stop
        if _scraper_instance:
            _scraper_instance.request_stop()
            _scraper_instance.update_scraper_status("stopping")

        # Wait for thread to finish (with timeout)
        if _scraper_thread:
            _scraper_thread.join(timeout=30)

            if _scraper_thread.is_alive():
                logger.warning("Scraper thread did not stop gracefully")
                return {
                    "success": False,
                    "message": "Scraper did not stop gracefully",
                    "status": "error"
                }

        # Clean up
        _scraper_instance = None
        _scraper_thread = None

        logger.info("Instagram scraper stopped successfully")

        return {
            "success": True,
            "message": "Scraper stopped successfully",
            "status": "stopped"
        }

    except Exception as e:
        logger.error(f"Failed to stop Instagram scraper: {e}")
        return {
            "success": False,
            "message": f"Failed to stop scraper: {str(e)}",
            "status": "error"
        }


def get_scraper_status() -> dict:
    """Get the current status of the Instagram scraper"""
    global _scraper_instance, _scraper_thread

    try:
        is_running = is_scraper_running()

        status_data = {
            "running": is_running,
            "status": "running" if is_running else "stopped",
            "timestamp": datetime.utcnow().isoformat()
        }

        # Add performance metrics if running
        if is_running and _scraper_instance:
            if hasattr(_scraper_instance, 'performance_monitor'):
                stats = _scraper_instance.performance_monitor.get_stats()
                status_data["performance"] = {
                    "current_rps": stats.get("current_rps", 0),
                    "avg_response_time": stats.get("avg_response_time", 0),
                    "total_requests": stats.get("total_requests", 0),
                    "uptime_seconds": stats.get("uptime_seconds", 0)
                }

            status_data["progress"] = {
                "creators_processed": _scraper_instance.creators_processed,
                "api_calls_made": _scraper_instance.api_calls_made,
                "successful_calls": _scraper_instance.successful_calls if hasattr(_scraper_instance, 'successful_calls') else _scraper_instance.api_calls_made,
                "failed_calls": _scraper_instance.failed_calls if hasattr(_scraper_instance, 'failed_calls') else 0,
                "daily_api_calls": _scraper_instance.daily_calls if hasattr(_scraper_instance, 'daily_calls') else 0,
                "errors": len(_scraper_instance.errors) if hasattr(_scraper_instance, 'errors') else 0
            }

            # Cost tracking
            if Config.ENABLE_COST_TRACKING:
                cost = _scraper_instance.api_calls_made * Config.get_cost_per_request()
                status_data["cost"] = {
                    "current_run": cost,
                    "total_daily_calls": _scraper_instance.daily_calls + _scraper_instance.api_calls_made,
                    "total_monthly_calls": _scraper_instance.monthly_calls + _scraper_instance.api_calls_made
                }

        return status_data

    except Exception as e:
        logger.error(f"Failed to get scraper status: {e}")
        return {
            "running": False,
            "status": "error",
            "error": str(e),
            "timestamp": datetime.utcnow().isoformat()
        }


def _run_scraper():
    """Internal function to run the scraper"""
    global _scraper_instance

    try:
        if _scraper_instance:
            _scraper_instance.run()
    except Exception as e:
        logger.error(f"Scraper execution failed: {e}")
        if _scraper_instance:
            _scraper_instance.update_scraper_status("error", {"error": str(e)})
    finally:
        # Clean up when done
        _scraper_instance = None


# Async wrapper functions for FastAPI

async def start_scraper_async() -> dict:
    """Async wrapper for starting the scraper"""
    return await asyncio.to_thread(start_instagram_scraper)


async def stop_scraper_async() -> dict:
    """Async wrapper for stopping the scraper"""
    return await asyncio.to_thread(stop_instagram_scraper)


async def get_status_async() -> dict:
    """Async wrapper for getting scraper status"""
    return await asyncio.to_thread(get_scraper_status)