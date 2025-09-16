"""
Background tasks module for B9 Dashboard API
Contains task handlers for long-running operations
"""

from .instagram_scraper_task import (
    start_instagram_scraper,
    stop_instagram_scraper,
    get_scraper_status,
    start_scraper_async,
    stop_scraper_async,
    get_status_async,
    get_scraper_instance,
    is_scraper_running
)

__all__ = [
    'start_instagram_scraper',
    'stop_instagram_scraper',
    'get_scraper_status',
    'start_scraper_async',
    'stop_scraper_async',
    'get_status_async',
    'get_scraper_instance',
    'is_scraper_running'
]