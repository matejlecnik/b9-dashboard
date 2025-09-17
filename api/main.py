#!/usr/bin/env python3
"""
B9 Dashboard API - Render Production Service
High-performance FastAPI application optimized for Render deployment with:
- Redis caching and rate limiting
- Comprehensive monitoring and health checks
- Background job processing
- Enhanced security and error handling
- Real-time analytics and streaming
"""

import asyncio
import os
import logging
import time
import json
from typing import List, Optional, Dict, Any
from datetime import datetime, timezone
from fastapi import FastAPI, HTTPException, Query, Request, Depends, BackgroundTasks
from fastapi.responses import StreamingResponse, JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from contextlib import asynccontextmanager
from pydantic import BaseModel
from dotenv import load_dotenv
from supabase import create_client
import uvicorn

# Load environment variables first
load_dotenv()

# Import utilities and services
from utils import (
    cache_manager, rate_limiter, health_monitor,
    request_timer, get_cache, rate_limit, check_request_rate_limit
)
from services.categorization_service import CategorizationService
from routes.scraper_routes import router as scraper_router
from routes.user_routes import router as user_router

# Import Instagram scraper routes
try:
    from routes.instagram_scraper_routes import router as instagram_scraper_router
    INSTAGRAM_SCRAPER_ROUTES_AVAILABLE = True
except ImportError as e:
    print(f"Instagram scraper routes not available: {e}")
    INSTAGRAM_SCRAPER_ROUTES_AVAILABLE = False

# Import Instagram scraper task handler (for backward compatibility)
try:
    from tasks.instagram_scraper_task import (
        start_scraper_async,
        stop_scraper_async,
        get_status_async
    )
    INSTAGRAM_SCRAPER_AVAILABLE = True
except ImportError as e:
    print(f"Instagram scraper task handler not available - dependencies may be missing: {e}")
    INSTAGRAM_SCRAPER_AVAILABLE = False

# Configure logging for production
log_level = os.getenv('LOG_LEVEL', 'info').upper()
logging.basicConfig(
    level=getattr(logging, log_level),
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(),
        logging.FileHandler('logs/api.log') if os.path.exists('logs') else logging.NullHandler()
    ]
)
logger = logging.getLogger(__name__)

# =============================================================================
# PYDANTIC MODELS
# =============================================================================

class CategorizationRequest(BaseModel):
    batchSize: int = 30
    limit: Optional[int] = None
    subredditIds: Optional[List[int]] = None

class ScrapingRequest(BaseModel):
    subredditNames: Optional[List[str]] = None
    usernames: Optional[List[str]] = None
    maxSubreddits: int = 100
    maxUsers: int = 50

class UserDiscoveryRequest(BaseModel):
    username: str
    source: str = "manual"

class BackgroundJobRequest(BaseModel):
    job_type: str
    parameters: Dict[str, Any] = {}
    priority: str = "normal"

# =============================================================================
# GLOBAL SERVICES
# =============================================================================

categorization_service = None
supabase = None

# =============================================================================
# APPLICATION LIFESPAN
# =============================================================================

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan manager with enhanced initialization"""
    global categorization_service, supabase

    logger.info("🚀 Starting B9 Dashboard API (Render Optimized)")
    startup_start = time.time()
    
    try:
        # Validate environment variables
        required_env_vars = ["SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY", "OPENAI_API_KEY"]
        missing_vars = [var for var in required_env_vars if not os.getenv(var)]
        
        if missing_vars:
            raise Exception(f"Missing required environment variables: {missing_vars}")
        
        supabase_url = os.getenv("SUPABASE_URL")
        supabase_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
        openai_key = os.getenv("OPENAI_API_KEY")
        
        # Initialize Supabase client with error handling
        try:
            supabase = create_client(supabase_url, supabase_key)
            logger.info("✅ Supabase client initialized")
        except Exception as e:
            logger.error(f"❌ Supabase initialization failed: {e}")
            raise
        
        # Initialize utilities
        logger.info("🔧 Initializing utilities...")
        
        # Initialize cache manager
        cache_initialized = await cache_manager.initialize()
        if cache_initialized:
            logger.info("✅ Cache manager initialized")
        else:
            logger.warning("⚠️  Cache manager failed to initialize (running without cache)")
        
        # Initialize rate limiter
        rate_limit_initialized = await rate_limiter.initialize()
        if rate_limit_initialized:
            logger.info("✅ Rate limiter initialized")
        else:
            logger.warning("⚠️  Rate limiter failed to initialize (running without rate limiting)")
        
        # Initialize services
        logger.info("⚙️  Initializing services...")

        categorization_service = CategorizationService(supabase, openai_key)

        logger.info("✅ All services initialized")

        # Register health check dependencies
        health_monitor.register_dependency('supabase', health_monitor.check_supabase_health)
        health_monitor.register_dependency('redis', health_monitor.check_redis_health)
        health_monitor.register_dependency('openai', health_monitor.check_openai_health)

        # Don't auto-start scraper - it can be controlled via API endpoints
        logger.info("📝 Scraper auto-start disabled - use /api/scraper/start endpoint to control")

        startup_time = time.time() - startup_start
        logger.info(f"🎯 B9 Dashboard API ready in {startup_time:.2f}s")
        
        # Log startup
        logger.info(f"Services initialized: categorization, user")
        logger.info(f"Cache enabled: {cache_initialized}, Rate limiting: {rate_limit_initialized}")
        
    except Exception as e:
        logger.error(f"❌ Failed to initialize B9 Dashboard API: {e}")
        raise
    
    yield

    # Cleanup
    logger.info("🛑 Shutting down B9 Dashboard API...")
    cleanup_start = time.time()

    try:
        # Close utilities
        await cache_manager.close()
        await rate_limiter.close()

        cleanup_time = time.time() - cleanup_start
        logger.info(f"✅ Cleanup completed in {cleanup_time:.2f}s")

    except Exception as e:
        logger.error(f"Error during cleanup: {e}")

# =============================================================================
# FASTAPI APPLICATION
# =============================================================================

app = FastAPI(
    title="B9 Dashboard API",
    description="Production Reddit Analytics API for OnlyFans Marketing Intelligence",
    version="3.0.0",
    docs_url="/docs" if os.getenv("ENVIRONMENT") != "production" else None,
    redoc_url="/redoc" if os.getenv("ENVIRONMENT") != "production" else None,
    lifespan=lifespan
)

# =============================================================================
# MIDDLEWARE CONFIGURATION
# =============================================================================

# Include routers
app.include_router(scraper_router)
app.include_router(user_router)

# Include Instagram scraper routes if available
if INSTAGRAM_SCRAPER_ROUTES_AVAILABLE:
    app.include_router(instagram_scraper_router)
    logger.info("✅ Instagram scraper routes registered")

# Security middleware
app.add_middleware(
    TrustedHostMiddleware,
    allowed_hosts=["*"] if os.getenv("ENVIRONMENT") != "production" else [
        "*.onrender.com", 
        "localhost", 
        "127.0.0.1",
        os.getenv("CUSTOM_DOMAIN", "")
    ]
)

# CORS middleware - allow all origins for now to fix connectivity issues
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins temporarily to fix the issue
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allow_headers=["*"],
    expose_headers=["*"],
)

# Compression middleware
app.add_middleware(GZipMiddleware, minimum_size=1000)

# Request timing and monitoring middleware
@app.middleware("http")
async def monitor_requests(request: Request, call_next):
    """Monitor all requests for performance and rate limiting"""
    start_time = time.time()
    
    # Check rate limit for API endpoints
    if request.url.path.startswith("/api/"):
        try:
            rate_limit_result = await check_request_rate_limit(request, "api")
            if not rate_limit_result.get("allowed", True):
                return JSONResponse(
                    status_code=429,
                    content={
                        "error": "Rate limit exceeded",
                        "details": rate_limit_result
                    },
                    headers={
                        "X-RateLimit-Limit": str(rate_limit_result.get("limit", "")),
                        "X-RateLimit-Remaining": str(rate_limit_result.get("remaining", "")),
                        "X-RateLimit-Reset": str(rate_limit_result.get("reset_time", "")),
                        "Retry-After": str(rate_limit_result.get("window_seconds", ""))
                    }
                )
        except Exception as e:
            logger.warning(f"Rate limit check failed: {e}")
    
    # Process request
    try:
        async with request_timer():
            response = await call_next(request)
    except Exception as e:
        logger.error(f"Request failed: {e}")
        return JSONResponse(
            status_code=500,
            content={"error": "Internal server error", "message": str(e)}
        )
    
    # Add performance headers
    process_time = time.time() - start_time
    response.headers["X-Process-Time"] = str(round(process_time * 1000, 2))
    response.headers["X-Server"] = "B9-Dashboard-API"
    
    return response

# =============================================================================
# HEALTH & STATUS ENDPOINTS
# =============================================================================

@app.get("/")
async def root():
    """Root endpoint with service information"""
    return {
        "service": "B9 Dashboard API",
        "version": "3.0.0",
        "status": "operational",
        "environment": os.getenv("ENVIRONMENT", "development"),
        "timestamp": datetime.now().isoformat(),
        "endpoints": {
            "health": "/health",
            "readiness": "/ready",
            "liveness": "/alive",
            "metrics": "/metrics",
            "docs": "/docs" if os.getenv("ENVIRONMENT") != "production" else None
        }
    }

@app.get("/health")
async def comprehensive_health_check():
    """Comprehensive health check for load balancers and monitoring"""
    try:
        health_result = await health_monitor.comprehensive_health_check()
        
        status_code = 200
        if health_result["status"] == "error":
            status_code = 503
        elif health_result["status"] == "warning":
            status_code = 200  # Still healthy, but with warnings
        
        return JSONResponse(
            content=health_result,
            status_code=status_code
        )
    except Exception as e:
        logger.error(f"Health check failed: {e}")
        return JSONResponse(
            content={
                "status": "error",
                "error": str(e),
                "timestamp": datetime.now().isoformat()
            },
            status_code=503
        )

@app.get("/ready")
async def readiness_check():
    """Kubernetes/Render readiness check"""
    return await health_monitor.readiness_check()

@app.get("/alive")
async def liveness_check():
    """Kubernetes/Render liveness check"""
    return await health_monitor.liveness_check()

@app.get("/metrics")
async def get_metrics():
    """System metrics for monitoring"""
    try:
        metrics = await health_monitor.get_system_metrics()
        cache_stats = await cache_manager.get_stats() if cache_manager.is_connected else {}
        rate_limit_stats = await rate_limiter.get_stats() if rate_limiter.is_connected else {}
        
        return {
            "system": metrics.__dict__ if hasattr(metrics, '__dict__') else metrics,
            "application": health_monitor.get_stats(),
            "cache": cache_stats,
            "rate_limiting": rate_limit_stats,
            "timestamp": datetime.now().isoformat()
        }
    except Exception as e:
        logger.error(f"Failed to get metrics: {e}")
        return JSONResponse(
            content={"error": "Metrics unavailable", "message": str(e)},
            status_code=500
        )

# =============================================================================
# CACHED API ENDPOINTS
# =============================================================================

@app.get("/api/stats")
@rate_limit("api")
async def get_system_stats(request: Request, cache: cache_manager = Depends(get_cache)):
    """Get comprehensive system statistics with caching"""
    cache_key = "system_stats"
    
    # Try to get from cache first
    cached_stats = await cache.get(cache_key, "stats")
    if cached_stats:
        return cached_stats
    
    try:
        stats = {}
        
        # Gather stats from all services
        if categorization_service:
            stats["categorization"] = await categorization_service.get_categorization_stats()
        
        # Scraper stats can be fetched from Supabase logs directly if needed
        stats["scraper"] = {"status": "Use /api/scraper/status endpoint for details"}
        
        result = {
            "status": "success",
            "stats": stats,
            "timestamp": datetime.now().isoformat()
        }
        
        # Cache for 5 minutes
        await cache.set(cache_key, result, ttl=300, namespace="stats")
        
        return result
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# =============================================================================
# CATEGORIZATION ENDPOINTS
# =============================================================================

@app.post("/api/categorization/start")
@rate_limit("api")
async def start_categorization(request: Request, payload: CategorizationRequest):
    """Start AI categorization process for approved subreddits"""
    logger.info(f"📝 Categorization request received: batchSize={payload.batchSize}, limit={payload.limit}, subredditIds={payload.subredditIds}")
    
    if not categorization_service:
        logger.error("❌ Categorization service not initialized")
        raise HTTPException(status_code=503, detail="Categorization service not initialized")
    
    if not supabase:
        logger.error("❌ Supabase client not initialized")
        raise HTTPException(status_code=503, detail="Supabase connection not available")
    
    # Test Supabase connection
    try:
        test_response = supabase.table('reddit_subreddits').select('id').limit(1).execute()
        logger.info(f"✅ Supabase connection test successful: {len(test_response.data)} test rows")
    except Exception as e:
        logger.error(f"❌ Supabase connection test failed: {e}")
        raise HTTPException(status_code=503, detail=f"Database connection failed: {str(e)}")
    
    try:
        logger.info(f"🚀 Starting categorization with batch_size={payload.batchSize}, limit={payload.limit}")
        
        # Start categorization with specified parameters
        result = await categorization_service.categorize_all_uncategorized(
            batch_size=payload.batchSize,
            limit=payload.limit,
            subreddit_ids=payload.subredditIds
        )
        
        return {
            "status": "completed",
            "message": f"Categorization completed successfully",
            "results": result
        }
        
    except Exception as e:
        logger.error(f"Categorization failed: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Categorization failed: {str(e)}")

@app.get("/api/categorization/stats")
@rate_limit("api")
async def get_categorization_stats(request: Request):
    """Get categorization statistics"""
    if not categorization_service:
        raise HTTPException(status_code=503, detail="Categorization service not initialized")
    
    try:
        stats = await categorization_service.get_categorization_stats()
        return stats
        
    except Exception as e:
        logger.error(f"Failed to get categorization stats: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/categorization/categories")
@rate_limit("api") 
async def get_categories(request: Request):
    """Get list of available marketing categories"""
    if not categorization_service:
        raise HTTPException(status_code=503, detail="Categorization service not initialized")
    
    try:
        return {
            "reddit_categories": categorization_service.CATEGORIES,
            "total_categories": len(categorization_service.CATEGORIES)
        }
        
    except Exception as e:
        logger.error(f"Failed to get categories: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

# =============================================================================
# BACKGROUND JOB ENDPOINTS
# =============================================================================

@app.post("/api/jobs/start")
@rate_limit("api")
async def start_background_job(request: Request, job_request: BackgroundJobRequest):
    """Start a background job (replaces Celery functionality)"""
    try:
        # Generate job ID
        job_id = f"job_{int(time.time() * 1000)}"
        
        # Create job record
        job_data = {
            'job_id': job_id,
            'job_type': job_request.job_type,
            'status': 'pending',
            'parameters': job_request.parameters,
            'priority': job_request.priority,
            'created_at': datetime.now().isoformat(),
            'started_at': None,
            'completed_at': None,
            'result': None,
            'error_message': None
        }
        
        # Save to database
        if supabase:
            supabase.table('background_jobs').insert(job_data).execute()
        
        # Add to Redis queue if available
        if cache_manager.is_connected:
            queue_data = {
                'job_id': job_id,
                'type': job_request.job_type,
                **job_request.parameters
            }
            
            # Add to appropriate priority queue
            queue_name = f"job_queue_{job_request.priority}"
            await cache_manager.redis_client.lpush(queue_name, json.dumps(queue_data))
        
        return {
            'job_id': job_id,
            'status': 'queued',
            'message': f'Background job {job_request.job_type} queued successfully',
            'parameters': job_request.parameters
        }
        
    except Exception as e:
        logger.error(f"Failed to start background job: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/jobs/{job_id}")
@rate_limit("api")
async def get_job_status(request: Request, job_id: str):
    """Get background job status"""
    try:
        if not supabase:
            raise HTTPException(status_code=503, detail="Database not available")
        
        response = supabase.table('background_jobs').select('*').eq('job_id', job_id).execute()
        
        if not response.data:
            raise HTTPException(status_code=404, detail="Job not found")
        
        job_data = response.data[0]
        
        # Parse result if it's JSON string
        result = job_data.get('result')
        if isinstance(result, str):
            try:
                result = json.loads(result)
            except json.JSONDecodeError:
                pass
        
        return {
            'job_id': job_id,
            'status': job_data['status'],
            'job_type': job_data['job_type'],
            'created_at': job_data['created_at'],
            'started_at': job_data.get('started_at'),
            'completed_at': job_data.get('completed_at'),
            'result': result,
            'error_message': job_data.get('error_message')
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get job status: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# =============================================================================
# INSTAGRAM SCRAPER ENDPOINTS (LEGACY)
# =============================================================================
# Note: If INSTAGRAM_SCRAPER_ROUTES_AVAILABLE, these are overridden by new subprocess-based endpoints
# These thread-based endpoints only used when new routes aren't available

@app.post("/api/instagram/scraper/start")
@rate_limit("api")
async def start_instagram_scraper(request: Request):
    """Start the Instagram scraper background task"""
    try:
        if not INSTAGRAM_SCRAPER_AVAILABLE:
            raise HTTPException(status_code=503, detail="Instagram scraper not available")

        result = await start_scraper_async()

        if not result.get("success"):
            raise HTTPException(status_code=400, detail=result.get("message", "Failed to start scraper"))

        # Log to Supabase
        if supabase:
            supabase.table('instagram_scraper_realtime_logs').insert({
                'timestamp': datetime.now(timezone.utc).isoformat(),
                'level': 'info',
                'message': 'Instagram scraper started via API',
                'source': 'instagram_api',
                'context': result
            }).execute()

        return result

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to start Instagram scraper: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/instagram/scraper/stop")
@rate_limit("api")
async def stop_instagram_scraper(request: Request):
    """Stop the Instagram scraper background task"""
    try:
        if not INSTAGRAM_SCRAPER_AVAILABLE:
            raise HTTPException(status_code=503, detail="Instagram scraper not available")

        result = await stop_scraper_async()

        if not result.get("success"):
            raise HTTPException(status_code=400, detail=result.get("message", "Failed to stop scraper"))

        # Log to Supabase
        if supabase:
            supabase.table('instagram_scraper_realtime_logs').insert({
                'timestamp': datetime.now(timezone.utc).isoformat(),
                'level': 'info',
                'message': 'Instagram scraper stopped via API',
                'source': 'instagram_api',
                'context': result
            }).execute()

        return result

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to stop Instagram scraper: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/instagram/scraper/status")
@rate_limit("api")
async def get_instagram_scraper_status(request: Request):
    """Get the current status of the Instagram scraper"""
    try:
        if not INSTAGRAM_SCRAPER_AVAILABLE:
            return {
                "running": False,
                "status": "unavailable",
                "error": "Instagram scraper not available",
                "timestamp": datetime.utcnow().isoformat()
            }

        status = await get_status_async()
        return status

    except Exception as e:
        logger.error(f"Failed to get Instagram scraper status: {e}")
        return {
            "running": False,
            "status": "error",
            "error": str(e),
            "timestamp": datetime.utcnow().isoformat()
        }


@app.get("/api/instagram/scraper/success-rate")
@rate_limit("api")
async def get_instagram_success_rate(request: Request):
    """Calculate and return Instagram scraper success rate from Supabase logs"""
    try:
        if not supabase:
            raise HTTPException(status_code=503, detail="Supabase not available")

        # Get today's date for filtering
        today = datetime.now(timezone.utc).date().isoformat()

        # Get control record for metadata
        control_result = supabase.table('instagram_scraper_control')\
            .select('metadata')\
            .eq('id', 1)\
            .single()\
            .execute()

        if control_result.data and control_result.data.get('metadata'):
            metadata = control_result.data['metadata']
            successful = metadata.get('successful_calls', 0)
            failed = metadata.get('failed_calls', 0)
            total = successful + failed

            success_rate = (successful / total * 100) if total > 0 else 100.0

            return {
                "success": True,
                "stats": {
                    "success_rate": round(success_rate, 1),
                    "successful_requests": successful,
                    "failed_requests": failed,
                    "total_requests": total,
                    "date": today
                }
            }
        else:
            return {
                "success": True,
                "stats": {
                    "success_rate": 100.0,
                    "successful_requests": 0,
                    "failed_requests": 0,
                    "total_requests": 0,
                    "date": today
                }
            }

    except Exception as e:
        logger.error(f"Failed to calculate Instagram success rate: {e}")
        return {
            "success": False,
            "error": str(e),
            "stats": {
                "success_rate": 0,
                "successful_requests": 0,
                "failed_requests": 0,
                "total_requests": 0
            }
        }


@app.get("/api/instagram/scraper/cost-metrics")
@rate_limit("api")
async def get_instagram_cost_metrics(request: Request):
    """Calculate and return Instagram scraper cost metrics"""
    try:
        if not supabase:
            raise HTTPException(status_code=503, detail="Supabase not available")

        # Get control record for metadata
        control_result = supabase.table('instagram_scraper_control')\
            .select('metadata')\
            .eq('id', 1)\
            .single()\
            .execute()

        daily_calls = 0
        if control_result.data and control_result.data.get('metadata'):
            daily_calls = control_result.data['metadata'].get('total_api_calls_today', 0)

        # Cost calculation: $75 per 250,000 requests = $0.0003 per request
        cost_per_request = 75 / 250000
        daily_cost = daily_calls * cost_per_request
        projected_monthly_cost = daily_cost * 30

        return {
            "success": True,
            "metrics": {
                "daily_api_calls": daily_calls,
                "daily_cost": round(daily_cost, 2),
                "projected_monthly_cost": round(projected_monthly_cost, 2),
                "cost_per_request": cost_per_request
            }
        }

    except Exception as e:
        logger.error(f"Failed to calculate Instagram cost metrics: {e}")
        return {
            "success": False,
            "error": str(e),
            "metrics": {
                "daily_api_calls": 0,
                "daily_cost": 0,
                "projected_monthly_cost": 0,
                "cost_per_request": 0.0003
            }
        }


@app.get("/api/instagram/scraper/metrics")
@rate_limit("api")
async def get_instagram_scraper_metrics(request: Request, hours: int = Query(default=24, le=168)):
    """Get Instagram scraper metrics and analytics"""
    try:
        if not supabase:
            raise HTTPException(status_code=503, detail="Database not available")

        # Get current status
        status = await get_status_async() if INSTAGRAM_SCRAPER_AVAILABLE else {"running": False}

        # Get recent logs
        logs_response = supabase.table('instagram_scraper_realtime_logs').select('*').order('timestamp', desc=True).limit(100).execute()

        # Get creator stats
        creator_response = supabase.table('instagram_creators').select('status, count').execute()

        # Calculate metrics
        total_creators = len(creator_response.data) if creator_response.data else 0
        ok_creators = sum(1 for c in creator_response.data if c.get('status') == 'OK') if creator_response.data else 0

        # Get recent performance from logs
        performance_logs = [
            log for log in (logs_response.data or [])
            if log.get('context') and isinstance(log['context'], dict) and 'performance' in log['context']
        ]

        avg_rps = 0
        total_requests = 0
        if performance_logs:
            rps_values = [log['context']['performance'].get('current_rps', 0) for log in performance_logs[:10]]
            avg_rps = sum(rps_values) / len(rps_values) if rps_values else 0

            request_counts = [log['context']['performance'].get('total_requests', 0) for log in performance_logs[:10]]
            total_requests = max(request_counts) if request_counts else 0

        return {
            "status": status,
            "metrics": {
                "total_creators": total_creators,
                "ok_creators": ok_creators,
                "average_rps": round(avg_rps, 2),
                "total_requests": total_requests,
                "logs_count": len(logs_response.data) if logs_response.data else 0
            },
            "recent_logs": logs_response.data[:10] if logs_response.data else [],
            "timestamp": datetime.utcnow().isoformat()
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get Instagram scraper metrics: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/instagram/scraper/logs")
@rate_limit("api")
async def get_instagram_scraper_logs(
    request: Request,
    limit: int = Query(default=100, le=1000),
    offset: int = Query(default=0, ge=0),
    log_level: Optional[str] = Query(default=None)
):
    """Get Instagram scraper logs from database"""
    try:
        if not supabase:
            raise HTTPException(status_code=503, detail="Database not available")

        query = supabase.table('instagram_scraper_realtime_logs').select('*')

        if log_level:
            query = query.eq('level', log_level)

        response = query.order('timestamp', desc=True).range(offset, offset + limit - 1).execute()

        return {
            "logs": response.data or [],
            "count": len(response.data) if response.data else 0,
            "limit": limit,
            "offset": offset,
            "timestamp": datetime.utcnow().isoformat()
        }

    except Exception as e:
        logger.error(f"Failed to get Instagram scraper logs: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# =============================================================================
# MAIN ENTRY POINT
# =============================================================================

if __name__ == "__main__":
    port = int(os.getenv("PORT", 8000))
    workers = int(os.getenv("API_WORKERS", 1))
    
    logger.info(f"🚀 Starting B9 Dashboard API on port {port}")
    
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=port,
        workers=workers,
        log_level=log_level.lower(),
        access_log=True,
        use_colors=True,
        reload=False  # Disabled for production
    )