#!/usr/bin/env python3
"""
B9 Dashboard Worker - Redis Queue Processor
Pulls Instagram scraper jobs from Redis queue and processes them
"""

import asyncio
import json
import logging
import os
import signal
import sys

import redis


# Add backend to path
sys.path.insert(0, '/app/backend')

from app.core.database.supabase_client import get_supabase_client
from app.scrapers.instagram.services.instagram_scraper import InstagramScraperUnified


logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Global flag for graceful shutdown
should_stop = False

def signal_handler(sig, frame):
    """Handle shutdown signals"""
    global should_stop
    logger.info("\n🛑 Shutdown signal received, finishing current job...")
    should_stop = True

async def process_job(job_data: dict):
    """Process a single scraper job"""
    try:
        creator_id = job_data.get('creator_id')
        logger.info(f"🚀 Processing creator: {creator_id}")

        # Initialize scraper
        supabase = get_supabase_client()
        scraper = InstagramScraperUnified(supabase_client=supabase)

        # Fetch creator data from database
        creator_result = supabase.table('instagram_creators').select('*').eq('id', creator_id).single().execute()

        if creator_result.data:
            # Process the creator
            success = scraper.process_creator(creator_result.data)

            if success:
                logger.info(f"✅ Successfully processed creator: {creator_id}")
                return True
            else:
                logger.error(f"❌ Failed to process creator: {creator_id}")
                return False
        else:
            logger.error(f"❌ Creator not found in database: {creator_id}")
            return False

    except Exception as e:
        logger.error(f"❌ Error processing job: {e}", exc_info=True)
        return False

async def worker_loop():
    """Main worker loop - pulls jobs from Redis queue"""
    global should_stop

    worker_id = os.getenv('WORKER_ID', 'unknown')
    redis_host = os.getenv('REDIS_HOST', 'localhost')
    redis_port = int(os.getenv('REDIS_PORT', 6379))
    redis_password = os.getenv('REDIS_PASSWORD', '')

    # Connect to Redis
    r = redis.Redis(
        host=redis_host,
        port=redis_port,
        password=redis_password,
        decode_responses=True
    )

    logger.info(f"🔗 Worker {worker_id} connected to Redis at {redis_host}:{redis_port}")
    logger.info(f"👷 Worker {worker_id} is ready to process jobs")

    while not should_stop:
        try:
            # Block and wait for a job (BRPOP waits up to 5 seconds)
            job = r.brpop('instagram_scraper_queue', timeout=5)

            if job:
                # job is a tuple: (queue_name, job_data)
                queue_name, job_data_json = job

                # Parse job data
                job_data = json.loads(job_data_json)

                logger.info(f"📦 Worker {worker_id} received job: {job_data}")

                # Process the job
                success = await process_job(job_data)

                if success:
                    logger.info(f"✅ Worker {worker_id} completed job successfully")
                else:
                    logger.error(f"❌ Worker {worker_id} failed to complete job")
                    # Optionally: re-queue failed jobs
                    # r.lpush('instagram_scraper_queue', job_data_json)
            else:
                # No jobs available, continue waiting
                pass

        except redis.ConnectionError as e:
            logger.error(f"❌ Redis connection error: {e}")
            await asyncio.sleep(10)  # Wait before retry
        except Exception as e:
            logger.error(f"❌ Worker error: {e}", exc_info=True)
            await asyncio.sleep(5)  # Brief pause before continuing

    logger.info(f"👋 Worker {worker_id} shutting down gracefully")

if __name__ == "__main__":
    # Handle shutdown signals
    signal.signal(signal.SIGINT, signal_handler)
    signal.signal(signal.SIGTERM, signal_handler)

    logger.info("🚀 Starting B9 Dashboard Worker...")

    # Run worker loop
    asyncio.run(worker_loop())
