#!/usr/bin/env python3
"""
B9 Dashboard API - Middleware Package
Production-ready middleware for logging, security, and monitoring
"""

from app.middleware.monitoring import configure_middleware


__all__ = ["configure_middleware"]
