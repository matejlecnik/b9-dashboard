"""
Request Monitoring and Middleware Configuration
Centralized middleware setup for security, CORS, compression, and monitoring
"""

import os
import time

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from fastapi.responses import JSONResponse

from app.logging import get_logger
from app.utils import request_timer


logger = get_logger(__name__)


def configure_middleware(app: FastAPI):
    """
    Configure all middleware for the FastAPI application

    Args:
        app: FastAPI application instance
    """

    # Security middleware - TrustedHostMiddleware
    allowed_hosts = (
        ["*"]
        if os.getenv("ENVIRONMENT") != "production"
        else ["*.onrender.com", "localhost", "127.0.0.1", os.getenv("CUSTOM_DOMAIN", "")]
    )
    app.add_middleware(TrustedHostMiddleware, allowed_hosts=allowed_hosts)
    logger.info(f"✅ TrustedHostMiddleware configured (hosts: {allowed_hosts})")

    # CORS middleware - allow all origins for now to fix connectivity issues
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],  # Allow all origins temporarily to fix the issue
        allow_credentials=True,
        allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
        allow_headers=["*"],
        expose_headers=["*"],
    )
    logger.info("✅ CORSMiddleware configured (allow_origins: *)")

    # Compression middleware
    app.add_middleware(GZipMiddleware, minimum_size=1000)
    logger.info("✅ GZipMiddleware configured (minimum_size: 1000 bytes)")

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
            logger.error(
                f"Request failed: {e}",
                context={
                    "endpoint": request.url.path,
                    "method": request.method,
                    "status_code": 500,
                    "error": str(e),
                },
                action="api_request_failed",
            )
            return JSONResponse(
                status_code=500, content={"error": "Internal server error", "message": str(e)}
            )

        # Add performance headers
        process_time = time.time() - start_time
        response.headers["X-Process-Time"] = str(round(process_time * 1000, 2))
        response.headers["X-Server"] = "B9-Dashboard-API"

        # Log successful API calls for monitoring
        if request.url.path.startswith("/api/") and response.status_code < 400:
            logger.info(
                f"API request: {request.method} {request.url.path}",
                context={
                    "endpoint": request.url.path,
                    "method": request.method,
                    "status_code": response.status_code,
                },
                duration_ms=int(process_time * 1000),
                action="api_request_success",
            )

        return response

    logger.info("✅ Request monitoring middleware configured")
