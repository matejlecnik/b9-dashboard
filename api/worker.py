#!/usr/bin/env python3
"""
B9 Dashboard API - Background Worker Service
Continuous Reddit scraper for 24/7 operation on Render
"""

import os
import asyncio
import json
import logging
import signal
import sys
import time
from datetime import datetime, timedelta, timezone
from typing import Dict, Any, Optional, List
from dotenv import load_dotenv
import redis.asyncio as redis

# Load environment variables
load_dotenv()

# Import services after environment setup
from services.categorization_service import CategorizationService
from services.scraper_service import RedditScraperService
from services.user_service import UserService
from services.logging_service import SupabaseLoggingService
from utils.cache import cache_manager
from supabase import create_client

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

class ContinuousScraperWorker:
    """
    Continuous Reddit scraper worker for 24/7 operation
    Manages job queues, rate limiting, and automatic recovery
    """

    def __init__(self):
        self.running = False
        self.supabase = None
        self.redis_client = None
        self.services = {}

        # Scraping configuration
        self.config = {
            'enabled': False,
            'batch_size': 10,
            'delay_between_batches': 30,  # seconds
            'max_daily_requests': 10000,
            'pause_on_rate_limit': True,
            'auto_recover': True,
            'priority_subreddits': [],
            'blacklisted_subreddits': []
        }

        # Statistics
        self.stats = {
            'start_time': datetime.now(timezone.utc),
            'total_requests': 0,
            'successful_requests': 0,
            'failed_requests': 0,
            'subreddits_processed': 0,
            'posts_collected': 0,
            'users_discovered': 0,
            'last_activity': None,
            'daily_requests': 0,
            'daily_reset_time': datetime.now(timezone.utc).replace(hour=0, minute=0, second=0)
        }

        # Job queue priorities
        self.job_priorities = {
            'priority': 1,
            'new_discovery': 2,
            'update': 3,
            'user_analysis': 4
        }

        # Reddit accounts configuration
        self.reddit_accounts = []
        self.proxy_configs = []

    async def initialize(self):
        """Initialize worker and all services"""
        logger.info("🔧 Initializing Continuous Scraper Worker...")

        try:
            # Initialize Supabase
            supabase_url = os.getenv("SUPABASE_URL")
            supabase_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
            openai_key = os.getenv("OPENAI_API_KEY")
            redis_url = os.getenv("REDIS_URL", "redis://localhost:6379")

            if not all([supabase_url, supabase_key]):
                raise Exception("Missing required environment variables")

            self.supabase = create_client(supabase_url, supabase_key)

            # Initialize Redis for job queue
            self.redis_client = await redis.from_url(redis_url)

            # Initialize logging service
            logging_service = SupabaseLoggingService(self.supabase)

            # Initialize scraper service
            self.services['scraper'] = RedditScraperService(self.supabase, logging_service)

            # Load Reddit accounts from environment or database
            await self._load_reddit_accounts()

            # Initialize Reddit clients
            if self.reddit_accounts:
                await self.services['scraper'].initialize_reddit_clients(
                    self.reddit_accounts,
                    self.proxy_configs
                )

            # Initialize other services
            self.services['categorization'] = CategorizationService(
                self.supabase, openai_key, logging_service
            ) if openai_key else None
            self.services['user'] = UserService(self.supabase, logging_service)

            # Initialize cache
            await cache_manager.initialize()

            # Load configuration from database
            await self._load_configuration()

            logger.info("✅ Continuous Scraper Worker initialized successfully")
            return True

        except Exception as e:
            logger.error(f"❌ Failed to initialize worker: {e}")
            return False

    async def _load_reddit_accounts(self):
        """Load Reddit account credentials"""
        try:
            # Try loading from environment variables
            for i in range(1, 11):  # Support up to 10 accounts
                client_id = os.getenv(f"REDDIT_CLIENT_ID_{i}")
                client_secret = os.getenv(f"REDDIT_CLIENT_SECRET_{i}")
                username = os.getenv(f"REDDIT_USERNAME_{i}")

                if client_id and client_secret:
                    self.reddit_accounts.append({
                        'client_id': client_id,
                        'client_secret': client_secret,
                        'username': username or f'account_{i}'
                    })

            # Load proxy configurations if available
            for i in range(1, 6):  # Support up to 5 proxies
                proxy_host = os.getenv(f"PROXY_HOST_{i}")
                proxy_port = os.getenv(f"PROXY_PORT_{i}")
                proxy_user = os.getenv(f"PROXY_USERNAME_{i}")
                proxy_pass = os.getenv(f"PROXY_PASSWORD_{i}")

                if proxy_host and proxy_port:
                    self.proxy_configs.append({
                        'host': proxy_host,
                        'port': proxy_port,
                        'username': proxy_user,
                        'password': proxy_pass
                    })

            logger.info(f"📱 Loaded {len(self.reddit_accounts)} Reddit accounts")
            logger.info(f"🔒 Loaded {len(self.proxy_configs)} proxy configurations")

        except Exception as e:
            logger.error(f"Error loading Reddit accounts: {e}")

    async def _load_configuration(self):
        """Load scraper configuration from database"""
        try:
            # Check Redis for configuration
            config_json = await self.redis_client.get('scraper_config')
            if config_json:
                config = json.loads(config_json)
                self.config.update(config)
                logger.info("📋 Loaded configuration from Redis")

            # Check if scraping is enabled
            enabled_flag = await self.redis_client.get('scraper_enabled')
            if enabled_flag:
                self.config['enabled'] = enabled_flag == b'true'

        except Exception as e:
            logger.error(f"Error loading configuration: {e}")

    async def start_continuous_scraping(self):
        """Start the continuous scraping process"""
        if not self.config['enabled']:
            logger.info("⏸️ Scraper is disabled. Waiting for activation...")
            await self._log_activity('info', 'Scraper is disabled, waiting for activation')
            return

        logger.info("🚀 Starting continuous scraping...")
        await self._log_activity('success', 'Starting continuous 24/7 scraping', {
            'accounts': len(self.reddit_accounts),
            'proxies': len(self.proxy_configs)
        })
        self.running = True

        while self.running and self.config['enabled']:
            try:
                # Check daily limit
                if await self._check_daily_limit():
                    logger.warning("⚠️ Daily request limit reached. Pausing until reset...")
                    await self._wait_for_daily_reset()
                    continue

                # Get next job from queue
                job = await self._get_next_job()

                if job:
                    await self._process_job(job)
                    self.stats['last_activity'] = datetime.now(timezone.utc)
                else:
                    # No jobs, discover new subreddits
                    await self._discover_new_subreddits()

                # Apply batch delay
                await asyncio.sleep(self.config['delay_between_batches'])

                # Reload configuration periodically
                if self.stats['total_requests'] % 100 == 0:
                    await self._load_configuration()

            except Exception as e:
                logger.error(f"❌ Error in scraping loop: {e}")
                if self.config['auto_recover']:
                    logger.info("🔄 Auto-recovering in 60 seconds...")
                    await asyncio.sleep(60)
                else:
                    break

    async def _check_daily_limit(self) -> bool:
        """Check if daily request limit has been reached"""
        # Reset daily counter if needed
        now = datetime.now(timezone.utc)
        if now.date() > self.stats['daily_reset_time'].date():
            self.stats['daily_requests'] = 0
            self.stats['daily_reset_time'] = now.replace(hour=0, minute=0, second=0)

        return self.stats['daily_requests'] >= self.config['max_daily_requests']

    async def _wait_for_daily_reset(self):
        """Wait until daily limit resets"""
        now = datetime.now(timezone.utc)
        tomorrow = (now + timedelta(days=1)).replace(hour=0, minute=0, second=0)
        wait_seconds = (tomorrow - now).total_seconds()

        logger.info(f"⏰ Waiting {wait_seconds/3600:.1f} hours until daily reset...")
        await asyncio.sleep(wait_seconds)

    async def _get_next_job(self) -> Optional[Dict[str, Any]]:
        """Get next job from priority queue"""
        try:
            # Check priority queues in order
            for priority_name in sorted(self.job_priorities, key=self.job_priorities.get):
                queue_name = f"scraper_queue:{priority_name}"
                job_data = await self.redis_client.lpop(queue_name)

                if job_data:
                    job = json.loads(job_data)
                    logger.info(f"📋 Got {priority_name} job: {job.get('type')}")
                    return job

            return None

        except Exception as e:
            logger.error(f"Error getting job from queue: {e}")
            return None

    async def _process_job(self, job: Dict[str, Any]):
        """Process a scraping job"""
        job_type = job.get('type')

        try:
            if job_type == 'subreddit':
                await self._scrape_subreddit(job.get('name'))
            elif job_type == 'user':
                await self._analyze_user(job.get('username'))
            elif job_type == 'discover':
                await self._discover_from_subreddit(job.get('name'))
            else:
                logger.warning(f"Unknown job type: {job_type}")

            # Update statistics
            self.stats['total_requests'] += 1
            self.stats['daily_requests'] += 1
            self.stats['successful_requests'] += 1

        except Exception as e:
            logger.error(f"Error processing job: {e}")
            self.stats['failed_requests'] += 1

            # Re-queue job with lower priority if it's retryable
            if job.get('retry_count', 0) < 3:
                job['retry_count'] = job.get('retry_count', 0) + 1
                await self._queue_job(job, priority='update')

    async def _scrape_subreddit(self, subreddit_name: str):
        """Scrape a single subreddit"""
        if not subreddit_name or subreddit_name in self.config['blacklisted_subreddits']:
            return

        logger.info(f"🔍 Scraping r/{subreddit_name}")
        await self._log_activity('info', f'Scraping r/{subreddit_name}')

        try:
            # Analyze subreddit
            result = await self.services['scraper'].analyze_subreddit(subreddit_name)

            if result:
                # Save data
                await self.services['scraper'].save_subreddit_data(
                    result['subreddit'],
                    result.get('reddit_posts', [])
                )

                self.stats['subreddits_processed'] += 1
                self.stats['posts_collected'] += len(result.get('reddit_posts', []))

                await self._log_activity('success', f'Successfully scraped r/{subreddit_name}', {
                    'posts_collected': len(result.get('reddit_posts', [])),
                    'processing_time_ms': result.get('processing_time_ms')
                })

                # Update Redis stats
                await self._update_redis_stats()

        except Exception as e:
            logger.error(f"Error scraping r/{subreddit_name}: {e}")
            await self._log_activity('error', f'Failed to scrape r/{subreddit_name}', {
                'error': str(e)
            })

    async def _analyze_user(self, username: str):
        """Analyze a Reddit user"""
        if not username:
            return

        try:
            user_data = await self.services['user'].analyze_user(username)
            if user_data:
                await self.services['user'].save_user(user_data)
                self.stats['users_discovered'] += 1

        except Exception as e:
            logger.error(f"Error analyzing user {username}: {e}")

    async def _discover_new_subreddits(self):
        """Discover new subreddits from trending or user activity"""
        logger.info("🔎 Discovering new subreddits...")

        try:
            # Get active users from database
            users_result = self.supabase.table('reddit_users').select('username').limit(20).execute()

            if users_result.data:
                usernames = [u['username'] for u in users_result.data]
                discovered = await self.services['scraper'].discover_subreddits_from_users(
                    usernames, max_users=5
                )

                # Queue discovered subreddits
                for subreddit in discovered:
                    await self._queue_job(
                        {'type': 'subreddit', 'name': subreddit},
                        priority='new_discovery'
                    )

                logger.info(f"📦 Discovered {len(discovered)} new subreddits")
                await self._log_activity('success', f'Discovered {len(discovered)} new subreddits', {
                    'reddit_subreddits': discovered[:10]  # Log first 10
                })

        except Exception as e:
            logger.error(f"Error discovering subreddits: {e}")
            await self._log_activity('error', 'Failed to discover new subreddits', {
                'error': str(e)
            })

    async def _discover_from_subreddit(self, subreddit_name: str):
        """Discover related subreddits from a given subreddit"""
        # Implementation for discovering related subreddits
        pass

    async def _queue_job(self, job: Dict[str, Any], priority: str = 'update'):
        """Add job to priority queue"""
        try:
            queue_name = f"scraper_queue:{priority}"
            job_data = json.dumps(job)
            await self.redis_client.rpush(queue_name, job_data)

        except Exception as e:
            logger.error(f"Error queuing job: {e}")

    async def _update_redis_stats(self):
        """Update statistics in Redis for monitoring"""
        try:
            stats_data = {
                **self.stats,
                'start_time': self.stats['start_time'].isoformat(),
                'last_activity': self.stats['last_activity'].isoformat() if self.stats['last_activity'] else None,
                'daily_reset_time': self.stats['daily_reset_time'].isoformat(),
                'config': self.config,
                'accounts_count': len(self.reddit_accounts),
                'proxies_count': len(self.proxy_configs)
            }

            await self.redis_client.set(
                'scraper_stats',
                json.dumps(stats_data),
                ex=300  # Expire after 5 minutes
            )

        except Exception as e:
            logger.error(f"Error updating Redis stats: {e}")

    async def _log_activity(self, level: str, message: str, context: dict = None):
        """Log activity to Redis for live monitoring"""
        try:
            log_entry = {
                'timestamp': datetime.now(timezone.utc).isoformat(),
                'level': level,
                'message': message,
                'context': context or {}
            }

            # Add to Redis list (keep last 1000 logs)
            await self.redis_client.lpush('reddit_scraper_logs', json.dumps(log_entry))
            await self.redis_client.ltrim('reddit_scraper_logs', 0, 999)

            # Also log to Python logger
            logger.info(f"[{level.upper()}] {message}")

        except Exception as e:
            logger.error(f"Error logging activity: {e}")

    async def stop(self):
        """Stop the scraper gracefully"""
        logger.info("🛑 Stopping continuous scraper...")
        self.running = False
        self.config['enabled'] = False

        # Save state to Redis
        await self.redis_client.set('scraper_enabled', 'false')
        await self._update_redis_stats()

    async def cleanup(self):
        """Cleanup resources"""
        logger.info("🧹 Cleaning up worker resources...")

        try:
            # Close scraper service
            if 'scraper' in self.services:
                await self.services['scraper'].close()

            # Close Redis connection
            if self.redis_client:
                await self.redis_client.close()

            # Close cache
            if cache_manager.is_connected:
                await cache_manager.close()

            logger.info("✅ Worker cleanup completed")

        except Exception as e:
            logger.error(f"Error during cleanup: {e}")

# Signal handlers for graceful shutdown
def signal_handler(signum, frame):
    logger.info(f"Received signal {signum}")
    asyncio.create_task(worker.stop())

async def main():
    """Main entry point for the worker"""
    global worker

    logger.info("🚀 B9 Dashboard Continuous Scraper Worker starting...")

    worker = ContinuousScraperWorker()

    # Set up signal handlers
    signal.signal(signal.SIGINT, signal_handler)
    signal.signal(signal.SIGTERM, signal_handler)

    # Initialize worker
    if not await worker.initialize():
        logger.error("Failed to initialize worker")
        sys.exit(1)

    logger.info("✅ Worker initialized and ready")

    # Check if scraping should start automatically
    auto_start = os.getenv("AUTO_START_SCRAPER", "false").lower() == "true"
    if auto_start:
        worker.config['enabled'] = True
        await worker.redis_client.set('scraper_enabled', 'true')

    # Start continuous scraping
    try:
        await worker.start_continuous_scraping()
    except KeyboardInterrupt:
        logger.info("Worker stopped by user")
    finally:
        await worker.cleanup()
        logger.info("Worker shut down complete")

if __name__ == "__main__":
    asyncio.run(main())