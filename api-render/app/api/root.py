"""
Root API Endpoint
Provides service information and API discovery
"""

import os
from datetime import datetime
from fastapi import APIRouter
from app.version import API_VERSION

router = APIRouter(tags=["root"])


@router.get("/")
async def root():
    """Root endpoint with service information"""
    return {
        "service": "B9 Dashboard API",
        "version": API_VERSION,
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
