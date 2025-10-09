"""
Central Configuration Module
All application settings in one place
"""

import os
from dataclasses import dataclass
from typing import Any, Dict, Optional

from dotenv import load_dotenv


# Load environment variables
load_dotenv()


@dataclass
class DatabaseConfig:
    """Database configuration"""

    url: str
    max_connections: int = 20
    min_connections: int = 5
    connection_timeout: int = 30
    command_timeout: int = 30
    pool_recycle: int = 3600


@dataclass
class ScraperConfig:
    """Scraper configuration"""

    reddit_enabled: bool = True
    instagram_enabled: bool = True
    reddit_batch_size: int = 100
    instagram_batch_size: int = 50
    reddit_rate_limit: int = 60  # requests per minute
    instagram_rate_limit: int = 200  # requests per hour
    max_workers: int = 10
    retry_attempts: int = 3
    retry_delay: int = 5


@dataclass
class APIConfig:
    """API configuration"""

    title: str = "B9 Dashboard API"
    version: str = "3.7.0"
    description: str = "Backend API for B9 Dashboard"
    host: str = "0.0.0.0"
    port: int = 8000
    workers: int = 4
    cors_origins: Optional[list] = None
    debug: bool = False


@dataclass
class CacheConfig:
    """Cache configuration"""

    enabled: bool = True
    ttl: int = 300  # 5 minutes
    max_size: int = 1000
    eviction_policy: str = "LRU"


@dataclass
class MonitoringConfig:
    """Monitoring configuration"""

    enabled: bool = True
    log_level: str = "INFO"
    log_file: str = "logs/app.log"
    metrics_enabled: bool = True
    health_check_interval: int = 60
    memory_threshold_mb: int = 1500


@dataclass
class HetznerServerConfig:
    """Hetzner CPX31 optimized server configuration"""

    # Worker Configuration (for Gunicorn)
    workers: int = 8  # (4 CPUs x 2) + 1 = 9, capped at 8 for stability
    max_workers: int = 8  # Maximum workers allowed
    worker_timeout: int = 120  # Worker timeout in seconds (2 minutes)
    graceful_timeout: int = 30  # Graceful shutdown timeout in seconds

    # Connection Limits
    max_connections: int = 1000  # Maximum concurrent connections per worker
    max_keepalive_connections: int = 100  # Keep-alive connection pool size
    keepalive_timeout: int = 5  # Keep-alive timeout in seconds

    # Request Limits
    max_request_size: int = 10 * 1024 * 1024  # 10MB max request body
    max_upload_size: int = 50 * 1024 * 1024  # 50MB max file upload
    max_requests_per_worker: int = 1000  # Restart worker after N requests
    max_requests_jitter: int = 100  # Add randomness to prevent thundering herd

    # Database Connection Pool (Supabase)
    db_pool_size: int = 20  # Connections per worker
    db_max_overflow: int = 10  # Extra connections if pool is full
    db_pool_timeout: int = 30  # Timeout for getting connection from pool

    # Timeouts
    request_timeout: int = 120  # General request timeout
    connection_timeout: int = 10  # Connection establishment timeout

    # Memory Limits (per worker)
    worker_memory_limit_mb: int = 800  # 800MB per worker (8 workers = 6.4GB)
    total_memory_limit_mb: int = 7500  # Total memory limit (leave 500MB for system)

    # Performance
    preload_app: bool = False  # Preload app before forking workers (can reduce memory)
    worker_class: str = "uvicorn.workers.UvicornWorker"  # Worker class for async support

    # Security
    limit_request_line: int = 8190  # Max HTTP request line size
    limit_request_fields: int = 100  # Max number of HTTP headers
    limit_request_field_size: int = 8190  # Max HTTP header field size

    @classmethod
    def from_env(cls) -> "HetznerServerConfig":
        """Create configuration from environment variables"""
        import multiprocessing

        cpus = multiprocessing.cpu_count()
        workers = int(os.getenv("WORKERS", (cpus * 2) + 1))
        workers = min(workers, int(os.getenv("MAX_WORKERS", 8)))

        return cls(
            workers=workers,
            max_workers=int(os.getenv("MAX_WORKERS", 8)),
            worker_timeout=int(os.getenv("WORKER_TIMEOUT", 120)),
            graceful_timeout=int(os.getenv("GRACEFUL_TIMEOUT", 30)),
        )


@dataclass
class InstagramScraperConfig:
    """Instagram scraper configuration"""

    # RapidAPI
    rapidapi_key: str
    rapidapi_host: str = "instagram-looter2.p.rapidapi.com"

    # Performance Settings
    max_workers: int = 10
    requests_per_second: int = 55
    concurrent_creators: int = 10  # v3.12.0: Tested 20 (0.86/min) vs 10 (0.90/min) - 10 is optimal

    # Batch Processing
    batch_size: int = 50
    update_frequency: int = 10800  # 3 hours

    # Connection Pooling
    connection_pool_size: int = 20
    connection_max_retries: int = 3
    connection_timeout: int = 30

    # Retry Settings
    request_timeout: int = 30
    retry_max_attempts: int = 3
    retry_wait_min: float = 2.0
    retry_wait_max: float = 10.0
    retry_empty_response: int = 1

    # Features
    enable_viral_detection: bool = True
    viral_min_views: int = 50000
    viral_multiplier: float = 5.0
    enable_analytics: bool = True
    enable_cost_tracking: bool = True

    # Monitoring
    enable_supabase_logging: bool = True
    enable_webhook_notifications: bool = False
    webhook_url: str = ""

    # Development
    dry_run: bool = False
    test_limit: int = 10

    # Content Fetching Strategy
    new_creator_reels_count: int = 90
    new_creator_posts_count: int = 30
    existing_creator_reels_count: int = 30
    existing_creator_posts_count: int = 10

    @property
    def rate_limit_delay(self) -> float:
        """Calculate delay between requests"""
        return 1.0 / self.requests_per_second

    @property
    def reels_endpoint(self) -> str:
        """Get reels API endpoint"""
        return f"https://{self.rapidapi_host}/reels"

    @property
    def posts_endpoint(self) -> str:
        """Get posts API endpoint"""
        return f"https://{self.rapidapi_host}/user-feeds"

    @property
    def profile_endpoint(self) -> str:
        """Get profile API endpoint"""
        return f"https://{self.rapidapi_host}/profile"

    def get_headers(self) -> Dict[str, str]:
        """Get API headers for RapidAPI"""
        return {
            "x-rapidapi-key": self.rapidapi_key,
            "x-rapidapi-host": self.rapidapi_host,
            "accept": "application/json",
            "user-agent": "IGScraperUnified/2.0",
        }

    def get_cost_per_request(self) -> float:
        """Calculate cost per API request based on plan ($75 for 250k requests)"""
        return 75 / 250_000


@dataclass
class ExternalServicesConfig:
    """External services configuration"""

    openai_api_key: str
    supabase_url: str
    supabase_service_key: str
    render_api_key: Optional[str] = None

    # R2 Storage (Cloudflare)
    r2_account_id: str = ""
    r2_access_key_id: str = ""
    r2_secret_access_key: str = ""
    r2_bucket_name: str = ""
    r2_public_url: str = ""


class Config:
    """Main configuration class"""

    def __init__(self):
        self.env = os.getenv("ENVIRONMENT", "development")
        self.is_production = self.env == "production"
        self.is_development = self.env == "development"

        # Database
        self.database = DatabaseConfig(
            url=os.getenv("DATABASE_URL", ""),
            max_connections=int(os.getenv("DB_MAX_CONNECTIONS", "20")),
            min_connections=int(os.getenv("DB_MIN_CONNECTIONS", "5")),
        )

        # Scraper
        self.scraper = ScraperConfig(
            reddit_enabled=os.getenv("REDDIT_SCRAPER_ENABLED", "true").lower() == "true",
            instagram_enabled=os.getenv("INSTAGRAM_SCRAPER_ENABLED", "true").lower() == "true",
            reddit_batch_size=int(os.getenv("REDDIT_BATCH_SIZE", "100")),
            instagram_batch_size=int(os.getenv("INSTAGRAM_BATCH_SIZE", "50")),
            max_workers=int(os.getenv("MAX_WORKERS", "10")),
        )

        # API
        self.api = APIConfig(
            host=os.getenv("HOST", "0.0.0.0"),
            port=int(os.getenv("PORT", "8000")),
            workers=int(os.getenv("WORKERS", "4")),
            cors_origins=self._parse_cors_origins(),
            debug=not self.is_production,
        )

        # Cache
        self.cache = CacheConfig(
            enabled=os.getenv("CACHE_ENABLED", "true").lower() == "true",
            ttl=int(os.getenv("CACHE_TTL", "300")),
            max_size=int(os.getenv("CACHE_MAX_SIZE", "1000")),
        )

        # Monitoring
        self.monitoring = MonitoringConfig(
            enabled=os.getenv("MONITORING_ENABLED", "true").lower() == "true",
            log_level=os.getenv("LOG_LEVEL", "INFO"),
            log_file=os.getenv("LOG_FILE", "logs/app.log"),
            metrics_enabled=os.getenv("METRICS_ENABLED", "true").lower() == "true",
            memory_threshold_mb=int(os.getenv("MEMORY_THRESHOLD_MB", "1500")),
        )

        # External Services
        self.services = ExternalServicesConfig(
            openai_api_key=os.getenv("OPENAI_API_KEY", ""),
            supabase_url=os.getenv("SUPABASE_URL", ""),
            supabase_service_key=os.getenv("SUPABASE_SERVICE_ROLE_KEY", ""),
            render_api_key=os.getenv("RENDER_API_KEY"),
            r2_account_id=os.getenv("R2_ACCOUNT_ID", ""),
            r2_access_key_id=os.getenv("R2_ACCESS_KEY_ID", ""),
            r2_secret_access_key=os.getenv("R2_SECRET_ACCESS_KEY", ""),
            r2_bucket_name=os.getenv("R2_BUCKET_NAME", ""),
            r2_public_url=os.getenv("R2_PUBLIC_URL", ""),
        )

        # Instagram Scraper
        self.instagram = InstagramScraperConfig(
            rapidapi_key=os.getenv("RAPIDAPI_KEY", ""),
            rapidapi_host=os.getenv("RAPIDAPI_HOST", "instagram-looter2.p.rapidapi.com"),
            max_workers=int(os.getenv("INSTAGRAM_MAX_WORKERS", "10")),
            requests_per_second=int(os.getenv("INSTAGRAM_REQUESTS_PER_SECOND", "55")),
            concurrent_creators=int(
                os.getenv("INSTAGRAM_CONCURRENT_CREATORS", "10")
            ),  # v3.12.0: Tested - 10 is optimal
            batch_size=int(os.getenv("INSTAGRAM_BATCH_SIZE", "50")),
            update_frequency=int(os.getenv("UPDATE_FREQUENCY", "10800")),
            connection_pool_size=int(os.getenv("INSTAGRAM_CONNECTION_POOL_SIZE", "20")),
            connection_max_retries=int(os.getenv("INSTAGRAM_CONNECTION_MAX_RETRIES", "3")),
            connection_timeout=int(os.getenv("INSTAGRAM_CONNECTION_TIMEOUT", "30")),
            request_timeout=int(os.getenv("REQUEST_TIMEOUT", "30")),
            retry_max_attempts=int(os.getenv("RETRY_MAX_ATTEMPTS", "3")),
            retry_wait_min=float(os.getenv("RETRY_WAIT_MIN", "2")),
            retry_wait_max=float(os.getenv("RETRY_WAIT_MAX", "10")),
            retry_empty_response=int(os.getenv("RETRY_EMPTY_RESPONSE", "1")),
            enable_viral_detection=os.getenv("ENABLE_VIRAL_DETECTION", "true").lower() == "true",
            viral_min_views=int(os.getenv("VIRAL_MIN_VIEWS", "50000")),
            viral_multiplier=float(os.getenv("VIRAL_MULTIPLIER", "5.0")),
            enable_analytics=os.getenv("ENABLE_ANALYTICS", "true").lower() == "true",
            enable_cost_tracking=os.getenv("ENABLE_COST_TRACKING", "true").lower() == "true",
            enable_supabase_logging=os.getenv("ENABLE_SUPABASE_LOGGING", "true").lower() == "true",
            enable_webhook_notifications=os.getenv("ENABLE_WEBHOOK_NOTIFICATIONS", "false").lower()
            == "true",
            webhook_url=os.getenv("WEBHOOK_URL", ""),
            dry_run=os.getenv("DRY_RUN", "false").lower() == "true",
            test_limit=int(os.getenv("TEST_LIMIT", "10")),
        )

        # Feature flags
        self.features = {
            "viral_detection": os.getenv("FEATURE_VIRAL_DETECTION", "false").lower() == "true",
            "auto_categorization": os.getenv("FEATURE_AUTO_CATEGORIZATION", "true").lower()
            == "true",
            "real_time_updates": os.getenv("FEATURE_REAL_TIME_UPDATES", "false").lower() == "true",
            "advanced_analytics": os.getenv("FEATURE_ADVANCED_ANALYTICS", "false").lower()
            == "true",
        }

    def _parse_cors_origins(self) -> list:
        """Parse CORS origins from environment variable"""
        origins = os.getenv("CORS_ORIGINS", "https://b9-dashboard.vercel.app,http://localhost:3000")
        return [origin.strip() for origin in origins.split(",")]

    def validate(self) -> tuple[bool, list[str]]:
        """Validate configuration"""
        errors = []

        # Required fields
        # DATABASE_URL not required - using Supabase REST API instead
        # if not self.database.url:
        #     errors.append("DATABASE_URL is required")
        if not self.services.openai_api_key:
            errors.append("OPENAI_API_KEY is required")
        if not self.services.supabase_url:
            errors.append("SUPABASE_URL is required")
        if not self.services.supabase_service_key:
            errors.append("SUPABASE_SERVICE_ROLE_KEY is required")
        if not self.instagram.rapidapi_key:
            errors.append("RAPIDAPI_KEY is required for Instagram scraper")

        # Value validation
        if self.api.port < 1 or self.api.port > 65535:
            errors.append("PORT must be between 1 and 65535")
        if self.api.workers < 1:
            errors.append("WORKERS must be at least 1")
        if self.cache.ttl < 0:
            errors.append("CACHE_TTL must be non-negative")

        return len(errors) == 0, errors

    def to_dict(self) -> Dict[str, Any]:
        """Convert configuration to dictionary"""
        return {
            "environment": self.env,
            "is_production": self.is_production,
            "database": {
                "max_connections": self.database.max_connections,
                "min_connections": self.database.min_connections,
            },
            "scraper": {
                "reddit_enabled": self.scraper.reddit_enabled,
                "instagram_enabled": self.scraper.instagram_enabled,
                "reddit_batch_size": self.scraper.reddit_batch_size,
                "instagram_batch_size": self.scraper.instagram_batch_size,
            },
            "api": {
                "title": self.api.title,
                "version": self.api.version,
                "host": self.api.host,
                "port": self.api.port,
                "workers": self.api.workers,
                "cors_origins": self.api.cors_origins,
                "debug": self.api.debug,
            },
            "cache": {
                "enabled": self.cache.enabled,
                "ttl": self.cache.ttl,
                "max_size": self.cache.max_size,
            },
            "monitoring": {
                "enabled": self.monitoring.enabled,
                "log_level": self.monitoring.log_level,
                "metrics_enabled": self.monitoring.metrics_enabled,
            },
            "instagram": {
                "batch_size": self.instagram.batch_size,
                "concurrent_creators": self.instagram.concurrent_creators,
                "requests_per_second": self.instagram.requests_per_second,
                "enable_viral_detection": self.instagram.enable_viral_detection,
                "viral_min_views": self.instagram.viral_min_views,
                "enable_analytics": self.instagram.enable_analytics,
                "dry_run": self.instagram.dry_run,
            },
            "features": self.features,
        }


# Global configuration instance
config = Config()

# Validate on import
is_valid, validation_errors = config.validate()
if not is_valid and config.is_production:
    raise ValueError(f"Configuration validation failed: {validation_errors}")


# Export commonly used values
DATABASE_URL = config.database.url
OPENAI_API_KEY = config.services.openai_api_key
SUPABASE_URL = config.services.supabase_url
SUPABASE_SERVICE_KEY = config.services.supabase_service_key
IS_PRODUCTION = config.is_production
IS_DEVELOPMENT = config.is_development
LOG_LEVEL = config.monitoring.log_level
API_VERSION = config.api.version
