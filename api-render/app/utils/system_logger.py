"""
System logger utilities - Stub implementation
"""
import logging
from enum import Enum
from typing import Any, Dict, Optional

logger = logging.getLogger(__name__)


class LogLevel(Enum):
    """Log levels"""
    DEBUG = "debug"
    INFO = "info"
    WARNING = "warning"
    ERROR = "error"
    CRITICAL = "critical"


class SystemLogger:
    """System logger - stub implementation"""

    def __init__(self):
        self.logger = logging.getLogger("system_logger")

    def log(self, message: str, level: str = "info", **kwargs):
        """Log a message"""
        log_method = getattr(self.logger, level.lower(), self.logger.info)
        log_method(message)

    def debug(self, message: str, **kwargs):
        """Log debug message"""
        self.logger.debug(message)

    def info(self, message: str, **kwargs):
        """Log info message"""
        self.logger.info(message)

    def warning(self, message: str, **kwargs):
        """Log warning message"""
        self.logger.warning(message)

    def error(self, message: str, **kwargs):
        """Log error message"""
        self.logger.error(message)

    def critical(self, message: str, **kwargs):
        """Log critical message"""
        self.logger.critical(message)

    def flush(self):
        """Flush log buffers"""
        pass

    def shutdown(self):
        """Shutdown logger"""
        pass


# Global system logger instance
system_logger = SystemLogger()


# Convenience functions
def log(message: str, level: str = "info", **kwargs):
    """Log a message"""
    system_logger.log(message, level, **kwargs)


def debug(message: str, **kwargs):
    """Log debug message"""
    system_logger.debug(message, **kwargs)


def info(message: str, **kwargs):
    """Log info message"""
    system_logger.info(message, **kwargs)


def warning(message: str, **kwargs):
    """Log warning message"""
    system_logger.warning(message, **kwargs)


def error(message: str, **kwargs):
    """Log error message"""
    system_logger.error(message, **kwargs)


def critical(message: str, **kwargs):
    """Log critical message"""
    system_logger.critical(message, **kwargs)


def log_exception(exc: Exception, **kwargs):
    """Log an exception"""
    system_logger.error(f"Exception: {exc}", **kwargs)


def log_api_call(source: str, endpoint: str, method: str,
                 status_code: int, response_time_ms: int = 0,
                 error: Optional[str] = None):
    """Log an API call"""
    if error:
        system_logger.error(
            f"API {method} {endpoint} - {status_code} - Error: {error}"
        )
    else:
        system_logger.info(
            f"API {method} {endpoint} - {status_code} - {response_time_ms}ms"
        )


def log_scraper_activity(message: str, **kwargs):
    """Log scraper activity"""
    system_logger.info(f"Scraper: {message}", **kwargs)


def flush():
    """Flush log buffers"""
    system_logger.flush()


def shutdown():
    """Shutdown logger"""
    system_logger.shutdown()
