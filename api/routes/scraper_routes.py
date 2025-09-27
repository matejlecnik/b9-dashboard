import os
import sys
import signal
import subprocess
import logging
import asyncio
import traceback
import glob
import re
from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel
from typing import Optional
from datetime import datetime, timezone
from supabase import create_client

#!/usr/bin/env python3
"""
Simple Scraper Control Endpoints
Uses Supabase to store scraper state - no Render API needed
"""

# Version tracking - should match scraper versions
API_VERSION = "3.0.0"

logger = logging.getLogger(__name__)

# Configuration
LOG_FILE_PATH = os.getenv('REDDIT_SCRAPER_LOG_PATH', '/tmp/reddit_scraper.log')

# Create router
router = APIRouter(prefix="/api/scraper", tags=["scraper"])

# Get Supabase client
def get_supabase():
    """Get Supabase client"""
    supabase_url = os.getenv("SUPABASE_URL")
    supabase_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

    if not supabase_url or not supabase_key:
        raise HTTPException(status_code=500, detail="Supabase not configured")

    return create_client(supabase_url, supabase_key)

# Request model
class ScraperConfigRequest(BaseModel):
    enabled: bool = True
    batch_size: int = 10
    delay_between_batches: int = 30
    max_daily_requests: int = 10000

@router.post("/start")
async def start_scraper(request: Request):
    """Enable the Reddit scraper by updating control table"""
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
                'status': 'running',
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
                'status': 'running',
                'started_at': datetime.now(timezone.utc).isoformat(),
                'updated_at': datetime.now(timezone.utc).isoformat(),
                'updated_by': 'api'
            }).execute()

        # Start the actual subprocess immediately (like Instagram scraper does)
        log_file = None
        try:
            # Open log file for Reddit scraper output
            log_file_path = LOG_FILE_PATH
            log_file = open(log_file_path, 'a')
            log_file.write(f"\n\n{'='*60}\n")
            log_file.write(f"Starting Reddit scraper at {datetime.now(timezone.utc).isoformat()}\n")
            log_file.write(f"{'='*60}\n")
            log_file.flush()

            # Start Reddit scraper subprocess with proper logging
            # The working directory is /app/api, so the script is at scrapers/reddit/main.py
            script_path = os.path.join("scrapers", "reddit", "main.py")
            api_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
            full_script_path = os.path.join(api_dir, script_path)

            # Log the exact command being run for debugging
            logger.info(f"Starting Reddit scraper with command: {sys.executable} -u {full_script_path}")
            logger.info(f"Working directory: {api_dir}")

            reddit_process = subprocess.Popen(
                [sys.executable, "-u", full_script_path],
                stdout=log_file,
                stderr=subprocess.STDOUT,
                stdin=subprocess.DEVNULL,
                start_new_session=True,  # Detach from parent
                cwd=api_dir,  # API directory
                env={**os.environ, 'PYTHONUNBUFFERED': '1'}  # Force unbuffered output
            )

            # Check if process started successfully
            await asyncio.sleep(2)  # Give it time to start

            if reddit_process.poll() is None:
                # Process is running
                logger.info(f"✅ Reddit scraper subprocess started with PID: {reddit_process.pid}")

                # Update PID in database
                supabase.table('system_control').update({
                    'pid': reddit_process.pid
                }).eq('script_name', 'reddit_scraper').execute()

                # Log success to file
                log_file.write(f"✅ Subprocess started successfully with PID: {reddit_process.pid}\n")
                log_file.flush()
                # Important: Close file since subprocess will continue using it
                log_file.close()
                log_file = None
            else:
                # Process died immediately - read the error
                log_file.close()
                log_file = None
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

        except Exception as subprocess_error:
            logger.error(f"Failed to start subprocess: {subprocess_error}")
            logger.error(f"Traceback: {traceback.format_exc()}")
        finally:
            # Ensure file is closed if still open
            if log_file:
                try:
                    log_file.close()
                except Exception:
                    pass

        # Log the action
        supabase.table('system_logs').insert({
            'timestamp': datetime.now(timezone.utc).isoformat(),
            'source': 'reddit_scraper',
            'script_name': 'scraper_routes',
            'level': 'info',
            'message': '✅ Reddit scraper enabled via API',
            'context': {'action': 'start'}
        }).execute()

        logger.info("✅ Reddit scraper enabled successfully")

        return {
            "success": True,
            "message": "Reddit scraper started successfully",
            "status": "running",
            "details": {
                "method": "database_control",
                "enabled_at": datetime.now(timezone.utc).isoformat()
            }
        }

    except Exception as e:
        logger.error(f"Error starting scraper: {e}")
        return {
            "success": False,
            "message": f"Failed to start scraper: {str(e)}",
            "status": "error"
        }

@router.post("/force-kill")
async def force_kill_scraper(request: Request):
    """Forcefully kill any Reddit scraper processes"""
    try:
        supabase = get_supabase()
        killed_pids = []

        # Try to find and kill any python processes running reddit_scraper.py
        try:
            # Method 1: Try to find PIDs from /proc filesystem
            for proc_dir in glob.glob('/proc/[0-9]*'):
                try:
                    pid = int(os.path.basename(proc_dir))
                    with open(f'{proc_dir}/cmdline', 'r') as f:
                        cmdline = f.read()
                        if 'reddit_scraper' in cmdline or 'core/reddit_scraper.py' in cmdline:
                            try:
                                os.kill(pid, signal.SIGKILL)  # Force kill
                                killed_pids.append(pid)
                                logger.info(f"💀 Force killed Reddit scraper process {pid}")
                            except Exception:
                                pass
                except Exception:
                    continue

            # Method 2: Try pkill as backup (may work on some systems)
            try:
                subprocess.run(['pkill', '-9', '-f', 'reddit_scraper'], capture_output=True)
            except Exception:
                pass

            # Method 3: Try killall
            try:
                subprocess.run(['killall', '-9', 'reddit_scraper.py'], capture_output=True)
            except Exception:
                pass

            # Clear any stored PID and disable scraper
            supabase.table('system_control').update({
                'enabled': False,
                'status': 'stopped',
                'pid': None,
                'stopped_at': datetime.now(timezone.utc).isoformat(),
                'last_error': 'Force killed via API',
                'last_error_at': datetime.now(timezone.utc).isoformat(),
                'updated_at': datetime.now(timezone.utc).isoformat(),
                'updated_by': 'api'
            }).eq('script_name', 'reddit_scraper').execute()

            # Log the action
            supabase.table('system_logs').insert({
                'timestamp': datetime.now(timezone.utc).isoformat(),
                'source': 'reddit_scraper',
                'script_name': 'scraper_routes',
                'level': 'warning',
                'message': f'💀 Force killed scraper processes: {killed_pids}',
                'context': {'action': 'force_kill', 'killed_pids': killed_pids}
            }).execute()

            return {
                "success": True,
                "message": f"Force killed {len(killed_pids)} Reddit scraper processes",
                "killed_pids": killed_pids
            }

        except Exception as kill_error:
            logger.error(f"Error during force kill: {kill_error}")

            # Still try to disable in database
            supabase.table('system_control').update({
                'enabled': False,
                'status': 'stopped',
                'pid': None,
                'stopped_at': datetime.now(timezone.utc).isoformat()
            }).eq('script_name', 'reddit_scraper').execute()

            return {
                "success": False,
                "message": f"Force kill attempted with errors: {str(kill_error)}",
                "killed_pids": []
            }

    except Exception as e:
        logger.error(f"Failed to force kill scraper: {e}")
        return {
            "success": False,
            "message": f"Failed to force kill: {str(e)}"
        }

@router.post("/stop")
async def stop_scraper(request: Request):
    """Disable the Reddit scraper by updating control table"""
    try:
        supabase = get_supabase()

        # Check current status
        result = supabase.table('system_control').select('*').eq('script_name', 'reddit_scraper').execute()

        if result.data and len(result.data) > 0:
            # Check if already disabled
            if not result.data[0].get('enabled'):
                logger.info("Reddit scraper is already disabled")
                return {
                    "success": True,
                    "message": "Reddit scraper is already stopped",
                    "status": "already_stopped"
                }

            # Get the PID to kill the process
            pid = result.data[0].get('pid')
            if pid:
                try:
                    # Kill the subprocess
                    os.kill(pid, signal.SIGTERM)
                    logger.info(f"✅ Killed Reddit scraper process {pid}")
                except ProcessLookupError:
                    logger.info(f"Process {pid} already dead")
                except Exception as e:
                    logger.error(f"Failed to kill process {pid}: {e}")

            # Update to disable and clear PID
            supabase.table('system_control').update({
                'enabled': False,
                'status': 'stopped',
                'pid': None,  # Clear the PID since process is killed
                'stopped_at': datetime.now(timezone.utc).isoformat(),
                'updated_at': datetime.now(timezone.utc).isoformat(),
                'updated_by': 'api'
            }).eq('script_name', 'reddit_scraper').execute()
        else:
            # Create record as disabled if doesn't exist
            supabase.table('system_control').insert({
                'script_name': 'reddit_scraper',
                'script_type': 'scraper',
                'enabled': False,
                'status': 'stopped',
                'stopped_at': datetime.now(timezone.utc).isoformat(),
                'updated_at': datetime.now(timezone.utc).isoformat(),
                'updated_by': 'api'
            }).execute()

        # Log the action
        supabase.table('system_logs').insert({
            'timestamp': datetime.now(timezone.utc).isoformat(),
            'source': 'reddit_scraper',
            'script_name': 'scraper_routes',
            'level': 'info',
            'message': '⏹️ Scraper stopped via API',
            'context': {'action': 'stop'}
        }).execute()

        logger.info("⏹️ Scraper stopped and disabled in Supabase")

        return {
            "success": True,
            "message": "Scraper stopped successfully",
            "status": "stopped",
            "details": {
                "method": "process_termination",
                "disabled_at": datetime.now(timezone.utc).isoformat()
            }
        }

    except Exception as e:
        logger.error(f"Error stopping scraper: {e}")
        return {
            "success": False,
            "message": f"Failed to stop scraper: {str(e)}",
            "status": "error"
        }

@router.get("/status")
async def get_scraper_status(request: Request):
    """Get scraper status from Supabase"""
    try:
        supabase = get_supabase()

        # Check scraper control state - this is the source of truth
        is_running = False
        last_updated = None

        try:
            result = supabase.table('system_control').select('*').eq('script_name', 'reddit_scraper').execute()
            if result.data and len(result.data) > 0:
                is_running = result.data[0].get('enabled', False)
                last_updated = result.data[0].get('updated_at')
        except Exception as e:
            logger.debug(f"Could not get scraper control state: {e}")

        # Get last activity from logs
        last_activity = None
        try:
            result = supabase.table('system_logs')\
                .select('timestamp')\
                .eq('source', 'reddit_scraper')\
                .order('timestamp.desc')\
                .limit(1)\
                .execute()

            if result.data:
                last_activity = result.data[0]['timestamp']
        except Exception:
            pass

        return {
            "version": API_VERSION,
            "discovery": {
                "subreddits_found_24h": 0,
                "new_subreddits": [],
                "processing_speed": 0
            },
            "data_quality": {
                "total_records": 0,
                "complete_records": 0,
                "missing_fields": 0,
                "quality_score": 95 if is_running else 0,
                "error_rate": 0
            },
            "system_health": {
                "database": "healthy",
                "scraper": "running" if is_running else "stopped",
                "reddit_api": "healthy",
                "storage": "healthy"
            },
            "recent_activity": [],
            "error_feed": [],
            "last_activity": last_activity,
            "last_control_update": last_updated,
            "last_updated": datetime.now(timezone.utc).isoformat()
        }

    except Exception as e:
        logger.error(f"Failed to get status: {e}")
        return {
            "version": API_VERSION,
            "discovery": {
                "subreddits_found_24h": 0,
                "new_subreddits": [],
                "processing_speed": 0
            },
            "data_quality": {
                "total_records": 0,
                "complete_records": 0,
                "missing_fields": 0,
                "quality_score": 0,
                "error_rate": 0
            },
            "system_health": {
                "database": "error",
                "scraper": "unknown",
                "reddit_api": "unknown",
                "storage": "error"
            },
            "recent_activity": [],
            "error_feed": [],
            "last_updated": datetime.now(timezone.utc).isoformat()
        }

@router.get("/status-detailed")
async def get_scraper_status_detailed(request: Request):
    """Get detailed scraper status"""
    try:
        # Get basic status
        basic_status = await get_scraper_status(request)
        basic_status['version'] = API_VERSION  # Ensure version is included

        # Check the actual scraper_control table for the true state
        supabase = get_supabase()
        is_running = False

        try:
            control_result = supabase.table('system_control').select('enabled').eq('script_name', 'reddit_scraper').execute()
            if control_result.data and len(control_result.data) > 0:
                is_running = control_result.data[0].get('enabled', False)
        except Exception as e:
            logger.debug(f"Could not get scraper control state: {e}")
            # Fallback to basic status check
            is_running = basic_status['system_health']['scraper'] == 'running'

        stats = {}
        cycle_info = None

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
                stats['daily_requests'] = result.count

            # Get Reddit API request success/failure from logs
            # Directly query for Reddit-related logs
            reddit_logs = []

            # Common Reddit request patterns
            patterns = [
                "Processing r/%",
                "Scraping subreddit%",
                "Fetched%posts%",
                "%Reddit API%",
                "%rate limit%",
                "%429%",
                "%403%",
                "%failed%r/%",
                "%error%subreddit%"
            ]

            for pattern in patterns[:3]:  # Get main patterns for status
                result = supabase.table('system_logs')\
                    .select('message')\
                    .eq('source', 'reddit_scraper')\
                    .gte('timestamp', today.isoformat())\
                    .like('message', pattern)\
                    .order('timestamp.desc')\
                    .limit(100)\
                    .execute()

                if result.data:
                    reddit_logs.extend(result.data)

            successful_requests = 0
            failed_requests = 0

            if reddit_logs:
                for log in reddit_logs:
                    msg = log.get('message', '').lower()

                    # Count failures (429, 403, timeouts, explicit errors)
                    if any(error in msg for error in ['429', '403', '401', 'rate limit', 'timeout', 'failed', 'error', '❌']):
                        failed_requests += 1
                    # Count successes (successful fetches, processed subreddits)
                    elif any(success in msg for success in ['successfully', 'found', '✅', 'processed', 'fetched', 'scraped']):
                        successful_requests += 1
                    # If it's about processing a subreddit without error indicators, likely success
                    elif 'r/' in msg and 'processing' in msg and not any(e in msg for e in ['error', 'failed']):
                        successful_requests += 1

            # If we still have no data, fall back to counting error level logs as failures
            if successful_requests == 0 and failed_requests == 0:
                error_count = supabase.table('system_logs')\
                    .select('id', count='exact')\
                    .eq('source', 'reddit_scraper')\
                    .gte('timestamp', today.isoformat())\
                    .eq('level', 'error')\
                    .execute()

                info_count = supabase.table('system_logs')\
                    .select('id', count='exact')\
                    .eq('source', 'reddit_scraper')\
                    .gte('timestamp', today.isoformat())\
                    .eq('level', 'info')\
                    .execute()

                failed_requests = error_count.count if error_count.count else 0
                # Estimate successes as a portion of info logs (very rough estimate)
                successful_requests = max(0, (info_count.count if info_count.count else 0) - failed_requests) // 10

            stats['successful_requests'] = successful_requests
            stats['failed_requests'] = failed_requests

            # Get cycle information if scraper is running
            if is_running:
                try:
                    # Get the earliest scraper start message from today (when scraper was first started)
                    # This gives us the true runtime, not just the latest cycle
                    # Use multiple queries since .or_() is not available in production
                    first_start_result = None
                    start_patterns = [
                        '🚀 Continuous scraper%',
                        '✅ Scraper started via API%',
                        '🔄 Starting scraping cycle #1%'
                    ]

                    for pattern in start_patterns:
                        result = supabase.table('system_logs')\
                            .select('timestamp')\
                            .eq('source', 'reddit_scraper')\
                            .like('message', pattern)\
                            .gte('timestamp', today.isoformat())\
                            .order('timestamp.asc')\
                            .limit(1)\
                            .execute()

                        if result.data and len(result.data) > 0:
                            if not first_start_result or result.data[0]['timestamp'] < first_start_result.data[0]['timestamp']:
                                first_start_result = result

                    # Get latest cycle info for cycle number
                    cycle_start_result = supabase.table('system_logs')\
                        .select('message, timestamp, context')\
                        .eq('source', 'reddit_scraper')\
                        .like('message', '🔄 Starting scraping cycle #%')\
                        .order('timestamp.desc')\
                        .limit(1)\
                        .execute()

                    # Get latest cycle completion
                    cycle_complete_result = supabase.table('system_logs')\
                        .select('message, context')\
                        .eq('source', 'reddit_scraper')\
                        .like('message', '✅ Completed scraping cycle #%')\
                        .order('timestamp.desc')\
                        .limit(1)\
                        .execute()

                    current_cycle = None
                    cycle_start = None
                    elapsed_seconds = None
                    elapsed_formatted = None
                    last_cycle_duration = None
                    last_cycle_formatted = None

                    # Use the earliest start time for elapsed calculation (true runtime)
                    if first_start_result.data and len(first_start_result.data) > 0:
                        cycle_start = first_start_result.data[0]['timestamp']
                        start_time = datetime.fromisoformat(cycle_start.replace('Z', '+00:00'))
                        elapsed_seconds = (datetime.now(timezone.utc) - start_time).total_seconds()

                        # Format elapsed time
                        if elapsed_seconds >= 3600:  # More than an hour
                            hours = int(elapsed_seconds // 3600)
                            minutes = int((elapsed_seconds % 3600) // 60)
                            elapsed_formatted = f"{hours}h {minutes}m"
                        elif elapsed_seconds >= 60:
                            elapsed_formatted = f"{int(elapsed_seconds // 60)}m {int(elapsed_seconds % 60)}s"
                        else:
                            elapsed_formatted = f"{int(elapsed_seconds)}s"

                    # Parse current cycle number from latest cycle start
                    if cycle_start_result.data and len(cycle_start_result.data) > 0:
                        start_log = cycle_start_result.data[0]
                        # Extract cycle number from message
                        match = re.search(r'cycle #(\d+)', start_log['message'])
                        if match:
                            current_cycle = int(match.group(1))

                    # Parse last completed cycle info
                    if cycle_complete_result.data and len(cycle_complete_result.data) > 0:
                        complete_log = cycle_complete_result.data[0]
                        context = complete_log.get('context', {})
                        if context:
                            last_cycle_duration = context.get('duration_seconds')
                            last_cycle_formatted = context.get('duration_formatted')

                    cycle_info = {
                        "current_cycle": current_cycle,
                        "cycle_start": cycle_start,
                        "elapsed_seconds": elapsed_seconds,
                        "elapsed_formatted": elapsed_formatted,
                        "last_cycle_duration": last_cycle_duration,
                        "last_cycle_formatted": last_cycle_formatted,
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
                "total_requests": stats.get('daily_requests', 0),
                "successful_requests": stats.get('successful_requests', 0),
                "failed_requests": stats.get('failed_requests', 0),
                "subreddits_processed": 0,
                "posts_collected": 0,
                "users_discovered": 0,
                "daily_requests": stats.get('daily_requests', 0),
                "processing_rate_per_hour": 0
            },
            "queue_depths": {
                "priority": 0,
                "new_discovery": 0,
                "update": 0,
                "user_analysis": 0
            },
            "total_queue_depth": 0,
            "accounts": {
                "count": 10,
                "proxies": 10
            },
            "last_activity": basic_status.get('last_activity'),
            "config": {
                "batch_size": 10,
                "delay_between_batches": 30,
                "max_daily_requests": 10000
            },
            "cycle": cycle_info  # Add cycle information
        }

    except Exception as e:
        logger.error(f"Failed to get detailed status: {e}")
        return {
            "enabled": False,
            "status": "error",
            "statistics": {},
            "queue_depths": {},
            "total_queue_depth": 0,
            "accounts": {"count": 0, "proxies": 0},
            "last_activity": None
        }

@router.get("/cycle-status")
async def get_cycle_status():
    """Get current scraper cycle status - properly checks for scraper start log"""
    try:
        supabase = get_supabase()

        # Check if scraper is enabled
        control_result = supabase.table('system_control')\
            .select('enabled')\
            .eq('script_name', 'reddit_scraper')\
            .single()\
            .execute()

        is_enabled = control_result.data and control_result.data.get('enabled', False)

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
        # Search for the most recent scraper start message
        # Try "Continuous scraper v2.1.0 started" pattern first (current version)
        result = supabase.table('system_logs')\
            .select('timestamp')\
            .eq('source', 'reddit_scraper')\
            .like('message', '%Continuous scraper%started%')\
            .order('timestamp.desc')\
            .limit(1)\
            .execute()

        # If no result, try "Starting scraping cycle" pattern
        if not result.data or len(result.data) == 0:
            result = supabase.table('system_logs')\
                .select('timestamp')\
                .eq('source', 'reddit_scraper')\
                .like('message', '%Starting scraping cycle%')\
                .order('timestamp.desc')\
                .limit(1)\
                .execute()

        # If still no result, try generic "scraper started" pattern
        if not result.data or len(result.data) == 0:
            result = supabase.table('system_logs')\
                .select('timestamp')\
                .eq('source', 'reddit_scraper')\
                .like('message', '%scraper%started%')\
                .order('timestamp.desc')\
                .limit(1)\
                .execute()

        start_time = None
        if result.data and len(result.data) > 0:
            start_time = result.data[0]['timestamp']

        if not start_time:
            # If no start message found but scraper is enabled, show as Unknown
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

        # Calculate elapsed time from the actual start log
        start_dt = datetime.fromisoformat(start_time.replace('Z', '+00:00'))
        elapsed_seconds = (datetime.now(timezone.utc) - start_dt).total_seconds()

        # Format elapsed time
        if elapsed_seconds >= 3600:  # More than an hour
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

@router.get("/logs")
async def get_scraper_logs(request: Request, lines: int = 100, level: Optional[str] = None, search: Optional[str] = None):
    """Get recent scraper logs from Supabase"""
    try:
        supabase = get_supabase()

        # Build query
        query = supabase.table('system_logs')\
            .select('*')\
            .eq('source', 'reddit_scraper')\
            .order('timestamp.desc')\
            .limit(lines)

        # Add filters if provided
        if level and level != 'all':
            query = query.eq('level', level)

        if search:
            query = query.ilike('message', f'%{search}%')

        # Execute query
        response = query.execute()

        structured_logs = []
        for log in response.data:
            structured_logs.append({
                "id": log.get('id'),
                "timestamp": log.get('timestamp'),
                "level": log.get('level', 'info'),
                "message": log.get('message', ''),
                "source": log.get('source', 'scraper')
            })

        return {
            "success": True,
            "logs": structured_logs,
            "lines": lines,
            "source": "supabase"
        }

    except Exception as e:
        logger.error(f"Error fetching logs: {e}")
        return {
            "success": False,
            "logs": [],
            "error": str(e)
        }

@router.post("/update-config")
async def update_scraper_config(request: Request, config: ScraperConfigRequest):
    """Update scraper configuration in Supabase"""
    try:
        supabase = get_supabase()

        # Update or create config in system_control table
        result = supabase.table('system_control').select('*').eq('script_name', 'reddit_scraper').execute()

        config_data = {
            'enabled': config.enabled,
            'config': {
                'batch_size': config.batch_size,
                'delay_between_batches': config.delay_between_batches,
                'max_daily_requests': config.max_daily_requests
            },
            'updated_at': datetime.now(timezone.utc).isoformat(),
            'updated_by': 'api'
        }

        if result.data:
            # Update existing record
            supabase.table('system_control').update(config_data).eq('script_name', 'reddit_scraper').execute()
        else:
            # Create new record
            config_data['script_name'] = 'reddit_scraper'
            config_data['script_type'] = 'scraper'
            config_data['status'] = 'stopped'
            supabase.table('system_control').insert(config_data).execute()

        logger.info(f"✅ Updated scraper config: {config.dict()}")

        return {
            "success": True,
            "message": "Configuration updated successfully",
            "config": config.dict()
        }

    except Exception as e:
        logger.error(f"Failed to update configuration: {e}")
        return {
            "success": False,
            "message": str(e)
        }

@router.get("/reddit-api-stats")
async def get_reddit_api_stats():
    """Get detailed Reddit API request statistics - analyzes last 1000 Reddit API requests only"""
    try:
        supabase = get_supabase()

        # Query specifically for Reddit API request logs (success and failure patterns)
        # Get more logs to ensure we can find 1000 unique requests
        result = supabase.table('system_logs')\
            .select('message, timestamp')\
            .eq('source', 'reddit_scraper')\
            .like('message', '%Reddit API request%')\
            .order('timestamp.desc')\
            .limit(10000)\
            .execute()

        reddit_logs = result.data if result.data else []

        # Process logs to count successes and failures
        successful_requests = 0
        failed_requests = 0  # Only count final failures
        initial_attempts = 0  # Count initial attempts
        rate_limit_errors = 0
        forbidden_errors = 0
        timeout_errors = 0
        auth_errors = 0
        other_errors = 0

        # Track actual Reddit API requests only
        unique_requests_processed = 0
        max_requests_to_analyze = 1000

        for log in reddit_logs:
            if unique_requests_processed >= max_requests_to_analyze:
                break

            msg = log.get('message', '')

            # Pattern 1: "✅ Reddit API request successful: ... - 200 in Xms"
            if '✅ Reddit API request successful' in msg:
                successful_requests += 1
                unique_requests_processed += 1

            # Pattern 2: Count only initial attempts as unique requests
            elif '⚠️ Reddit API request failed (attempt 1/10)' in msg:
                initial_attempts += 1
                unique_requests_processed += 1

            # Pattern 3: Count final failures (after all retries exhausted)
            elif '❌ Reddit API request failed after' in msg:
                failed_requests += 1
                # Don't increment unique_requests_processed as this was already counted in initial attempt

                # Parse the error type from the final failure
                if '403' in msg:
                    forbidden_errors += 1
                elif '429' in msg:
                    rate_limit_errors += 1
                elif '401' in msg:
                    auth_errors += 1
                elif 'timed out' in msg or 'timeout' in msg.lower():
                    timeout_errors += 1
                else:
                    other_errors += 1

            # Skip retry attempts (attempt 2-10) as they're already counted in initial attempt

        # Calculate the correct total and success rate
        # Total unique requests = successful + final failures
        # Initial attempts that succeeded after retries are in successful_requests
        total_unique_requests = successful_requests + failed_requests

        # Calculate true success rate based on unique requests
        success_rate = (successful_requests / total_unique_requests * 100) if total_unique_requests > 0 else 0

        return {
            "success": True,
            "stats": {
                "total_requests": total_unique_requests,
                "successful_requests": successful_requests,
                "failed_requests": failed_requests,
                "success_rate": round(success_rate, 2),
                "error_breakdown": {
                    "rate_limits": rate_limit_errors,
                    "forbidden": forbidden_errors,
                    "auth_errors": auth_errors,
                    "timeouts": timeout_errors,
                    "other": other_errors
                },
                "time_period": "last_1000_unique_requests",
                "logs_analyzed": unique_requests_processed,
                "initial_attempts_found": initial_attempts
            }
        }

    except Exception as e:
        logger.error(f"Failed to get Reddit API stats: {e}")
        return {
            "success": False,
            "message": str(e)
        }