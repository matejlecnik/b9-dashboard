"""
Log Formatters
Standardized log formatting for console, file, and Supabase
"""

import logging
import json
from datetime import datetime
from typing import Dict, Any


class StandardFormatter(logging.Formatter):
    """Standard text-based log formatter"""

    def __init__(self):
        super().__init__(
            fmt='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
            datefmt='%Y-%m-%d %H:%M:%S'
        )


class JSONFormatter(logging.Formatter):
    """JSON-based log formatter for structured logging"""

    def format(self, record: logging.LogRecord) -> str:
        """Format log record as JSON"""
        log_data = {
            'timestamp': datetime.utcnow().isoformat(),
            'level': record.levelname,
            'logger': record.name,
            'message': record.getMessage(),
            'module': record.module,
            'function': record.funcName,
            'line': record.lineno,
        }

        # Add extra context if available
        if hasattr(record, 'context'):
            log_data['context'] = record.context

        if hasattr(record, 'source'):
            log_data['source'] = record.source

        if hasattr(record, 'script_name'):
            log_data['script_name'] = record.script_name

        if hasattr(record, 'action'):
            log_data['action'] = record.action

        if hasattr(record, 'duration_ms'):
            log_data['duration_ms'] = record.duration_ms

        # Add exception info if present
        if record.exc_info:
            log_data['exception'] = self.formatException(record.exc_info)

        return json.dumps(log_data)


def format_for_supabase(
    level: str,
    message: str,
    source: str = None,
    script_name: str = None,
    action: str = None,
    context: Dict[str, Any] = None,
    duration_ms: int = None
) -> Dict[str, Any]:
    """Format log data for Supabase insertion"""
    log_entry = {
        'timestamp': datetime.utcnow().isoformat(),
        'level': level.lower(),
        'message': message,
        'source': source or 'api',
        'script_name': script_name or 'unknown',
    }

    if action:
        log_entry['action'] = action

    if context:
        log_entry['context'] = context

    if duration_ms is not None:
        log_entry['duration_ms'] = duration_ms

    return log_entry
