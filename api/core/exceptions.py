"""
Custom Exception Classes for Reddit Scraper
Provides specific exception types for better error handling and debugging
"""
import re
from typing import Any


class RedditScraperException(Exception):
    """Base exception for all Reddit scraper errors"""
    pass


class APIException(RedditScraperException):
    """Exceptions related to Reddit API interactions"""
    pass


class RateLimitException(APIException):
    """Raised when API rate limits are exceeded"""
    def __init__(self, message: str, reset_time: float = None):
        super().__init__(message)
        self.reset_time = reset_time


class ProxyException(RedditScraperException):
    """Exceptions related to proxy operations"""
    pass


class ProxyValidationException(ProxyException):
    """Raised when proxy validation fails"""
    pass


class DatabaseException(RedditScraperException):
    """Exceptions related to database operations"""
    pass


class BatchWriterException(DatabaseException):
    """Exceptions specific to batch writing operations"""
    pass


class CacheException(RedditScraperException):
    """Exceptions related to caching operations"""
    pass


class ConfigurationException(RedditScraperException):
    """Exceptions related to configuration issues"""
    pass


class MemoryException(RedditScraperException):
    """Exceptions related to memory management"""
    pass


class ScrapingException(RedditScraperException):
    """Exceptions during scraping operations"""
    pass


class SubredditBannedException(ScrapingException):
    """Raised when trying to scrape a banned subreddit"""
    def __init__(self, subreddit_name: str):
        super().__init__(f"Subreddit r/{subreddit_name} is banned")
        self.subreddit_name = subreddit_name


class SubredditPrivateException(ScrapingException):
    """Raised when trying to scrape a private subreddit"""
    def __init__(self, subreddit_name: str):
        super().__init__(f"Subreddit r/{subreddit_name} is private")
        self.subreddit_name = subreddit_name


class UserSuspendedException(ScrapingException):
    """Raised when trying to scrape a suspended user"""
    def __init__(self, username: str):
        super().__init__(f"User u/{username} is suspended")
        self.username = username


class ValidationException(RedditScraperException):
    """Raised when data validation fails"""
    def __init__(self, message: str, field_name: str = None, value: Any = None):
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
        raise SubredditBannedException(response_data.get('subreddit', 'unknown'))
    elif error_type == 'private' or error_type == 'forbidden':
        raise SubredditPrivateException(response_data.get('subreddit', 'unknown'))
    elif error_type == 'not_found':
        raise ScrapingException(f"{operation}: Resource not found")
    elif error_type == 'rate_limited':
        raise RateLimitException(f"{operation}: Rate limit exceeded")
    elif error_type == 'suspended':
        raise UserSuspendedException(response_data.get('username', 'unknown'))


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
        raise DatabaseException(f"{operation}: Connection or timeout error - {error}")
    elif 'permission' in error_str or 'auth' in error_str:
        raise DatabaseException(f"{operation}: Permission or authentication error - {error}")
    elif 'schema' in error_str or 'column' in error_str:
        raise DatabaseException(f"{operation}: Schema or column error - {error}")
    else:
        raise DatabaseException(f"{operation}: Database error - {error}")


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
        raise ValidationException("Subreddit name must be a non-empty string", "name", name)
    
    # Remove r/ prefix if present
    if name.startswith('r/'):
        name = name[2:]
    
    # Normalize to lowercase
    name = name.lower().strip()
    
    # Validate length and characters
    if len(name) < 1:
        raise ValidationException("Subreddit name cannot be empty", "name", name)
    if len(name) > 50:
        raise ValidationException("Subreddit name too long (max 50 chars)", "name", name)
    
    # Basic character validation (simplified)
    if not re.match(r'^[a-z0-9_]+$', name):
        raise ValidationException("Subreddit name contains invalid characters", "name", name)
    
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
        raise ValidationException("Username must be a non-empty string", "username", username)
    
    # Remove u/ prefix if present
    if username.startswith('u/'):
        username = username[2:]
    
    # Check for deleted/removed users
    if username.lower() in ['[deleted]', '[removed]', 'automoderator']:
        raise ValidationException("Invalid or system username", "username", username)
    
    # Normalize
    username = username.strip()
    
    # Validate length
    if len(username) < 1:
        raise ValidationException("Username cannot be empty", "username", username)
    if len(username) > 20:  # Reddit username limit
        raise ValidationException("Username too long (max 20 chars)", "username", username)
    
    return username
