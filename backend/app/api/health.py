"""
Health Check and System Metrics API
Endpoints for monitoring, readiness, liveness, and system metrics
"""

import logging
from datetime import datetime

from fastapi import APIRouter
from fastapi.responses import JSONResponse

from app.utils import health_monitor


logger = logging.getLogger(__name__)

router = APIRouter(tags=["health"])


@router.get("/health")
async def comprehensive_health_check():
    """Comprehensive health check for load balancers and monitoring"""
    try:
        health_result = await health_monitor.comprehensive_health_check()

        status_code = 200
        if health_result["status"] == "error":
            status_code = 503
        elif health_result["status"] == "warning":
            status_code = 200  # Still healthy, but with warnings

        return JSONResponse(content=health_result, status_code=status_code)
    except Exception as e:
        logger.error(f"Health check failed: {e}")
        return JSONResponse(
            content={"status": "error", "error": str(e), "timestamp": datetime.now().isoformat()},
            status_code=503,
        )


@router.get("/ready")
async def readiness_check():
    """Kubernetes readiness check"""
    return await health_monitor.readiness_check()


@router.get("/alive")
async def liveness_check():
    """Kubernetes liveness check"""
    return await health_monitor.liveness_check()


@router.get("/metrics")
async def get_metrics():
    """System metrics for monitoring"""
    try:
        metrics = await health_monitor.get_system_metrics()

        return {
            "system": metrics.__dict__ if hasattr(metrics, "__dict__") else metrics,
            "application": health_monitor.get_stats(),
            "timestamp": datetime.now().isoformat(),
        }
    except Exception as e:
        logger.error(f"Failed to get metrics: {e}")
        return JSONResponse(
            content={"error": "Metrics unavailable", "message": str(e)}, status_code=500
        )
