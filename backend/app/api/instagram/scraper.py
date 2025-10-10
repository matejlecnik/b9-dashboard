#!/usr/bin/env python3
"""
Instagram Scraper Control & Status Endpoints
Manages Instagram scraper via system_control table
"""

# Version tracking
import os
import signal
import subprocess
import sys
from datetime import datetime, timezone

from fastapi import APIRouter, Request
from supabase import Client

# Import database singleton and unified logger
from app.core.database import get_db
from app.logging import get_logger
from app.version import INSTAGRAM_SCRAPER_VERSION as API_VERSION


# Note: system_logger and log_api_call moved to unified logging system
system_logger = None
log_api_call = None

logger = get_logger(__name__)

# Create router
router = APIRouter(prefix="/api/instagram/scraper", tags=["instagram-scraper"])


# Get Supabase client using singleton
def get_supabase() -> Client:
    """Get Supabase client from singleton"""
    return get_db()


@router.get("/health")
async def get_instagram_scraper_health(request: Request):
    """Get Instagram scraper health status for monitoring"""
    try:
        supabase = get_supabase()

        # Get control record
        result = (
            supabase.table("system_control")
            .select("*")
            .eq("script_name", "instagram_scraper")
            .execute()
        )

        if not result.data or len(result.data) == 0:
            return {
                "healthy": False,
                "status": "not_initialized",
                "message": "Instagram scraper not found in control table",
            }

        control = result.data[0]
        now = datetime.now(timezone.utc)

        # Check heartbeat (consider unhealthy if no heartbeat for 2 minutes)
        last_heartbeat = control.get("last_heartbeat")
        if last_heartbeat:
            heartbeat_time = datetime.fromisoformat(last_heartbeat.replace("Z", "+00:00"))
            heartbeat_age = (now - heartbeat_time).total_seconds()
            is_healthy = heartbeat_age < 120  # 2 minutes
        else:
            is_healthy = False
            heartbeat_age = None

        # Get config info
        config = control.get("config", {})

        # Check if in waiting period
        in_waiting_period = config.get("in_waiting_period", False)
        wait_remaining_seconds = None
        wait_remaining_formatted = None

        if config.get("next_cycle_at"):
            next_cycle_time = datetime.fromisoformat(config["next_cycle_at"].replace("Z", "+00:00"))
            if now < next_cycle_time:
                in_waiting_period = True
                wait_remaining_seconds = (next_cycle_time - now).total_seconds()
                hours = int(wait_remaining_seconds // 3600)
                minutes = int((wait_remaining_seconds % 3600) // 60)
                seconds = int(wait_remaining_seconds % 60)
                wait_remaining_formatted = f"{hours}h {minutes}m {seconds}s"

        # Determine effective status
        effective_status = control.get("status", "unknown")
        if in_waiting_period:
            effective_status = (
                f"waiting ({wait_remaining_formatted})" if wait_remaining_formatted else "waiting"
            )

        # Build health response
        health_status = {
            "healthy": is_healthy,
            "enabled": control.get("enabled", False),
            "status": control.get("status", "unknown"),
            "effective_status": effective_status,
            "heartbeat_age_seconds": heartbeat_age,
            "last_heartbeat": last_heartbeat,
            "pid": control.get("pid"),
            "memory_mb": control.get("memory_mb"),
            "cpu_percent": control.get("cpu_percent"),
            "current_cycle": config.get("current_cycle", 0),
            "total_cycles_completed": config.get("total_cycles_completed", 0),
            "last_cycle_completed_at": config.get("last_cycle_completed_at"),
            "next_cycle_at": config.get("next_cycle_at"),
            "in_waiting_period": in_waiting_period,
            "wait_remaining_seconds": wait_remaining_seconds,
            "wait_remaining_formatted": wait_remaining_formatted,
        }

        # Log API call
        if log_api_call:
            log_api_call(request, "GET /api/instagram/scraper/health", 200, "instagram_scraper")

        return health_status

    except Exception as e:
        logger.error(f"Failed to get health status: {e}")
        if log_api_call:
            log_api_call(request, "GET /api/instagram/scraper/health", 500, "instagram_scraper")
        return {"healthy": False, "status": "error", "error": str(e)}


@router.get("/status")
async def get_instagram_scraper_status(request: Request):
    """Get Instagram scraper status from Supabase"""
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
                .eq("script_name", "instagram_scraper")
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
                    source="instagram_scraper",
                    script_name="instagram_scraper_routes",
                    context={"error": str(e)},
                )

        # Get last activity from logs
        last_activity = None
        try:
            result = (
                supabase.table("system_logs")
                .select("timestamp")
                .eq("source", "instagram_scraper")
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
                "instagram_api": "healthy",
            },
            "control": {
                "enabled": is_running,
                "last_updated": last_updated,
                "pid": pid,
                "control_via": "supabase_only",
                "control_table": "system_control",
                "control_method": "UPDATE system_control SET enabled = true/false WHERE script_name = 'instagram_scraper'",
            },
            "last_activity": last_activity,
            "last_updated": datetime.now(timezone.utc).isoformat(),
        }

    except Exception as e:
        logger.error(f"Failed to get status: {e}")
        if system_logger:
            system_logger.error(
                f"Failed to get Instagram scraper status: {e}",
                source="instagram_scraper",
                script_name="instagram_scraper_routes",
                context={"error": str(e), "endpoint": "status"},
                sync=True,
            )
        return {
            "version": API_VERSION,
            "system_health": {
                "database": "error",
                "scraper": "unknown",
                "instagram_api": "unknown",
            },
            "error": str(e),
            "last_updated": datetime.now(timezone.utc).isoformat(),
        }


@router.get("/status-detailed")
async def get_instagram_scraper_status_detailed(request: Request):
    """Get detailed Instagram scraper status"""
    try:
        # Get basic status
        basic_status = await get_instagram_scraper_status(request)
        basic_status["version"] = API_VERSION

        # Check the actual system_control table for the true state
        supabase = get_supabase()
        is_running = False

        try:
            control_result = (
                supabase.table("system_control")
                .select("enabled")
                .eq("script_name", "instagram_scraper")
                .execute()
            )
            if control_result.data and len(control_result.data) > 0:
                is_running = control_result.data[0].get("enabled", False)
        except Exception as e:
            logger.debug(f"Could not get scraper control state: {e}")
            if system_logger:
                system_logger.debug(
                    f"Could not get scraper control state: {e}",
                    source="instagram_scraper",
                    script_name="instagram_scraper_routes",
                    context={"error": str(e)},
                )
            is_running = basic_status["system_health"]["scraper"] == "running"

        stats = {}
        cycle_info = None

        try:
            # Get today's metrics
            today = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)

            # Count logs for today
            result = (
                supabase.table("system_logs")
                .select("id", count="exact")  # type: ignore[arg-type]
                .eq("source", "instagram_scraper")
                .gte("timestamp", today.isoformat())
                .execute()
            )

            if result.count:
                stats["daily_api_calls"] = result.count

            # Get success/failure from logs
            success_logs = (
                supabase.table("system_logs")
                .select("message")
                .eq("source", "instagram_scraper")
                .gte("timestamp", today.isoformat())
                .like("message", "%✅%")
                .limit(100)
                .execute()
            )

            error_logs = (
                supabase.table("system_logs")
                .select("message")
                .eq("source", "instagram_scraper")
                .gte("timestamp", today.isoformat())
                .eq("level", "error")
                .limit(100)
                .execute()
            )

            successful_calls = len(success_logs.data) if success_logs.data else 0
            failed_calls = len(error_logs.data) if error_logs.data else 0
            stats["successful_requests"] = successful_calls
            stats["failed_requests"] = failed_calls

            # Get cycle information if scraper is running
            if is_running:
                try:
                    # Get the earliest scraper start message from today
                    first_start_result = (
                        supabase.table("system_logs")
                        .select("timestamp")
                        .eq("source", "instagram_scraper")
                        .like("message", "🚀 Continuous Instagram scraper%")
                        .gte("timestamp", today.isoformat())
                        .order("timestamp", asc=True)
                        .limit(1)
                        .execute()
                    )

                    # Get latest cycle info
                    cycle_start_result = (
                        supabase.table("system_logs")
                        .select("message, timestamp, context")
                        .eq("source", "instagram_scraper")
                        .like("message", "🔄 Starting Instagram scraping cycle #%")
                        .order("timestamp", desc=True)
                        .limit(1)
                        .execute()
                    )

                    current_cycle = None
                    cycle_start = None
                    elapsed_seconds = None
                    elapsed_formatted = None

                    # Use the earliest start time for elapsed calculation
                    if first_start_result.data and len(first_start_result.data) > 0:
                        cycle_start = first_start_result.data[0]["timestamp"]
                        start_time = datetime.fromisoformat(cycle_start.replace("Z", "+00:00"))
                        elapsed_seconds = (datetime.now(timezone.utc) - start_time).total_seconds()

                        # Format elapsed time
                        if elapsed_seconds >= 3600:
                            hours = int(elapsed_seconds // 3600)
                            minutes = int((elapsed_seconds % 3600) // 60)
                            elapsed_formatted = f"{hours}h {minutes}m"
                        elif elapsed_seconds >= 60:
                            elapsed_formatted = (
                                f"{int(elapsed_seconds // 60)}m {int(elapsed_seconds % 60)}s"
                            )
                        else:
                            elapsed_formatted = f"{int(elapsed_seconds)}s"

                    # Parse current cycle number
                    if cycle_start_result.data and len(cycle_start_result.data) > 0:
                        start_log = cycle_start_result.data[0]
                        import re

                        match = re.search(r"cycle #(\d+)", start_log["message"])
                        if match:
                            current_cycle = int(match.group(1))

                    cycle_info = {
                        "current_cycle": current_cycle,
                        "cycle_start": cycle_start,
                        "elapsed_seconds": elapsed_seconds,
                        "elapsed_formatted": elapsed_formatted,
                    }

                except Exception as e:
                    logger.debug(f"Could not get cycle info: {e}")
                    if system_logger:
                        system_logger.debug(
                            f"Could not get cycle info: {e}",
                            source="instagram_scraper",
                            script_name="instagram_scraper_routes",
                            context={"error": str(e)},
                        )

        except Exception as e:
            logger.debug(f"Could not get stats: {e}")
            if system_logger:
                system_logger.debug(
                    f"Could not get stats: {e}",
                    source="instagram_scraper",
                    script_name="instagram_scraper_routes",
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
            "cycle": cycle_info,
            "last_activity": basic_status.get("last_activity"),
            "control_info": basic_status.get("control"),
        }

    except Exception as e:
        logger.error(f"Failed to get detailed status: {e}")
        if system_logger:
            system_logger.error(
                f"Failed to get detailed Instagram status: {e}",
                source="instagram_scraper",
                script_name="instagram_scraper_routes",
                context={"error": str(e), "endpoint": "detailed_status"},
                sync=True,
            )
        return {
            "enabled": False,
            "status": "error",
            "statistics": {},
            "cycle": None,
            "last_activity": None,
            "error": str(e),
        }


@router.get("/cycle-status")
async def get_cycle_status():
    """Get current Instagram scraper cycle status"""
    try:
        supabase = get_supabase()

        # Check if scraper is enabled
        control_result = (
            supabase.table("system_control")
            .select("enabled, status")
            .eq("script_name", "instagram_scraper")
            .single()
            .execute()
        )

        is_enabled = control_result.data and (
            control_result.data.get("enabled", False)
            or control_result.data.get("status") == "running"
        )

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

        # Get the most recent scraper start log
        result = (
            supabase.table("system_logs")
            .select("timestamp")
            .eq("source", "instagram_scraper")
            .like("message", "%Continuous Instagram scraper%started%")
            .order("timestamp", desc=True)
            .limit(1)
            .execute()
        )

        # If no result, try "Starting Instagram scraping cycle" pattern
        if not result.data or len(result.data) == 0:
            result = (
                supabase.table("system_logs")
                .select("timestamp")
                .eq("source", "instagram_scraper")
                .like("message", "%Starting Instagram scraping cycle%")
                .order("timestamp", desc=True)
                .limit(1)
                .execute()
            )

        start_time = None
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
        if system_logger:
            system_logger.error(
                f"Failed to get Instagram cycle status: {e}",
                source="instagram_scraper",
                script_name="instagram_scraper_routes",
                context={"error": str(e), "endpoint": "cycle_status"},
                sync=True,
            )
        return {"success": False, "error": str(e), "running": False, "cycle": None}


@router.get("/success-rate")
async def get_instagram_success_rate():
    """Get Instagram API success rate statistics"""
    try:
        supabase = get_supabase()

        # Query specifically for Instagram API request logs
        success_result = (
            supabase.table("system_logs")
            .select("id", count="exact")  # type: ignore[arg-type]
            .eq("source", "instagram_scraper")
            .like("message", "✅%")
            .execute()
        )

        error_result = (
            supabase.table("system_logs")
            .select("id", count="exact")  # type: ignore[arg-type]
            .eq("source", "instagram_scraper")
            .eq("level", "error")
            .execute()
        )

        successful_requests = success_result.count if success_result.count else 0
        failed_requests = error_result.count if error_result.count else 0
        total_requests = successful_requests + failed_requests

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
        logger.error(f"Failed to get Instagram success rate: {e}")
        if system_logger:
            system_logger.error(
                f"Failed to get Instagram success rate: {e}",
                source="instagram_scraper",
                script_name="instagram_scraper_routes",
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


@router.get("/cost-metrics")
async def get_cost_metrics():
    """Get Instagram API cost metrics for today and projected monthly"""
    try:
        from datetime import datetime, timezone

        supabase = get_supabase()

        # Get today's start time
        today_start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)

        # Count RapidAPI calls made today
        # Look for API Response messages (successful calls to RapidAPI)
        result = (
            supabase.table("system_logs")
            .select("id", count="exact")  # type: ignore[arg-type]
            .eq("source", "instagram_scraper")
            .like("message", "✅%API Response%")
            .gte("timestamp", today_start.isoformat())
            .execute()
        )

        api_calls_today = result.count if result.count else 0

        # Calculate costs based on RapidAPI pricing
        # $75 for 250k requests = $0.0003 per request
        cost_per_request = 75 / 250_000
        daily_cost = api_calls_today * cost_per_request

        # Project monthly cost (assume same daily rate for 30 days)
        projected_monthly_cost = daily_cost * 30

        return {
            "success": True,
            "metrics": {
                "api_calls_today": api_calls_today,
                "daily_cost": round(daily_cost, 2),
                "projected_monthly_cost": round(projected_monthly_cost, 2),
                "cost_per_request": cost_per_request,
            },
        }

    except Exception as e:
        logger.error(f"Failed to get cost metrics: {e}")
        return {
            "success": False,
            "message": str(e),
            "metrics": {"api_calls_today": 0, "daily_cost": 0, "projected_monthly_cost": 0},
        }


@router.post("/start")
async def start_instagram_scraper(request: Request):
    """Enable the Instagram scraper by updating control table"""
    try:
        supabase = get_supabase()

        # Check current status
        result = (
            supabase.table("system_control")
            .select("*")
            .eq("script_name", "instagram_scraper")
            .execute()
        )

        if result.data and len(result.data) > 0:
            # Check if already enabled
            if result.data[0].get("enabled"):
                logger.info("Instagram scraper is already enabled")
                return {
                    "success": True,
                    "message": "Instagram scraper is already running",
                    "status": "already_running",
                }

            # Update existing record to enable
            supabase.table("system_control").update(
                {
                    "enabled": True,
                    "status": "running",
                    "started_at": datetime.now(timezone.utc).isoformat(),
                    "stopped_at": None,
                    "updated_at": datetime.now(timezone.utc).isoformat(),
                    "updated_by": "api",
                }
            ).eq("script_name", "instagram_scraper").execute()
        else:
            # Create new record if doesn't exist
            supabase.table("system_control").insert(
                {
                    "script_name": "instagram_scraper",
                    "script_type": "scraper",
                    "enabled": True,
                    "status": "running",
                    "started_at": datetime.now(timezone.utc).isoformat(),
                    "updated_at": datetime.now(timezone.utc).isoformat(),
                    "updated_by": "api",
                    "config": {"scan_interval_hours": 24, "batch_size": 5},
                }
            ).execute()

        # Start the actual subprocess immediately (like Reddit scraper should do)
        try:
            # Open log file for Instagram scraper output
            log_file_path = "/tmp/instagram_scraper.log"
            log_file = open(log_file_path, "a")  # noqa: SIM115 - Must stay open for subprocess
            log_file.write(f"\n\n{'=' * 60}\n")
            log_file.write(
                f"Starting Instagram scraper at {datetime.now(timezone.utc).isoformat()}\n"
            )
            log_file.write(f"{'=' * 60}\n")
            log_file.flush()

            # Start Instagram scraper subprocess with proper logging
            env = os.environ.copy()
            env["PYTHONUNBUFFERED"] = "1"
            env["PYTHONPATH"] = "/app/b9dashboard/backend"  # Ensure module imports work

            instagram_process = subprocess.Popen(
                [sys.executable, "-u", "app/scrapers/instagram/instagram_controller.py"],
                stdout=log_file,
                stderr=subprocess.STDOUT,
                stdin=subprocess.DEVNULL,
                start_new_session=True,  # Detach from parent
                cwd="/app/b9dashboard/backend",  # Absolute path to backend directory
                env=env,
            )

            # Check if process started successfully
            import time

            time.sleep(2)  # Give it more time to start

            if instagram_process.poll() is None:
                # Process is running
                logger.info(
                    f"✅ Instagram scraper subprocess started with PID: {instagram_process.pid}"
                )

                # Update PID in database
                supabase.table("system_control").update({"pid": instagram_process.pid}).eq(
                    "script_name", "instagram_scraper"
                ).execute()

                # Log success to file
                log_file.write(
                    f"✅ Subprocess started successfully with PID: {instagram_process.pid}\n"
                )
                log_file.flush()
            else:
                # Process died immediately - read the error
                log_file.close()
                with open(log_file_path) as f:
                    error_output = f.read()
                    last_lines = error_output.split("\n")[-20:]  # Get last 20 lines
                    error_msg = "\n".join(last_lines)

                logger.error(
                    f"Instagram scraper subprocess died immediately. Last output:\n{error_msg}"
                )

                # Update database with error
                supabase.table("system_control").update(
                    {
                        "enabled": False,
                        "status": "error",
                        "last_error": f"Process died on startup: {error_msg[:500]}",
                        "last_error_at": datetime.now(timezone.utc).isoformat(),
                    }
                ).eq("script_name", "instagram_scraper").execute()

        except Exception as subprocess_error:
            logger.error(f"Failed to start subprocess: {subprocess_error}")
            import traceback

            logger.error(f"Traceback: {traceback.format_exc()}")

        # Log the action
        if system_logger:
            system_logger.info(
                "✅ Instagram scraper enabled via API",
                source="instagram_scraper",
                script_name="instagram_scraper_routes",
                context={"action": "start"},
            )

        logger.info("✅ Instagram scraper enabled successfully")

        return {
            "success": True,
            "message": "Instagram scraper started successfully",
            "status": "running",
            "details": {
                "method": "database_control",
                "enabled_at": datetime.now(timezone.utc).isoformat(),
            },
        }

    except Exception as e:
        logger.error(f"Error starting Instagram scraper: {e}")
        if system_logger:
            system_logger.error(
                f"Failed to start Instagram scraper: {e}",
                source="instagram_scraper",
                script_name="instagram_scraper_routes",
                context={"error": str(e), "endpoint": "start"},
                sync=True,
            )
        return {
            "success": False,
            "message": f"Failed to start Instagram scraper: {e!s}",
            "status": "error",
        }


@router.post("/stop")
async def stop_instagram_scraper(request: Request):
    """Disable the Instagram scraper by updating control table"""
    try:
        supabase = get_supabase()

        # Check current status
        result = (
            supabase.table("system_control")
            .select("*")
            .eq("script_name", "instagram_scraper")
            .execute()
        )

        if result.data and len(result.data) > 0:
            # Check if already disabled
            if not result.data[0].get("enabled"):
                logger.info("Instagram scraper is already disabled")
                return {
                    "success": True,
                    "message": "Instagram scraper is already stopped",
                    "status": "already_stopped",
                }

            # Get the PID to kill the process
            pid = result.data[0].get("pid")
            if pid:
                try:
                    # Kill the subprocess
                    os.kill(pid, signal.SIGTERM)
                    logger.info(f"✅ Killed Instagram scraper process {pid}")
                except ProcessLookupError:
                    logger.info(f"Process {pid} already dead")
                except Exception as e:
                    logger.error(f"Failed to kill process {pid}: {e}")

            # Update to disable and clear PID
            supabase.table("system_control").update(
                {
                    "enabled": False,
                    "status": "stopped",
                    "pid": None,  # Clear the PID since process is killed
                    "stopped_at": datetime.now(timezone.utc).isoformat(),
                    "updated_at": datetime.now(timezone.utc).isoformat(),
                    "updated_by": "api",
                }
            ).eq("script_name", "instagram_scraper").execute()
        else:
            # Create record as disabled if doesn't exist
            supabase.table("system_control").insert(
                {
                    "script_name": "instagram_scraper",
                    "script_type": "scraper",
                    "enabled": False,
                    "status": "stopped",
                    "stopped_at": datetime.now(timezone.utc).isoformat(),
                    "updated_at": datetime.now(timezone.utc).isoformat(),
                    "updated_by": "api",
                    "config": {"scan_interval_hours": 24, "batch_size": 5},
                }
            ).execute()

        # Log the action
        if system_logger:
            system_logger.info(
                "⏹️ Instagram scraper stopped via API",
                source="instagram_scraper",
                script_name="instagram_scraper_routes",
                context={"action": "stop"},
            )

        logger.info("⏹️ Instagram scraper stopped and disabled in Supabase")

        return {
            "success": True,
            "message": "Instagram scraper stopped successfully",
            "status": "stopped",
            "details": {
                "method": "process_termination",
                "disabled_at": datetime.now(timezone.utc).isoformat(),
            },
        }

    except Exception as e:
        logger.error(f"Error stopping Instagram scraper: {e}")
        if system_logger:
            system_logger.error(
                f"Failed to stop Instagram scraper: {e}",
                source="instagram_scraper",
                script_name="instagram_scraper_routes",
                context={"error": str(e), "endpoint": "stop"},
                sync=True,
            )
        return {
            "success": False,
            "message": f"Failed to stop Instagram scraper: {e!s}",
            "status": "error",
        }


@router.get("/control-info")
async def get_control_info():
    """Get information about how to control the Instagram scraper"""
    return {
        "control_method": "API & Supabase",
        "api_endpoints": {
            "start": "POST /api/instagram/scraper/start",
            "stop": "POST /api/instagram/scraper/stop",
            "status": "GET /api/instagram/scraper/status",
        },
        "database_control": {
            "to_start": "UPDATE system_control SET enabled = true WHERE script_name = 'instagram_scraper';",
            "to_stop": "UPDATE system_control SET enabled = false WHERE script_name = 'instagram_scraper';",
            "to_check_status": "SELECT * FROM system_control WHERE script_name = 'instagram_scraper';",
            "to_view_logs": "SELECT * FROM system_logs WHERE source = 'instagram_scraper' ORDER BY timestamp DESC;",
        },
        "architecture": {
            "type": "subprocess_managed_by_container",
            "runs_24_7": True,
            "check_interval": "30 seconds",
            "scraper_file": "backend/app/scrapers/instagram/instagram_controller.py",
            "logic_file": "backend/app/scrapers/instagram/services/instagram_scraper.py",
            "startup_handler": "backend/start.py",
        },
        "note": "The Instagram scraper is controlled via API endpoints or database. The subprocess is managed by the container's start.py script and checks the control table every 30 seconds.",
    }
