"""
API Request Models
Pydantic models for validating incoming API requests
"""

from pydantic import BaseModel
from typing import Optional, List, Dict, Any


class CategorizationRequest(BaseModel):
    """Request model for subreddit categorization"""
    batchSize: int = 30
    limit: Optional[int] = None
    subredditIds: Optional[List[int]] = None


class SingleSubredditRequest(BaseModel):
    """Request model for fetching a single subreddit"""
    subreddit_name: str


class ScrapingRequest(BaseModel):
    """Request model for scraping operations"""
    subredditNames: Optional[List[str]] = None
    usernames: Optional[List[str]] = None
    maxSubreddits: int = 100
    maxUsers: int = 50


class UserDiscoveryRequest(BaseModel):
    """Request model for user discovery"""
    username: str
    source: str = "manual"


class BackgroundJobRequest(BaseModel):
    """Request model for background job creation"""
    job_type: str
    parameters: Dict[str, Any] = {}
    priority: str = "normal"
