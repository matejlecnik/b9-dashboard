"""
Log Handlers
Handlers for different logging destinations (Supabase, File, Console)
"""

import logging
import os
from datetime import datetime
from logging.handlers import RotatingFileHandler
from typing import Any, Optional

from app.logging.config import config
from app.logging.formatters import JSONFormatter, StandardFormatter, format_for_supabase


class SupabaseHandler(logging.Handler):
    """
    Custom handler for logging to Supabase
    Batches logs and writes asynchronously to prevent blocking
    """

    def __init__(self, supabase_client=None, table_name: str = "logs"):
        super().__init__()
        self.supabase = supabase_client
        self.table_name = table_name
        self.batch: list[dict[str, Any]] = []
        self.batch_size = config.supabase_batch_size
        self.last_flush = datetime.now()

    def emit(self, record: logging.LogRecord):
        """Add log record to batch and flush if needed"""
        if not self.supabase:
            return

        try:
            # Format for Supabase
            log_data = format_for_supabase(
                level=record.levelname,
                message=record.getMessage(),
                source=getattr(record, "source", "api"),
                script_name=getattr(record, "script_name", record.name),
                action=getattr(record, "action", None),
                context=getattr(record, "context", None),
                duration_ms=getattr(record, "duration_ms", None),
            )

            self.batch.append(log_data)

            # Flush if batch is full
            if len(self.batch) >= self.batch_size:
                self.flush()

        except Exception:
            # Don't let logging errors crash the app
            self.handleError(record)

    def flush(self):
        """Write batched logs to Supabase"""
        if not self.batch or not self.supabase:
            return

        try:
            self.supabase.table(self.table_name).insert(self.batch).execute()
            self.batch = []
            self.last_flush = datetime.now()
        except Exception:
            # Silent fail - logging should never crash the app
            pass


def setup_console_handler(use_json: bool = False) -> logging.Handler:
    """Create and configure console handler"""
    handler = logging.StreamHandler()
    handler.setLevel(logging.DEBUG)

    if use_json:
        handler.setFormatter(JSONFormatter())
    else:
        handler.setFormatter(StandardFormatter())

    return handler


def setup_file_handler(
    log_file: str, max_bytes: int = 10 * 1024 * 1024, backup_count: int = 5
) -> Optional[logging.Handler]:
    """Create and configure rotating file handler"""
    try:
        # Ensure log directory exists
        log_dir = os.path.dirname(log_file)
        if log_dir and not os.path.exists(log_dir):
            os.makedirs(log_dir, exist_ok=True)

        handler = RotatingFileHandler(log_file, maxBytes=max_bytes, backupCount=backup_count)
        handler.setLevel(logging.DEBUG)
        handler.setFormatter(StandardFormatter())

        return handler

    except Exception as e:
        # If file logging fails, continue without it
        import sys

        sys.stderr.write(f"Warning: Could not setup file logging: {e}\n")
        return None


def setup_supabase_handler(supabase_client) -> Optional[SupabaseHandler]:
    """Create and configure Supabase handler"""
    if not config.supabase_logging_enabled or not supabase_client:
        return None

    handler = SupabaseHandler(supabase_client, config.supabase_table)
    handler.setLevel(logging.INFO)  # Only log INFO and above to Supabase

    return handler
