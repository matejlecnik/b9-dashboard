#!/usr/bin/env python3
"""
Reddit Scraper Configuration Management
Centralized configuration for the Reddit scraper service with environment variable support
"""

import os
from dataclasses import dataclass, field
from typing import Dict, List, Optional
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

@dataclass
class SupabaseConfig:
    """Supabase connection configuration"""
    url: str = field(default_factory=lambda: os.getenv('SUPABASE_URL', ''))
    service_role_key: str = field(default_factory=lambda: os.getenv('SUPABASE_SERVICE_ROLE_KEY', ''))
    anon_key: str = field(default_factory=lambda: os.getenv('SUPABASE_ANON_KEY', ''))

    # Table names
    users_table: str = 'reddit_users'
    posts_table: str = 'reddit_posts'
    subreddits_table: str = 'reddit_subreddits'
    accounts_table: str = 'scraper_accounts'  # Existing table name in Supabase
    logs_table: str = 'scraper_logs'
    performance_table: str = 'performance_logs'
    errors_table: str = 'scraper_errors'

@dataclass
class ProxyConfig:
    """Proxy configuration for requests"""
    enabled: bool = field(default_factory=lambda: os.getenv('PROXY_ENABLED', 'true').lower() == 'true')
    url: str = field(default_factory=lambda: os.getenv('PROXY_URL', ''))
    username: str = field(default_factory=lambda: os.getenv('PROXY_USERNAME', ''))
    password: str = field(default_factory=lambda: os.getenv('PROXY_PASSWORD', ''))
    timeout: int = field(default_factory=lambda: int(os.getenv('PROXY_TIMEOUT', '30')))
    max_retries: int = field(default_factory=lambda: int(os.getenv('PROXY_MAX_RETRIES', '3')))

    def get_proxy_dict(self) -> Dict[str, str]:
        """Get proxy configuration as a dictionary for requests"""
        if not self.enabled or not self.url:
            return {}

        if self.username and self.password:
            # Format: http://username:password@proxy.com:port
            proxy_parts = self.url.split('://')
            if len(proxy_parts) == 2:
                protocol, rest = proxy_parts
                proxy_url = f"{protocol}://{self.username}:{self.password}@{rest}"
            else:
                proxy_url = self.url
        else:
            proxy_url = self.url

        return {
            'http': proxy_url,
            'https': proxy_url
        }

@dataclass
class RateLimitConfig:
    """Rate limiting configuration"""
    max_requests_per_minute: int = field(default_factory=lambda: int(os.getenv('MAX_REQUESTS_PER_MINUTE', '100')))
    min_delay_seconds: float = field(default_factory=lambda: float(os.getenv('MIN_DELAY_SECONDS', '2.5')))
    max_delay_seconds: float = field(default_factory=lambda: float(os.getenv('MAX_DELAY_SECONDS', '6.0')))
    burst_delay_min: int = field(default_factory=lambda: int(os.getenv('BURST_DELAY_MIN', '12')))
    burst_delay_max: int = field(default_factory=lambda: int(os.getenv('BURST_DELAY_MAX', '20')))
    burst_frequency_min: int = field(default_factory=lambda: int(os.getenv('BURST_FREQUENCY_MIN', '8')))
    burst_frequency_max: int = field(default_factory=lambda: int(os.getenv('BURST_FREQUENCY_MAX', '15')))

    # Account-specific limits
    max_retries_per_user: int = field(default_factory=lambda: int(os.getenv('MAX_RETRIES_PER_USER', '3')))
    account_cooldown_minutes: int = field(default_factory=lambda: int(os.getenv('ACCOUNT_COOLDOWN_MINUTES', '60')))

@dataclass
class ScraperConfig:
    """Main scraper configuration"""
    # Service control
    auto_start: bool = field(default_factory=lambda: os.getenv('AUTO_START', 'true').lower() == 'true')
    batch_size: int = field(default_factory=lambda: int(os.getenv('BATCH_SIZE', '10')))
    max_daily_requests: int = field(default_factory=lambda: int(os.getenv('MAX_DAILY_REQUESTS', '50000')))

    # Processing limits
    max_users_per_cycle: int = field(default_factory=lambda: int(os.getenv('MAX_USERS_PER_CYCLE', '500')))
    max_posts_per_subreddit: int = field(default_factory=lambda: int(os.getenv('MAX_POSTS_PER_SUBREDDIT', '30')))
    min_users_for_requirements: int = field(default_factory=lambda: int(os.getenv('MIN_USERS_FOR_REQUIREMENTS', '5')))

    # Timing
    cycle_interval_hours: int = field(default_factory=lambda: int(os.getenv('CYCLE_INTERVAL_HOURS', '4')))
    startup_delay_seconds: int = field(default_factory=lambda: int(os.getenv('STARTUP_DELAY_SECONDS', '10')))

    # Features
    enable_user_analysis: bool = field(default_factory=lambda: os.getenv('ENABLE_USER_ANALYSIS', 'true').lower() == 'true')
    enable_post_analysis: bool = field(default_factory=lambda: os.getenv('ENABLE_POST_ANALYSIS', 'true').lower() == 'true')
    enable_requirements_calc: bool = field(default_factory=lambda: os.getenv('ENABLE_REQUIREMENTS_CALC', 'true').lower() == 'true')

    # Data quality
    percentile_for_requirements: float = field(default_factory=lambda: float(os.getenv('PERCENTILE_FOR_REQUIREMENTS', '0.1')))
    min_subscriber_count: int = field(default_factory=lambda: int(os.getenv('MIN_SUBSCRIBER_COUNT', '100')))

@dataclass
class MonitoringConfig:
    """Monitoring and observability configuration"""
    enable_metrics: bool = field(default_factory=lambda: os.getenv('ENABLE_METRICS', 'true').lower() == 'true')
    metrics_port: int = field(default_factory=lambda: int(os.getenv('METRICS_PORT', '9090')))
    log_level: str = field(default_factory=lambda: os.getenv('LOG_LEVEL', 'info').upper())

    # Logging destinations
    log_to_file: bool = field(default_factory=lambda: os.getenv('LOG_TO_FILE', 'true').lower() == 'true')
    log_to_supabase: bool = field(default_factory=lambda: os.getenv('LOG_TO_SUPABASE', 'true').lower() == 'true')
    log_to_console: bool = field(default_factory=lambda: os.getenv('LOG_TO_CONSOLE', 'true').lower() == 'true')

    # Log file configuration
    log_file_path: str = field(default_factory=lambda: os.getenv('LOG_FILE_PATH', './logs/reddit_scraper.log'))
    log_max_bytes: int = field(default_factory=lambda: int(os.getenv('LOG_MAX_BYTES', '10485760')))  # 10MB
    log_backup_count: int = field(default_factory=lambda: int(os.getenv('LOG_BACKUP_COUNT', '5')))

    # Alerting thresholds
    error_rate_threshold: float = field(default_factory=lambda: float(os.getenv('ERROR_RATE_THRESHOLD', '0.01')))  # 1%
    response_time_threshold_ms: int = field(default_factory=lambda: int(os.getenv('RESPONSE_TIME_THRESHOLD_MS', '5000')))

@dataclass
class RedisConfig:
    """Redis cache configuration"""
    url: str = field(default_factory=lambda: os.getenv('REDIS_URL', 'redis://localhost:6379'))
    max_connections: int = field(default_factory=lambda: int(os.getenv('REDIS_MAX_CONNECTIONS', '10')))

    # Cache TTLs (in seconds)
    user_cache_ttl: int = field(default_factory=lambda: int(os.getenv('USER_CACHE_TTL', '86400')))  # 24 hours
    subreddit_cache_ttl: int = field(default_factory=lambda: int(os.getenv('SUBREDDIT_CACHE_TTL', '3600')))  # 1 hour
    post_cache_ttl: int = field(default_factory=lambda: int(os.getenv('POST_CACHE_TTL', '7200')))  # 2 hours

    # Queue names
    scraper_queue: str = 'scraper:queue'
    results_queue: str = 'scraper:results'
    errors_queue: str = 'scraper:errors'

@dataclass
class HealthCheckConfig:
    """Health check configuration"""
    enabled: bool = field(default_factory=lambda: os.getenv('HEALTH_CHECK_ENABLED', 'true').lower() == 'true')
    port: int = field(default_factory=lambda: int(os.getenv('HEALTH_CHECK_PORT', '8080')))
    path: str = '/health'

    # Health check thresholds
    max_consecutive_failures: int = field(default_factory=lambda: int(os.getenv('MAX_CONSECUTIVE_FAILURES', '5')))
    unhealthy_error_rate: float = field(default_factory=lambda: float(os.getenv('UNHEALTHY_ERROR_RATE', '0.05')))  # 5%
    unhealthy_response_time_ms: int = field(default_factory=lambda: int(os.getenv('UNHEALTHY_RESPONSE_TIME_MS', '10000')))

class Config:
    """Main configuration class that combines all config sections"""

    def __init__(self):
        self.supabase = SupabaseConfig()
        self.proxy = ProxyConfig()
        self.rate_limit = RateLimitConfig()
        self.scraper = ScraperConfig()
        self.monitoring = MonitoringConfig()
        self.redis = RedisConfig()
        self.health_check = HealthCheckConfig()

        # Validate configuration
        self._validate()

    def _validate(self):
        """Validate configuration and raise errors for missing required values"""
        errors = []

        # Check required Supabase config
        if not self.supabase.url:
            errors.append("SUPABASE_URL is required")
        if not self.supabase.service_role_key:
            errors.append("SUPABASE_SERVICE_ROLE_KEY is required")

        # Check proxy config if enabled
        if self.proxy.enabled and not self.proxy.url:
            errors.append("PROXY_URL is required when PROXY_ENABLED=true")

        # Check Redis URL
        if not self.redis.url:
            errors.append("REDIS_URL is required")

        # Validate numeric ranges
        if self.rate_limit.min_delay_seconds >= self.rate_limit.max_delay_seconds:
            errors.append("MIN_DELAY_SECONDS must be less than MAX_DELAY_SECONDS")

        if self.scraper.batch_size <= 0:
            errors.append("BATCH_SIZE must be greater than 0")

        if errors:
            error_msg = "Configuration validation failed:\n" + "\n".join(f"  - {e}" for e in errors)
            raise ValueError(error_msg)

    def to_dict(self) -> dict:
        """Convert configuration to dictionary for logging/debugging"""
        return {
            'supabase': {
                'url': self.supabase.url[:20] + '...' if self.supabase.url else None,
                'tables': {
                    'users': self.supabase.users_table,
                    'posts': self.supabase.posts_table,
                    'subreddits': self.supabase.subreddits_table,
                    'accounts': self.supabase.accounts_table,
                    'logs': self.supabase.logs_table
                }
            },
            'proxy': {
                'enabled': self.proxy.enabled,
                'url': self.proxy.url[:20] + '...' if self.proxy.url else None,
                'timeout': self.proxy.timeout,
                'max_retries': self.proxy.max_retries
            },
            'rate_limit': {
                'max_requests_per_minute': self.rate_limit.max_requests_per_minute,
                'delay_range': f"{self.rate_limit.min_delay_seconds}-{self.rate_limit.max_delay_seconds}s",
                'burst_config': f"every {self.rate_limit.burst_frequency_min}-{self.rate_limit.burst_frequency_max} requests"
            },
            'scraper': {
                'auto_start': self.scraper.auto_start,
                'batch_size': self.scraper.batch_size,
                'max_daily_requests': self.scraper.max_daily_requests,
                'cycle_interval_hours': self.scraper.cycle_interval_hours
            },
            'monitoring': {
                'enabled': self.monitoring.enable_metrics,
                'log_level': self.monitoring.log_level,
                'destinations': {
                    'file': self.monitoring.log_to_file,
                    'supabase': self.monitoring.log_to_supabase,
                    'console': self.monitoring.log_to_console
                }
            },
            'redis': {
                'url': self.redis.url[:20] + '...' if self.redis.url else None,
                'max_connections': self.redis.max_connections
            },
            'health_check': {
                'enabled': self.health_check.enabled,
                'port': self.health_check.port,
                'path': self.health_check.path
            }
        }

# Global config instance
config = Config()

# Export individual configs for convenience
supabase_config = config.supabase
proxy_config = config.proxy
rate_limit_config = config.rate_limit
scraper_config = config.scraper
monitoring_config = config.monitoring
redis_config = config.redis
health_check_config = config.health_check