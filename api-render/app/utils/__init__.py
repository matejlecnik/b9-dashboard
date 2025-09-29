#!/usr/bin/env python3
"""
B9 Dashboard API - Utilities Package
Common utilities for monitoring and logging
"""

from .monitoring import health_monitor, HealthMonitor, HealthCheck, SystemMetrics, request_timer, get_health_monitor
from .system_logger import (
    system_logger, LogLevel,
    log, debug, info, warning, error, critical,
    log_exception, log_api_call, log_scraper_activity,
    flush, shutdown
)
# Memory monitor removed - not needed in simplified architecture
from .supabase_logger import SupabaseLogHandler, setup_supabase_logging

__all__ = [
    # Monitoring utilities
    'health_monitor',
    'HealthMonitor',
    'HealthCheck',
    'SystemMetrics',
    'request_timer',
    'get_health_monitor',

    # System logging utilities
    'system_logger',
    'LogLevel',
    'log',
    'debug',
    'info',
    'warning',
    'error',
    'critical',
    'log_exception',
    'log_api_call',
    'log_scraper_activity',
    'flush',
    'shutdown',


    # Supabase logging
    'SupabaseLogHandler',
    'setup_supabase_logging'
]