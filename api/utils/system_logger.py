#!/usr/bin/env python3
"""
Centralized System Logger for B9 Dashboard API
Handles both Python logging and Supabase system_logs persistence
"""
import os
import sys
import logging
import json
import traceback
from datetime import datetime, timezone
from typing import Dict, Optional, Any, Union
from enum import Enum
from threading import Lock
from queue import Queue, Empty
import threading
import time

from supabase import Client, create_client
from tenacity import retry, stop_after_attempt, wait_exponential


class LogLevel(Enum):
    """Standard log levels"""
    DEBUG = "debug"
    INFO = "info"
    WARNING = "warning"
    ERROR = "error"
    CRITICAL = "critical"


class SystemLogger:
    """
    Unified logger that writes to both Python logging and Supabase system_logs table
    Thread-safe with batch insertion support for performance
    """

    _instance = None
    _lock = Lock()

    def __new__(cls):
        """Singleton pattern to ensure single instance"""
        if cls._instance is None:
            with cls._lock:
                if cls._instance is None:
                    cls._instance = super().__new__(cls)
        return cls._instance

    def __init__(self):
        """Initialize the system logger"""
        if not hasattr(self, 'initialized'):
            self.initialized = False
            self.supabase = None
            self.python_logger = logging.getLogger('system')
            self.batch_queue = Queue()
            self.batch_thread = None
            self.stop_batch_thread = False
            self.batch_size = 10
            self.batch_interval = 5  # seconds

            # Try to initialize Supabase connection
            self._initialize_supabase()

            # Start batch insertion thread if Supabase is available
            if self.supabase:
                self._start_batch_thread()

            self.initialized = True

    def _initialize_supabase(self):
        """Initialize Supabase client"""
        try:
            supabase_url = os.getenv("SUPABASE_URL")
            supabase_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

            if supabase_url and supabase_key:
                self.supabase = create_client(supabase_url, supabase_key)
                self.python_logger.info("✅ SystemLogger: Supabase connection established")
            else:
                self.python_logger.warning("⚠️ SystemLogger: Supabase credentials not found, using Python logging only")
        except Exception as e:
            self.python_logger.error(f"❌ SystemLogger: Failed to initialize Supabase: {e}")
            self.supabase = None

    def _start_batch_thread(self):
        """Start background thread for batch log insertion"""
        self.stop_batch_thread = False
        self.batch_thread = threading.Thread(target=self._batch_insert_worker, daemon=True)
        self.batch_thread.start()
        self.python_logger.debug("SystemLogger: Batch insertion thread started")

    def _batch_insert_worker(self):
        """Worker thread that batches log insertions for performance"""
        batch = []
        last_insert = time.time()

        while not self.stop_batch_thread:
            try:
                # Try to get a log entry from the queue
                timeout = max(0.1, self.batch_interval - (time.time() - last_insert))
                try:
                    log_entry = self.batch_queue.get(timeout=timeout)
                    batch.append(log_entry)
                except Empty:
                    pass

                # Insert batch if size reached or interval passed
                should_insert = (
                    len(batch) >= self.batch_size or
                    (len(batch) > 0 and time.time() - last_insert >= self.batch_interval)
                )

                if should_insert and batch:
                    self._insert_batch(batch)
                    batch = []
                    last_insert = time.time()

            except Exception as e:
                self.python_logger.error(f"Batch insert worker error: {e}")
                time.sleep(1)

    @retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=1, max=10))
    def _insert_batch(self, batch: list):
        """Insert a batch of log entries to Supabase"""
        if not self.supabase or not batch:
            return

        try:
            self.supabase.table("system_logs").insert(batch).execute()
            self.python_logger.debug(f"SystemLogger: Inserted batch of {len(batch)} logs")
        except Exception as e:
            self.python_logger.error(f"Failed to insert log batch: {e}")
            # Fall back to individual inserts on batch failure
            for entry in batch:
                try:
                    self.supabase.table("system_logs").insert(entry).execute()
                except Exception as individual_error:
                    self.python_logger.error(f"Failed to insert individual log: {individual_error}")

    def log(
        self,
        level: Union[LogLevel, str],
        message: str,
        source: str,
        script_name: Optional[str] = None,
        context: Optional[Dict[str, Any]] = None,
        user_id: Optional[str] = None,
        duration_ms: Optional[int] = None,
        items_processed: Optional[int] = None,
        sync: bool = False
    ):
        """
        Log a message to both Python logging and Supabase

        Args:
            level: Log level (LogLevel enum or string)
            message: Log message
            source: Source service (e.g., 'api', 'reddit_scraper', 'instagram_scraper')
            script_name: Specific script or module name
            context: Additional context data (will be JSON serialized)
            user_id: Optional user ID for user-specific logs
            duration_ms: Optional duration in milliseconds for performance tracking
            items_processed: Optional count of items processed
            sync: If True, insert immediately instead of batching
        """
        # Convert level to string if enum
        if isinstance(level, LogLevel):
            level_str = level.value
        else:
            level_str = str(level).lower()

        # Get script name from call stack if not provided
        if not script_name:
            frame = sys._getframe(1)
            script_name = frame.f_code.co_filename.split('/')[-1].replace('.py', '')

        # Log to Python logger
        log_method = getattr(self.python_logger, level_str, self.python_logger.info)
        log_method(f"[{source}:{script_name}] {message}")

        # Prepare Supabase log entry
        log_entry = {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "source": source,
            "script_name": script_name,
            "level": level_str,
            "message": message,
            "context": context or {},
            "user_id": user_id,
            "duration_ms": duration_ms,
            "items_processed": items_processed
        }

        # Add to Supabase if available
        if self.supabase:
            if sync:
                # Immediate insertion for critical logs
                try:
                    self.supabase.table("system_logs").insert(log_entry).execute()
                except Exception as e:
                    self.python_logger.error(f"Failed to insert sync log: {e}")
            else:
                # Add to batch queue
                try:
                    self.batch_queue.put(log_entry, block=False)
                except:
                    # Queue is full, insert synchronously
                    try:
                        self.supabase.table("system_logs").insert(log_entry).execute()
                    except Exception as e:
                        self.python_logger.error(f"Failed to insert overflow log: {e}")

    def debug(self, message: str, source: str, **kwargs):
        """Log debug message"""
        self.log(LogLevel.DEBUG, message, source, **kwargs)

    def info(self, message: str, source: str, **kwargs):
        """Log info message"""
        self.log(LogLevel.INFO, message, source, **kwargs)

    def warning(self, message: str, source: str, **kwargs):
        """Log warning message"""
        self.log(LogLevel.WARNING, message, source, **kwargs)

    def error(self, message: str, source: str, **kwargs):
        """Log error message"""
        self.log(LogLevel.ERROR, message, source, **kwargs)

    def critical(self, message: str, source: str, **kwargs):
        """Log critical message"""
        self.log(LogLevel.CRITICAL, message, source, **kwargs)

    def log_exception(self, source: str, script_name: Optional[str] = None, context: Optional[Dict] = None):
        """Log current exception with traceback"""
        exc_info = sys.exc_info()
        if exc_info[0] is None:
            return

        error_context = context or {}
        error_context.update({
            "exception_type": exc_info[0].__name__,
            "exception_message": str(exc_info[1]),
            "traceback": traceback.format_exc()
        })

        self.error(
            f"Exception: {exc_info[0].__name__}: {exc_info[1]}",
            source=source,
            script_name=script_name,
            context=error_context,
            sync=True  # Exceptions should be logged immediately
        )

    def log_api_call(
        self,
        source: str,
        endpoint: str,
        method: str,
        status_code: Optional[int] = None,
        response_time_ms: Optional[int] = None,
        error: Optional[str] = None,
        **kwargs
    ):
        """Specialized method for logging API calls"""
        context = kwargs.get('context', {})
        context.update({
            "endpoint": endpoint,
            "method": method,
            "status_code": status_code,
            "response_time_ms": response_time_ms,
            "error": error
        })

        level = LogLevel.ERROR if error or (status_code and status_code >= 400) else LogLevel.INFO
        message = f"API {method} {endpoint} - {status_code or 'pending'}"
        if error:
            message += f" - Error: {error}"

        self.log(
            level=level,
            message=message,
            source=source,
            context=context,
            duration_ms=response_time_ms,
            **{k: v for k, v in kwargs.items() if k != 'context'}
        )

    def log_scraper_activity(
        self,
        source: str,
        activity: str,
        items_processed: Optional[int] = None,
        success_count: Optional[int] = None,
        failure_count: Optional[int] = None,
        **kwargs
    ):
        """Specialized method for logging scraper activities"""
        context = kwargs.get('context', {})
        context.update({
            "activity": activity,
            "success_count": success_count,
            "failure_count": failure_count
        })

        level = LogLevel.INFO
        if failure_count and success_count:
            success_rate = success_count / (success_count + failure_count)
            if success_rate < 0.5:
                level = LogLevel.WARNING

        message = f"Scraper: {activity}"
        if items_processed is not None:
            message += f" - Processed: {items_processed}"
        if success_count is not None:
            message += f" - Success: {success_count}"
        if failure_count is not None:
            message += f" - Failed: {failure_count}"

        self.log(
            level=level,
            message=message,
            source=source,
            context=context,
            items_processed=items_processed,
            **{k: v for k, v in kwargs.items() if k not in ['context', 'items_processed']}
        )

    def flush(self):
        """Force flush any pending logs in the batch queue"""
        if self.batch_queue.qsize() > 0:
            batch = []
            while not self.batch_queue.empty():
                try:
                    batch.append(self.batch_queue.get_nowait())
                except Empty:
                    break

            if batch:
                self._insert_batch(batch)

    def shutdown(self):
        """Gracefully shutdown the logger"""
        self.python_logger.info("SystemLogger: Shutting down...")

        # Stop batch thread
        self.stop_batch_thread = True
        if self.batch_thread:
            self.batch_thread.join(timeout=5)

        # Flush remaining logs
        self.flush()

        self.python_logger.info("SystemLogger: Shutdown complete")


# Global singleton instance
system_logger = SystemLogger()


# Convenience functions for direct usage
def log(level: Union[LogLevel, str], message: str, source: str, **kwargs):
    """Log a message using the global system logger"""
    system_logger.log(level, message, source, **kwargs)


def debug(message: str, source: str, **kwargs):
    """Log debug message"""
    system_logger.debug(message, source, **kwargs)


def info(message: str, source: str, **kwargs):
    """Log info message"""
    system_logger.info(message, source, **kwargs)


def warning(message: str, source: str, **kwargs):
    """Log warning message"""
    system_logger.warning(message, source, **kwargs)


def error(message: str, source: str, **kwargs):
    """Log error message"""
    system_logger.error(message, source, **kwargs)


def critical(message: str, source: str, **kwargs):
    """Log critical message"""
    system_logger.critical(message, source, **kwargs)


def log_exception(source: str, **kwargs):
    """Log current exception"""
    system_logger.log_exception(source, **kwargs)


def log_api_call(source: str, endpoint: str, method: str, **kwargs):
    """Log API call"""
    system_logger.log_api_call(source, endpoint, method, **kwargs)


def log_scraper_activity(source: str, activity: str, **kwargs):
    """Log scraper activity"""
    system_logger.log_scraper_activity(source, activity, **kwargs)


def flush():
    """Flush pending logs"""
    system_logger.flush()


def shutdown():
    """Shutdown logger"""
    system_logger.shutdown()