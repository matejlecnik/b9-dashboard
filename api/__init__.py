"""
B9 Dashboard API Package
Reddit & Instagram scraping and analytics API
"""

__version__ = "2.0.0"
__author__ = "B9 Agency"

# Make key classes available at package level for easier imports
from .core.clients.api_pool import ThreadSafeAPIPool, PublicRedditAPI
from .core.config.proxy_manager import ProxyManager
from .core.config.scraper_config import ScraperConfig, get_scraper_config
from .core.exceptions import (
    RedditScraperException, APIException, RateLimitException, 
    ProxyException, DatabaseException, ScrapingException,
    SubredditBannedException, SubredditPrivateException, UserSuspendedException,
    ValidationException, handle_api_error, validate_subreddit_name, validate_username
)
from .core.cache.cache_manager import AsyncCacheManager, CacheManager
from .core.database.batch_writer import BatchWriter
from .core.database.supabase_client import get_supabase_client, close_supabase_client, get_circuit_breaker
from .core.utils.supabase_logger import SupabaseLogHandler, setup_supabase_logging
from .core.utils.memory_monitor import MemoryMonitor, get_memory_monitor, set_memory_monitor

# Scraper classes
from .scrapers.reddit.main import RedditScraperV2
from .scrapers.reddit.scrapers.subreddit import SubredditScraper
from .scrapers.reddit.scrapers.user import UserScraper
from .scrapers.reddit.scrapers.base import BaseScraper
from .scrapers.reddit.processors.calculator import MetricsCalculator

__all__ = [
    # Core components
    'ThreadSafeAPIPool', 'PublicRedditAPI', 'ProxyManager', 
    'AsyncCacheManager', 'CacheManager', 'BatchWriter',
    'get_supabase_client', 'close_supabase_client', 'get_circuit_breaker',
    'SupabaseLogHandler', 'setup_supabase_logging',
    'MemoryMonitor', 'get_memory_monitor', 'set_memory_monitor',
    
    # Configuration and exceptions
    'ScraperConfig', 'get_scraper_config',
    'RedditScraperException', 'APIException', 'RateLimitException',
    'ProxyException', 'DatabaseException', 'ScrapingException',
    'SubredditBannedException', 'SubredditPrivateException', 'UserSuspendedException',
    'ValidationException', 'handle_api_error', 'validate_subreddit_name', 'validate_username',
    
    # Reddit scrapers
    'RedditScraperV2', 'SubredditScraper', 'UserScraper', 'BaseScraper',
    'MetricsCalculator'
]
