"""
Central Configuration Module
All application settings in one place
"""

import os
from typing import Optional, Dict, Any
from dataclasses import dataclass
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
    version: str = "2.0.0"
    description: str = "Backend API for B9 Dashboard"
    host: str = "0.0.0.0"
    port: int = 8000
    workers: int = 4
    cors_origins: list = None
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
class ExternalServicesConfig:
    """External services configuration"""
    openai_api_key: str
    supabase_url: str
    supabase_service_key: str
    render_api_key: Optional[str] = None


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
            min_connections=int(os.getenv("DB_MIN_CONNECTIONS", "5"))
        )

        # Scraper
        self.scraper = ScraperConfig(
            reddit_enabled=os.getenv("REDDIT_SCRAPER_ENABLED", "true").lower() == "true",
            instagram_enabled=os.getenv("INSTAGRAM_SCRAPER_ENABLED", "true").lower() == "true",
            reddit_batch_size=int(os.getenv("REDDIT_BATCH_SIZE", "100")),
            instagram_batch_size=int(os.getenv("INSTAGRAM_BATCH_SIZE", "50")),
            max_workers=int(os.getenv("MAX_WORKERS", "10"))
        )

        # API
        self.api = APIConfig(
            host=os.getenv("HOST", "0.0.0.0"),
            port=int(os.getenv("PORT", "8000")),
            workers=int(os.getenv("WORKERS", "4")),
            cors_origins=self._parse_cors_origins(),
            debug=not self.is_production
        )

        # Cache
        self.cache = CacheConfig(
            enabled=os.getenv("CACHE_ENABLED", "true").lower() == "true",
            ttl=int(os.getenv("CACHE_TTL", "300")),
            max_size=int(os.getenv("CACHE_MAX_SIZE", "1000"))
        )

        # Monitoring
        self.monitoring = MonitoringConfig(
            enabled=os.getenv("MONITORING_ENABLED", "true").lower() == "true",
            log_level=os.getenv("LOG_LEVEL", "INFO"),
            log_file=os.getenv("LOG_FILE", "logs/app.log"),
            metrics_enabled=os.getenv("METRICS_ENABLED", "true").lower() == "true",
            memory_threshold_mb=int(os.getenv("MEMORY_THRESHOLD_MB", "1500"))
        )

        # External Services
        self.services = ExternalServicesConfig(
            openai_api_key=os.getenv("OPENAI_API_KEY", ""),
            supabase_url=os.getenv("SUPABASE_URL", ""),
            supabase_service_key=os.getenv("SUPABASE_SERVICE_ROLE_KEY", ""),
            render_api_key=os.getenv("RENDER_API_KEY")
        )

        # Feature flags
        self.features = {
            "viral_detection": os.getenv("FEATURE_VIRAL_DETECTION", "false").lower() == "true",
            "auto_categorization": os.getenv("FEATURE_AUTO_CATEGORIZATION", "true").lower() == "true",
            "real_time_updates": os.getenv("FEATURE_REAL_TIME_UPDATES", "false").lower() == "true",
            "advanced_analytics": os.getenv("FEATURE_ADVANCED_ANALYTICS", "false").lower() == "true"
        }

    def _parse_cors_origins(self) -> list:
        """Parse CORS origins from environment variable"""
        origins = os.getenv("CORS_ORIGINS", "https://b9-dashboard.vercel.app,http://localhost:3000")
        return [origin.strip() for origin in origins.split(",")]

    def validate(self) -> tuple[bool, list[str]]:
        """Validate configuration"""
        errors = []

        # Required fields
        if not self.database.url:
            errors.append("DATABASE_URL is required")
        if not self.services.openai_api_key:
            errors.append("OPENAI_API_KEY is required")
        if not self.services.supabase_url:
            errors.append("SUPABASE_URL is required")
        if not self.services.supabase_service_key:
            errors.append("SUPABASE_SERVICE_ROLE_KEY is required")

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
                "min_connections": self.database.min_connections
            },
            "scraper": {
                "reddit_enabled": self.scraper.reddit_enabled,
                "instagram_enabled": self.scraper.instagram_enabled,
                "reddit_batch_size": self.scraper.reddit_batch_size,
                "instagram_batch_size": self.scraper.instagram_batch_size
            },
            "api": {
                "title": self.api.title,
                "version": self.api.version,
                "host": self.api.host,
                "port": self.api.port,
                "workers": self.api.workers,
                "cors_origins": self.api.cors_origins,
                "debug": self.api.debug
            },
            "cache": {
                "enabled": self.cache.enabled,
                "ttl": self.cache.ttl,
                "max_size": self.cache.max_size
            },
            "monitoring": {
                "enabled": self.monitoring.enabled,
                "log_level": self.monitoring.log_level,
                "metrics_enabled": self.monitoring.metrics_enabled
            },
            "features": self.features
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