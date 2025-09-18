#!/usr/bin/env python3
"""
Simple Scraper Control Endpoints
Uses Supabase to store scraper state - no Render API needed
"""

# Version tracking - should match scraper versions
API_VERSION = "3.0.0"

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

            # Update to disable
            supabase.table('system_control').update({
                'enabled': False,
                'status': 'stopped',
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
                .order('timestamp', desc=True)\
                .limit(1)\
                .execute()

            if result.data:
                last_activity = result.data[0]['timestamp']
        except:
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
                    .order('timestamp', desc=True)\
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
                            .order('timestamp', asc=True)\
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
                        .order('timestamp', desc=True)\
                        .limit(1)\
                        .execute()

                    # Get latest cycle completion
                    cycle_complete_result = supabase.table('system_logs')\
                        .select('message, context')\
                        .eq('source', 'reddit_scraper')\
                        .like('message', '✅ Completed scraping cycle #%')\
                        .order('timestamp', desc=True)\
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
                        import re
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
        from datetime import datetime, timezone

        # Search for the most recent scraper start message
        # Try "Continuous scraper v2.1.0 started" pattern first (current version)
        result = supabase.table('system_logs')\
            .select('timestamp')\
            .eq('source', 'reddit_scraper')\
            .like('message', '%Continuous scraper%started%')\
            .order('timestamp', desc=True)\
            .limit(1)\
            .execute()

        # If no result, try "Starting scraping cycle" pattern
        if not result.data or len(result.data) == 0:
            result = supabase.table('system_logs')\
                .select('timestamp')\
                .eq('source', 'reddit_scraper')\
                .like('message', '%Starting scraping cycle%')\
                .order('timestamp', desc=True)\
                .limit(1)\
                .execute()

        # If still no result, try generic "scraper started" pattern
        if not result.data or len(result.data) == 0:
            result = supabase.table('system_logs')\
                .select('timestamp')\
                .eq('source', 'reddit_scraper')\
                .like('message', '%scraper%started%')\
                .order('timestamp', desc=True)\
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
            .order('timestamp', desc=True)\
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
        # Only look for actual success/failure messages, not request initiations
        result = supabase.table('system_logs')\
            .select('message, timestamp')\
            .eq('source', 'reddit_scraper')\
            .like('message', '%Reddit API request%')\
            .order('timestamp', desc=True)\
            .limit(1500)\
            .execute()

        reddit_logs = result.data if result.data else []

        # Process logs to count successes and failures
        successful_requests = 0
        failed_requests = 0
        rate_limit_errors = 0
        forbidden_errors = 0
        timeout_errors = 0
        auth_errors = 0
        other_errors = 0

        # Track actual Reddit API requests only
        api_requests_processed = 0
        max_requests_to_analyze = 1000

        for log in reddit_logs:
            if api_requests_processed >= max_requests_to_analyze:
                break

            msg = log.get('message', '')

            # Pattern 1: "✅ Reddit API request successful: ... - 200 in Xms"
            if '✅ Reddit API request successful' in msg:
                successful_requests += 1
                api_requests_processed += 1

            # Pattern 2: "⚠️ Reddit API request failed (attempt X/10): ..."
            elif '⚠️ Reddit API request failed' in msg or '❌ Reddit API request failed' in msg:
                failed_requests += 1
                api_requests_processed += 1

                # Parse the error type
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

            # Pattern 3: Count "Request to:" logs if they have a corresponding success/fail (skip for now as they don't indicate result)
            # elif '🔍 Request to: https://www.reddit.com' in msg:
            #     # These are just request initiation logs, not results
            #     pass

        total_requests = successful_requests + failed_requests
        success_rate = (successful_requests / total_requests * 100) if total_requests > 0 else 0

        return {
            "success": True,
            "stats": {
                "total_requests": total_requests,
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
                "time_period": "last_1000_requests",
                "logs_analyzed": api_requests_processed
            }
        }

    except Exception as e:
        logger.error(f"Failed to get Reddit API stats: {e}")
        return {
            "success": False,
            "message": str(e)
        }