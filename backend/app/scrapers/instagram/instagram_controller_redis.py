#!/usr/bin/env python3
"""
Instagram Scraper Controller - Redis Queue Version

Instead of processing creators directly, this controller adds jobs to a Redis queue
for distributed workers to process. This enables:
- Horizontal scaling (add more workers)
- Better resource utilization (workers on different servers)
- Job persistence (queue survives restarts)
- Load balancing (workers pull jobs when ready)

Usage:
    python backend/app/scrapers/instagram/instagram_controller_redis.py
"""

import json
import logging
import os
import sys
from datetime import datetime, timezone
from typing import Optional

import redis


# Add backend to Python path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '../../../..'))

from app.core.database.supabase_client import get_supabase_client


logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


def get_redis_client() -> redis.Redis:
    """
    Create and return Redis client

    Returns:
        redis.Redis: Configured Redis client
    """
    redis_host = os.getenv('REDIS_HOST', 'localhost')
    redis_port = int(os.getenv('REDIS_PORT', 6379))
    redis_password = os.getenv('REDIS_PASSWORD', '')

    return redis.Redis(
        host=redis_host,
        port=redis_port,
        password=redis_password,
        decode_responses=True,
        socket_connect_timeout=10,
        socket_timeout=10,
        retry_on_timeout=True
    )


def enqueue_creators(limit: Optional[int] = None, enabled_only: bool = True) -> int:
    """
    Fetch enabled creators from database and add them to Redis queue

    Args:
        limit: Max number of creators to enqueue (None = all)
        enabled_only: Only enqueue enabled creators

    Returns:
        int: Number of creators enqueued
    """
    try:
        logger.info("🚀 Starting Instagram scraper controller (Redis Queue Mode)")

        # Connect to Supabase
        supabase = get_supabase_client()
        logger.info("✅ Connected to Supabase")

        # Connect to Redis
        r = get_redis_client()
        r.ping()  # Test connection
        logger.info(f"✅ Connected to Redis at {os.getenv('REDIS_HOST', 'localhost')}")

        # Fetch creators from database
        query = supabase.table('instagram_creators').select('*')

        if enabled_only:
            query = query.eq('enabled', True)

        if limit:
            query = query.limit(limit)

        result = query.execute()
        creators = result.data

        logger.info(f"📊 Found {len(creators)} creators to enqueue")

        if not creators:
            logger.warning("⚠️ No creators found in database")
            return 0

        # Add each creator to queue
        queue_name = 'instagram_scraper_queue'
        queued_count = 0

        for creator in creators:
            creator_id = creator.get('id')
            username = creator.get('username', 'unknown')

            # Skip if already in queue (optional deduplication)
            # You could check if creator_id is already queued by maintaining a set

            job_data = {
                'creator_id': creator_id,
                'username': username,
                'timestamp': datetime.now(timezone.utc).isoformat(),
                'retry_count': 0
            }

            # Push to Redis queue (LPUSH adds to left/head of list)
            # Workers will BRPOP from right/tail (FIFO order)
            r.lpush(queue_name, json.dumps(job_data))
            queued_count += 1

            logger.info(f"✅ Queued: {username} (ID: {creator_id})")

        # Get current queue length
        queue_length = r.llen(queue_name)

        logger.info(f"🎉 Successfully queued {queued_count} creators")
        logger.info(f"📊 Current queue length: {queue_length} jobs")

        return queued_count

    except redis.ConnectionError as e:
        logger.error(f"❌ Redis connection error: {e}")
        logger.error("   Check REDIS_HOST and REDIS_PASSWORD environment variables")
        return 0

    except Exception as e:
        logger.error(f"❌ Error enqueueing creators: {e}", exc_info=True)
        return 0


def get_queue_status() -> dict:
    """
    Get current status of Instagram scraper queue

    Returns:
        dict: Queue status with length and sample jobs
    """
    try:
        r = get_redis_client()
        r.ping()

        queue_name = 'instagram_scraper_queue'
        queue_length = r.llen(queue_name)

        # Get sample of first 5 jobs (without removing them)
        sample_jobs = []
        if queue_length > 0:
            raw_jobs = r.lrange(queue_name, 0, 4)  # Get first 5
            sample_jobs = [json.loads(job) for job in raw_jobs]

        return {
            'queue_name': queue_name,
            'queue_length': queue_length,
            'sample_jobs': sample_jobs,
            'status': 'healthy'
        }

    except Exception as e:
        logger.error(f"❌ Error getting queue status: {e}")
        return {
            'queue_name': 'instagram_scraper_queue',
            'queue_length': 0,
            'sample_jobs': [],
            'status': 'error',
            'error': str(e)
        }


def clear_queue() -> int:
    """
    Clear all jobs from Instagram scraper queue

    WARNING: This deletes all pending jobs!

    Returns:
        int: Number of jobs deleted
    """
    try:
        r = get_redis_client()
        queue_name = 'instagram_scraper_queue'

        deleted_count = r.delete(queue_name)
        logger.info(f"🗑️ Cleared {deleted_count} jobs from queue")

        return deleted_count

    except Exception as e:
        logger.error(f"❌ Error clearing queue: {e}")
        return 0


def main():
    """Entry point for CLI usage"""
    import argparse

    parser = argparse.ArgumentParser(description='Instagram Scraper Controller (Redis Queue)')
    parser.add_argument('--limit', type=int, help='Max creators to enqueue')
    parser.add_argument('--status', action='store_true', help='Show queue status')
    parser.add_argument('--clear', action='store_true', help='Clear queue (WARNING: deletes all jobs!)')
    parser.add_argument('--all', action='store_true', help='Enqueue all creators (enabled + disabled)')

    args = parser.parse_args()

    if args.status:
        # Show queue status
        status = get_queue_status()
        logger.info("📊 Queue Status:")
        logger.info(f"   Length: {status['queue_length']} jobs")
        logger.info(f"   Status: {status['status']}")

        if status['sample_jobs']:
            logger.info("   Sample jobs:")
            for job in status['sample_jobs']:
                logger.info(f"     - {job.get('username')} (ID: {job.get('creator_id')})")

    elif args.clear:
        # Clear queue
        confirm = input("⚠️ Are you sure you want to clear ALL jobs? (yes/no): ")
        if confirm.lower() == 'yes':
            clear_queue()
        else:
            logger.info("❌ Cancelled")

    else:
        # Enqueue creators
        enabled_only = not args.all
        count = enqueue_creators(limit=args.limit, enabled_only=enabled_only)
        logger.info(f"✅ Enqueued {count} creators")


if __name__ == "__main__":
    main()
