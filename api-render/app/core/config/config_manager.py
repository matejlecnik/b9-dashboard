"""
Centralized Configuration Manager
Fetches configuration from database with fallback defaults
"""
import logging
from datetime import datetime, timezone
from typing import Any, ClassVar, Dict


logger = logging.getLogger(__name__)


class ConfigManager:
    """
    Manages centralized configuration from system_control table.
    Provides fallback defaults if database is unavailable.
    """

    # Default configuration values
    DEFAULTS: ClassVar[Dict[str, Any]] = {
        "batch_size": 50,
        "user_batch_size": 30,
        "posts_per_subreddit": 30,
        "user_submissions_limit": 30,
        "rate_limit_delay": 1.0,
        "max_retries": 3,
        "timeout": 300,
        "cache_batch_size": 1000,
        "heartbeat_interval": 30,
        "max_threads": 5  # Fallback if proxy calculation fails
    }

    def __init__(self, supabase_client=None):
        """
        Initialize config manager.

        Args:
            supabase_client: Supabase client instance
        """
        self.supabase = supabase_client
        self._config_cache = {}
        self._last_fetch = None
        self._cache_duration = 300  # Refresh config every 5 minutes

    def get_config(self, force_refresh: bool = False) -> Dict[str, Any]:
        """
        Get configuration from database or cache.

        Args:
            force_refresh: Force reload from database

        Returns:
            Configuration dictionary
        """
        # Check if cache is valid
        if not force_refresh and self._config_cache and self._last_fetch:
            age = (datetime.now(timezone.utc) - self._last_fetch).total_seconds()
            if age < self._cache_duration:
                return self._config_cache

        # Try to fetch from database
        if self.supabase:
            try:
                result = self.supabase.table('system_control').select('config').eq('script_name', 'reddit_scraper').execute()

                if result.data and len(result.data) > 0:
                    db_config = result.data[0].get('config', {})
                    # Merge with defaults (database overrides)
                    self._config_cache = {**self.DEFAULTS, **db_config}
                    self._last_fetch = datetime.now(timezone.utc)
                    logger.info(f"✅ Loaded config from database: {len(db_config)} custom values")
                    return self._config_cache
            except Exception as e:
                logger.warning(f"Failed to fetch config from database: {e}")

        # Fall back to defaults
        logger.info("Using default configuration (database unavailable)")
        self._config_cache = self.DEFAULTS.copy()
        self._last_fetch = datetime.now(timezone.utc)
        return self._config_cache

    def get(self, key: str, default: Any = None) -> Any:
        """
        Get a specific configuration value.

        Args:
            key: Configuration key
            default: Default value if key not found

        Returns:
            Configuration value
        """
        config = self.get_config()
        return config.get(key, default)

    def update_config(self, updates: Dict[str, Any]) -> bool:
        """
        Update configuration in database.

        Args:
            updates: Dictionary of configuration updates

        Returns:
            True if successful
        """
        if not self.supabase:
            logger.error("Cannot update config: No database connection")
            return False

        try:
            # Get current config
            result = self.supabase.table('system_control').select('config').eq('script_name', 'reddit_scraper').execute()

            current_config = {}
            if result.data and len(result.data) > 0:
                current_config = result.data[0].get('config', {})

            # Merge updates
            new_config = {**current_config, **updates}

            # Update in database
            self.supabase.table('system_control').update({
                'config': new_config,
                'updated_at': datetime.now(timezone.utc).isoformat()
            }).eq('script_name', 'reddit_scraper').execute()

            # Clear cache to force refresh
            self._config_cache = {}
            self._last_fetch = None

            logger.info(f"✅ Updated config in database: {list(updates.keys())}")
            return True

        except Exception as e:
            logger.error(f"Failed to update config: {e}")
            return False

    def get_all_settings(self) -> Dict[str, Any]:
        """
        Get all configuration settings with metadata.

        Returns:
            Dictionary with current values and defaults
        """
        current = self.get_config()
        return {
            "current": current,
            "defaults": self.DEFAULTS,
            "customized": {k: v for k, v in current.items() if v != self.DEFAULTS.get(k)},
            "cache_age": (datetime.now(timezone.utc) - self._last_fetch).total_seconds() if self._last_fetch else None
        }
