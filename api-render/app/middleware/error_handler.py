#!/usr/bin/env python3
"""
B9 Dashboard API - Error Handling Middleware
Comprehensive error handling and logging for production deployment
"""

import logging
import traceback
import uuid
from typing import Dict, Any, Optional
from datetime import datetime, timezone
from fastapi import Request, HTTPException
from fastapi.responses import JSONResponse
from fastapi.exceptions import ValidationError, RequestValidationError
from starlette.exceptions import HTTPException as StarletteHTTPException
from starlette.middleware.base import BaseHTTPMiddleware
from pydantic import ValidationError as PydanticValidationError
import json

# Use unified logging system
from app.logging import get_logger
from app.core.database import get_db

logger = get_logger(__name__)
SUPABASE_AVAILABLE = True  # Using unified logging with Supabase support

def filter_sensitive_headers(headers: dict) -> dict:
    """Remove sensitive headers before logging"""
    sensitive_keys = {
        'authorization', 'cookie', 'x-api-key', 'api-key',
        'x-auth-token', 'x-csrf-token', 'x-forwarded-for',
        'x-access-token', 'x-secret-key', 'set-cookie'
    }

    filtered = {}
    for key, value in headers.items():
        if key.lower() in sensitive_keys:
            filtered[key] = '[REDACTED]'
        elif 'token' in key.lower() or 'secret' in key.lower() or 'key' in key.lower():
            filtered[key] = '[REDACTED]'
        else:
            filtered[key] = value
    return filtered

class ErrorHandlingMiddleware(BaseHTTPMiddleware):
    """
    Comprehensive error handling middleware
    Catches all exceptions and returns structured error responses
    """
    
    async def dispatch(self, request: Request, call_next):
        try:
            response = await call_next(request)
            return response
            
        except HTTPException as e:
            return await self.handle_http_exception(request, e)
            
        except StarletteHTTPException as e:
            return await self.handle_starlette_exception(request, e)
            
        except (RequestValidationError, ValidationError, PydanticValidationError) as e:
            return await self.handle_validation_error(request, e)
            
        except Exception as e:
            return await self.handle_generic_exception(request, e)
    
    async def handle_http_exception(self, request: Request, exc: HTTPException) -> JSONResponse:
        """Handle FastAPI HTTP exceptions"""
        error_data = {
            "error": "HTTP Exception",
            "status_code": exc.status_code,
            "message": exc.detail,
            "timestamp": datetime.now().isoformat(),
            "path": str(request.url),
            "method": request.method
        }
        
        # Log error for monitoring
        if exc.status_code >= 500:
            logger.error(f"HTTP {exc.status_code}: {exc.detail} at {request.url}")
        else:
            logger.warning(f"HTTP {exc.status_code}: {exc.detail} at {request.url}")
        
        return JSONResponse(
            status_code=exc.status_code,
            content=error_data,
            headers=getattr(exc, 'headers', None)
        )
    
    async def handle_starlette_exception(self, request: Request, exc: StarletteHTTPException) -> JSONResponse:
        """Handle Starlette HTTP exceptions"""
        error_data = {
            "error": "Request Error",
            "status_code": exc.status_code,
            "message": exc.detail,
            "timestamp": datetime.now().isoformat(),
            "path": str(request.url),
            "method": request.method
        }
        
        logger.warning(f"Starlette HTTP {exc.status_code}: {exc.detail} at {request.url}")
        
        return JSONResponse(
            status_code=exc.status_code,
            content=error_data
        )
    
    async def handle_validation_error(self, request: Request, exc) -> JSONResponse:
        """Handle validation errors"""
        error_details = []
        
        if hasattr(exc, 'errors'):
            for error in exc.errors():
                error_details.append({
                    "field": " -> ".join(str(loc) for loc in error.get("loc", [])),
                    "message": error.get("msg", ""),
                    "type": error.get("type", ""),
                    "input": error.get("input")
                })
        
        error_data = {
            "error": "Validation Error",
            "status_code": 422,
            "message": "Request validation failed",
            "details": error_details,
            "timestamp": datetime.now().isoformat(),
            "path": str(request.url),
            "method": request.method
        }
        
        logger.warning(f"Validation error at {request.url}: {error_details}")
        
        return JSONResponse(
            status_code=422,
            content=error_data
        )
    
    async def handle_generic_exception(self, request: Request, exc: Exception) -> JSONResponse:
        """Handle all other exceptions"""
        error_id = f"error_{uuid.uuid4().hex[:8]}_{int(datetime.now().timestamp())}"
        
        # Get error details
        error_type = type(exc).__name__
        error_message = str(exc)
        
        # Get traceback for logging (not for user response)
        tb_str = traceback.format_exc()
        
        error_data = {
            "error": "Internal Server Error",
            "status_code": 500,
            "message": "An unexpected error occurred",
            "error_id": error_id,
            "timestamp": datetime.now().isoformat(),
            "path": str(request.url),
            "method": request.method
        }
        
        # Log detailed error information
        logger.error(f"Unhandled exception {error_id} at {request.url}:")
        logger.error(f"  Type: {error_type}")
        logger.error(f"  Message: {error_message}")
        logger.error(f"  Traceback: {tb_str}")
        
        # Try to log to database if available
        try:
            await self.log_error_to_database(error_id, request, exc, tb_str)
        except Exception as log_exc:
            logger.error(f"Failed to log error to database: {log_exc}")
        
        return JSONResponse(
            status_code=500,
            content=error_data
        )
    
    async def log_error_to_database(self, error_id: str, request: Request, exception: Exception, traceback_str: str):
        """Log error to Supabase system_logs table"""
        try:
            if SUPABASE_AVAILABLE:
                supabase = get_supabase_client()

                # Prepare error log for Supabase
                error_log = {
                    "source": "api_errors",
                    "level": "ERROR",
                    "message": f"[{error_id}] {type(exception).__name__}: {str(exception)[:500]}",
                    "metadata": {
                        "error_id": error_id,
                        "request_method": request.method,
                        "request_url": str(request.url),
                        "request_headers": filter_sensitive_headers(dict(request.headers)),
                        "error_type": type(exception).__name__,
                        "traceback": traceback_str[:2000],  # Limit traceback size
                        "user_agent": request.headers.get("user-agent"),
                        "client_ip": request.client.host if request.client else None
                    },
                    "created_at": datetime.now(timezone.utc).isoformat()
                }

                # Save to system_logs table
                result = supabase.table('system_logs').insert(error_log).execute()
                logger.info(f"Error {error_id} logged to Supabase")

            else:
                # Fallback to local logging if Supabase not available
                error_log = {
                    "error_id": error_id,
                    "timestamp": datetime.now().isoformat(),
                    "request_method": request.method,
                    "request_url": str(request.url),
                    "request_headers": filter_sensitive_headers(dict(request.headers)),
                    "error_type": type(exception).__name__,
                    "error_message": str(exception),
                    "traceback": traceback_str[:1000],
                    "user_agent": request.headers.get("user-agent"),
                    "client_ip": request.client.host if request.client else None
                }
                logger.info(f"Structured error log (Supabase unavailable): {json.dumps(error_log, indent=2)}")

        except Exception as e:
            logger.error(f"Failed to log error to database: {e}")

class CustomExceptionHandler:
    """
    Custom exception handlers for specific error types
    """
    
    @staticmethod
    def database_error_handler(request: Request, exc: Exception) -> JSONResponse:
        """Handle database connection errors"""
        logger.error(f"Database error at {request.url}: {exc}")

        # Use configuration for retry time if available
        retry_seconds = 30
        if SUPABASE_AVAILABLE:
            try:
                config = get_scraper_config()
                retry_seconds = config.request_timeout
            except Exception:
                pass

        return JSONResponse(
            status_code=503,
            content={
                "error": "Service Unavailable",
                "message": "Database connection error. Please try again later.",
                "status_code": 503,
                "timestamp": datetime.now().isoformat(),
                "path": str(request.url),
                "method": request.method,
                "retry_after": f"{retry_seconds} seconds"
            },
            headers={
                "Retry-After": str(retry_seconds)
            }
        )
    
    @staticmethod
    def external_api_error_handler(request: Request, exc: Exception) -> JSONResponse:
        """Handle external API errors (OpenAI, Reddit, etc.)"""
        logger.error(f"External API error at {request.url}: {exc}")
        
        return JSONResponse(
            status_code=502,
            content={
                "error": "Bad Gateway",
                "message": "External service error. Please try again later.",
                "status_code": 502,
                "timestamp": datetime.now().isoformat(),
                "path": str(request.url),
                "method": request.method
            }
        )

def add_error_handlers(app):
    """
    Add custom error handlers to the FastAPI app
    """

    # Add middleware
    app.add_middleware(ErrorHandlingMiddleware)

    # Create handler instance
    custom_handler = CustomExceptionHandler()

    # Register combined exception handler for specific error types
    @app.exception_handler(Exception)
    async def handle_specific_exceptions(request: Request, exc: Exception):
        """Handle specific types of exceptions before generic handling"""
        error_msg = str(exc).lower()

        # Check for database errors first (higher priority)
        if any(term in error_msg for term in ['supabase', 'database', 'connection', 'postgrest']):
            return custom_handler.database_error_handler(request, exc)

        # Check for external API errors
        if any(term in error_msg for term in ['openai', 'reddit', 'api error', 'external']):
            return custom_handler.external_api_error_handler(request, exc)

        # Let other exceptions be handled by the middleware
        raise exc

    # Rate limiting has been disabled (Redis removed)

    # Add specific exception handlers
    @app.exception_handler(404)
    async def not_found_handler(request: Request, exc: HTTPException):
        return JSONResponse(
            status_code=404,
            content={
                "error": "Not Found",
                "message": "The requested resource was not found",
                "status_code": 404,
                "timestamp": datetime.now().isoformat(),
                "path": str(request.url),
                "method": request.method,
                "available_endpoints": [
                    # Health & monitoring
                    "/", "/health", "/ready", "/alive", "/metrics",
                    "/api/stats",
                    # Reddit scraper
                    "/api/scraper/start", "/api/scraper/stop", "/api/scraper/status",
                    "/api/scraper/status-detailed", "/api/scraper/cycle-status",
                    # Instagram scraper
                    "/api/instagram/scraper/start", "/api/instagram/scraper/stop",
                    "/api/instagram/scraper/status", "/api/instagram/scraper/cycle-status",
                    # Categorization
                    "/api/categorization/start", "/api/categorization/stats",
                    # User discovery
                    "/api/users/discover",
                    # Single subreddit fetch
                    "/api/subreddits/fetch-single",
                    # Background jobs
                    "/api/jobs/start", "/api/jobs/{job_id}"
                ]
            }
        )
    
    @app.exception_handler(405)
    async def method_not_allowed_handler(request: Request, exc: HTTPException):
        return JSONResponse(
            status_code=405,
            content={
                "error": "Method Not Allowed",
                "message": f"Method {request.method} is not allowed for this endpoint",
                "status_code": 405,
                "timestamp": datetime.now().isoformat(),
                "path": str(request.url),
                "method": request.method,
                "allowed_methods": ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"]
            }
        )
    
    return app

# Utility functions for error handling

def create_error_response(
    status_code: int,
    message: str,
    error_type: str = "Error",
    details: Optional[Dict[str, Any]] = None,
    request: Optional[Request] = None
) -> JSONResponse:
    """Create a standardized error response"""
    
    error_data = {
        "error": error_type,
        "status_code": status_code,
        "message": message,
        "timestamp": datetime.now().isoformat()
    }
    
    if details:
        error_data["details"] = details
    
    if request:
        error_data["path"] = str(request.url)
        error_data["method"] = request.method
    
    return JSONResponse(
        status_code=status_code,
        content=error_data
    )

def log_and_raise_error(
    message: str,
    status_code: int = 500,
    error_type: str = "InternalError",
    details: Optional[Dict[str, Any]] = None,
    log_level: str = "error"
) -> None:
    """Log an error and raise HTTP exception"""
    
    log_message = f"{error_type}: {message}"
    if details:
        log_message += f" Details: {details}"
    
    # Log based on level
    if log_level == "error":
        logger.error(log_message)
    elif log_level == "warning":
        logger.warning(log_message)
    else:
        logger.info(log_message)
    
    # Raise HTTP exception
    raise HTTPException(
        status_code=status_code,
        detail={
            "message": message,
            "error_type": error_type,
            "details": details
        }
    )