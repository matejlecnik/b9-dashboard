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

import os
import logging
import time
import json
from typing import List, Optional, Dict, Any
from datetime import datetime, timezone
from fastapi import FastAPI, HTTPException, Query, Request, Depends
from fastapi.responses import JSONResponse
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
    request_timer, rate_limit,
    system_logger, log_api_call, log_exception
)
# Flexible imports for both local development and production
try:
    # Local development (with api. prefix)
    from api.services.categorization_service_tags import TagCategorizationService
    from api.services.single_subreddit_fetcher import fetch_subreddit
    from api.routes.scraper_routes import router as scraper_router
    from api.routes.user_routes import router as user_router
    from api.routes.instagram_scraper_routes import router as instagram_scraper_router
    INSTAGRAM_SCRAPER_ROUTES_AVAILABLE = True
except ImportError:
    # Production (without api. prefix)
    from services.categorization_service_tags import TagCategorizationService
    from services.single_subreddit_fetcher import fetch_subreddit
    from routes.scraper_routes import router as scraper_router
    from routes.user_routes import router as user_router
    try:
        from routes.instagram_scraper_routes import router as instagram_scraper_router
        INSTAGRAM_SCRAPER_ROUTES_AVAILABLE = True
    except ImportError as e:
        print(f"Instagram scraper routes not available: {e}")
        INSTAGRAM_SCRAPER_ROUTES_AVAILABLE = False

# Import Instagram related creators routes
try:
    # Local development
    from api.routes.instagram_related_creators_routes import router as instagram_related_router
    INSTAGRAM_RELATED_ROUTES_AVAILABLE = True
except ImportError:
    try:
        # Production
        from routes.instagram_related_creators_routes import router as instagram_related_router
        INSTAGRAM_RELATED_ROUTES_AVAILABLE = True
    except ImportError as e:
        print(f"Instagram related creators routes not available: {e}")
        INSTAGRAM_RELATED_ROUTES_AVAILABLE = False

# Instagram scraper now uses subprocess architecture via instagram_scraper_routes.py
# Control is done via Supabase system_control table only
INSTAGRAM_SCRAPER_AVAILABLE = False  # Thread-based scraper disabled

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

class SingleSubredditRequest(BaseModel):
    subreddit_name: str

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

tag_categorization_service = None
supabase = None

# =============================================================================
# APPLICATION LIFESPAN
# =============================================================================

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan manager with enhanced initialization"""
    global tag_categorization_service, supabase

    logger.info("🚀 Starting B9 Dashboard API (Render Optimized)")
    system_logger.info("Starting B9 Dashboard API", source="api", script_name="main", context={"environment": os.getenv("ENVIRONMENT", "development")})
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
            system_logger.info("Supabase client initialized", source="api", script_name="main")
        except Exception as e:
            logger.error(f"❌ Supabase initialization failed: {e}")
            system_logger.error(f"Supabase initialization failed: {e}", source="api", script_name="main", sync=True)
            raise
        
        # Initialize utilities
        logger.info("🔧 Initializing utilities...")
        
        # Initialize cache manager (no-op version)
        await cache_manager.initialize()
        logger.info("✅ Cache manager initialized (caching disabled)")
        
        # Initialize rate limiter (no-op version)
        await rate_limiter.initialize()
        logger.info("✅ Rate limiter initialized (rate limiting disabled)")
        
        # Initialize services
        logger.info("⚙️  Initializing services...")

        tag_categorization_service = TagCategorizationService(supabase, openai_key)

        logger.info("✅ All services initialized")

        # Register health check dependencies
        health_monitor.register_dependency('supabase', health_monitor.check_supabase_health)
        health_monitor.register_dependency('openai', health_monitor.check_openai_health)

        # Don't auto-start scraper - it can be controlled via API endpoints
        logger.info("📝 Scraper auto-start disabled - use /api/scraper/start endpoint to control")

        startup_time = time.time() - startup_start
        logger.info(f"🎯 B9 Dashboard API ready in {startup_time:.2f}s")
        system_logger.info(
            f"API startup complete",
            source="api",
            script_name="main",
            duration_ms=int(startup_time * 1000),
            context={
                "cache_enabled": False,
                "rate_limiting_enabled": False,
                "services": ["categorization", "user"],
                "startup_time_seconds": startup_time
            }
        )
        
        # Log startup
        logger.info(f"Services initialized: categorization, user")
        logger.info("Cache disabled, Rate limiting disabled")
        
    except Exception as e:
        logger.error(f"❌ Failed to initialize B9 Dashboard API: {e}")
        system_logger.error(
            f"API startup failed: {e}",
            source="api",
            script_name="main",
            context={"error": str(e)},
            sync=True
        )
        raise
    
    yield

    # Cleanup
    logger.info("🛑 Shutting down B9 Dashboard API...")
    system_logger.info("API shutdown initiated", source="api", script_name="main")
    cleanup_start = time.time()

    try:
        # Close utilities
        await cache_manager.close()
        await rate_limiter.close()

        cleanup_time = time.time() - cleanup_start
        logger.info(f"✅ Cleanup completed in {cleanup_time:.2f}s")
        system_logger.info(
            "API shutdown complete",
            source="api",
            script_name="main",
            duration_ms=int(cleanup_time * 1000)
        )
        # Flush any remaining logs
        system_logger.flush()

    except Exception as e:
        logger.error(f"Error during cleanup: {e}")
        system_logger.error(f"Cleanup error: {e}", source="api", script_name="main", sync=True)

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

# Include Instagram related creators routes if available
if INSTAGRAM_RELATED_ROUTES_AVAILABLE:
    app.include_router(instagram_related_router)
    logger.info("✅ Instagram related creators routes registered")

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
    
    # Rate limiting disabled - skip check
    # (Redis has been removed from the project)
    
    # Process request
    try:
        async with request_timer():
            response = await call_next(request)
    except Exception as e:
        logger.error(f"Request failed: {e}")
        log_api_call(
            source="api",
            endpoint=request.url.path,
            method=request.method,
            status_code=500,
            error=str(e)
        )
        return JSONResponse(
            status_code=500,
            content={"error": "Internal server error", "message": str(e)}
        )
    
    # Add performance headers
    process_time = time.time() - start_time
    response.headers["X-Process-Time"] = str(round(process_time * 1000, 2))
    response.headers["X-Server"] = "B9-Dashboard-API"

    # Log successful API calls for monitoring
    if request.url.path.startswith("/api/") and response.status_code < 400:
        log_api_call(
            source="api",
            endpoint=request.url.path,
            method=request.method,
            status_code=response.status_code,
            response_time_ms=int(process_time * 1000)
        )

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
async def get_system_stats(request: Request):
    """Get comprehensive system statistics with caching"""
    cache_key = "system_stats"
    
    # Try to get from cache first
    cached_stats = await cache.get(cache_key, "stats")
    if cached_stats:
        return cached_stats
    
    try:
        stats = {}
        
        # Gather stats from all services
        if tag_categorization_service:
            stats["categorization"] = await tag_categorization_service.get_tag_stats()
        
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
async def start_tag_categorization(request: Request, payload: CategorizationRequest):
    """Start AI tag-based categorization process for approved subreddits"""
    logger.info(f"🏷️  Tag categorization request received: batch_size={payload.batchSize}, limit={payload.limit}")

    if not tag_categorization_service:
        logger.error("❌ Tag categorization service not initialized")
        raise HTTPException(status_code=503, detail="Tag categorization service not initialized")

    if not supabase:
        logger.error("❌ Supabase client not initialized")
        raise HTTPException(status_code=503, detail="Supabase connection not available")

    try:
        logger.info(f"🚀 Starting tag categorization with batch_size={payload.batchSize}, limit={payload.limit}")

        # Start tag categorization with specified parameters
        result = await tag_categorization_service.tag_all_uncategorized(
            batch_size=payload.batchSize,
            limit=payload.limit,
            subreddit_ids=payload.subredditIds
        )

        logger.info(f"✅ Tag categorization completed: {result.get('status')}")
        logger.info(f"📊 Stats: {result.get('stats')}")

        # Return the result for frontend processing
        return result

    except Exception as e:
        logger.error(f"❌ Tag categorization failed: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Tag categorization failed: {str(e)}")

@app.get("/api/categorization/stats")
@rate_limit("api")
async def get_tag_stats(request: Request):
    """Get tag categorization statistics"""
    if not tag_categorization_service:
        raise HTTPException(status_code=503, detail="Tag categorization service not initialized")

    try:
        stats = await tag_categorization_service.get_tag_stats()
        return stats

    except Exception as e:
        logger.error(f"Failed to get tag stats: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

# =============================================================================
# SINGLE SUBREDDIT FETCHER ENDPOINT
# =============================================================================

@app.post("/api/subreddits/fetch-single")
@rate_limit("api")
async def fetch_single_subreddit(request: Request, payload: SingleSubredditRequest):
    """Fetch data for a single subreddit from Reddit"""
    logger.info(f"📊 Single subreddit fetch request: {payload.subreddit_name}")

    try:
        # Clean the subreddit name
        subreddit_name = payload.subreddit_name.replace('r/', '').replace('u/', '').strip()

        if not subreddit_name:
            raise HTTPException(status_code=400, detail="Subreddit name is required")

        # Fetch the subreddit data using the fetcher
        result = fetch_subreddit(subreddit_name)

        if not result['success']:
            logger.warning(f"⚠️ Failed to fetch r/{subreddit_name}: {result.get('error')}")
            if result.get('status') == 404:
                raise HTTPException(status_code=404, detail=f"Subreddit r/{subreddit_name} not found")
            elif result.get('status') == 403:
                raise HTTPException(status_code=403, detail=f"Subreddit r/{subreddit_name} is private or banned")
            else:
                raise HTTPException(status_code=500, detail=result.get('error', 'Failed to fetch subreddit'))

        logger.info(f"✅ Successfully fetched data for r/{subreddit_name}")

        # Return just the data part for the frontend
        return result['data']

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Failed to fetch subreddit: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to fetch subreddit: {str(e)}")

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