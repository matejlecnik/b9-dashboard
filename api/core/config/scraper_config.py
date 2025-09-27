"""
Centralized Configuration for Reddit Scraper
Eliminates hardcoded values and provides environment-based configuration
"""
import os
from typing import Dict, Any, Optional
from dataclasses import dataclass
from datetime import timedelta


@dataclass
class ScraperConfig:
    """Configuration class for Reddit scraper with environment override support"""
    
    # Subreddit Processing
    max_subreddits: int = 2500
    batch_size: int = 1000
    max_concurrent_threads: int = 9
    
    # Stealth Configuration
    min_delay: float = 2.5
    max_delay: float = 6.0
    burst_delay_min: float = 12.0
    burst_delay_max: float = 20.0
    burst_frequency_min: int = 8
    burst_frequency_max: int = 15
    
    # Memory Management
    memory_warning_threshold: float = 0.70
    memory_error_threshold: float = 0.85
    memory_critical_threshold: float = 0.90
    memory_check_interval: int = 60
    
    # Batch Writer Configuration
    batch_writer_size: int = 50
    batch_writer_flush_interval: float = 5.0
    max_retry_attempts: int = 3
    
    # Cache Configuration
    user_cache_ttl: int = 3600  # 1 hour
    subreddit_cache_ttl: int = 7200  # 2 hours
    post_cache_ttl: int = 1800  # 30 minutes
    cache_max_users: int = 50000
    cache_max_subreddits: int = 10000
    cache_max_posts: int = 100000
    
    # API Request Configuration
    max_retries: int = 5
    base_delay: float = 1.0
    request_timeout: int = 30
    
    # User Processing
    max_users_per_cycle: int = 50
    min_user_karma_threshold: int = 100
    
    # Discovery Mode
    discovery_limit: int = 500
    
    # Database Query Limits
    no_seller_limit: int = 500
    
    @classmethod
    def from_environment(cls) -> 'ScraperConfig':
        """
        Create configuration from environment variables with fallback to defaults.
        
        Environment variable format: REDDIT_SCRAPER_[SETTING_NAME]
        Example: REDDIT_SCRAPER_MAX_SUBREDDITS=3000
        """
        config = cls()
        
        # Map config fields to environment variables
        env_mappings = {
            'max_subreddits': 'REDDIT_SCRAPER_MAX_SUBREDDITS',
            'batch_size': 'REDDIT_SCRAPER_BATCH_SIZE',
            'max_concurrent_threads': 'REDDIT_SCRAPER_MAX_THREADS',
            'min_delay': 'REDDIT_SCRAPER_MIN_DELAY',
            'max_delay': 'REDDIT_SCRAPER_MAX_DELAY',
            'memory_warning_threshold': 'REDDIT_SCRAPER_MEMORY_WARNING',
            'memory_error_threshold': 'REDDIT_SCRAPER_MEMORY_ERROR',
            'memory_critical_threshold': 'REDDIT_SCRAPER_MEMORY_CRITICAL',
            'batch_writer_size': 'REDDIT_SCRAPER_BATCH_SIZE',
            'batch_writer_flush_interval': 'REDDIT_SCRAPER_FLUSH_INTERVAL',
            'max_retry_attempts': 'REDDIT_SCRAPER_MAX_RETRIES',
            'user_cache_ttl': 'REDDIT_SCRAPER_USER_CACHE_TTL',
            'subreddit_cache_ttl': 'REDDIT_SCRAPER_SUBREDDIT_CACHE_TTL',
            'max_users_per_cycle': 'REDDIT_SCRAPER_MAX_USERS_PER_CYCLE'
        }
        
        # Override with environment values where available
        for field_name, env_var in env_mappings.items():
            env_value = os.getenv(env_var)
            if env_value is not None:
                try:
                    # Convert to appropriate type based on current value
                    current_value = getattr(config, field_name)
                    if isinstance(current_value, int):
                        setattr(config, field_name, int(env_value))
                    elif isinstance(current_value, float):
                        setattr(config, field_name, float(env_value))
                    elif isinstance(current_value, bool):
                        setattr(config, field_name, env_value.lower() in ('true', '1', 'yes'))
                    else:
                        setattr(config, field_name, env_value)
                except (ValueError, TypeError) as e:
                    import logging
                    logger = logging.getLogger(__name__)
                    logger.warning(f"Invalid environment value for {env_var}: {env_value}, using default: {current_value}")
        
        return config
    
    def validate(self) -> Dict[str, str]:
        """
        Validate configuration values and return any issues.
        
        Returns:
            Dict of field_name -> error_message for invalid values
        """
        issues = {}
        
        # Validate ranges
        if self.max_subreddits <= 0:
            issues['max_subreddits'] = "Must be positive"
        if self.max_subreddits > 10000:
            issues['max_subreddits'] = "Too high, may cause memory issues"
            
        if self.batch_size <= 0 or self.batch_size > 5000:
            issues['batch_size'] = "Must be between 1 and 5000"
            
        if self.min_delay >= self.max_delay:
            issues['stealth_delays'] = "min_delay must be less than max_delay"
            
        if not (0.1 <= self.memory_warning_threshold <= 1.0):
            issues['memory_warning_threshold'] = "Must be between 0.1 and 1.0"
            
        if self.memory_warning_threshold >= self.memory_error_threshold:
            issues['memory_thresholds'] = "Warning threshold must be less than error threshold"
            
        if self.memory_error_threshold >= self.memory_critical_threshold:
            issues['memory_thresholds'] = "Error threshold must be less than critical threshold"
            
        return issues
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert configuration to dictionary for logging/debugging"""
        return {
            'max_subreddits': self.max_subreddits,
            'batch_size': self.batch_size,
            'max_concurrent_threads': self.max_concurrent_threads,
            'stealth_config': {
                'min_delay': self.min_delay,
                'max_delay': self.max_delay,
                'burst_delay': (self.burst_delay_min, self.burst_delay_max),
                'burst_frequency': (self.burst_frequency_min, self.burst_frequency_max)
            },
            'memory_thresholds': {
                'warning': self.memory_warning_threshold,
                'error': self.memory_error_threshold, 
                'critical': self.memory_critical_threshold
            },
            'batch_writer': {
                'size': self.batch_writer_size,
                'flush_interval': self.batch_writer_flush_interval,
                'max_retries': self.max_retry_attempts
            },
            'cache_config': {
                'user_ttl': self.user_cache_ttl,
                'subreddit_ttl': self.subreddit_cache_ttl,
                'post_ttl': self.post_cache_ttl
            }
        }


# Global configuration instance
_config: Optional[ScraperConfig] = None

def get_scraper_config() -> ScraperConfig:
    """
    Get the global scraper configuration instance.
    Loads from environment on first call.
    """
    global _config
    if _config is None:
        _config = ScraperConfig.from_environment()
        
        # Validate configuration
        issues = _config.validate()
        if issues:
            import logging
            logger = logging.getLogger(__name__)
            logger.warning(f"Configuration validation issues: {issues}")
    
    return _config

def reload_config() -> ScraperConfig:
    """Force reload configuration from environment"""
    global _config
    _config = ScraperConfig.from_environment()
    return _config
