#!/usr/bin/env python3
"""
Simple Scraper Control Endpoints
Uses Supabase to store scraper state - no Render API needed
"""

import os
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
    """Start the scraper by setting enabled flag in Supabase"""
    try:
        supabase = get_supabase()

        # Check if scraper_control record exists
        result = supabase.table('scraper_control').select('*').eq('id', 1).execute()

        if result.data:
            # Update existing record
            supabase.table('scraper_control').update({
                'enabled': True,
                'last_updated': datetime.now(timezone.utc).isoformat(),
                'updated_by': 'api'
            }).eq('id', 1).execute()
        else:
            # Create new record
            supabase.table('scraper_control').insert({
                'id': 1,
                'enabled': True,
                'last_updated': datetime.now(timezone.utc).isoformat(),
                'updated_by': 'api'
            }).execute()

        # Log the action
        supabase.table('reddit_scraper_logs').insert({
            'timestamp': datetime.now(timezone.utc).isoformat(),
            'level': 'info',
            'message': '✅ Scraper started via API',
            'source': 'api_control'
        }).execute()

        logger.info("✅ Scraper enabled in Supabase")

        return {
            "success": True,
            "message": "Scraper started successfully",
            "status": "running",
            "details": {
                "method": "supabase_control",
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
    """Stop the scraper by clearing enabled flag in Supabase"""
    try:
        supabase = get_supabase()

        # Check if scraper_control record exists
        result = supabase.table('scraper_control').select('*').eq('id', 1).execute()

        if result.data:
            # Update existing record
            supabase.table('scraper_control').update({
                'enabled': False,
                'last_updated': datetime.now(timezone.utc).isoformat(),
                'updated_by': 'api'
            }).eq('id', 1).execute()
        else:
            # Create new record
            supabase.table('scraper_control').insert({
                'id': 1,
                'enabled': False,
                'last_updated': datetime.now(timezone.utc).isoformat(),
                'updated_by': 'api'
            }).execute()

        # Log the action
        supabase.table('reddit_scraper_logs').insert({
            'timestamp': datetime.now(timezone.utc).isoformat(),
            'level': 'info',
            'message': '⏹️ Scraper stopped via API',
            'source': 'api_control'
        }).execute()

        logger.info("⏹️ Scraper disabled in Supabase")

        return {
            "success": True,
            "message": "Scraper stopped successfully",
            "status": "stopped",
            "details": {
                "method": "supabase_control",
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
            result = supabase.table('scraper_control').select('*').eq('id', 1).execute()
            if result.data and len(result.data) > 0:
                is_running = result.data[0].get('enabled', False)
                last_updated = result.data[0].get('last_updated')
        except Exception as e:
            logger.debug(f"Could not get scraper control state: {e}")

        # Get last activity from logs
        last_activity = None
        try:
            result = supabase.table('reddit_scraper_logs')\
                .select('timestamp')\
                .order('timestamp', desc=True)\
                .limit(1)\
                .execute()

            if result.data:
                last_activity = result.data[0]['timestamp']
        except:
            pass

        return {
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

        # Check the actual scraper_control table for the true state
        supabase = get_supabase()
        is_running = False

        try:
            control_result = supabase.table('scraper_control').select('enabled').eq('id', 1).execute()
            if control_result.data and len(control_result.data) > 0:
                is_running = control_result.data[0].get('enabled', False)
        except Exception as e:
            logger.debug(f"Could not get scraper control state: {e}")
            # Fallback to basic status check
            is_running = basic_status['system_health']['scraper'] == 'running'

        stats = {}

        try:
            # Get today's metrics
            today = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)

            # Count logs for today
            result = supabase.table('reddit_scraper_logs')\
                .select('id', count='exact')\
                .gte('timestamp', today.isoformat())\
                .execute()

            if result.count:
                stats['daily_requests'] = result.count

            # Get successful vs failed from logs
            success_result = supabase.table('reddit_scraper_logs')\
                .select('id', count='exact')\
                .gte('timestamp', today.isoformat())\
                .eq('level', 'success')\
                .execute()

            error_result = supabase.table('reddit_scraper_logs')\
                .select('id', count='exact')\
                .gte('timestamp', today.isoformat())\
                .eq('level', 'error')\
                .execute()

            stats['successful_requests'] = success_result.count if success_result.count else 0
            stats['failed_requests'] = error_result.count if error_result.count else 0

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
            }
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

@router.get("/logs")
async def get_scraper_logs(request: Request, lines: int = 100, level: Optional[str] = None, search: Optional[str] = None):
    """Get recent scraper logs from Supabase"""
    try:
        supabase = get_supabase()

        # Build query
        query = supabase.table('reddit_scraper_logs')\
            .select('*')\
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

        # Update or create config in scraper_control table
        result = supabase.table('scraper_control').select('*').eq('id', 1).execute()

        config_data = {
            'enabled': config.enabled,
            'batch_size': config.batch_size,
            'delay_between_batches': config.delay_between_batches,
            'max_daily_requests': config.max_daily_requests,
            'last_updated': datetime.now(timezone.utc).isoformat(),
            'updated_by': 'api'
        }

        if result.data:
            # Update existing record
            supabase.table('scraper_control').update(config_data).eq('id', 1).execute()
        else:
            # Create new record
            config_data['id'] = 1
            supabase.table('scraper_control').insert(config_data).execute()

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