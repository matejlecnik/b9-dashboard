#!/usr/bin/env python3
"""
Test script to add sample logs to Redis for testing the improved log viewer
"""

import asyncio
import redis.asyncio as redis
import json
from datetime import datetime, timezone, timedelta
import os
from dotenv import load_dotenv

load_dotenv()

async def add_test_logs():
    """Add various test logs to Redis"""
    redis_url = os.getenv("REDIS_URL", "redis://localhost:6379")
    client = await redis.from_url(redis_url)

    # Sample logs with different levels and contexts
    test_logs = [
        {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "level": "success",
            "message": "Reddit scraper started - 5 accounts active, 3 proxies configured",
            "source": "scraper",
            "context": {
                "accounts": 5,
                "proxies": 3,
                "batch_size": 10,
                "daily_limit": 10000
            }
        },
        {
            "timestamp": (datetime.now(timezone.utc) - timedelta(seconds=10)).isoformat(),
            "level": "info",
            "message": "Starting scrape of r/technology",
            "source": "scraper",
            "context": {
                "subreddit": "technology",
                "operation": "subreddit_analysis"
            }
        },
        {
            "timestamp": (datetime.now(timezone.utc) - timedelta(seconds=20)).isoformat(),
            "level": "success",
            "message": "Successfully collected 45 posts from r/technology",
            "source": "scraper",
            "context": {
                "subreddit": "technology",
                "posts_collected": 45,
                "processing_time_ms": 1234,
                "members": 15234567
            }
        },
        {
            "timestamp": (datetime.now(timezone.utc) - timedelta(seconds=30)).isoformat(),
            "level": "info",
            "message": "Starting scrape of r/gaming",
            "source": "scraper",
            "context": {
                "subreddit": "gaming",
                "operation": "subreddit_analysis"
            }
        },
        {
            "timestamp": (datetime.now(timezone.utc) - timedelta(seconds=35)).isoformat(),
            "level": "warning",
            "message": "Rate limit hit while scraping r/gaming - will retry later",
            "source": "scraper",
            "context": {
                "subreddit": "gaming",
                "error": "Rate limit exceeded"
            }
        },
        {
            "timestamp": (datetime.now(timezone.utc) - timedelta(seconds=40)).isoformat(),
            "level": "success",
            "message": "Discovered 12 new subreddits from user analysis",
            "source": "scraper",
            "context": {
                "reddit_subreddits": ["pics", "funny", "videos", "gifs", "movies"],
                "total_discovered": 12
            }
        },
        {
            "timestamp": (datetime.now(timezone.utc) - timedelta(seconds=50)).isoformat(),
            "level": "info",
            "message": "Processing job queue: 5 priority, 12 discovery, 45 updates",
            "source": "worker"
        },
        {
            "timestamp": (datetime.now(timezone.utc) - timedelta(seconds=60)).isoformat(),
            "level": "error",
            "message": "Failed to scrape r/private_sub: Subreddit is private",
            "source": "scraper",
            "context": {
                "subreddit": "private_sub",
                "error": "403 Forbidden: This subreddit is private"
            }
        },
        {
            "timestamp": (datetime.now(timezone.utc) - timedelta(seconds=70)).isoformat(),
            "level": "warning",
            "message": "Daily limit reached (10000 requests) - pausing until midnight UTC",
            "source": "scraper",
            "context": {
                "requests_made": 10000,
                "limit": 10000
            }
        },
        {
            "timestamp": (datetime.now(timezone.utc) - timedelta(seconds=80)).isoformat(),
            "level": "info",
            "message": "No new subreddits discovered in this batch",
            "source": "scraper",
            "context": {
                "users_analyzed": 20
            }
        },
        {
            "timestamp": (datetime.now(timezone.utc) - timedelta(seconds=90)).isoformat(),
            "level": "success",
            "message": "Successfully collected 120 posts from r/programming",
            "source": "scraper",
            "context": {
                "subreddit": "programming",
                "posts_collected": 120,
                "processing_time_ms": 2567,
                "members": 4567890
            }
        },
        {
            "timestamp": (datetime.now(timezone.utc) - timedelta(seconds=100)).isoformat(),
            "level": "debug",
            "message": "Cache hit for subreddit metadata: r/python",
            "source": "scraper"
        }
    ]

    # Clear existing logs
    await client.delete('reddit_scraper_logs')

    # Add test logs
    for log in test_logs:
        await client.lpush('reddit_scraper_logs', json.dumps(log))

    print(f"✅ Added {len(test_logs)} test logs to Redis")

    # Verify logs were added
    count = await client.llen('reddit_scraper_logs')
    print(f"📊 Total logs in Redis: {count}")

    await client.close()

if __name__ == "__main__":
    asyncio.run(add_test_logs())