"""
Supabase Log Handler for Reddit Scraper
Buffers log messages and batch writes them to system_logs table
"""
import logging
import time
from datetime import datetime, timezone
from typing import Optional


class SupabaseLogHandler(logging.Handler):
    """Custom logging handler that sends logs to system_logs table"""

    def __init__(self, supabase_client, source: str = 'reddit_scraper',
                 buffer_size: int = 5, flush_interval: int = 30):
        """
        Initialize the Supabase log handler.

        Args:
            supabase_client: Initialized Supabase client
            source: Source identifier for logs
            buffer_size: Number of logs to buffer before flushing
            flush_interval: Seconds between automatic flushes
        """
        super().__init__()
        self.supabase = supabase_client
        self.source = source
        self.log_buffer = []
        self.buffer_size = buffer_size
        self.last_flush = time.time()
        self.flush_interval = flush_interval

    def emit(self, record: logging.LogRecord):
        """Handle a logging record by adding it to buffer"""
        if not self.supabase:
            return

        try:
            # Format the log message
            message = self.format(record)

            # Create context with additional info
            context = {
                'module': getattr(record, 'module', record.name),
                'function': getattr(record, 'funcName', None),
                'line': getattr(record, 'lineno', None),
                'thread': getattr(record, 'thread', None)
            }

            # Add any extra fields from the record
            if hasattr(record, 'subreddit'):
                context['subreddit'] = record.subreddit
            if hasattr(record, 'user'):
                context['user'] = record.user
            if hasattr(record, 'account'):
                context['account'] = record.account
            if hasattr(record, 'operation'):
                context['operation'] = record.operation
            if hasattr(record, 'thread_id'):
                context['thread_id'] = record.thread_id

            log_entry = {
                'timestamp': datetime.fromtimestamp(record.created, timezone.utc).isoformat(),
                'source': self.source,
                'script_name': 'reddit_scraper',
                'level': record.levelname.lower(),
                'message': message[:1000],  # Truncate long messages
                'context': context
            }

            self.log_buffer.append(log_entry)

            # Flush if buffer is full or enough time has passed
            if len(self.log_buffer) >= self.buffer_size or \
               (time.time() - self.last_flush) > self.flush_interval:
                self.flush()

        except Exception as e:
            # Don't let logging errors break the application
            print(f"Error in SupabaseLogHandler.emit: {e}")

    def flush(self):
        """Flush the log buffer to Supabase"""
        if not self.log_buffer or not self.supabase:
            return

        try:
            # Insert logs in batch
            response = self.supabase.table('system_logs').insert(self.log_buffer).execute()

            if hasattr(response, 'error') and response.error:
                print(f"Error flushing logs to Supabase: {response.error}")
            else:
                # Clear buffer on successful flush
                self.log_buffer = []
                self.last_flush = time.time()

        except Exception as e:
            print(f"Exception flushing logs to Supabase: {e}")
            # Keep buffer for next attempt

    def close(self):
        """Close the handler and flush any remaining logs"""
        self.flush()
        super().close()


def setup_supabase_logging(supabase_client, logger_name: Optional[str] = None,
                          level: int = logging.INFO) -> logging.Logger:
    """
    Set up a logger with Supabase handler.

    Args:
        supabase_client: Initialized Supabase client
        logger_name: Name of the logger (None for root logger)
        level: Logging level

    Returns:
        Configured logger instance
    """
    logger = logging.getLogger(logger_name)

    # Check if Supabase handler already exists
    has_supabase_handler = any(
        isinstance(handler, SupabaseLogHandler)
        for handler in logger.handlers
    )

    if not has_supabase_handler:
        # Create and add the Supabase handler
        supabase_handler = SupabaseLogHandler(supabase_client)
        supabase_handler.setLevel(level)

        # Create formatter
        formatter = logging.Formatter(
            '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
        )
        supabase_handler.setFormatter(formatter)

        # Add handler to logger
        logger.addHandler(supabase_handler)
        logger.setLevel(level)

    return logger