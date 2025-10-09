#!/usr/bin/env python3
"""
Reddit Scraper Control & Status Endpoints
Manages Reddit scraper via system_control table and subprocess
"""

# Version tracking
import os
import signal
import subprocess
import sys
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Request
from supabase import Client

# Import database singleton and unified logger
from app.core.database import get_db
from app.logging import get_logger
from app.version import REDDIT_SCRAPER_VERSION as API_VERSION


# Note: system_logger and log_api_call moved to unified logging system
system_logger = None
log_api_call = None

logger = get_logger(__name__)

# Create router
router = APIRouter(prefix="/api/reddit/scraper", tags=["reddit-scraper"])


# Get Supabase client using singleton
def get_supabase() -> Client:
    """Get Supabase client from singleton"""
    return get_db()


@router.get("/health")
async def get_reddit_scraper_health(request: Request):
    """Get Reddit scraper health status for monitoring"""
    try:
        supabase = get_supabase()

        # Get control record
        result = (
            supabase.table("system_control")
            .select("*")
            .eq("script_name", "reddit_scraper")
            .execute()
        )

        if not result.data or len(result.data) == 0:
            return {
                "healthy": False,
                "status": "not_initialized",
                "message": "Reddit scraper not found in control table",
            }

        control = result.data[0]
        now = datetime.now(timezone.utc)

        # Check heartbeat (consider unhealthy if no heartbeat for 5 minutes)
        last_heartbeat = control.get("last_heartbeat")
        if last_heartbeat:
            heartbeat_time = datetime.fromisoformat(last_heartbeat.replace("Z", "+00:00"))
            heartbeat_age = (now - heartbeat_time).total_seconds()
            is_healthy = heartbeat_age < 300  # 5 minutes (scraper is slower than Instagram)
        else:
            is_healthy = False
            heartbeat_age = None

        # Build health response
        health_status = {
            "healthy": is_healthy,
            "enabled": control.get("enabled", False),
            "status": control.get("status", "unknown"),
            "heartbeat_age_seconds": heartbeat_age,
            "last_heartbeat": last_heartbeat,
            "pid": control.get("pid"),
            "version": API_VERSION,
        }

        # Log API call
        if log_api_call:
            log_api_call(request, "GET /api/scraper/health", 200, "reddit_scraper")

        return health_status

    except Exception as e:
        logger.error(f"Failed to get health status: {e}")
        if log_api_call:
            log_api_call(request, "GET /api/scraper/health", 500, "reddit_scraper")
        return {"healthy": False, "status": "error", "error": str(e)}


@router.get("/status")
async def get_reddit_scraper_status(request: Request):
    """Get Reddit scraper status from Supabase"""
    try:
        supabase = get_supabase()

        # Check scraper control state
        is_running = False
        last_updated = None
        pid = None

        try:
            result = (
                supabase.table("system_control")
                .select("*")
                .eq("script_name", "reddit_scraper")
                .execute()
            )
            if result.data and len(result.data) > 0:
                control = result.data[0]
                is_running = control.get("enabled", False) or control.get("status") == "running"
                last_updated = control.get("updated_at")
                pid = control.get("pid")
        except Exception as e:
            logger.debug(f"Could not get scraper control state: {e}")
            if system_logger:
                system_logger.debug(
                    f"Could not get scraper control state: {e}",
                    source="reddit_scraper",
                    script_name="reddit_scraper_routes",
                    context={"error": str(e)},
                )

        # Get last activity from logs
        last_activity = None
        try:
            result = (
                supabase.table("system_logs")
                .select("timestamp")
                .eq("source", "reddit_scraper")
                .order("timestamp", desc=True)
                .limit(1)
                .execute()
            )

            if result.data:
                last_activity = result.data[0]["timestamp"]
        except Exception:
            pass

        return {
            "version": API_VERSION,
            "system_health": {
                "database": "healthy",
                "scraper": "running" if is_running else "stopped",
                "reddit_api": "healthy",
            },
            "control": {
                "enabled": is_running,
                "last_updated": last_updated,
                "pid": pid,
                "control_via": "supabase_and_api",
                "control_table": "system_control",
                "control_method": "POST /api/scraper/start or /stop",
            },
            "last_activity": last_activity,
            "last_updated": datetime.now(timezone.utc).isoformat(),
        }

    except Exception as e:
        logger.error(f"Failed to get status: {e}")
        if system_logger:
            system_logger.error(
                f"Failed to get Reddit scraper status: {e}",
                source="reddit_scraper",
                script_name="reddit_scraper_routes",
                context={"error": str(e), "endpoint": "status"},
                sync=True,
            )
        return {
            "version": API_VERSION,
            "system_health": {"database": "error", "scraper": "unknown", "reddit_api": "unknown"},
            "error": str(e),
            "last_updated": datetime.now(timezone.utc).isoformat(),
        }


@router.get("/status-detailed")
async def get_reddit_scraper_status_detailed(request: Request):
    """Get detailed Reddit scraper status"""
    try:
        # Get basic status
        basic_status = await get_reddit_scraper_status(request)
        basic_status["version"] = API_VERSION

        # Check the actual system_control table for the true state
        supabase = get_supabase()
        is_running = False

        try:
            control_result = (
                supabase.table("system_control")
                .select("enabled")
                .eq("script_name", "reddit_scraper")
                .execute()
            )
            if control_result.data and len(control_result.data) > 0:
                is_running = control_result.data[0].get("enabled", False)
        except Exception as e:
            logger.debug(f"Could not get scraper control state: {e}")
            if system_logger:
                system_logger.debug(
                    f"Could not get scraper control state: {e}",
                    source="reddit_scraper",
                    script_name="reddit_scraper_routes",
                    context={"error": str(e)},
                )
            is_running = basic_status["system_health"]["scraper"] == "running"

        stats = {}

        try:
            # Get today's metrics
            today = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)

            # Count logs for today
            result = (
                supabase.table("system_logs")
                .select("id", count="exact")  # type: ignore[arg-type]
                .eq("source", "reddit_scraper")
                .gte("timestamp", today.isoformat())
                .execute()
            )

            if result.count:
                stats["daily_api_calls"] = result.count

            # Get success/failure from logs
            success_logs = (
                supabase.table("system_logs")
                .select("message")
                .eq("source", "reddit_scraper")
                .gte("timestamp", today.isoformat())
                .like("message", "%✅%")
                .limit(100)
                .execute()
            )

            error_logs = (
                supabase.table("system_logs")
                .select("message")
                .eq("source", "reddit_scraper")
                .gte("timestamp", today.isoformat())
                .eq("level", "error")
                .limit(100)
                .execute()
            )

            successful_calls = len(success_logs.data) if success_logs.data else 0
            failed_calls = len(error_logs.data) if error_logs.data else 0
            stats["successful_requests"] = successful_calls
            stats["failed_requests"] = failed_calls

        except Exception as e:
            logger.debug(f"Could not get stats: {e}")
            if system_logger:
                system_logger.debug(
                    f"Could not get stats: {e}",
                    source="reddit_scraper",
                    script_name="reddit_scraper_routes",
                    context={"error": str(e)},
                )

        return {
            "enabled": is_running,
            "status": "running" if is_running else "stopped",
            "statistics": {
                "daily_api_calls": stats.get("daily_api_calls", 0),
                "successful_requests": stats.get("successful_requests", 0),
                "failed_requests": stats.get("failed_requests", 0),
            },
            "last_activity": basic_status.get("last_activity"),
            "control_info": basic_status.get("control"),
        }

    except Exception as e:
        logger.error(f"Failed to get detailed status: {e}")
        if system_logger:
            system_logger.error(
                f"Failed to get detailed Reddit status: {e}",
                source="reddit_scraper",
                script_name="reddit_scraper_routes",
                context={"error": str(e), "endpoint": "detailed_status"},
                sync=True,
            )
        return {
            "enabled": False,
            "status": "error",
            "statistics": {},
            "last_activity": None,
            "error": str(e),
        }


@router.get("/cycle-status")
async def get_cycle_status():
    """Get current Reddit scraper cycle status with elapsed time"""
    try:
        supabase = get_supabase()

        # Get system_control record
        result = (
            supabase.table("system_control")
            .select("*")
            .eq("script_name", "reddit_scraper")
            .execute()
        )

        if not result.data or len(result.data) == 0:
            return {
                "success": True,
                "running": False,
                "status": "not_configured",
                "message": "Reddit scraper not found in system_control table",
                "cycle": {
                    "elapsed_formatted": "Not Configured",
                    "start_time": None,
                    "elapsed_seconds": None,
                },
            }

        control = result.data[0]
        is_enabled = control.get("enabled", False)

        if not is_enabled:
            return {
                "success": True,
                "running": False,
                "status": "Not Active",
                "cycle": {
                    "elapsed_formatted": "Not Active",
                    "start_time": None,
                    "elapsed_seconds": None,
                },
            }

        # Get started_at from system_control
        start_time = control.get("started_at")

        if not start_time:
            # Fallback: try to find start from logs
            result = (
                supabase.table("system_logs")
                .select("timestamp")
                .eq("source", "reddit_scraper")
                .like("message", "%Starting Reddit Scraper%")
                .order("timestamp", desc=True)
                .limit(1)
                .execute()
            )

            if result.data and len(result.data) > 0:
                start_time = result.data[0]["timestamp"]

        if not start_time:
            return {
                "success": True,
                "running": True,
                "status": "Running",
                "cycle": {
                    "start_time": None,
                    "elapsed_seconds": None,
                    "elapsed_formatted": "Unknown",
                },
            }

        # Calculate elapsed time
        start_dt = datetime.fromisoformat(start_time.replace("Z", "+00:00"))
        elapsed_seconds = (datetime.now(timezone.utc) - start_dt).total_seconds()

        # Format elapsed time
        if elapsed_seconds >= 3600:
            hours = int(elapsed_seconds // 3600)
            minutes = int((elapsed_seconds % 3600) // 60)
            elapsed_formatted = f"{hours}h {minutes}m"
        elif elapsed_seconds >= 60:
            minutes = int(elapsed_seconds // 60)
            seconds = int(elapsed_seconds % 60)
            elapsed_formatted = f"{minutes}m {seconds}s"
        else:
            elapsed_formatted = f"{int(elapsed_seconds)}s"

        return {
            "success": True,
            "running": True,
            "status": "Running",
            "cycle": {
                "start_time": start_time,
                "elapsed_seconds": int(elapsed_seconds),
                "elapsed_formatted": elapsed_formatted,
            },
        }

    except Exception as e:
        logger.error(f"Failed to get cycle status: {e}")
        return {
            "success": False,
            "running": False,
            "status": "error",
            "error": str(e),
            "cycle": None,
        }


@router.get("/reddit-api-stats")
async def get_reddit_api_stats():
    """Get Reddit API usage statistics"""
    try:
        supabase = get_supabase()

        # Get today's stats
        today = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)

        # Count API calls from logs
        api_calls = (
            supabase.table("system_logs")
            .select("id", count="exact")  # type: ignore[arg-type]
            .eq("source", "reddit_scraper")
            .gte("timestamp", today.isoformat())
            .execute()
        )

        return {
            "daily_calls": api_calls.count if api_calls.count else 0,
            "daily_limit": None,  # No artificial limit
            "remaining": "unlimited",
            "reset_at": (today.replace(hour=0, minute=0, second=0) + timedelta(days=1)).isoformat(),
        }

    except Exception as e:
        logger.error(f"Failed to get Reddit API stats: {e}")
        return {"daily_calls": 0, "daily_limit": None, "remaining": "unlimited", "error": str(e)}


@router.get("/success-rate")
async def get_reddit_success_rate():
    """Get Reddit API success rate from actual API requests (not all logs)"""
    try:
        supabase = get_supabase()

        # Get current run's start time from system_control
        control_result = (
            supabase.table("system_control")
            .select("started_at")
            .eq("script_name", "reddit_scraper")
            .execute()
        )

        # Default to last 24 hours if no started_at found
        if control_result.data and len(control_result.data) > 0 and control_result.data[0].get("started_at"):
            start_time = control_result.data[0]["started_at"]
        else:
            # Fallback to 24 hours ago
            start_time = (datetime.now(timezone.utc) - timedelta(hours=24)).isoformat()

        # Pre-filter logs at DATABASE level for efficiency (not in Python)
        # Query 1: Successful user post fetches - "[X/Y] username: ✅ N posts"
        successful_logs = (
            supabase.table("system_logs")
            .select("id", count="exact")
            .eq("source", "reddit_scraper")
            .gte("timestamp", start_time)
            .like("message", "%✅%posts%")
            .like("message", "%[%/%]%")  # Ensure [X/Y] format
            .execute()
        )

        # Query 2: Failed user post fetches - "[X/Y] username: ⚠️ 0 posts"
        failed_user_logs = (
            supabase.table("system_logs")
            .select("id", count="exact")
            .eq("source", "reddit_scraper")
            .gte("timestamp", start_time)
            .like("message", "%⚠️%0 posts%")
            .execute()
        )

        # Query 3: API validation failures - "⚠️ subreddit_info is None"
        validation_failures = (
            supabase.table("system_logs")
            .select("id", count="exact")
            .eq("source", "reddit_scraper")
            .gte("timestamp", start_time)
            .like("message", "%⚠️%is None%")
            .execute()
        )

        # Query 4: Retry attempts - "🔄 Retrying subreddit_info"
        retry_logs = (
            supabase.table("system_logs")
            .select("id", count="exact")
            .eq("source", "reddit_scraper")
            .gte("timestamp", start_time)
            .like("message", "%🔄 Retrying%")
            .execute()
        )

        # Query 5: Explicit error logs related to API
        error_logs = (
            supabase.table("system_logs")
            .select("id", count="exact")
            .eq("source", "reddit_scraper")
            .eq("level", "error")
            .gte("timestamp", start_time)
            .execute()
        )

        # Calculate totals from database counts (not Python filtering)
        successful_requests = successful_logs.count or 0
        failed_requests = (
            (failed_user_logs.count or 0)
            + (validation_failures.count or 0)
            + (retry_logs.count or 0)
            + (error_logs.count or 0)
        )
        total_requests = successful_requests + failed_requests

        if total_requests == 0:
            # No API requests found in logs yet
            return {
                "success": True,
                "stats": {
                    "total_requests": 0,
                    "successful_requests": 0,
                    "failed_requests": 0,
                    "success_rate": 100.0,
                },
            }

        success_rate = (successful_requests / total_requests * 100) if total_requests > 0 else 100.0

        return {
            "success": True,
            "stats": {
                "total_requests": total_requests,
                "successful_requests": successful_requests,
                "failed_requests": failed_requests,
                "success_rate": round(success_rate, 2),
            },
        }

    except Exception as e:
        logger.error(f"Failed to get Reddit success rate: {e}")
        if system_logger:
            system_logger.error(
                f"Failed to get Reddit success rate: {e}",
                source="reddit_scraper",
                script_name="reddit_scraper_routes",
                context={"error": str(e), "endpoint": "success_rate"},
                sync=True,
            )
        return {
            "success": False,
            "message": str(e),
            "stats": {
                "total_requests": 0,
                "successful_requests": 0,
                "failed_requests": 0,
                "success_rate": 0,
            },
        }


@router.post("/start")
async def start_reddit_scraper(request: Request):
    """Start the Reddit scraper by launching subprocess"""
    try:
        supabase = get_supabase()

        # Check current status
        result = (
            supabase.table("system_control")
            .select("*")
            .eq("script_name", "reddit_scraper")
            .execute()
        )

        if result.data and len(result.data) > 0:
            # Check if already enabled
            if result.data[0].get("enabled"):
                logger.info("Reddit scraper is already enabled")
                return {
                    "success": True,
                    "message": "Reddit scraper is already running",
                    "status": "already_running",
                }

            # Update existing record to enable
            supabase.table("system_control").update(
                {
                    "enabled": True,
                    "status": "starting",
                    "started_at": datetime.now(timezone.utc).isoformat(),
                    "stopped_at": None,
                    "updated_at": datetime.now(timezone.utc).isoformat(),
                    "updated_by": "api",
                }
            ).eq("script_name", "reddit_scraper").execute()
        else:
            # Create new record if doesn't exist
            supabase.table("system_control").insert(
                {
                    "script_name": "reddit_scraper",
                    "script_type": "scraper",
                    "enabled": True,
                    "status": "starting",
                    "started_at": datetime.now(timezone.utc).isoformat(),
                    "updated_at": datetime.now(timezone.utc).isoformat(),
                    "updated_by": "api",
                    "config": {"batch_size": 5, "max_daily_requests": 10000},
                }
            ).execute()

        # Start the actual subprocess
        try:
            # Open log file for Reddit scraper output
            log_file_path = "/tmp/reddit_scraper.log"
            log_file = open(log_file_path, "a")  # noqa: SIM115 - Must stay open for subprocess
            log_file.write(f"\n\n{'=' * 60}\n")
            log_file.write(
                f"Starting Reddit scraper v{API_VERSION} at {datetime.now(timezone.utc).isoformat()}\n"
            )
            log_file.write("Started via API endpoint\n")
            log_file.write(f"{'=' * 60}\n")
            log_file.flush()

            # Start Reddit scraper subprocess with proper logging
            env = os.environ.copy()
            env["PYTHONUNBUFFERED"] = "1"
            env["PYTHONPATH"] = "/app/backend"  # Ensure module imports work

            reddit_process = subprocess.Popen(
                [sys.executable, "-u", "app/scrapers/reddit/reddit_controller.py"],
                stdout=log_file,
                stderr=subprocess.STDOUT,
                stdin=subprocess.DEVNULL,
                start_new_session=True,  # Detach from parent
                cwd="/app/backend",  # Absolute path to backend directory
                env=env,
            )

            # Check if process started successfully
            import time

            time.sleep(2)  # Give it time to start

            if reddit_process.poll() is None:
                # Process is running
                logger.info(f"✅ Reddit scraper subprocess started with PID: {reddit_process.pid}")

                # Update PID and status in database
                supabase.table("system_control").update(
                    {
                        "pid": reddit_process.pid,
                        "status": "running",
                        "last_heartbeat": datetime.now(timezone.utc).isoformat(),
                    }
                ).eq("script_name", "reddit_scraper").execute()

                # Log success to file
                log_file.write(
                    f"✅ Subprocess started successfully with PID: {reddit_process.pid}\n"
                )
                log_file.flush()

                # Log the action
                if system_logger:
                    system_logger.info(
                        f"✅ Reddit scraper v{API_VERSION} started via API",
                        source="reddit_scraper",
                        script_name="reddit_scraper_routes",
                        context={"action": "start", "pid": reddit_process.pid},
                    )

                logger.info("✅ Reddit scraper started successfully")

                return {
                    "success": True,
                    "message": f"Reddit scraper v{API_VERSION} started successfully",
                    "status": "running",
                    "pid": reddit_process.pid,
                    "details": {
                        "method": "subprocess",
                        "version": API_VERSION,
                        "started_at": datetime.now(timezone.utc).isoformat(),
                    },
                }
            else:
                # Process died immediately - read the error
                log_file.close()
                with open(log_file_path) as f:
                    error_output = f.read()
                    last_lines = error_output.split("\n")[-20:]  # Get last 20 lines
                    error_msg = "\n".join(last_lines)

                logger.error(
                    f"Reddit scraper subprocess died immediately. Last output:\n{error_msg}"
                )

                # Update database with error
                supabase.table("system_control").update(
                    {
                        "enabled": False,
                        "status": "error",
                        "last_error": f"Process died on startup: {error_msg[:500]}",
                        "last_error_at": datetime.now(timezone.utc).isoformat(),
                    }
                ).eq("script_name", "reddit_scraper").execute()

                return {
                    "success": False,
                    "message": "Reddit scraper process died on startup",
                    "status": "error",
                    "error": error_msg,
                }

        except Exception as subprocess_error:
            logger.error(f"Failed to start subprocess: {subprocess_error}")
            import traceback

            logger.error(f"Traceback: {traceback.format_exc()}")

            # Update database with error
            supabase.table("system_control").update(
                {
                    "enabled": False,
                    "status": "error",
                    "last_error": f"Failed to start subprocess: {subprocess_error!s}",
                    "last_error_at": datetime.now(timezone.utc).isoformat(),
                }
            ).eq("script_name", "reddit_scraper").execute()

            return {
                "success": False,
                "message": f"Failed to start subprocess: {subprocess_error!s}",
                "status": "error",
            }

    except Exception as e:
        logger.error(f"Error starting Reddit scraper: {e}")
        if system_logger:
            system_logger.error(
                f"Failed to start Reddit scraper: {e}",
                source="reddit_scraper",
                script_name="reddit_scraper_routes",
                context={"error": str(e), "endpoint": "start"},
                sync=True,
            )
        return {
            "success": False,
            "message": f"Failed to start Reddit scraper: {e!s}",
            "status": "error",
        }


@router.post("/stop")
async def stop_reddit_scraper(request: Request):
    """Stop the Reddit scraper by updating control table and killing process"""
    try:
        supabase = get_supabase()

        # Get current PID
        result = (
            supabase.table("system_control")
            .select("*")
            .eq("script_name", "reddit_scraper")
            .execute()
        )

        if not result.data or len(result.data) == 0:
            return {
                "success": False,
                "message": "Reddit scraper not found in control table",
                "status": "not_found",
            }

        control = result.data[0]
        pid = control.get("pid")

        # Update control table first
        supabase.table("system_control").update(
            {
                "enabled": False,
                "status": "stopped",
                "stopped_at": datetime.now(timezone.utc).isoformat(),
                "updated_at": datetime.now(timezone.utc).isoformat(),
                "updated_by": "api",
            }
        ).eq("script_name", "reddit_scraper").execute()

        # Try to kill the process if PID exists
        if pid:
            try:
                os.kill(pid, signal.SIGTERM)
                logger.info(f"Sent SIGTERM to Reddit scraper PID {pid}")

                # Wait a bit and then force kill if still running
                import time

                time.sleep(2)
                try:
                    os.kill(pid, signal.SIGKILL)
                    logger.info(f"Sent SIGKILL to Reddit scraper PID {pid}")
                except ProcessLookupError:
                    # Process already dead
                    pass
            except ProcessLookupError:
                logger.info(f"Reddit scraper PID {pid} not found (already stopped)")
            except Exception as kill_error:
                logger.warning(f"Could not kill process {pid}: {kill_error}")

        # Log the action
        if system_logger:
            system_logger.info(
                "🛑 Reddit scraper stopped via API",
                source="reddit_scraper",
                script_name="reddit_scraper_routes",
                context={"action": "stop", "pid": pid},
            )

        logger.info("✅ Reddit scraper stopped successfully")

        return {
            "success": True,
            "message": "Reddit scraper stopped successfully",
            "status": "stopped",
            "details": {
                "method": "database_control_and_signal",
                "pid": pid,
                "stopped_at": datetime.now(timezone.utc).isoformat(),
            },
        }

    except Exception as e:
        logger.error(f"Error stopping Reddit scraper: {e}")
        if system_logger:
            system_logger.error(
                f"Failed to stop Reddit scraper: {e}",
                source="reddit_scraper",
                script_name="reddit_scraper_routes",
                context={"error": str(e), "endpoint": "stop"},
                sync=True,
            )
        return {
            "success": False,
            "message": f"Failed to stop Reddit scraper: {e!s}",
            "status": "error",
        }
