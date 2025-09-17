"""
Configuration module for Instagram Scraper Unified
"""
import os
from typing import Dict, Any
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

class Config:
    """Configuration class for the scraper"""

    # Supabase
    SUPABASE_URL = os.getenv("SUPABASE_URL")
    SUPABASE_KEY = os.getenv("SUPABASE_KEY")

    # RapidAPI
    RAPIDAPI_KEY = os.getenv("RAPIDAPI_KEY")
    RAPIDAPI_HOST = os.getenv("RAPIDAPI_HOST", "instagram-looter2.p.rapidapi.com")

    # Scraper Settings
    UPDATE_FREQUENCY = int(os.getenv("UPDATE_FREQUENCY", "21600"))  # 6 hours
    BATCH_SIZE = int(os.getenv("BATCH_SIZE", "100"))
    MAX_DAILY_API_CALLS = int(os.getenv("MAX_DAILY_API_CALLS", "24000"))
    MAX_MONTHLY_API_CALLS = int(os.getenv("MAX_MONTHLY_API_CALLS", "1000000"))

    # Performance
    REQUEST_TIMEOUT = int(os.getenv("REQUEST_TIMEOUT", "30"))
    RETRY_MAX_ATTEMPTS = int(os.getenv("RETRY_MAX_ATTEMPTS", "5"))
    RETRY_WAIT_MIN = float(os.getenv("RETRY_WAIT_MIN", "1"))
    RETRY_WAIT_MAX = float(os.getenv("RETRY_WAIT_MAX", "10"))
    RATE_LIMIT_DELAY = float(os.getenv("RATE_LIMIT_DELAY", "0.05"))

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
    POSTS_ENDPOINT = f"https://{RAPIDAPI_HOST}/user-feeds"  # Fixed endpoint
    PROFILE_ENDPOINT = f"https://{RAPIDAPI_HOST}/profile"

    @classmethod
    def validate(cls) -> bool:
        """Validate required configuration"""
        required = [
            cls.SUPABASE_URL,
            cls.SUPABASE_KEY,
            cls.RAPIDAPI_KEY
        ]

        missing = [var for var in required if not var]
        if missing:
            raise ValueError(f"Missing required configuration: {missing}")

        return True

    @classmethod
    def get_headers(cls) -> Dict[str, str]:
        """Get API headers for RapidAPI"""
        return {
            "x-rapidapi-key": cls.RAPIDAPI_KEY,
            "x-rapidapi-host": cls.RAPIDAPI_HOST,
            "accept": "application/json",
            "user-agent": "IGScraperUnified/1.0"
        }

    @classmethod
    def get_cost_per_request(cls) -> float:
        """Calculate cost per API request based on plan"""
        # $200 for 1M requests
        return 200 / 1_000_000

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
            "dry_run": cls.DRY_RUN
        }