"""
Unified Logger - Core logging implementation
Consolidates SystemLogger, LoggingHelper, and SupabaseLogHandler into one interface
"""

import logging
from functools import lru_cache
from typing import Any, Dict, Optional

from app.logging.config import config
from app.logging.handlers import setup_console_handler, setup_file_handler, setup_supabase_handler


class UnifiedLogger:
    """
    Unified logging class that consolidates all logging functionality

    Features:
    - Console logging (stdout/stderr)
    - File logging (rotating files)
    - Supabase logging (database persistence)
    - Structured logging with context
    - Async-safe batching
    """

    def __init__(
        self,
        name: str,
        supabase_client=None,
        source: str = "api",
        script_name: Optional[str] = None
    ):
        """
        Initialize unified logger

        Args:
            name: Logger name (usually __name__)
            supabase_client: Optional Supabase client for database logging
            source: Source identifier (api, scraper, etc.)
            script_name: Script name for better tracking
        """
        self.name = name
        self.source = source
        self.script_name = script_name or name
        self.logger = logging.getLogger(name)
        self.logger.setLevel(getattr(logging, config.log_level))

        # Prevent duplicate handlers
        if not self.logger.handlers:
            self._setup_handlers(supabase_client)

    def _setup_handlers(self, supabase_client):
        """Setup all logging handlers"""

        # Console handler
        if config.console_logging_enabled:
            console_handler = setup_console_handler(
                use_json=(config.console_format == "json")
            )
            self.logger.addHandler(console_handler)

        # File handler
        if config.file_logging_enabled:
            file_handler = setup_file_handler(
                log_file=config.log_file,
                max_bytes=config.max_file_size,
                backup_count=config.backup_count
            )
            if file_handler:
                self.logger.addHandler(file_handler)

        # Supabase handler
        if config.supabase_logging_enabled and supabase_client:
            supabase_handler = setup_supabase_handler(supabase_client)
            if supabase_handler:
                self.logger.addHandler(supabase_handler)

    def _add_context(self, extra: Dict[str, Any]) -> Dict[str, Any]:
        """Add default context to log extra data"""
        if extra is None:
            extra = {}

        if 'source' not in extra:
            extra['source'] = self.source

        if 'script_name' not in extra:
            extra['script_name'] = self.script_name

        return extra

    def debug(
        self,
        message: str,
        context: Optional[Dict[str, Any]] = None,
        action: Optional[str] = None,
        **kwargs
    ):
        """Log debug message"""
        extra = self._add_context({'context': context, 'action': action})
        self.logger.debug(message, extra=extra, **kwargs)

    def info(
        self,
        message: str,
        context: Optional[Dict[str, Any]] = None,
        action: Optional[str] = None,
        duration_ms: Optional[int] = None,
        **kwargs
    ):
        """Log info message"""
        extra = self._add_context({
            'context': context,
            'action': action,
            'duration_ms': duration_ms
        })
        self.logger.info(message, extra=extra, **kwargs)

    def warning(
        self,
        message: str,
        context: Optional[Dict[str, Any]] = None,
        action: Optional[str] = None,
        **kwargs
    ):
        """Log warning message"""
        extra = self._add_context({'context': context, 'action': action})
        self.logger.warning(message, extra=extra, **kwargs)

    def error(
        self,
        message: str,
        context: Optional[Dict[str, Any]] = None,
        action: Optional[str] = None,
        exc_info: bool = False,
        **kwargs
    ):
        """Log error message"""
        extra = self._add_context({'context': context, 'action': action})
        self.logger.error(message, extra=extra, exc_info=exc_info, **kwargs)

    def critical(
        self,
        message: str,
        context: Optional[Dict[str, Any]] = None,
        action: Optional[str] = None,
        exc_info: bool = False,
        **kwargs
    ):
        """Log critical message"""
        extra = self._add_context({'context': context, 'action': action})
        self.logger.critical(message, extra=extra, exc_info=exc_info, **kwargs)

    def exception(
        self,
        message: str,
        context: Optional[Dict[str, Any]] = None,
        **kwargs
    ):
        """Log exception with traceback"""
        extra = self._add_context({'context': context})
        self.logger.exception(message, extra=extra, **kwargs)

    def flush(self):
        """Flush all handlers"""
        for handler in self.logger.handlers:
            handler.flush()


# Global logger cache
_logger_cache: Dict[str, UnifiedLogger] = {}


@lru_cache(maxsize=None)
def get_logger(
    name: str,
    supabase_client=None,
    source: str = "api",
    script_name: Optional[str] = None
) -> UnifiedLogger:
    """
    Get or create a logger instance

    Args:
        name: Logger name (usually __name__)
        supabase_client: Optional Supabase client
        source: Source identifier
        script_name: Optional script name

    Returns:
        UnifiedLogger instance
    """
    cache_key = f"{name}:{source}:{script_name}"

    if cache_key not in _logger_cache:
        _logger_cache[cache_key] = UnifiedLogger(
            name=name,
            supabase_client=supabase_client,
            source=source,
            script_name=script_name
        )

    return _logger_cache[cache_key]
