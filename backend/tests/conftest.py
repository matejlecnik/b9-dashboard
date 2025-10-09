"""
Pytest Configuration and Shared Fixtures
Provides common test fixtures for mocking external dependencies
"""

import asyncio
from typing import Generator
from unittest.mock import AsyncMock, MagicMock, patch

import pytest


# Configure asyncio event loop for tests
@pytest.fixture(scope="session")
def event_loop() -> Generator:
    """Create an instance of the default event loop for the test session."""
    loop = asyncio.get_event_loop_policy().new_event_loop()
    yield loop
    loop.close()


# ============================================================================
# Database Fixtures
# ============================================================================


@pytest.fixture
def mock_supabase():
    """Mock Supabase client"""
    mock = MagicMock()

    # Mock table operations
    mock.table.return_value = mock
    mock.select.return_value = mock
    mock.insert.return_value = mock
    mock.update.return_value = mock
    mock.delete.return_value = mock
    mock.upsert.return_value = mock

    # Mock query methods
    mock.eq.return_value = mock
    mock.neq.return_value = mock
    mock.gt.return_value = mock
    mock.gte.return_value = mock
    mock.lt.return_value = mock
    mock.lte.return_value = mock
    mock.like.return_value = mock
    mock.ilike.return_value = mock
    mock.in_.return_value = mock
    mock.is_.return_value = mock
    mock.order.return_value = mock
    mock.limit.return_value = mock
    mock.range.return_value = mock
    mock.single.return_value = mock
    mock.maybe_single.return_value = mock

    # Mock execute returns successful response
    mock.execute.return_value = MagicMock(data=[], error=None)

    return mock


@pytest.fixture
def mock_redis():
    """Mock Redis client"""
    mock = MagicMock()

    # Mock Redis operations
    mock.lpush.return_value = 1
    mock.rpush.return_value = 1
    mock.brpop.return_value = (b"queue_name", b'{"task": "test"}')
    mock.llen.return_value = 0
    mock.get.return_value = None
    mock.set.return_value = True
    mock.delete.return_value = 1
    mock.ping.return_value = True

    return mock


# ============================================================================
# API Fixtures
# ============================================================================


@pytest.fixture
def mock_requests():
    """Mock requests library"""
    with patch("requests.get") as mock_get, patch("requests.post") as mock_post:
        # Configure successful responses
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = {"success": True}
        mock_response.text = '{"success": true}'

        mock_get.return_value = mock_response
        mock_post.return_value = mock_response

        yield {"get": mock_get, "post": mock_post}


@pytest.fixture
async def mock_aiohttp():
    """Mock aiohttp ClientSession"""
    mock_session = AsyncMock()

    # Configure successful responses
    mock_response = AsyncMock()
    mock_response.status = 200
    mock_response.json.return_value = {"success": True}
    mock_response.text.return_value = '{"success": true}'

    mock_session.get.return_value.__aenter__.return_value = mock_response
    mock_session.post.return_value.__aenter__.return_value = mock_response

    return mock_session


# ============================================================================
# Storage Fixtures
# ============================================================================


@pytest.fixture
def mock_r2_client():
    """Mock Cloudflare R2 (boto3) client"""
    mock = MagicMock()

    # Mock S3 operations
    mock.put_object.return_value = {"ETag": '"abc123"'}
    mock.get_object.return_value = {"Body": MagicMock()}
    mock.delete_object.return_value = {"DeleteMarker": True}
    mock.list_objects_v2.return_value = {"Contents": []}

    return mock


# ============================================================================
# Scraper Fixtures
# ============================================================================


@pytest.fixture
def sample_instagram_creator():
    """Sample Instagram creator data for testing"""
    return {
        "ig_user_id": "123456789",
        "username": "test_creator",
        "full_name": "Test Creator",
        "followers": 10000,
        "following": 500,
        "bio": "Test bio",
        "profile_pic_url": "https://example.com/pic.jpg",
        "is_verified": False,
        "is_business": False,
    }


@pytest.fixture
def sample_reddit_subreddit():
    """Sample Reddit subreddit data for testing"""
    return {
        "name": "test_subreddit",
        "display_name": "TestSubreddit",
        "subscribers": 50000,
        "description": "Test subreddit description",
        "over18": False,
        "public_description": "Public test description",
        "created_utc": 1609459200,
    }


@pytest.fixture
def sample_reddit_user():
    """Sample Reddit user data for testing"""
    return {
        "name": "test_user",
        "id": "abc123",
        "link_karma": 1000,
        "comment_karma": 5000,
        "created_utc": 1609459200,
        "is_gold": False,
        "is_mod": False,
        "has_verified_email": True,
    }


# ============================================================================
# Environment Fixtures
# ============================================================================


@pytest.fixture(autouse=True)
def mock_env_vars(monkeypatch):
    """Mock environment variables for all tests"""
    env_vars = {
        "SUPABASE_URL": "https://test.supabase.co",
        "SUPABASE_SERVICE_ROLE_KEY": "test-key",
        "OPENAI_API_KEY": "test-openai-key",
        "RAPIDAPI_KEY": "test-rapidapi-key",
        "RAPIDAPI_HOST": "test.rapidapi.com",
        "REDIS_URL": "redis://localhost:6379",
        "R2_ACCOUNT_ID": "test-account",
        "R2_ACCESS_KEY_ID": "test-access-key",
        "R2_SECRET_ACCESS_KEY": "test-secret",
        "R2_BUCKET_NAME": "test-bucket",
        "R2_PUBLIC_URL": "https://test.r2.dev",
        "ENABLE_R2_STORAGE": "false",
        "ENVIRONMENT": "test",
    }

    for key, value in env_vars.items():
        monkeypatch.setenv(key, value)


# ============================================================================
# Performance Fixtures
# ============================================================================


@pytest.fixture
def performance_timer():
    """Fixture for timing test execution"""
    import time

    class Timer:
        def __init__(self):
            self.start_time = None
            self.end_time = None

        def start(self):
            self.start_time = time.time()

        def stop(self):
            self.end_time = time.time()

        @property
        def elapsed(self) -> float:
            if self.start_time and self.end_time:
                return self.end_time - self.start_time
            return 0.0

    return Timer()


# ============================================================================
# Cleanup Fixtures
# ============================================================================


@pytest.fixture(autouse=True)
async def cleanup():
    """Cleanup after each test"""
    yield
    # Add any global cleanup logic here
    # For example: close connections, clear caches, etc.
