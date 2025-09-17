#!/usr/bin/env python3
"""
Instagram Scraper Status Endpoints (Read-Only)
Control is done via Supabase system_control table only
No start/stop endpoints - scraper runs 24/7 and checks control table
"""

# Version tracking - matches Instagram scraper versions
API_VERSION = "2.0.0"

import os
import logging
from fastapi import APIRouter, HTTPException, Request
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
router = APIRouter(prefix="/api/instagram/scraper", tags=["instagram-scraper"])

# Get Supabase client
def get_supabase():
    """Get Supabase client"""
    supabase_url = os.getenv("SUPABASE_URL")
    supabase_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

    if not supabase_url or not supabase_key:
        raise HTTPException(status_code=500, detail="Supabase not configured")

    return create_client(supabase_url, supabase_key)


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
            result = supabase.table('system_control').select('*').eq('script_name', 'instagram_scraper').execute()
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
                    source="instagram_scraper",
                    script_name="instagram_scraper_routes",
                    context={"error": str(e)}
                )

        # Get last activity from logs
        last_activity = None
        try:
            result = supabase.table('system_logs')\
                .select('timestamp')\
                .eq('source', 'instagram_scraper')\
                .order('timestamp', desc=True)\
                .limit(1)\
                .execute()

            if result.data:
                last_activity = result.data[0]['timestamp']
        except:
            pass

        return {
            "version": API_VERSION,
            "system_health": {
                "database": "healthy",
                "scraper": "running" if is_running else "stopped",
                "instagram_api": "healthy"
            },
            "control": {
                "enabled": is_running,
                "last_updated": last_updated,
                "pid": pid,
                "control_via": "supabase_only",
                "control_table": "system_control",
                "control_method": "UPDATE system_control SET enabled = true/false WHERE script_name = 'instagram_scraper'"
            },
            "last_activity": last_activity,
            "last_updated": datetime.now(timezone.utc).isoformat()
        }

    except Exception as e:
        logger.error(f"Failed to get status: {e}")
        if system_logger:
            system_logger.error(
                f"Failed to get Instagram scraper status: {e}",
                source="instagram_scraper",
                script_name="instagram_scraper_routes",
                context={"error": str(e), "endpoint": "status"},
                sync=True
            )
        return {
            "version": API_VERSION,
            "system_health": {
                "database": "error",
                "scraper": "unknown",
                "instagram_api": "unknown"
            },
            "error": str(e),
            "last_updated": datetime.now(timezone.utc).isoformat()
        }


@router.get("/status-detailed")
async def get_instagram_scraper_status_detailed(request: Request):
    """Get detailed Instagram scraper status"""
    try:
        # Get basic status
        basic_status = await get_instagram_scraper_status(request)
        basic_status['version'] = API_VERSION

        # Check the actual system_control table for the true state
        supabase = get_supabase()
        is_running = False

        try:
            control_result = supabase.table('system_control').select('enabled').eq('script_name', 'instagram_scraper').execute()
            if control_result.data and len(control_result.data) > 0:
                is_running = control_result.data[0].get('enabled', False)
        except Exception as e:
            logger.debug(f"Could not get scraper control state: {e}")
            if system_logger:
                system_logger.debug(
                    f"Could not get scraper control state: {e}",
                    source="instagram_scraper",
                    script_name="instagram_scraper_routes",
                    context={"error": str(e)}
                )
            is_running = basic_status['system_health']['scraper'] == 'running'

        stats = {}
        cycle_info = None

        try:
            # Get today's metrics
            today = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)

            # Count logs for today
            result = supabase.table('system_logs')\
                .select('id', count='exact')\
                .eq('source', 'instagram_scraper')\
                .gte('timestamp', today.isoformat())\
                .execute()

            if result.count:
                stats['daily_api_calls'] = result.count

            # Get success/failure from logs
            success_logs = supabase.table('system_logs')\
                .select('message')\
                .eq('source', 'instagram_scraper')\
                .gte('timestamp', today.isoformat())\
                .like('message', '%✅%')\
                .limit(100)\
                .execute()

            error_logs = supabase.table('system_logs')\
                .select('message')\
                .eq('source', 'instagram_scraper')\
                .gte('timestamp', today.isoformat())\
                .eq('level', 'error')\
                .limit(100)\
                .execute()

            successful_calls = len(success_logs.data) if success_logs.data else 0
            failed_calls = len(error_logs.data) if error_logs.data else 0
            stats['successful_requests'] = successful_calls
            stats['failed_requests'] = failed_calls

            # Get cycle information if scraper is running
            if is_running:
                try:
                    # Get the earliest scraper start message from today
                    first_start_result = supabase.table('system_logs')\
                        .select('timestamp')\
                        .eq('source', 'instagram_scraper')\
                        .like('message', '🚀 Continuous Instagram scraper%')\
                        .gte('timestamp', today.isoformat())\
                        .order('timestamp', asc=True)\
                        .limit(1)\
                        .execute()

                    # Get latest cycle info
                    cycle_start_result = supabase.table('system_logs')\
                        .select('message, timestamp, context')\
                        .eq('source', 'instagram_scraper')\
                        .like('message', '🔄 Starting Instagram scraping cycle #%')\
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
                        "elapsed_formatted": elapsed_formatted
                    }

                except Exception as e:
                    logger.debug(f"Could not get cycle info: {e}")
                    if system_logger:
                        system_logger.debug(
                            f"Could not get cycle info: {e}",
                            source="instagram_scraper",
                            script_name="instagram_scraper_routes",
                            context={"error": str(e)}
                        )

        except Exception as e:
            logger.debug(f"Could not get stats: {e}")
            if system_logger:
                system_logger.debug(
                    f"Could not get stats: {e}",
                    source="instagram_scraper",
                    script_name="instagram_scraper_routes",
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
            "cycle": cycle_info,
            "last_activity": basic_status.get('last_activity'),
            "control_info": basic_status.get('control')
        }

    except Exception as e:
        logger.error(f"Failed to get detailed status: {e}")
        if system_logger:
            system_logger.error(
                f"Failed to get detailed Instagram status: {e}",
                source="instagram_scraper",
                script_name="instagram_scraper_routes",
                context={"error": str(e), "endpoint": "detailed_status"},
                sync=True
            )
        return {
            "enabled": False,
            "status": "error",
            "statistics": {},
            "cycle": None,
            "last_activity": None,
            "error": str(e)
        }


@router.get("/cycle-status")
async def get_cycle_status():
    """Get current Instagram scraper cycle status"""
    try:
        supabase = get_supabase()

        # Check if scraper is enabled
        control_result = supabase.table('system_control')\
            .select('enabled, status')\
            .eq('script_name', 'instagram_scraper')\
            .single()\
            .execute()

        is_enabled = control_result.data and (control_result.data.get('enabled', False) or control_result.data.get('status') == 'running')

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
        result = supabase.table('system_logs')\
            .select('timestamp')\
            .eq('source', 'instagram_scraper')\
            .like('message', '%Continuous Instagram scraper%started%')\
            .order('timestamp', desc=True)\
            .limit(1)\
            .execute()

        # If no result, try "Starting Instagram scraping cycle" pattern
        if not result.data or len(result.data) == 0:
            result = supabase.table('system_logs')\
                .select('timestamp')\
                .eq('source', 'instagram_scraper')\
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
        if system_logger:
            system_logger.error(
                f"Failed to get Instagram cycle status: {e}",
                source="instagram_scraper",
                script_name="instagram_scraper_routes",
                context={"error": str(e), "endpoint": "cycle_status"},
                sync=True
            )
        return {
            "success": False,
            "error": str(e),
            "running": False,
            "cycle": None
        }


@router.get("/success-rate")
async def get_instagram_success_rate():
    """Get Instagram API success rate statistics"""
    try:
        supabase = get_supabase()

        # Query specifically for Instagram API request logs
        success_result = supabase.table('system_logs')\
            .select('id', count='exact')\
            .eq('source', 'instagram_scraper')\
            .like('message', '✅%')\
            .execute()

        error_result = supabase.table('system_logs')\
            .select('id', count='exact')\
            .eq('source', 'instagram_scraper')\
            .eq('level', 'error')\
            .execute()

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
                "success_rate": round(success_rate, 2)
            }
        }

    except Exception as e:
        logger.error(f"Failed to get Instagram success rate: {e}")
        if system_logger:
            system_logger.error(
                f"Failed to get Instagram success rate: {e}",
                source="instagram_scraper",
                script_name="instagram_scraper_routes",
                context={"error": str(e), "endpoint": "success_rate"},
                sync=True
            )
        return {
            "success": False,
            "message": str(e),
            "stats": {
                "total_requests": 0,
                "successful_requests": 0,
                "failed_requests": 0,
                "success_rate": 0
            }
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
        result = supabase.table('system_logs')\
            .select('id', count='exact')\
            .eq('source', 'instagram_scraper')\
            .like('message', '✅%API Response%')\
            .gte('timestamp', today_start.isoformat())\
            .execute()

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
                "cost_per_request": cost_per_request
            }
        }

    except Exception as e:
        logger.error(f"Failed to get cost metrics: {e}")
        return {
            "success": False,
            "message": str(e),
            "metrics": {
                "api_calls_today": 0,
                "daily_cost": 0,
                "projected_monthly_cost": 0
            }
        }


@router.get("/control-info")
async def get_control_info():
    """Get information about how to control the Instagram scraper"""
    return {
        "control_method": "Supabase Only",
        "no_api_endpoints": True,
        "instructions": {
            "to_start": "UPDATE system_control SET enabled = true WHERE script_name = 'instagram_scraper';",
            "to_stop": "UPDATE system_control SET enabled = false WHERE script_name = 'instagram_scraper';",
            "to_check_status": "SELECT * FROM system_control WHERE script_name = 'instagram_scraper';",
            "to_view_logs": "SELECT * FROM system_logs WHERE source = 'instagram_scraper' ORDER BY timestamp DESC;"
        },
        "architecture": {
            "type": "subprocess",
            "runs_24_7": True,
            "check_interval": "30 seconds",
            "scraper_file": "api/core/continuous_instagram_scraper.py",
            "logic_file": "api/services/instagram/unified_scraper.py"
        },
        "note": "The Instagram scraper runs continuously as a subprocess and checks the control table every 30 seconds. There are no API endpoints to start or stop it - control is exclusively through the database."
    }