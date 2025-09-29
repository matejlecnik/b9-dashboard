#!/usr/bin/env python3
"""
Continuous Reddit Scraper v3.0
Uses the simplified architecture with direct database operations
"""
import asyncio
import os
import sys
import logging
from datetime import datetime, timezone
from dotenv import load_dotenv
from pathlib import Path

# Setup path for imports
current_dir = os.path.dirname(os.path.abspath(__file__))
# In Docker: /app/app/scrapers/reddit -> need to go up 3 levels to /app
# In local: api-render/app/scrapers/reddit -> need to go up 2 levels to api-render/app
if '/app/app/scrapers' in current_dir:
    # Docker environment
    api_root = os.path.join(current_dir, '..', '..', '..')  # Goes to /app
    sys.path.insert(0, api_root)
    # Now we can import from app.*
    from app.scrapers.reddit.simple_main import SimplifiedRedditScraper
    from app.core.database.supabase_client import get_supabase_client
else:
    # Local environment
    api_root = os.path.join(current_dir, '..', '..')  # Goes to api-render/app
    sys.path.insert(0, api_root)
    # Local imports
    from scrapers.reddit.simple_main import SimplifiedRedditScraper
    from core.database.supabase_client import get_supabase_client

# Version tracking
SCRAPER_VERSION = "3.2.0 - Enhanced Supabase Logging"

# Load environment variables
env_path = Path(__file__).parent.parent.parent / '.env'
load_dotenv(env_path)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


class ContinuousScraperV3:
    """Manages continuous scraping with Supabase control - Simplified version"""

    def __init__(self):
        self.supabase = None
        self.scraper = None
        self.is_scraping = False
        self.last_check = None
        self.cycle_count = 0

    def initialize_supabase(self):
        """Initialize Supabase client"""
        self.supabase = get_supabase_client()
        logger.info("✅ Supabase client initialized")

    async def update_heartbeat(self):
        """Update heartbeat in database"""
        try:
            self.supabase.table('system_control').update({
                'last_heartbeat': datetime.now(timezone.utc).isoformat(),
                'pid': os.getpid(),
                'status': 'running'
            }).eq('script_name', 'reddit_scraper').execute()
        except Exception as e:
            logger.error(f"Error updating heartbeat: {e}")

    async def check_scraper_status(self):
        """Check if scraper should be running"""
        try:
            result = self.supabase.table('system_control').select('*').eq('script_name', 'reddit_scraper').execute()

            if result.data and len(result.data) > 0:
                control = result.data[0]
                enabled = control.get('enabled', False)

                # Log status change
                if self.last_check is not None and self.last_check != enabled:
                    status_msg = "✅ Scraper ENABLED" if enabled else "⏹️ Scraper DISABLED"
                    logger.info(f"{status_msg} via Supabase control")

                    # Log to Supabase
                    self.supabase.table('system_logs').insert({
                        'timestamp': datetime.now(timezone.utc).isoformat(),
                        'source': 'reddit_scraper',
                        'script_name': 'continuous_v3',
                        'level': 'info',
                        'message': status_msg,
                        'context': {'status_change': True, 'version': SCRAPER_VERSION}
                    }).execute()

                self.last_check = enabled
                return enabled, control
            else:
                # No control record, create default one
                logger.warning("No scraper control record found, creating default (disabled)")
                self.supabase.table('system_control').insert({
                    'script_name': 'reddit_scraper',
                    'script_type': 'scraper',
                    'enabled': False,
                    'status': 'stopped',
                    'config': {
                        'batch_size': 50,
                        'max_threads': 5,
                        'version': SCRAPER_VERSION
                    },
                    'updated_at': datetime.now(timezone.utc).isoformat(),
                    'updated_by': 'system'
                }).execute()
                return False, {}

        except Exception as e:
            logger.error(f"Error checking scraper status: {e}")
            return False, {}

    async def run_scraping_cycle(self, config):
        """Run one scraping cycle using simplified scraper"""
        if self.is_scraping:
            logger.warning("⚠️ Scraping already in progress, skipping cycle")
            return

        self.is_scraping = True
        self.cycle_count += 1
        cycle_start_time = datetime.now(timezone.utc)

        try:
            logger.info(f"🔄 Starting scraping cycle #{self.cycle_count} (v3.0 Simplified)")

            # Log cycle start
            self.supabase.table('system_logs').insert({
                'timestamp': cycle_start_time.isoformat(),
                'source': 'reddit_scraper',
                'script_name': 'continuous_v3',
                'level': 'info',
                'message': f'🔄 Starting scraping cycle #{self.cycle_count}',
                'context': {'cycle': self.cycle_count, 'version': SCRAPER_VERSION}
            }).execute()

            # Initialize scraper if needed
            if not self.scraper:
                logger.info("Initializing Simplified Reddit Scraper v3...")
                self.scraper = SimplifiedRedditScraper()
                await self.scraper.initialize()

            # Create control checker function
            async def control_checker():
                """Check if scraper should continue running"""
                try:
                    result = self.supabase.table('system_control').select('enabled').eq('script_name', 'reddit_scraper').execute()
                    if result.data and len(result.data) > 0:
                        return result.data[0].get('enabled', False)
                    return False
                except Exception as e:
                    logger.error(f"Error checking control status: {e}")
                    return False

            # Run the scraping
            await self.scraper.run_scraping_cycle(control_checker=control_checker)

            # Calculate cycle duration
            cycle_end_time = datetime.now(timezone.utc)
            cycle_duration = (cycle_end_time - cycle_start_time).total_seconds()
            duration_str = f"{int(cycle_duration // 60)}m {int(cycle_duration % 60)}s" if cycle_duration >= 60 else f"{cycle_duration:.1f}s"

            # Get stats from scraper
            stats = self.scraper.stats if hasattr(self.scraper, 'stats') else {}

            # Log cycle completion
            self.supabase.table('system_logs').insert({
                'timestamp': cycle_end_time.isoformat(),
                'source': 'reddit_scraper',
                'script_name': 'continuous_v3',
                'level': 'success',
                'message': f'✅ Completed scraping cycle #{self.cycle_count} in {duration_str}',
                'context': {
                    'cycle': self.cycle_count,
                    'duration_seconds': cycle_duration,
                    'duration_formatted': duration_str,
                    'version': SCRAPER_VERSION,
                    'subreddits_processed': stats.get('subreddits_processed', 0),
                    'users_processed': stats.get('users_processed', 0),
                    'posts_processed': stats.get('posts_processed', 0),
                    'new_subreddits_discovered': stats.get('new_subreddits_discovered', 0)
                },
                'duration_ms': int(cycle_duration * 1000)
            }).execute()

            logger.info(f"✅ Completed scraping cycle #{self.cycle_count} in {duration_str}")

        except Exception as e:
            logger.error(f"❌ Error in scraping cycle #{self.cycle_count}: {e}")

            # Log error
            self.supabase.table('system_logs').insert({
                'timestamp': datetime.now(timezone.utc).isoformat(),
                'source': 'reddit_scraper',
                'script_name': 'continuous_v3',
                'level': 'error',
                'message': f'❌ Error in cycle #{self.cycle_count}: {str(e)}',
                'context': {'cycle': self.cycle_count, 'error': str(e)}
            }).execute()

        finally:
            self.is_scraping = False

    async def heartbeat_task(self):
        """Background task to update heartbeat every 30 seconds"""
        while True:
            try:
                await self.update_heartbeat()
                await asyncio.sleep(30)
            except Exception as e:
                logger.error(f"Error in heartbeat task: {e}")
                await asyncio.sleep(30)

    async def run_continuous(self):
        """Main continuous loop - checks every 30 seconds"""
        logger.info(f"🚀 Starting continuous scraper v{SCRAPER_VERSION} with 30-second check interval")

        # Initialize Supabase
        self.initialize_supabase()

        # Log startup
        self.supabase.table('system_logs').insert({
            'timestamp': datetime.now(timezone.utc).isoformat(),
            'source': 'reddit_scraper',
            'script_name': 'continuous_v3',
            'level': 'info',
            'message': f'🚀 Continuous scraper started (v{SCRAPER_VERSION})',
            'context': {
                'version': SCRAPER_VERSION,
                'pid': os.getpid(),
                'check_interval': 30
            }
        }).execute()

        # Set initial status
        self.supabase.table('system_control').update({
            'status': 'running',
            'started_at': datetime.now(timezone.utc).isoformat(),
            'pid': os.getpid(),
            'updated_at': datetime.now(timezone.utc).isoformat()
        }).eq('script_name', 'reddit_scraper').execute()

        # Start heartbeat task in background
        heartbeat_task = asyncio.create_task(self.heartbeat_task())
        logger.info("💓 Started heartbeat background task")

        try:
            while True:
                # Check if scraper should be running
                enabled, config = await self.check_scraper_status()

                if enabled and not self.is_scraping:
                    try:
                        # Run a scraping cycle with timeout
                        logger.info("⏱️ Starting scraping cycle with 5-minute timeout")
                        await asyncio.wait_for(
                            self.run_scraping_cycle(config),
                            timeout=300  # 5 minutes timeout
                        )
                    except asyncio.TimeoutError:
                        logger.error("❌ Scraping cycle timed out after 5 minutes")
                        self.is_scraping = False
                        # Log timeout to database
                        self.supabase.table('system_logs').insert({
                            'timestamp': datetime.now(timezone.utc).isoformat(),
                            'source': 'reddit_scraper',
                            'script_name': 'continuous_v3',
                            'level': 'error',
                            'message': '❌ Scraping cycle timed out',
                            'context': {'cycle': self.cycle_count, 'timeout_seconds': 300}
                        }).execute()

                    # Wait before checking again (avoid rapid cycling)
                    await asyncio.sleep(30)
                else:
                    # Not enabled or already scraping, check again in 30 seconds
                    if not enabled:
                        logger.debug("⏸️ Scraper disabled, waiting...")
                    await asyncio.sleep(30)

        except KeyboardInterrupt:
            logger.info("⏹️ Received shutdown signal")
        except Exception as e:
            logger.error(f"❌ Fatal error in continuous loop: {e}")
        finally:
            # Cleanup
            logger.info("🧹 Cleaning up...")

            # Update control status
            try:
                self.supabase.table('system_control').update({
                    'status': 'stopped',
                    'stopped_at': datetime.now(timezone.utc).isoformat(),
                    'pid': None,
                    'updated_at': datetime.now(timezone.utc).isoformat()
                }).eq('script_name', 'reddit_scraper').execute()

                # Log shutdown
                self.supabase.table('system_logs').insert({
                    'timestamp': datetime.now(timezone.utc).isoformat(),
                    'source': 'reddit_scraper',
                    'script_name': 'continuous_v3',
                    'level': 'info',
                    'message': '⏹️ Continuous scraper stopped',
                    'context': {
                        'version': SCRAPER_VERSION,
                        'total_cycles': self.cycle_count
                    }
                }).execute()
            except Exception as e:
                logger.error(f"Error updating shutdown status: {e}")

            # Cleanup scraper
            if self.scraper:
                await self.scraper.cleanup()

            logger.info("✅ Shutdown complete")


async def main():
    """Main entry point"""
    continuous_scraper = ContinuousScraperV3()
    await continuous_scraper.run_continuous()


if __name__ == "__main__":
    asyncio.run(main())