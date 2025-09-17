"""
Configuration module for Instagram Scraper - High Performance Version
"""
import os
from typing import Dict, Any
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

class Config:
    """Configuration class for the Instagram scraper"""

    # Supabase
    SUPABASE_URL = os.getenv("SUPABASE_URL")
    SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY") or os.getenv("SUPABASE_KEY")

    # RapidAPI
    RAPIDAPI_KEY = os.getenv("RAPIDAPI_KEY")
    RAPIDAPI_HOST = os.getenv("RAPIDAPI_HOST", "instagram-looter2.p.rapidapi.com")

    # Performance Settings for 60 req/sec
    MAX_WORKERS = int(os.getenv("INSTAGRAM_MAX_WORKERS", "20"))  # Concurrent threads
    REQUESTS_PER_SECOND = int(os.getenv("INSTAGRAM_REQUESTS_PER_SECOND", "55"))  # Stay under 60 limit
    RATE_LIMIT_DELAY = 1.0 / REQUESTS_PER_SECOND  # Calculate delay between requests

    # Batch Processing
    BATCH_SIZE = int(os.getenv("INSTAGRAM_BATCH_SIZE", "100"))  # Process 100 creators per batch
    CONCURRENT_CREATORS = int(os.getenv("INSTAGRAM_CONCURRENT_CREATORS", "10"))  # Process 10 creators simultaneously

    # Connection Pooling
    CONNECTION_POOL_SIZE = int(os.getenv("INSTAGRAM_CONNECTION_POOL_SIZE", "50"))
    CONNECTION_MAX_RETRIES = int(os.getenv("INSTAGRAM_CONNECTION_MAX_RETRIES", "3"))
    CONNECTION_TIMEOUT = int(os.getenv("INSTAGRAM_CONNECTION_TIMEOUT", "30"))

    # Scraper Settings
    UPDATE_FREQUENCY = int(os.getenv("UPDATE_FREQUENCY", "21600"))  # 6 hours
    MAX_DAILY_API_CALLS = int(os.getenv("MAX_DAILY_API_CALLS", "24000"))
    MAX_MONTHLY_API_CALLS = int(os.getenv("MAX_MONTHLY_API_CALLS", "1000000"))

    # Retry Settings
    REQUEST_TIMEOUT = int(os.getenv("REQUEST_TIMEOUT", "30"))
    RETRY_MAX_ATTEMPTS = int(os.getenv("RETRY_MAX_ATTEMPTS", "5"))
    RETRY_WAIT_MIN = float(os.getenv("RETRY_WAIT_MIN", "1"))
    RETRY_WAIT_MAX = float(os.getenv("RETRY_WAIT_MAX", "10"))

    # Features
    ENABLE_VIRAL_DETECTION = os.getenv("ENABLE_VIRAL_DETECTION", "true").lower() == "true"
    VIRAL_MIN_VIEWS = int(os.getenv("VIRAL_MIN_VIEWS", "50000"))
    VIRAL_MULTIPLIER = float(os.getenv("VIRAL_MULTIPLIER", "5.0"))
    ENABLE_ANALYTICS = os.getenv("ENABLE_ANALYTICS", "true").lower() == "true"
    ENABLE_COST_TRACKING = os.getenv("ENABLE_COST_TRACKING", "true").lower() == "true"

    # Monitoring
    LOG_LEVEL = os.getenv("LOG_LEVEL", "INFO")
    ENABLE_SUPABASE_LOGGING = os.getenv("ENABLE_SUPABASE_LOGGING", "true").lower() == "true"
    ENABLE_WEBHOOK_NOTIFICATIONS = os.getenv("ENABLE_WEBHOOK_NOTIFICATIONS", "false").lower() == "true"
    WEBHOOK_URL = os.getenv("WEBHOOK_URL", "")

    # Redis (optional)
    REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379")
    USE_REDIS_QUEUE = os.getenv("USE_REDIS_QUEUE", "false").lower() == "true"

    # Development
    DRY_RUN = os.getenv("DRY_RUN", "false").lower() == "true"
    TEST_LIMIT = int(os.getenv("TEST_LIMIT", "10"))

    # Content Fetching Strategy
    NEW_CREATOR_REELS_COUNT = 90
    NEW_CREATOR_POSTS_COUNT = 30
    EXISTING_CREATOR_REELS_COUNT = 30
    EXISTING_CREATOR_POSTS_COUNT = 10

    # API Endpoints
    REELS_ENDPOINT = f"https://{RAPIDAPI_HOST}/reels"
    POSTS_ENDPOINT = f"https://{RAPIDAPI_HOST}/user-feeds"
    PROFILE_ENDPOINT = f"https://{RAPIDAPI_HOST}/profile"

    @classmethod
    def validate(cls) -> bool:
        """Validate required configuration"""
        required_vars = {
            "SUPABASE_URL": cls.SUPABASE_URL,
            "SUPABASE_KEY": cls.SUPABASE_KEY,
            "RAPIDAPI_KEY": cls.RAPIDAPI_KEY
        }

        missing = [name for name, value in required_vars.items() if not value]
        if missing:
            # Also log the actual values for debugging
            import logging
            logger = logging.getLogger(__name__)
            logger.error(f"Missing environment variables: {missing}")
            for name, value in required_vars.items():
                logger.error(f"  {name}: {'SET' if value else 'MISSING'}")
            raise ValueError(f"Missing required configuration: {missing}")

        return True

    @classmethod
    def get_headers(cls) -> Dict[str, str]:
        """Get API headers for RapidAPI"""
        return {
            "x-rapidapi-key": cls.RAPIDAPI_KEY,
            "x-rapidapi-host": cls.RAPIDAPI_HOST,
            "accept": "application/json",
            "user-agent": "IGScraperUnified/2.0"
        }

    @classmethod
    def get_cost_per_request(cls) -> float:
        """Calculate cost per API request based on plan"""
        # $75 for 250k requests
        return 75 / 250_000

    @classmethod
    def to_dict(cls) -> Dict[str, Any]:
        """Export configuration as dictionary"""
        return {
            "batch_size": cls.BATCH_SIZE,
            "update_frequency": cls.UPDATE_FREQUENCY,
            "max_daily_calls": cls.MAX_DAILY_API_CALLS,
            "max_monthly_calls": cls.MAX_MONTHLY_API_CALLS,
            "viral_detection": cls.ENABLE_VIRAL_DETECTION,
            "viral_threshold": cls.VIRAL_MIN_VIEWS,
            "viral_multiplier": cls.VIRAL_MULTIPLIER,
            "analytics_enabled": cls.ENABLE_ANALYTICS,
            "cost_tracking": cls.ENABLE_COST_TRACKING,
            "dry_run": cls.DRY_RUN,
            "max_workers": cls.MAX_WORKERS,
            "requests_per_second": cls.REQUESTS_PER_SECOND,
            "concurrent_creators": cls.CONCURRENT_CREATORS
        }