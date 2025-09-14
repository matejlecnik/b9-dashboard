#!/usr/bin/env python3
"""
Scraper control endpoints for 24/7 continuous scraping on Render
"""

import json
import logging
from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
import redis.asyncio as redis
import os
from datetime import datetime, timezone

logger = logging.getLogger(__name__)

# Create router
router = APIRouter(prefix="/api/scraper", tags=["scraper"])

# Redis client (will be initialized from main app)
redis_client = None

# Request/Response models
class ScraperControlRequest(BaseModel):
    action: str  # start, stop, pause, resume
    config: Optional[Dict[str, Any]] = None

class ScraperConfigRequest(BaseModel):
    enabled: bool = True
    batch_size: int = 10
    delay_between_batches: int = 30
    max_daily_requests: int = 10000
    pause_on_rate_limit: bool = True
    auto_recover: bool = True
    priority_subreddits: List[str] = []
    blacklisted_subreddits: List[str] = []

class JobQueueRequest(BaseModel):
    job_type: str  # subreddit, user, discover
    target: str  # subreddit name or username
    priority: str = "update"  # priority, new_discovery, update, user_analysis

async def get_redis_client():
    """Get or create Redis client"""
    global redis_client
    if not redis_client:
        redis_url = os.getenv("REDIS_URL", "redis://localhost:6379")
        redis_client = await redis.from_url(redis_url)
    return redis_client

@router.post("/start-continuous")
async def start_continuous_scraping(request: Request, config: Optional[ScraperConfigRequest] = None):
    """Start 24/7 continuous scraping"""
    try:
        client = await get_redis_client()

        # Set scraper as enabled
        await client.set('scraper_enabled', 'true')

        # Update configuration if provided
        if config:
            config_data = config.dict()
            await client.set('scraper_config', json.dumps(config_data))
            logger.info(f"Updated scraper configuration: {config_data}")

        # Log the start event
        logger.info("🚀 Continuous scraper started via API")

        return {
            "status": "success",
            "message": "Continuous scraper started",
            "timestamp": datetime.now(timezone.utc).isoformat()
        }

    except Exception as e:
        logger.error(f"Failed to start continuous scraper: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/stop-continuous")
async def stop_continuous_scraping(request: Request):
    """Stop 24/7 continuous scraping"""
    try:
        client = await get_redis_client()

        # Set scraper as disabled
        await client.set('scraper_enabled', 'false')

        logger.info("🛑 Continuous scraper stopped via API")

        return {
            "status": "success",
            "message": "Continuous scraper stopped",
            "timestamp": datetime.now(timezone.utc).isoformat()
        }

    except Exception as e:
        logger.error(f"Failed to stop continuous scraper: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/status-detailed")
async def get_scraper_status_detailed(request: Request):
    """Get detailed scraper status including queue depth and processing rate"""
    try:
        client = await get_redis_client()

        # Get scraper enabled status
        enabled = await client.get('scraper_enabled')
        is_enabled = enabled == b'true' if enabled else False

        # Get scraper stats
        stats_json = await client.get('scraper_stats')
        stats = json.loads(stats_json) if stats_json else {}

        # Get queue depths
        queue_depths = {}
        for priority in ['priority', 'new_discovery', 'update', 'user_analysis']:
            queue_name = f"scraper_queue:{priority}"
            depth = await client.llen(queue_name)
            queue_depths[priority] = depth

        # Calculate processing rate
        if stats.get('start_time') and stats.get('subreddits_processed'):
            start_time = datetime.fromisoformat(stats['start_time'])
            runtime_hours = (datetime.now(timezone.utc) - start_time).total_seconds() / 3600
            processing_rate = stats['subreddits_processed'] / max(runtime_hours, 0.01)
        else:
            processing_rate = 0

        return {
            "enabled": is_enabled,
            "status": "running" if is_enabled and stats.get('last_activity') else "stopped",
            "statistics": {
                "total_requests": stats.get('total_requests', 0),
                "successful_requests": stats.get('successful_requests', 0),
                "failed_requests": stats.get('failed_requests', 0),
                "subreddits_processed": stats.get('subreddits_processed', 0),
                "posts_collected": stats.get('posts_collected', 0),
                "users_discovered": stats.get('users_discovered', 0),
                "daily_requests": stats.get('daily_requests', 0),
                "processing_rate_per_hour": round(processing_rate, 2)
            },
            "queue_depths": queue_depths,
            "total_queue_depth": sum(queue_depths.values()),
            "configuration": stats.get('config', {}),
            "accounts": {
                "count": stats.get('accounts_count', 0),
                "proxies": stats.get('proxies_count', 0)
            },
            "last_activity": stats.get('last_activity'),
            "start_time": stats.get('start_time'),
            "daily_reset_time": stats.get('daily_reset_time')
        }

    except Exception as e:
        logger.error(f"Failed to get scraper status: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/queue-job")
async def queue_scraping_job(request: Request, job: JobQueueRequest):
    """Add a job to the scraping queue"""
    try:
        client = await get_redis_client()

        # Prepare job data
        job_data = {
            'type': job.job_type,
            'name' if job.job_type == 'subreddit' else 'username': job.target,
            'queued_at': datetime.now(timezone.utc).isoformat(),
            'retry_count': 0
        }

        # Add to queue
        queue_name = f"scraper_queue:{job.priority}"
        await client.rpush(queue_name, json.dumps(job_data))

        logger.info(f"📋 Queued {job.job_type} job for {job.target} with priority {job.priority}")

        return {
            "status": "success",
            "message": f"Job queued successfully",
            "job": job_data,
            "queue": queue_name
        }

    except Exception as e:
        logger.error(f"Failed to queue job: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/update-config")
async def update_scraper_config(request: Request, config: ScraperConfigRequest):
    """Update scraper configuration"""
    try:
        client = await get_redis_client()

        # Update configuration
        config_data = config.dict()
        await client.set('scraper_config', json.dumps(config_data))

        # Update enabled status
        await client.set('scraper_enabled', 'true' if config.enabled else 'false')

        logger.info(f"📋 Updated scraper configuration: {config_data}")

        return {
            "status": "success",
            "message": "Configuration updated",
            "config": config_data
        }

    except Exception as e:
        logger.error(f"Failed to update configuration: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/accounts")
async def get_scraper_accounts(request: Request):
    """Get Reddit account status (mock endpoint for frontend)"""
    try:
        client = await get_redis_client()

        # Get stats to check account info
        stats_json = await client.get('scraper_stats')
        stats = json.loads(stats_json) if stats_json else {}

        # Mock account data for frontend
        accounts_count = stats.get('accounts_count', 0)

        return {
            "accounts": {
                "total": accounts_count,
                "active": accounts_count,  # Assume all are active
                "details": [
                    {
                        "username": f"account_{i+1}",
                        "status": "active",
                        "rate_limit_remaining": 95
                    }
                    for i in range(min(accounts_count, 5))
                ]
            },
            "proxies": {
                "total": stats.get('proxies_count', 0),
                "active": stats.get('proxies_count', 0),
                "details": []
            }
        }

    except Exception as e:
        logger.error(f"Failed to get accounts: {e}")
        # Return mock data even on error
        return {
            "accounts": {
                "total": 0,
                "active": 0,
                "details": []
            },
            "proxies": {
                "total": 0,
                "active": 0,
                "details": []
            }
        }

@router.get("/status")
async def get_scraper_status(request: Request):
    """Get basic scraper status (for compatibility with existing frontend)"""
    try:
        client = await get_redis_client()

        # Get scraper stats
        stats_json = await client.get('scraper_stats')
        stats = json.loads(stats_json) if stats_json else {}

        # Get enabled status
        enabled = await client.get('scraper_enabled')
        is_running = enabled == b'true' if enabled else False

        return {
            "discovery": {
                "subreddits_found_24h": stats.get('daily_requests', 0),
                "new_subreddits": [],
                "processing_speed": stats.get('subreddits_processed', 0)
            },
            "data_quality": {
                "total_records": stats.get('subreddits_processed', 0),
                "complete_records": stats.get('successful_requests', 0),
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
            "last_updated": datetime.now(timezone.utc).isoformat()
        }

    except Exception as e:
        logger.error(f"Failed to get status: {e}")
        # Return default status on error
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
                "database": "unknown",
                "scraper": "stopped",
                "reddit_api": "unknown",
                "storage": "unknown"
            },
            "recent_activity": [],
            "error_feed": [],
            "last_updated": datetime.now(timezone.utc).isoformat()
        }

@router.post("/start")
async def start_scraper(request: Request):
    """Start scraper for 24/7 continuous operation"""
    try:
        import sys
        import os
        sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
        from scraper_control import ScraperController

        result = ScraperController.start()

        if result["success"]:
            logger.info("✅ Scraper started via API for 24/7 operation")
            return {
                "success": True,
                "message": "Scraper started for continuous operation",
                "status": "running",
                "details": result["details"]
            }
        else:
            logger.error(f"❌ Failed to start scraper: {result['message']}")
            raise HTTPException(status_code=500, detail=result["message"])
    except ImportError:
        # Fallback to existing method if supervisor not available
        logger.warning("Supervisor not available, using fallback method")
        return await start_continuous_scraping(request)

@router.post("/stop")
async def stop_scraper(request: Request):
    """Stop the continuous scraper"""
    try:
        import sys
        import os
        sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
        from scraper_control import ScraperController

        result = ScraperController.stop()

        if result["success"]:
            logger.info("✅ Scraper stopped via API")
            return {
                "success": True,
                "message": "Scraper stopped",
                "status": "stopped",
                "details": result["details"]
            }
        else:
            logger.error(f"❌ Failed to stop scraper: {result['message']}")
            raise HTTPException(status_code=500, detail=result["message"])
    except ImportError:
        # Fallback to existing method if supervisor not available
        logger.warning("Supervisor not available, using fallback method")
        return await stop_continuous_scraping(request)

@router.delete("/errors")
async def clear_errors(request: Request):
    """Clear error log"""
    try:
        client = await get_redis_client()
        await client.delete('reddit_scraper_logs')
        logger.info("🧹 Cleared error log")
        return {
            "status": "success",
            "message": "Errors cleared"
        }
    except Exception as e:
        logger.error(f"Failed to clear errors: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/logs")
async def get_scraper_logs(request: Request, lines: int = 100, level: Optional[str] = None, search: Optional[str] = None):
    """Get recent scraper logs from Supabase"""
    try:
        from supabase import create_client
        import os

        # Create Supabase client
        supabase_url = os.getenv("SUPABASE_URL")
        supabase_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

        if not supabase_url or not supabase_key:
            # Fallback to Redis if Supabase not configured
            return await get_scraper_logs_from_redis(request, lines)

        supabase = create_client(supabase_url, supabase_key)

        # Build query
        query = supabase.table('reddit_scraper_logs').select('*').order('timestamp', desc=True).limit(lines)

        # Add filters if provided
        if level and level != 'all':
            query = query.eq('level', level)

        if search:
            query = query.ilike('message', f'%{search}%')

        # Execute query
        response = query.execute()

        structured_logs = []
        for log in response.data:
            # Format log entry
            formatted_log = {
                "id": log.get('id'),
                "timestamp": log.get('timestamp', datetime.now(timezone.utc).isoformat()),
                "level": log.get('level', 'info'),
                "message": log.get('message', ''),
                "source": log.get('source', 'scraper')
            }

            # Add context if available
            if log.get('context'):
                context = log['context']

                # Enhance message with context details
                if 'subreddit' in context:
                    formatted_log['message'] = f"[r/{context['subreddit']}] {formatted_log['message']}"
                elif 'reddit_subreddits' in context:
                    subs = context['reddit_subreddits'][:3]  # Show first 3
                    formatted_log['message'] = f"[{', '.join(subs)}...] {formatted_log['message']}"

                # Add stats to message if available
                if 'posts_collected' in context:
                    formatted_log['message'] += f" ({context['posts_collected']} posts)"
                if 'processing_time_ms' in context:
                    formatted_log['message'] += f" [{context['processing_time_ms']}ms]"
                if 'error' in context:
                    formatted_log['message'] += f" - {context['error']}"

            structured_logs.append(formatted_log)

        return {
            "success": True,
            "logs": structured_logs,
            "lines": lines,
            "source": "supabase"
        }

    except Exception as e:
        logger.error(f"Error fetching logs from Supabase: {e}")
        # Fallback to Redis
        return await get_scraper_logs_from_redis(request, lines)

async def get_scraper_logs_from_redis(request: Request, lines: int = 100):
    """Fallback method to get logs from Redis"""
    try:
        client = await get_redis_client()
        logs_raw = await client.lrange('reddit_scraper_logs', 0, lines - 1)

        structured_logs = []
        for log_data in logs_raw:
            try:
                log = json.loads(log_data)
                formatted_log = {
                    "timestamp": log.get('timestamp', datetime.now(timezone.utc).isoformat()),
                    "level": log.get('level', 'info'),
                    "message": log.get('message', ''),
                    "source": log.get('source', 'scraper')
                }
                structured_logs.append(formatted_log)
            except:
                continue

        # Try to get supervisor logs as supplementary source
        try:
            import sys
            import os
            sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
            from scraper_control import ScraperController
            supervisor_result = ScraperController.get_logs(20)  # Get last 20 supervisor logs

            if supervisor_result.get("success") and supervisor_result.get("logs"):
                import re
                for log_line in supervisor_result["logs"][-10:]:  # Add last 10 supervisor logs
                    if log_line.strip():
                        # Parse supervisor log format
                        match = re.match(r'(\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2},\d{3}) - (\w+) - (.+)', log_line)

                        if match:
                            timestamp_str, level_str, message = match.groups()
                            try:
                                dt = datetime.strptime(timestamp_str, '%Y-%m-%d %H:%M:%S,%f')
                                timestamp = dt.replace(tzinfo=timezone.utc).isoformat()
                            except:
                                timestamp = datetime.now(timezone.utc).isoformat()

                            # Determine log level
                            level = 'info'
                            if '✅' in message or 'SUCCESS' in message or 'Successfully' in message:
                                level = 'success'
                            elif '❌' in message or 'ERROR' in message or 'Failed' in message:
                                level = 'error'
                            elif '⚠️' in message or 'WARNING' in message:
                                level = 'warning'
                            elif '🔍' in message or '🔎' in message:
                                level = 'info'
                            elif '📦' in message or '📋' in message:
                                level = 'debug'

                            structured_logs.append({
                                "timestamp": timestamp,
                                "level": level,
                                "message": message,
                                "source": "supervisor"
                            })
        except ImportError:
            pass  # Supervisor not available
        except Exception as e:
            logger.debug(f"Could not get supervisor logs: {e}")

        # Sort logs by timestamp (newest first)
        structured_logs.sort(key=lambda x: x['timestamp'], reverse=True)

        # Limit to requested number of lines
        structured_logs = structured_logs[:lines]

        return {
            "success": True,
            "logs": structured_logs,
            "total": len(structured_logs),
            "timestamp": datetime.now(timezone.utc).isoformat()
        }

    except Exception as e:
        logger.error(f"Failed to get logs: {e}")
        return {
            "success": False,
            "logs": [],
            "total": 0,
            "error": str(e)
        }

@router.post("/log")
async def add_scraper_log(request: Request,
                          level: str = "info",
                          message: str = "",
                          context: Optional[Dict[str, Any]] = None):
    """Add a log entry (internal use)"""
    try:
        client = await get_redis_client()

        log_entry = {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "level": level,
            "message": message,
            "context": context or {}
        }

        # Add to Redis list (keep last 1000 logs)
        await client.lpush('reddit_scraper_logs', json.dumps(log_entry))
        await client.ltrim('reddit_scraper_logs', 0, 999)

        return {"status": "success"}
    except Exception as e:
        logger.error(f"Failed to add log: {e}")
        return {"status": "error"}