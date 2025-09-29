"""
Centralized Logging Helper for Dual Console + Supabase Logging
Provides consistent logging across all modules
"""
import logging
from datetime import datetime, timezone
from typing import Optional, Dict, Any

# Import Supabase
try:
    from app.core.database.supabase_client import get_supabase_client
    _supabase_client = None
except ImportError:
    _supabase_client = None

logger = logging.getLogger(__name__)


class LoggingHelper:
    """
    Helper class for dual console + Supabase logging.
    Ensures consistent logging across the application.
    """

    def __init__(self, source: str = 'reddit_scraper', script_name: str = None):
        """
        Initialize logging helper.

        Args:
            source: Log source identifier (e.g., 'reddit_scraper')
            script_name: Script/module name for context
        """
        self.source = source
        self.script_name = script_name or 'unknown'
        self.supabase = self._get_supabase_client()

    @staticmethod
    def _get_supabase_client():
        """Get or initialize the Supabase client"""
        global _supabase_client
        if _supabase_client is None:
            try:
                _supabase_client = get_supabase_client()
            except Exception as e:
                logger.warning(f"Failed to initialize Supabase client for logging: {e}")
        return _supabase_client

    def log(self,
            level: str,
            message: str,
            context: Optional[Dict[str, Any]] = None,
            action: Optional[str] = None,
            duration_ms: Optional[int] = None,
            console_log: bool = True) -> None:
        """
        Log to both console and Supabase.

        Args:
            level: Log level (info, warning, error, success)
            message: Log message
            context: Additional context data
            action: Action identifier for filtering
            duration_ms: Duration in milliseconds for performance tracking
            console_log: Whether to also log to console
        """
        # Console logging
        if console_log:
            if level == 'error':
                logger.error(message)
            elif level == 'warning':
                logger.warning(message)
            elif level == 'success':
                logger.info(f"✅ {message}")
            else:
                logger.info(message)

        # Supabase logging
        if self.supabase:
            try:
                log_entry = {
                    'timestamp': datetime.now(timezone.utc).isoformat(),
                    'source': self.source,
                    'script_name': self.script_name,
                    'level': level,
                    'message': message[:500],  # Limit message length
                }

                # Add optional fields
                if context:
                    log_entry['context'] = context
                if action:
                    log_entry['action'] = action
                if duration_ms is not None:
                    log_entry['duration_ms'] = duration_ms

                self.supabase.table('system_logs').insert(log_entry).execute()
            except Exception as e:
                # Silently fail Supabase logging to not break the application
                if console_log:
                    logger.debug(f"Failed to log to Supabase: {e}")

    def info(self, message: str, **kwargs):
        """Log info message"""
        self.log('info', message, **kwargs)

    def warning(self, message: str, **kwargs):
        """Log warning message"""
        self.log('warning', message, **kwargs)

    def error(self, message: str, **kwargs):
        """Log error message"""
        self.log('error', message, **kwargs)

    def success(self, message: str, **kwargs):
        """Log success message"""
        self.log('success', message, **kwargs)

    def metric(self, metric_name: str, value: Any, unit: str = None, **kwargs):
        """Log a metric value"""
        context = kwargs.get('context', {})
        context.update({
            'metric': metric_name,
            'value': value,
            'unit': unit
        })
        kwargs['context'] = context
        kwargs['action'] = 'metric'
        self.log('info', f"Metric: {metric_name}={value}{unit or ''}", **kwargs)