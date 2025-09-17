#!/usr/bin/env python3
"""
Instagram Scraper Control Endpoints
Based on Reddit scraper architecture for subprocess control and 24/7 operation
"""

# Version tracking - matches Instagram scraper versions
API_VERSION = "2.0.0"

import os
import sys
import signal
import subprocess
import logging
from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel
from typing import Optional, Dict, Any
from datetime import datetime, timezone
from supabase import create_client

logger = logging.getLogger(__name__)

# Create router
router = APIRouter(prefix="/api/instagram/scraper", tags=["instagram-scraper"])

# Get Supabase client
def get_supabase():
    """Get Supabase client"""
    supabase_url = os.getenv("SUPABASE_URL")
    supabase_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

    if not supabase_url or not supabase_key:
        raise HTTPException(status_code=500, detail="Supabase not configured")

    return create_client(supabase_url, supabase_key)

# Request models
class ScraperConfigRequest(BaseModel):
    enabled: bool = True

@router.post("/start")
async def start_instagram_scraper(request: Request):
    """Start the Instagram scraper subprocess and track in Supabase"""
    try:
        supabase = get_supabase()

        # Check if scraper_control record exists and if already running
        result = supabase.table('instagram_scraper_control').select('*').eq('id', 1).execute()

        if result.data and result.data[0].get('pid'):
            pid = result.data[0]['pid']
            # Check if process is actually running
            try:
                os.kill(pid, 0)  # Check if process exists (doesn't actually kill)
                logger.info(f"Instagram scraper already running with PID {pid}")
                return {
                    "success": False,
                    "message": f"Instagram scraper already running with PID {pid}",
                    "status": "already_running"
                }
            except (OSError, ProcessLookupError):
                # Process doesn't exist, clean up stale PID
                logger.info(f"Cleaning up stale PID {pid}")
                pass

        # Launch the Instagram scraper subprocess
        # Determine the correct path for the scraper
        if os.path.exists("/app/api/core/continuous_instagram_scraper.py"):
            # Production path (Render)
            scraper_path = "/app/api/core/continuous_instagram_scraper.py"
        else:
            # Local development path
            scraper_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), "core", "continuous_instagram_scraper.py")
            if not os.path.exists(scraper_path):
                logger.error(f"Instagram scraper script not found at {scraper_path}")
                return {
                    "success": False,
                    "message": f"Instagram scraper script not found at {scraper_path}",
                    "status": "error"
                }

        logger.info(f"Launching Instagram scraper from: {scraper_path}")

        # Create log directory if it doesn't exist
        log_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), "logs")
        os.makedirs(log_dir, exist_ok=True)

        # Open log files for scraper output
        stdout_log = open(os.path.join(log_dir, "instagram_scraper_stdout.log"), "a")
        stderr_log = open(os.path.join(log_dir, "instagram_scraper_stderr.log"), "a")

        scraper_process = subprocess.Popen(
            [sys.executable, "-u", scraper_path],
            stdout=stdout_log,
            stderr=stderr_log,
            stdin=subprocess.DEVNULL,
            start_new_session=True  # Detach from parent
        )

        # Close file handles in parent process
        stdout_log.close()
        stderr_log.close()

        logger.info(f"✅ Instagram scraper subprocess started with PID {scraper_process.pid}")

        # Update database with PID and enabled status
        update_data = {
            'enabled': True,
            'status': 'running',  # Keep status field for backward compatibility
            'pid': scraper_process.pid,
            'last_updated': datetime.now(timezone.utc).isoformat(),
            'last_heartbeat': datetime.now(timezone.utc).isoformat(),
            'updated_by': 'api'
        }

        if result.data:
            # Update existing record
            supabase.table('instagram_scraper_control').update(update_data).eq('id', 1).execute()
        else:
            # Create new record
            update_data['id'] = 1
            supabase.table('instagram_scraper_control').insert(update_data).execute()

        # Log the action
        supabase.table('instagram_scraper_realtime_logs').insert({
            'timestamp': datetime.now(timezone.utc).isoformat(),
            'level': 'info',
            'message': f'✅ Instagram scraper started via API with PID {scraper_process.pid}',
            'source': 'api_control'
        }).execute()

        return {
            "success": True,
            "message": "Instagram scraper started successfully",
            "pid": scraper_process.pid,
            "status": "running",
            "details": {
                "method": "subprocess",
                "pid": scraper_process.pid,
                "enabled_at": datetime.now(timezone.utc).isoformat()
            }
        }

    except Exception as e:
        logger.error(f"Error starting Instagram scraper: {e}")
        return {
            "success": False,
            "message": f"Failed to start Instagram scraper: {str(e)}",
            "status": "error"
        }

@router.post("/stop")
async def stop_instagram_scraper(request: Request):
    """Stop the Instagram scraper by killing the process and updating Supabase"""
    try:
        supabase = get_supabase()

        # Get current PID
        result = supabase.table('instagram_scraper_control').select('*').eq('id', 1).execute()

        if result.data and result.data[0].get('pid'):
            pid = result.data[0]['pid']
            try:
                # First try graceful termination with SIGTERM
                os.kill(pid, signal.SIGTERM)
                logger.info(f"Sent SIGTERM to Instagram scraper PID {pid}")

                # Give it a moment to terminate gracefully
                import time
                time.sleep(1)

                # Check if still running and force kill if needed
                try:
                    os.kill(pid, 0)  # Check if still exists
                    os.kill(pid, signal.SIGKILL)  # Force kill
                    logger.warning(f"Had to force kill Instagram scraper PID {pid}")
                except (OSError, ProcessLookupError):
                    logger.info(f"Instagram scraper PID {pid} terminated gracefully")

            except (OSError, ProcessLookupError) as e:
                logger.warning(f"Could not kill PID {pid}: {e} (process may have already stopped)")

        # Update database - clear PID and set enabled to false
        update_data = {
            'enabled': False,
            'status': 'stopped',  # Keep status field for backward compatibility
            'pid': None,
            'last_updated': datetime.now(timezone.utc).isoformat(),
            'updated_by': 'api'
        }

        if result.data:
            supabase.table('instagram_scraper_control').update(update_data).eq('id', 1).execute()
        else:
            update_data['id'] = 1
            supabase.table('instagram_scraper_control').insert(update_data).execute()

        # Log the action
        supabase.table('instagram_scraper_realtime_logs').insert({
            'timestamp': datetime.now(timezone.utc).isoformat(),
            'level': 'info',
            'message': '⏹️ Instagram scraper stopped via API',
            'source': 'api_control'
        }).execute()

        logger.info("⏹️ Instagram scraper stopped and disabled in Supabase")

        return {
            "success": True,
            "message": "Instagram scraper stopped successfully",
            "status": "stopped",
            "details": {
                "method": "process_termination",
                "disabled_at": datetime.now(timezone.utc).isoformat()
            }
        }

    except Exception as e:
        logger.error(f"Error stopping Instagram scraper: {e}")
        return {
            "success": False,
            "message": f"Failed to stop Instagram scraper: {str(e)}",
            "status": "error"
        }

@router.get("/status")
async def get_instagram_scraper_status(request: Request):
    """Get Instagram scraper status from Supabase"""
    try:
        supabase = get_supabase()

        # Check scraper control state - this is the source of truth
        is_running = False
        last_updated = None
        pid = None

        try:
            result = supabase.table('instagram_scraper_control').select('*').eq('id', 1).execute()
            if result.data and len(result.data) > 0:
                control = result.data[0]
                is_running = control.get('enabled', False) or control.get('status') == 'running'
                last_updated = control.get('last_updated') or control.get('updated_at')
                pid = control.get('pid')

                # Check if PID is actually running
                if pid and is_running:
                    try:
                        os.kill(pid, 0)
                    except (OSError, ProcessLookupError):
                        # Process not running, update status
                        is_running = False
                        logger.warning(f"PID {pid} not running, marking as stopped")

        except Exception as e:
            logger.debug(f"Could not get Instagram scraper control state: {e}")

        # Get last activity from logs
        last_activity = None
        try:
            result = supabase.table('instagram_scraper_realtime_logs')\
                .select('timestamp')\
                .order('timestamp', desc=True)\
                .limit(1)\
                .execute()

            if result.data:
                last_activity = result.data[0]['timestamp']
        except:
            pass

        return {
            "version": API_VERSION,
            "running": is_running,
            "status": "running" if is_running else "stopped",
            "pid": pid,
            "last_activity": last_activity,
            "last_control_update": last_updated,
            "timestamp": datetime.now(timezone.utc).isoformat()
        }

    except Exception as e:
        logger.error(f"Failed to get status: {e}")
        return {
            "version": API_VERSION,
            "running": False,
            "status": "error",
            "error": str(e),
            "timestamp": datetime.now(timezone.utc).isoformat()
        }

@router.get("/status-detailed")
async def get_instagram_scraper_status_detailed(request: Request):
    """Get detailed Instagram scraper status with metrics"""
    try:
        # Get basic status
        basic_status = await get_instagram_scraper_status(request)
        basic_status['version'] = API_VERSION

        supabase = get_supabase()
        is_running = basic_status.get('running', False)

        stats = {}
        cycle_info = None

        try:
            # Get today's metrics
            today = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)

            # Count logs for today
            result = supabase.table('instagram_scraper_realtime_logs')\
                .select('id', count='exact')\
                .gte('timestamp', today.isoformat())\
                .execute()

            if result.count:
                stats['daily_api_calls'] = result.count

            # Get success/failure from logs
            success_logs = supabase.table('instagram_scraper_realtime_logs')\
                .select('message')\
                .gte('timestamp', today.isoformat())\
                .like('message', '%✅%')\
                .limit(100)\
                .execute()

            error_logs = supabase.table('instagram_scraper_realtime_logs')\
                .select('message')\
                .gte('timestamp', today.isoformat())\
                .eq('level', 'error')\
                .limit(100)\
                .execute()

            successful_calls = len(success_logs.data) if success_logs.data else 0
            failed_calls = len(error_logs.data) if error_logs.data else 0

            stats['successful_calls'] = successful_calls
            stats['failed_calls'] = failed_calls

            # Get cycle information if scraper is running
            if is_running:
                try:
                    # Get the earliest scraper start message from today
                    first_start_result = supabase.table('instagram_scraper_realtime_logs')\
                        .select('timestamp')\
                        .like('message', '%Continuous Instagram scraper%started%')\
                        .gte('timestamp', today.isoformat())\
                        .order('timestamp', asc=True)\
                        .limit(1)\
                        .execute()

                    # Get latest cycle info
                    cycle_start_result = supabase.table('instagram_scraper_realtime_logs')\
                        .select('message, timestamp, context')\
                        .like('message', '%Starting Instagram scraping cycle #%')\
                        .order('timestamp', desc=True)\
                        .limit(1)\
                        .execute()

                    current_cycle = None
                    cycle_start = None
                    elapsed_seconds = None
                    elapsed_formatted = None

                    # Use the earliest start time for elapsed calculation
                    if first_start_result.data and len(first_start_result.data) > 0:
                        cycle_start = first_start_result.data[0]['timestamp']
                        start_time = datetime.fromisoformat(cycle_start.replace('Z', '+00:00'))
                        elapsed_seconds = (datetime.now(timezone.utc) - start_time).total_seconds()

                        # Format elapsed time
                        if elapsed_seconds >= 3600:
                            hours = int(elapsed_seconds // 3600)
                            minutes = int((elapsed_seconds % 3600) // 60)
                            elapsed_formatted = f"{hours}h {minutes}m"
                        elif elapsed_seconds >= 60:
                            elapsed_formatted = f"{int(elapsed_seconds // 60)}m {int(elapsed_seconds % 60)}s"
                        else:
                            elapsed_formatted = f"{int(elapsed_seconds)}s"

                    # Parse current cycle number
                    if cycle_start_result.data and len(cycle_start_result.data) > 0:
                        start_log = cycle_start_result.data[0]
                        import re
                        match = re.search(r'cycle #(\d+)', start_log['message'])
                        if match:
                            current_cycle = int(match.group(1))

                    cycle_info = {
                        "current_cycle": current_cycle,
                        "cycle_start": cycle_start,
                        "elapsed_seconds": elapsed_seconds,
                        "elapsed_formatted": elapsed_formatted,
                        "items_processed": 0,
                        "errors": 0
                    }

                except Exception as e:
                    logger.debug(f"Could not get cycle info: {e}")

        except Exception as e:
            logger.debug(f"Could not get stats: {e}")

        return {
            "enabled": is_running,
            "status": "running" if is_running else "stopped",
            "statistics": {
                "total_api_calls": stats.get('daily_api_calls', 0),
                "successful_calls": stats.get('successful_calls', 0),
                "failed_calls": stats.get('failed_calls', 0),
                "creators_processed": 0,
                "content_collected": 0,
                "viral_content_detected": 0,
                "daily_api_calls": stats.get('daily_api_calls', 0),
                "processing_rate_per_hour": 0
            },
            "performance": {
                "current_rps": 0,
                "avg_response_time": 0,
                "total_requests": stats.get('daily_api_calls', 0),
                "uptime_seconds": cycle_info['elapsed_seconds'] if cycle_info else 0
            },
            "creators": {
                "total": 0,
                "active": 0,
                "pending": 0
            },
            "last_activity": basic_status.get('last_activity'),
            "config": {
                "batch_size": 100,
                "requests_per_second": 55,
                "max_daily_calls": 24000,
                "max_monthly_calls": 1000000
            },
            "cycle": cycle_info
        }

    except Exception as e:
        logger.error(f"Failed to get detailed status: {e}")
        return {
            "enabled": False,
            "status": "error",
            "statistics": {},
            "performance": {},
            "creators": {},
            "last_activity": None,
            "cycle": None
        }

@router.get("/cycle-status")
async def get_cycle_status():
    """Get current Instagram scraper cycle status"""
    try:
        supabase = get_supabase()

        # Check if scraper is enabled
        control_result = supabase.table('instagram_scraper_control')\
            .select('enabled, status')\
            .eq('id', 1)\
            .single()\
            .execute()

        is_enabled = (control_result.data and
                     (control_result.data.get('enabled', False) or
                      control_result.data.get('status') == 'running'))

        if not is_enabled:
            return {
                "success": True,
                "running": False,
                "status": "Not Active",
                "cycle": {
                    "elapsed_formatted": "Not Active",
                    "start_time": None,
                    "elapsed_seconds": None
                }
            }

        # Get the most recent scraper start log
        result = supabase.table('instagram_scraper_realtime_logs')\
            .select('timestamp')\
            .like('message', '%Continuous Instagram scraper%started%')\
            .order('timestamp', desc=True)\
            .limit(1)\
            .execute()

        # If no result, try cycle start pattern
        if not result.data or len(result.data) == 0:
            result = supabase.table('instagram_scraper_realtime_logs')\
                .select('timestamp')\
                .like('message', '%Starting Instagram scraping cycle%')\
                .order('timestamp', desc=True)\
                .limit(1)\
                .execute()

        start_time = None
        if result.data and len(result.data) > 0:
            start_time = result.data[0]['timestamp']

        if not start_time:
            return {
                "success": True,
                "running": True,
                "status": "Running",
                "cycle": {
                    "start_time": None,
                    "elapsed_seconds": None,
                    "elapsed_formatted": "Unknown"
                }
            }

        # Calculate elapsed time
        start_dt = datetime.fromisoformat(start_time.replace('Z', '+00:00'))
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
                "elapsed_formatted": elapsed_formatted
            }
        }

    except Exception as e:
        logger.error(f"Failed to get cycle status: {e}")
        return {
            "success": False,
            "error": str(e),
            "running": False,
            "cycle": None
        }

@router.get("/success-rate")
async def get_instagram_success_rate():
    """Calculate Instagram scraper success rate from logs"""
    try:
        supabase = get_supabase()
        today = datetime.now(timezone.utc).date().isoformat()

        # Get success and error counts
        success_result = supabase.table('instagram_scraper_realtime_logs')\
            .select('id', count='exact')\
            .gte('timestamp', today)\
            .eq('level', 'success')\
            .execute()

        error_result = supabase.table('instagram_scraper_realtime_logs')\
            .select('id', count='exact')\
            .gte('timestamp', today)\
            .eq('level', 'error')\
            .execute()

        successful = success_result.count if success_result.count else 0
        failed = error_result.count if error_result.count else 0
        total = successful + failed

        success_rate = (successful / total * 100) if total > 0 else 0

        return {
            "success": True,
            "stats": {
                "total_requests": total,
                "successful_requests": successful,
                "failed_requests": failed,
                "success_rate": round(success_rate, 2)
            }
        }

    except Exception as e:
        logger.error(f"Failed to get success rate: {e}")
        return {
            "success": False,
            "error": str(e),
            "stats": {
                "total_requests": 0,
                "successful_requests": 0,
                "failed_requests": 0,
                "success_rate": 0
            }
        }