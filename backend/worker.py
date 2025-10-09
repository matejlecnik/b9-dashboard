#!/usr/bin/env python3
"""
B9 Dashboard Worker - Redis Queue Processor
Pulls Instagram scraper jobs from Redis queue and processes them

Architecture:
- Workers pull jobs from Redis queue (BRPOP - blocking pop)
- Each job contains a creator_id to process
- Worker fetches creator data from Supabase
- Worker runs InstagramScraperUnified on the creator
- Results are saved back to Supabase
- Failed jobs can be retried or logged

Usage:
    WORKER_ID=1 python backend/worker.py
"""

import asyncio
import json
import logging
import os
import signal
import sys
from datetime import datetime, timezone
from typing import Dict

import redis


# Add backend to Python path
sys.path.insert(0, os.path.join(os.path.dirname(__file__)))

from app.core.database.supabase_client import get_supabase_client
from app.scrapers.instagram.services.instagram_scraper import InstagramScraperUnified


# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - [Worker-%(worker_id)s] - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(sys.stdout),
        logging.FileHandler(f'logs/worker-{os.getenv("WORKER_ID", "unknown")}.log')
    ]
)
logger = logging.getLogger(__name__)
logger = logging.LoggerAdapter(logger, {'worker_id': os.getenv('WORKER_ID', 'unknown')})

# Global flag for graceful shutdown
should_stop = False


def signal_handler(sig, frame):
    """Handle shutdown signals (SIGINT, SIGTERM)"""
    global should_stop
    logger.info("🛑 Shutdown signal received, finishing current job...")
    should_stop = True


async def process_job(job_data: Dict) -> bool:
    """
    Process a single scraper job

    Args:
        job_data: Dict with creator_id, username, timestamp

    Returns:
        bool: True if successful, False otherwise
    """
    try:
        creator_id = job_data.get('creator_id')
        username = job_data.get('username', 'unknown')

        logger.info(f"🚀 Processing creator: {username} (ID: {creator_id})")

        # Initialize Supabase client
        supabase = get_supabase_client()

        # Fetch creator data from database
        creator_result = supabase.table('instagram_creators') \
            .select('*') \
            .eq('id', creator_id) \
            .single() \
            .execute()

        if not creator_result.data:
            logger.error(f"❌ Creator not found in database: {creator_id}")
            return False

        creator = creator_result.data

        # Initialize Instagram scraper
        scraper = InstagramScraperUnified(supabase_client=supabase)

        # Process the creator (scrape posts, reels, upload to R2, save to DB)
        success = await scraper.process_creator_async(creator)

        if success:
            logger.info(f"✅ Successfully processed creator: {username}")

            # Update last_scraped timestamp
            supabase.table('instagram_creators') \
                .update({'last_scraped': datetime.now(timezone.utc).isoformat()}) \
                .eq('id', creator_id) \
                .execute()

            return True
        else:
            logger.error(f"❌ Failed to process creator: {username}")
            return False

    except Exception as e:
        logger.error(f"❌ Error processing job: {e}", exc_info=True)
        return False


async def worker_loop():
    """
    Main worker loop - continuously pulls jobs from Redis queue

    Flow:
    1. Connect to Redis server (on API server)
    2. BRPOP from instagram_scraper_queue (blocks until job available)
    3. Process job asynchronously
    4. Log success/failure
    5. Repeat until shutdown signal
    """
    global should_stop

    worker_id = os.getenv('WORKER_ID', 'unknown')
    redis_host = os.getenv('REDIS_HOST', 'localhost')
    redis_port = int(os.getenv('REDIS_PORT', 6379))
    redis_password = os.getenv('REDIS_PASSWORD', '')
    queue_name = 'instagram_scraper_queue'

    logger.info(f"🔗 Connecting to Redis at {redis_host}:{redis_port}...")

    # Connect to Redis
    try:
        r = redis.Redis(
            host=redis_host,
            port=redis_port,
            password=redis_password,
            decode_responses=True,
            socket_connect_timeout=10,
            socket_timeout=10,
            retry_on_timeout=True
        )

        # Test connection
        r.ping()
        logger.info("✅ Connected to Redis successfully")

    except redis.ConnectionError as e:
        logger.error(f"❌ Failed to connect to Redis: {e}")
        logger.error(f"   Check REDIS_HOST ({redis_host}) and REDIS_PASSWORD")
        return

    logger.info(f"👷 Worker {worker_id} is ready to process jobs from '{queue_name}'")

    # Statistics
    jobs_processed = 0
    jobs_succeeded = 0
    jobs_failed = 0
    start_time = datetime.now(timezone.utc)

    while not should_stop:
        try:
            # Block and wait for a job (BRPOP waits up to 5 seconds)
            # Using BRPOP (right pop) to process jobs in FIFO order
            job = r.brpop(queue_name, timeout=5)

            if job:
                # job is a tuple: (queue_name, job_data_json)
                _, job_data_json = job

                # Parse job data
                try:
                    job_data = json.loads(job_data_json)
                except json.JSONDecodeError:
                    logger.error(f"❌ Invalid JSON in job data: {job_data_json}")
                    continue

                logger.info(f"📦 Received job: {job_data.get('username', 'unknown')}")

                # Process the job
                success = await process_job(job_data)

                jobs_processed += 1
                if success:
                    jobs_succeeded += 1
                    logger.info(f"✅ Job completed (Success rate: {jobs_succeeded}/{jobs_processed})")
                else:
                    jobs_failed += 1
                    logger.error(f"❌ Job failed (Failure rate: {jobs_failed}/{jobs_processed})")

                    # Optionally: Re-queue failed jobs with retry count
                    # retry_count = job_data.get('retry_count', 0)
                    # if retry_count < 3:
                    #     job_data['retry_count'] = retry_count + 1
                    #     r.lpush(queue_name, json.dumps(job_data))
                    #     logger.info(f"🔄 Re-queued job (retry {retry_count + 1}/3)")

            else:
                # No jobs available, continue waiting
                # This is normal - BRPOP returns None after timeout
                pass

        except redis.ConnectionError as e:
            logger.error(f"❌ Redis connection error: {e}")
            logger.info("🔄 Attempting to reconnect in 10 seconds...")
            await asyncio.sleep(10)

            # Try to reconnect
            try:
                r = redis.Redis(
                    host=redis_host,
                    port=redis_port,
                    password=redis_password,
                    decode_responses=True,
                    socket_connect_timeout=10,
                    socket_timeout=10,
                    retry_on_timeout=True
                )
                r.ping()
                logger.info("✅ Reconnected to Redis")
            except Exception as reconnect_error:
                logger.error(f"❌ Reconnection failed: {reconnect_error}")

        except Exception as e:
            logger.error(f"❌ Unexpected worker error: {e}", exc_info=True)
            await asyncio.sleep(5)  # Brief pause before continuing

    # Shutdown statistics
    runtime = datetime.now(timezone.utc) - start_time
    logger.info(f"👋 Worker {worker_id} shutting down gracefully")
    logger.info(f"📊 Runtime: {runtime}")
    logger.info(f"📊 Jobs processed: {jobs_processed}")
    logger.info(f"📊 Success: {jobs_succeeded} ({jobs_succeeded/jobs_processed*100:.1f}%)" if jobs_processed > 0 else "📊 No jobs processed")
    logger.info(f"📊 Failed: {jobs_failed} ({jobs_failed/jobs_processed*100:.1f}%)" if jobs_processed > 0 else "")


def main():
    """Entry point - setup signals and start worker loop"""

    # Display startup banner
    worker_id = os.getenv('WORKER_ID', 'unknown')
    logger.info("=" * 60)
    logger.info("🚀 B9 Dashboard Worker Starting...")
    logger.info(f"   Worker ID: {worker_id}")
    logger.info(f"   Redis Host: {os.getenv('REDIS_HOST', 'localhost')}")
    logger.info(f"   Environment: {os.getenv('ENVIRONMENT', 'development')}")
    logger.info("=" * 60)

    # Handle shutdown signals
    signal.signal(signal.SIGINT, signal_handler)
    signal.signal(signal.SIGTERM, signal_handler)

    # Run worker loop
    try:
        asyncio.run(worker_loop())
    except KeyboardInterrupt:
        logger.info("🛑 Keyboard interrupt received")
    except Exception as e:
        logger.error(f"❌ Fatal error: {e}", exc_info=True)
        sys.exit(1)

    logger.info("👋 Worker shutdown complete")


if __name__ == "__main__":
    main()
