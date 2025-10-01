#!/usr/bin/env python3
"""
Reddit Scraper Control & Status Endpoints
Manages Reddit scraper v3.4.9+ via system_control table and subprocess
"""

# Version tracking - matches Reddit scraper versions
API_VERSION = "3.4.9"

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

# Import system logger
try:
    from ..utils.system_logger import system_logger, log_api_call
except ImportError:
    system_logger = None
    log_api_call = None

logger = logging.getLogger(__name__)

# Create router
router = APIRouter(prefix="/api/scraper", tags=["reddit-scraper"])

# Get Supabase client
def get_supabase():
    """Get Supabase client"""
    supabase_url = os.getenv("SUPABASE_URL")
    supabase_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

    if not supabase_url or not supabase_key:
        raise HTTPException(status_code=500, detail="Supabase not configured")

    return create_client(supabase_url, supabase_key)


@router.get("/health")
async def get_reddit_scraper_health(request: Request):
    """Get Reddit scraper health status for monitoring"""
    try:
        supabase = get_supabase()

        # Get control record
        result = supabase.table('system_control').select('*').eq('script_name', 'reddit_scraper').execute()

        if not result.data or len(result.data) == 0:
            return {
                "healthy": False,
                "status": "not_initialized",
                "message": "Reddit scraper not found in control table"
            }

        control = result.data[0]
        now = datetime.now(timezone.utc)

        # Check heartbeat (consider unhealthy if no heartbeat for 5 minutes)
        last_heartbeat = control.get('last_heartbeat')
        if last_heartbeat:
            heartbeat_time = datetime.fromisoformat(last_heartbeat.replace('Z', '+00:00'))
            heartbeat_age = (now - heartbeat_time).total_seconds()
            is_healthy = heartbeat_age < 300  # 5 minutes (scraper is slower than Instagram)
        else:
            is_healthy = False
            heartbeat_age = None

        # Build health response
        health_status = {
            "healthy": is_healthy,
            "enabled": control.get('enabled', False),
            "status": control.get('status', 'unknown'),
            "heartbeat_age_seconds": heartbeat_age,
            "last_heartbeat": last_heartbeat,
            "pid": control.get('pid'),
            "version": API_VERSION
        }

        # Log API call
        if log_api_call:
            log_api_call(request, "GET /api/scraper/health", 200, "reddit_scraper")

        return health_status

    except Exception as e:
        logger.error(f"Failed to get health status: {e}")
        if log_api_call:
            log_api_call(request, "GET /api/scraper/health", 500, "reddit_scraper")
        return {
            "healthy": False,
            "status": "error",
            "error": str(e)
        }


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
            result = supabase.table('system_control').select('*').eq('script_name', 'reddit_scraper').execute()
            if result.data and len(result.data) > 0:
                control = result.data[0]
                is_running = control.get('enabled', False) or control.get('status') == 'running'
                last_updated = control.get('updated_at')
                pid = control.get('pid')
        except Exception as e:
            logger.debug(f"Could not get scraper control state: {e}")
            if system_logger:
                system_logger.debug(
                    f"Could not get scraper control state: {e}",
                    source="reddit_scraper",
                    script_name="reddit_scraper_routes",
                    context={"error": str(e)}
                )

        # Get last activity from logs
        last_activity = None
        try:
            result = supabase.table('system_logs')\
                .select('timestamp')\
                .eq('source', 'reddit_scraper')\
                .order('timestamp', desc=True)\
                .limit(1)\
                .execute()

            if result.data:
                last_activity = result.data[0]['timestamp']
        except Exception:
            pass

        return {
            "version": API_VERSION,
            "system_health": {
                "database": "healthy",
                "scraper": "running" if is_running else "stopped",
                "reddit_api": "healthy"
            },
            "control": {
                "enabled": is_running,
                "last_updated": last_updated,
                "pid": pid,
                "control_via": "supabase_and_api",
                "control_table": "system_control",
                "control_method": "POST /api/scraper/start or /stop"
            },
            "last_activity": last_activity,
            "last_updated": datetime.now(timezone.utc).isoformat()
        }

    except Exception as e:
        logger.error(f"Failed to get status: {e}")
        if system_logger:
            system_logger.error(
                f"Failed to get Reddit scraper status: {e}",
                source="reddit_scraper",
                script_name="reddit_scraper_routes",
                context={"error": str(e), "endpoint": "status"},
                sync=True
            )
        return {
            "version": API_VERSION,
            "system_health": {
                "database": "error",
                "scraper": "unknown",
                "reddit_api": "unknown"
            },
            "error": str(e),
            "last_updated": datetime.now(timezone.utc).isoformat()
        }


@router.get("/status-detailed")
async def get_reddit_scraper_status_detailed(request: Request):
    """Get detailed Reddit scraper status"""
    try:
        # Get basic status
        basic_status = await get_reddit_scraper_status(request)
        basic_status['version'] = API_VERSION

        # Check the actual system_control table for the true state
        supabase = get_supabase()
        is_running = False

        try:
            control_result = supabase.table('system_control').select('enabled').eq('script_name', 'reddit_scraper').execute()
            if control_result.data and len(control_result.data) > 0:
                is_running = control_result.data[0].get('enabled', False)
        except Exception as e:
            logger.debug(f"Could not get scraper control state: {e}")
            if system_logger:
                system_logger.debug(
                    f"Could not get scraper control state: {e}",
                    source="reddit_scraper",
                    script_name="reddit_scraper_routes",
                    context={"error": str(e)}
                )
            is_running = basic_status['system_health']['scraper'] == 'running'

        stats = {}

        try:
            # Get today's metrics
            today = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)

            # Count logs for today
            result = supabase.table('system_logs')\
                .select('id', count='exact')\
                .eq('source', 'reddit_scraper')\
                .gte('timestamp', today.isoformat())\
                .execute()

            if result.count:
                stats['daily_api_calls'] = result.count

            # Get success/failure from logs
            success_logs = supabase.table('system_logs')\
                .select('message')\
                .eq('source', 'reddit_scraper')\
                .gte('timestamp', today.isoformat())\
                .like('message', '%✅%')\
                .limit(100)\
                .execute()

            error_logs = supabase.table('system_logs')\
                .select('message')\
                .eq('source', 'reddit_scraper')\
                .gte('timestamp', today.isoformat())\
                .eq('level', 'error')\
                .limit(100)\
                .execute()

            successful_calls = len(success_logs.data) if success_logs.data else 0
            failed_calls = len(error_logs.data) if error_logs.data else 0
            stats['successful_requests'] = successful_calls
            stats['failed_requests'] = failed_calls

        except Exception as e:
            logger.debug(f"Could not get stats: {e}")
            if system_logger:
                system_logger.debug(
                    f"Could not get stats: {e}",
                    source="reddit_scraper",
                    script_name="reddit_scraper_routes",
                    context={"error": str(e)}
                )

        return {
            "enabled": is_running,
            "status": "running" if is_running else "stopped",
            "statistics": {
                "daily_api_calls": stats.get('daily_api_calls', 0),
                "successful_requests": stats.get('successful_requests', 0),
                "failed_requests": stats.get('failed_requests', 0),
            },
            "last_activity": basic_status.get('last_activity'),
            "control_info": basic_status.get('control')
        }

    except Exception as e:
        logger.error(f"Failed to get detailed status: {e}")
        if system_logger:
            system_logger.error(
                f"Failed to get detailed Reddit status: {e}",
                source="reddit_scraper",
                script_name="reddit_scraper_routes",
                context={"error": str(e), "endpoint": "detailed_status"},
                sync=True
            )
        return {
            "enabled": False,
            "status": "error",
            "statistics": {},
            "last_activity": None,
            "error": str(e)
        }


@router.get("/cycle-status")
async def get_cycle_status():
    """Get current Reddit scraper cycle status"""
    try:
        supabase = get_supabase()

        # Get system_control record
        result = supabase.table('system_control').select('*').eq('script_name', 'reddit_scraper').execute()

        if not result.data or len(result.data) == 0:
            return {
                "status": "not_configured",
                "message": "Reddit scraper not found in system_control table"
            }

        control = result.data[0]

        # Get latest cycle info from logs
        today = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)

        # Look for cycle start message
        cycle_logs = supabase.table('system_logs')\
            .select('message, timestamp')\
            .eq('source', 'reddit_scraper')\
            .gte('timestamp', today.isoformat())\
            .like('message', '%Processing%subreddit%')\
            .order('timestamp', desc=True)\
            .limit(1)\
            .execute()

        current_subreddit = None
        if cycle_logs.data and len(cycle_logs.data) > 0:
            # Parse subreddit from message
            import re
            match = re.search(r'r/(\w+)', cycle_logs.data[0]['message'])
            if match:
                current_subreddit = match.group(1)

        return {
            "enabled": control.get('enabled', False),
            "status": control.get('status', 'unknown'),
            "pid": control.get('pid'),
            "last_heartbeat": control.get('last_heartbeat'),
            "current_subreddit": current_subreddit,
            "version": API_VERSION
        }

    except Exception as e:
        logger.error(f"Failed to get cycle status: {e}")
        return {
            "status": "error",
            "error": str(e)
        }


@router.get("/reddit-api-stats")
async def get_reddit_api_stats():
    """Get Reddit API usage statistics"""
    try:
        supabase = get_supabase()

        # Get today's stats
        today = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)

        # Count API calls from logs
        api_calls = supabase.table('system_logs')\
            .select('id', count='exact')\
            .eq('source', 'reddit_scraper')\
            .gte('timestamp', today.isoformat())\
            .execute()

        return {
            "daily_calls": api_calls.count if api_calls.count else 0,
            "daily_limit": 10000,
            "remaining": 10000 - (api_calls.count if api_calls.count else 0),
            "reset_at": (today.replace(hour=0, minute=0, second=0) + timezone.timedelta(days=1)).isoformat()
        }

    except Exception as e:
        logger.error(f"Failed to get Reddit API stats: {e}")
        return {
            "daily_calls": 0,
            "daily_limit": 10000,
            "remaining": 10000,
            "error": str(e)
        }


@router.post("/start")
async def start_reddit_scraper(request: Request):
    """Start the Reddit scraper by launching subprocess"""
    try:
        supabase = get_supabase()

        # Check current status
        result = supabase.table('system_control').select('*').eq('script_name', 'reddit_scraper').execute()

        if result.data and len(result.data) > 0:
            # Check if already enabled
            if result.data[0].get('enabled'):
                logger.info("Reddit scraper is already enabled")
                return {
                    "success": True,
                    "message": "Reddit scraper is already running",
                    "status": "already_running"
                }

            # Update existing record to enable
            supabase.table('system_control').update({
                'enabled': True,
                'status': 'starting',
                'started_at': datetime.now(timezone.utc).isoformat(),
                'stopped_at': None,
                'updated_at': datetime.now(timezone.utc).isoformat(),
                'updated_by': 'api'
            }).eq('script_name', 'reddit_scraper').execute()
        else:
            # Create new record if doesn't exist
            supabase.table('system_control').insert({
                'script_name': 'reddit_scraper',
                'script_type': 'scraper',
                'enabled': True,
                'status': 'starting',
                'started_at': datetime.now(timezone.utc).isoformat(),
                'updated_at': datetime.now(timezone.utc).isoformat(),
                'updated_by': 'api',
                'config': {'batch_size': 5, 'max_daily_requests': 10000}
            }).execute()

        # Start the actual subprocess
        try:
            # Open log file for Reddit scraper output
            log_file_path = '/tmp/reddit_scraper.log'
            log_file = open(log_file_path, 'a')
            log_file.write(f"\n\n{'='*60}\n")
            log_file.write(f"Starting Reddit scraper v{API_VERSION} at {datetime.now(timezone.utc).isoformat()}\n")
            log_file.write(f"Started via API endpoint\n")
            log_file.write(f"{'='*60}\n")
            log_file.flush()

            # Start Reddit scraper subprocess with proper logging
            reddit_process = subprocess.Popen(
                [sys.executable, "-u", "app/scrapers/reddit/reddit_controller.py"],
                stdout=log_file,
                stderr=subprocess.STDOUT,
                stdin=subprocess.DEVNULL,
                start_new_session=True,  # Detach from parent
                cwd=os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))),  # Project root
                env={**os.environ, 'PYTHONUNBUFFERED': '1'}  # Force unbuffered output
            )

            # Check if process started successfully
            import time
            time.sleep(2)  # Give it time to start

            if reddit_process.poll() is None:
                # Process is running
                logger.info(f"✅ Reddit scraper subprocess started with PID: {reddit_process.pid}")

                # Update PID and status in database
                supabase.table('system_control').update({
                    'pid': reddit_process.pid,
                    'status': 'running',
                    'last_heartbeat': datetime.now(timezone.utc).isoformat()
                }).eq('script_name', 'reddit_scraper').execute()

                # Log success to file
                log_file.write(f"✅ Subprocess started successfully with PID: {reddit_process.pid}\n")
                log_file.flush()

                # Log the action
                if system_logger:
                    system_logger.info(
                        f'✅ Reddit scraper v{API_VERSION} started via API',
                        source="reddit_scraper",
                        script_name="reddit_scraper_routes",
                        context={'action': 'start', 'pid': reddit_process.pid}
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
                        "started_at": datetime.now(timezone.utc).isoformat()
                    }
                }
            else:
                # Process died immediately - read the error
                log_file.close()
                with open(log_file_path, 'r') as f:
                    error_output = f.read()
                    last_lines = error_output.split('\n')[-20:]  # Get last 20 lines
                    error_msg = '\n'.join(last_lines)

                logger.error(f"Reddit scraper subprocess died immediately. Last output:\n{error_msg}")

                # Update database with error
                supabase.table('system_control').update({
                    'enabled': False,
                    'status': 'error',
                    'last_error': f"Process died on startup: {error_msg[:500]}",
                    'last_error_at': datetime.now(timezone.utc).isoformat()
                }).eq('script_name', 'reddit_scraper').execute()

                return {
                    "success": False,
                    "message": "Reddit scraper process died on startup",
                    "status": "error",
                    "error": error_msg
                }

        except Exception as subprocess_error:
            logger.error(f"Failed to start subprocess: {subprocess_error}")
            import traceback
            logger.error(f"Traceback: {traceback.format_exc()}")

            # Update database with error
            supabase.table('system_control').update({
                'enabled': False,
                'status': 'error',
                'last_error': f"Failed to start subprocess: {str(subprocess_error)}",
                'last_error_at': datetime.now(timezone.utc).isoformat()
            }).eq('script_name', 'reddit_scraper').execute()

            return {
                "success": False,
                "message": f"Failed to start subprocess: {str(subprocess_error)}",
                "status": "error"
            }

    except Exception as e:
        logger.error(f"Error starting Reddit scraper: {e}")
        if system_logger:
            system_logger.error(
                f"Failed to start Reddit scraper: {e}",
                source="reddit_scraper",
                script_name="reddit_scraper_routes",
                context={"error": str(e), "endpoint": "start"},
                sync=True
            )
        return {
            "success": False,
            "message": f"Failed to start Reddit scraper: {str(e)}",
            "status": "error"
        }


@router.post("/stop")
async def stop_reddit_scraper(request: Request):
    """Stop the Reddit scraper by updating control table and killing process"""
    try:
        supabase = get_supabase()

        # Get current PID
        result = supabase.table('system_control').select('*').eq('script_name', 'reddit_scraper').execute()

        if not result.data or len(result.data) == 0:
            return {
                "success": False,
                "message": "Reddit scraper not found in control table",
                "status": "not_found"
            }

        control = result.data[0]
        pid = control.get('pid')

        # Update control table first
        supabase.table('system_control').update({
            'enabled': False,
            'status': 'stopped',
            'stopped_at': datetime.now(timezone.utc).isoformat(),
            'updated_at': datetime.now(timezone.utc).isoformat(),
            'updated_by': 'api'
        }).eq('script_name', 'reddit_scraper').execute()

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
                '🛑 Reddit scraper stopped via API',
                source="reddit_scraper",
                script_name="reddit_scraper_routes",
                context={'action': 'stop', 'pid': pid}
            )

        logger.info("✅ Reddit scraper stopped successfully")

        return {
            "success": True,
            "message": "Reddit scraper stopped successfully",
            "status": "stopped",
            "details": {
                "method": "database_control_and_signal",
                "pid": pid,
                "stopped_at": datetime.now(timezone.utc).isoformat()
            }
        }

    except Exception as e:
        logger.error(f"Error stopping Reddit scraper: {e}")
        if system_logger:
            system_logger.error(
                f"Failed to stop Reddit scraper: {e}",
                source="reddit_scraper",
                script_name="reddit_scraper_routes",
                context={"error": str(e), "endpoint": "stop"},
                sync=True
            )
        return {
            "success": False,
            "message": f"Failed to stop Reddit scraper: {str(e)}",
            "status": "error"
        }
