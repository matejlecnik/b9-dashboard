"""
API Request Models
Pydantic models for validating incoming API requests
"""

from typing import Any, Dict, List, Optional

from pydantic import BaseModel


class CategorizationRequest(BaseModel):
    """Request model for subreddit categorization"""

    batchSize: int = 30  # noqa: N815 - camelCase for frontend compatibility
    limit: Optional[int] = None
    subredditIds: Optional[List[int]] = None  # noqa: N815 - camelCase for frontend compatibility


class SingleSubredditRequest(BaseModel):
    """Request model for fetching a single subreddit"""

    subreddit_name: str


class ScrapingRequest(BaseModel):
    """Request model for scraping operations"""

    subredditNames: Optional[List[str]] = None  # noqa: N815 - camelCase for frontend compatibility
    usernames: Optional[List[str]] = None
    maxSubreddits: int = 100  # noqa: N815 - camelCase for frontend compatibility
    maxUsers: int = 50  # noqa: N815 - camelCase for frontend compatibility


class UserDiscoveryRequest(BaseModel):
    """Request model for user discovery"""

    username: str
    source: str = "manual"


class BackgroundJobRequest(BaseModel):
    """Request model for background job creation"""

    job_type: str
    parameters: Dict[str, Any] = {}
    priority: str = "normal"
