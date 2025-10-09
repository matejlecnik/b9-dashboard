#!/usr/bin/env python3
"""
Instagram Scraper Controller - Redis Queue Version
Instead of processing creators directly, adds them to Redis queue for workers to process
"""

import json
import logging
import os
from datetime import datetime, timezone

import redis

from app.core.database.supabase_client import get_supabase_client


logging.basicConfig(
    level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)


def enqueue_creators():
    """Fetch enabled creators and add them to Redis queue"""
    try:
        # Connect to Supabase
        supabase = get_supabase_client()

        # Connect to Redis
        redis_host = os.getenv("REDIS_HOST", "localhost")
        redis_port = int(os.getenv("REDIS_PORT", 6379))
        redis_password = os.getenv("REDIS_PASSWORD", "")

        r = redis.Redis(
            host=redis_host, port=redis_port, password=redis_password, decode_responses=True
        )

        # Fetch all enabled creators
        result = supabase.table("instagram_creators").select("*").eq("enabled", True).execute()

        creators = result.data
        logger.info(f"📊 Found {len(creators)} enabled creators")

        # Add each creator to queue
        queued_count = 0
        for creator in creators:
            job_data = {
                "creator_id": creator["id"],
                "username": creator.get("username", "unknown"),
                "timestamp": datetime.now(timezone.utc).isoformat(),
            }

            # Push to Redis queue (LPUSH adds to left/head of list)
            r.lpush("instagram_scraper_queue", json.dumps(job_data))
            queued_count += 1

            logger.info(f"✅ Queued creator: {creator.get('username')} (ID: {creator['id']})")

        logger.info(f"🎉 Successfully queued {queued_count} creators for processing")
        return queued_count

    except Exception as e:
        logger.error(f"❌ Error enqueueing creators: {e}", exc_info=True)
        return 0


if __name__ == "__main__":
    logger.info("🚀 Starting Instagram Scraper Controller (Redis Queue Mode)")
    enqueue_creators()
