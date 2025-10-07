"""
Custom Exception Classes for Reddit Scraper
Provides specific exception types for better error handling and debugging
"""
import re
from typing import Any, Optional

# Use unified logging system
from app.logging import get_logger


logger_helper = get_logger(__name__)


class RedditScraperError(Exception):
    """Base exception for all Reddit scraper errors"""
    pass


class APIError(RedditScraperError):
    """Exceptions related to Reddit API interactions"""
    pass


class RateLimitError(APIError):
    """Raised when API rate limits are exceeded"""
    def __init__(self, message: str, reset_time: Optional[float] = None):
        super().__init__(message)
        self.reset_time = reset_time


class ProxyError(RedditScraperError):
    """Exceptions related to proxy operations"""
    pass


class ProxyValidationError(ProxyError):
    """Raised when proxy validation fails"""
    pass


class DatabaseError(RedditScraperError):
    """Exceptions related to database operations"""
    pass


class CacheError(RedditScraperError):
    """Exceptions related to caching operations"""
    pass


class ConfigurationError(RedditScraperError):
    """Exceptions related to configuration issues"""
    pass


class MemoryError(RedditScraperError):
    """Exceptions related to memory management"""
    pass


class ScrapingError(RedditScraperError):
    """Exceptions during scraping operations"""
    pass


class SubredditBannedError(ScrapingError):
    """Raised when trying to scrape a banned subreddit"""
    def __init__(self, subreddit_name: str):
        super().__init__(f"Subreddit r/{subreddit_name} is banned")
        self.subreddit_name = subreddit_name


class SubredditPrivateError(ScrapingError):
    """Raised when trying to scrape a private subreddit"""
    def __init__(self, subreddit_name: str):
        super().__init__(f"Subreddit r/{subreddit_name} is private")
        self.subreddit_name = subreddit_name


class UserSuspendedError(ScrapingError):
    """Raised when trying to scrape a suspended user"""
    def __init__(self, username: str):
        super().__init__(f"User u/{username} is suspended")
        self.username = username


class ValidationError(RedditScraperError):
    """Raised when data validation fails"""
    def __init__(self, message: str, field_name: Optional[str] = None, value: Optional[Any] = None):
        super().__init__(message)
        self.field_name = field_name
        self.value = value


# Exception handler utilities
def handle_api_error(response_data: dict, operation: str = "API request") -> None:
    """
    Handle API response errors and raise appropriate exceptions.

    Args:
        response_data: API response dictionary
        operation: Description of the operation for error context

    Raises:
        Appropriate specific exception based on error type
    """
    if not isinstance(response_data, dict):
        return

    error_type = response_data.get('error')
    if error_type == 'banned':
        subreddit = response_data.get('subreddit', 'unknown')
        if logger_helper:
            logger_helper.warning(
            f"Banned subreddit encountered: r/{subreddit}",
            context={'subreddit': subreddit, 'operation': operation},
            action='banned_subreddit'
        )
        raise SubredditBannedError(subreddit)
    elif error_type == 'private' or error_type == 'forbidden':
        subreddit = response_data.get('subreddit', 'unknown')
        if logger_helper:
            logger_helper.warning(
            f"Private/forbidden subreddit: r/{subreddit}",
            context={'subreddit': subreddit, 'operation': operation},
            action='private_subreddit'
        )
        raise SubredditPrivateError(subreddit)
    elif error_type == 'not_found':
        if logger_helper:
            logger_helper.warning(
            f"{operation}: Resource not found",
            context={'operation': operation},
            action='not_found'
        )
        raise ScrapingError(f"{operation}: Resource not found")
    elif error_type == 'rate_limited':
        if logger_helper:
            logger_helper.error(
            f"{operation}: Rate limit exceeded",
            context={'operation': operation},
            action='rate_limit_error'
        )
        raise RateLimitError(f"{operation}: Rate limit exceeded")
    elif error_type == 'suspended':
        username = response_data.get('username', 'unknown')
        if logger_helper:
            logger_helper.warning(
            f"Suspended user encountered: u/{username}",
            context={'username': username, 'operation': operation},
            action='suspended_user'
        )
        raise UserSuspendedError(username)


def handle_database_error(error: Exception, operation: str = "Database operation") -> None:
    """
    Convert generic database errors to specific exceptions.

    Args:
        error: Original exception
        operation: Description of the operation for error context

    Raises:
        Appropriate specific exception based on error type
    """
    error_str = str(error).lower()

    if 'connection' in error_str or 'timeout' in error_str:
        if logger_helper:
            logger_helper.error(
            f"{operation}: Connection or timeout error",
            context={'operation': operation, 'error': str(error)[:200]},
            action='database_connection_error'
        )
        raise DatabaseError(f"{operation}: Connection or timeout error - {error}")
    elif 'permission' in error_str or 'auth' in error_str:
        if logger_helper:
            logger_helper.error(
            f"{operation}: Permission or authentication error",
            context={'operation': operation, 'error': str(error)[:200]},
            action='database_auth_error'
        )
        raise DatabaseError(f"{operation}: Permission or authentication error - {error}")
    elif 'schema' in error_str or 'column' in error_str:
        if logger_helper:
            logger_helper.error(
            f"{operation}: Schema or column error",
            context={'operation': operation, 'error': str(error)[:200]},
            action='database_schema_error'
        )
        raise DatabaseError(f"{operation}: Schema or column error - {error}")
    else:
        if logger_helper:
            logger_helper.error(
            f"{operation}: Database error",
            context={'operation': operation, 'error': str(error)[:200]},
            action='database_error'
        )
        raise DatabaseError(f"{operation}: Database error - {error}")


def validate_subreddit_name(name: str) -> str:
    """
    Validate and normalize subreddit name.

    Args:
        name: Raw subreddit name

    Returns:
        Normalized subreddit name

    Raises:
        ValidationException: If name is invalid
    """
    if not name or not isinstance(name, str):
        raise ValidationError("Subreddit name must be a non-empty string", "name", name)

    # Remove r/ prefix if present
    if name.startswith('r/'):
        name = name[2:]

    # Normalize to lowercase
    name = name.lower().strip()

    # Validate length and characters
    if len(name) < 1:
        raise ValidationError("Subreddit name cannot be empty", "name", name)
    if len(name) > 50:
        raise ValidationError("Subreddit name too long (max 50 chars)", "name", name)

    # Basic character validation (simplified)
    if not re.match(r'^[a-z0-9_]+$', name):
        raise ValidationError("Subreddit name contains invalid characters", "name", name)

    return name


def validate_username(username: str) -> str:
    """
    Validate and normalize Reddit username.

    Args:
        username: Raw username

    Returns:
        Normalized username

    Raises:
        ValidationException: If username is invalid
    """
    if not username or not isinstance(username, str):
        raise ValidationError("Username must be a non-empty string", "username", username)

    # Remove u/ prefix if present
    if username.startswith('u/'):
        username = username[2:]

    # Check for deleted/removed users
    if username.lower() in ['[deleted]', '[removed]', 'automoderator']:
        raise ValidationError("Invalid or system username", "username", username)

    # Normalize
    username = username.strip()

    # Validate length
    if len(username) < 1:
        raise ValidationError("Username cannot be empty", "username", username)
    if len(username) > 20:  # Reddit username limit
        raise ValidationError("Username too long (max 20 chars)", "username", username)

    return username
