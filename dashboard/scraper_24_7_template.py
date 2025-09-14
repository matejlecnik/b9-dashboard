#!/usr/bin/env python3
"""
24/7 Reddit Scraper with Cycle Tracking
This scraper runs continuously, processing all data and then restarting
"""

import os
import sys
import time
import json
import logging
from datetime import datetime, timedelta
from typing import Dict, List, Optional
import traceback

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger('reddit_scraper_24_7')

class CycleTracker:
    """Track scraper cycles for monitoring"""

    def __init__(self):
        self.current_cycle_start = None
        self.last_cycle_duration = None
        self.cycle_count = 0
        self.items_processed_this_cycle = 0
        self.errors_this_cycle = 0

    def start_cycle(self):
        """Start a new scraping cycle"""
        self.current_cycle_start = datetime.now()
        self.items_processed_this_cycle = 0
        self.errors_this_cycle = 0
        self.cycle_count += 1

        logger.info(f"🔄 Starting cycle #{self.cycle_count} at {self.current_cycle_start}")
        self.log_cycle_start()

    def end_cycle(self):
        """End the current cycle and calculate duration"""
        if self.current_cycle_start:
            cycle_end = datetime.now()
            self.last_cycle_duration = cycle_end - self.current_cycle_start

            logger.info(f"""
            ✅ Completed cycle #{self.cycle_count}
            ⏱️ Duration: {self.last_cycle_duration}
            📊 Items processed: {self.items_processed_this_cycle}
            ❌ Errors: {self.errors_this_cycle}
            """)

            self.log_cycle_complete()

    def log_cycle_start(self):
        """Log cycle start to Supabase"""
        try:
            # This would connect to your Supabase instance
            log_data = {
                'timestamp': datetime.now().isoformat(),
                'level': 'info',
                'message': f'🔄 Cycle #{self.cycle_count} started',
                'source': 'scraper',
                'context': json.dumps({
                    'event': 'cycle_start',
                    'cycle_number': self.cycle_count,
                    'start_time': self.current_cycle_start.isoformat()
                })
            }
            # supabase.table('reddit_scraper_logs').insert(log_data).execute()
            logger.debug(f"Logged cycle start: {log_data}")
        except Exception as e:
            logger.error(f"Failed to log cycle start: {e}")

    def log_cycle_complete(self):
        """Log cycle completion to Supabase"""
        try:
            # This would connect to your Supabase instance
            log_data = {
                'timestamp': datetime.now().isoformat(),
                'level': 'success',
                'message': f'✅ Cycle #{self.cycle_count} completed in {self.last_cycle_duration}',
                'source': 'scraper',
                'context': json.dumps({
                    'event': 'cycle_complete',
                    'cycle_number': self.cycle_count,
                    'duration_seconds': self.last_cycle_duration.total_seconds() if self.last_cycle_duration else 0,
                    'items_processed': self.items_processed_this_cycle,
                    'errors': self.errors_this_cycle
                })
            }
            # supabase.table('reddit_scraper_logs').insert(log_data).execute()
            logger.debug(f"Logged cycle complete: {log_data}")
        except Exception as e:
            logger.error(f"Failed to log cycle completion: {e}")

    def increment_processed(self, count: int = 1):
        """Increment processed items counter"""
        self.items_processed_this_cycle += count

    def increment_errors(self, count: int = 1):
        """Increment error counter"""
        self.errors_this_cycle += count

    def get_cycle_status(self) -> Dict:
        """Get current cycle status for API"""
        elapsed = None
        if self.current_cycle_start:
            elapsed = (datetime.now() - self.current_cycle_start).total_seconds()

        return {
            'current_cycle': self.cycle_count,
            'cycle_start': self.current_cycle_start.isoformat() if self.current_cycle_start else None,
            'elapsed_seconds': elapsed,
            'elapsed_formatted': self.format_duration(elapsed) if elapsed else None,
            'last_cycle_duration': self.last_cycle_duration.total_seconds() if self.last_cycle_duration else None,
            'last_cycle_formatted': self.format_duration(self.last_cycle_duration.total_seconds()) if self.last_cycle_duration else None,
            'items_processed': self.items_processed_this_cycle,
            'errors': self.errors_this_cycle
        }

    @staticmethod
    def format_duration(seconds: float) -> str:
        """Format duration in human-readable format"""
        if not seconds:
            return "0s"

        hours = int(seconds // 3600)
        minutes = int((seconds % 3600) // 60)
        secs = int(seconds % 60)

        parts = []
        if hours > 0:
            parts.append(f"{hours}h")
        if minutes > 0:
            parts.append(f"{minutes}m")
        if secs > 0 or not parts:
            parts.append(f"{secs}s")

        return " ".join(parts)

class Reddit24_7Scraper:
    """Main scraper class that runs 24/7"""

    def __init__(self):
        self.cycle_tracker = CycleTracker()
        self.running = True
        self.cycle_delay = 60  # Delay between cycles in seconds

    def should_run(self) -> bool:
        """Check if scraper should run based on environment variable"""
        scraper_enabled = os.getenv('SCRAPER_ENABLED', 'true').lower()
        return scraper_enabled in ['true', '1', 'yes', 'on']

    def process_subreddits(self):
        """Process all subreddits in the queue"""
        logger.info("📋 Processing subreddits...")

        # Simulate processing subreddits
        # In real implementation, this would:
        # 1. Get list of subreddits from database
        # 2. Process each subreddit
        # 3. Save results back to database

        subreddits = ['python', 'javascript', 'golang']  # Example

        for subreddit in subreddits:
            try:
                logger.info(f"Processing r/{subreddit}")
                # Your actual scraping logic here
                time.sleep(2)  # Simulate work
                self.cycle_tracker.increment_processed()
            except Exception as e:
                logger.error(f"Error processing r/{subreddit}: {e}")
                self.cycle_tracker.increment_errors()

    def process_users(self):
        """Process all users in the queue"""
        logger.info("👥 Processing users...")

        # Simulate processing users
        users = ['user1', 'user2', 'user3']  # Example

        for user in users:
            try:
                logger.info(f"Processing u/{user}")
                # Your actual user processing logic here
                time.sleep(1)  # Simulate work
                self.cycle_tracker.increment_processed()
            except Exception as e:
                logger.error(f"Error processing u/{user}: {e}")
                self.cycle_tracker.increment_errors()

    def run_cycle(self):
        """Run a complete scraping cycle"""
        try:
            self.cycle_tracker.start_cycle()

            # Process all data types in sequence
            self.process_subreddits()
            self.process_users()
            # Add more processing methods as needed

            self.cycle_tracker.end_cycle()

        except Exception as e:
            logger.error(f"Critical error in cycle: {e}")
            logger.error(traceback.format_exc())
            self.cycle_tracker.increment_errors()
            self.cycle_tracker.end_cycle()

    def save_cycle_status(self):
        """Save cycle status to file for API to read"""
        try:
            status = self.cycle_tracker.get_cycle_status()
            with open('/tmp/scraper_cycle_status.json', 'w') as f:
                json.dump(status, f)
        except Exception as e:
            logger.error(f"Failed to save cycle status: {e}")

    def run_forever(self):
        """Run the scraper continuously"""
        logger.info("🚀 Starting 24/7 Reddit Scraper")

        while self.running:
            try:
                # Check if scraper should run
                if not self.should_run():
                    logger.info("⏸️ Scraper is disabled. Waiting...")
                    time.sleep(60)
                    continue

                # Run a complete cycle
                self.run_cycle()

                # Save status for monitoring
                self.save_cycle_status()

                # Wait before starting next cycle
                logger.info(f"⏳ Waiting {self.cycle_delay}s before next cycle...")
                time.sleep(self.cycle_delay)

            except KeyboardInterrupt:
                logger.info("🛑 Scraper stopped by user")
                self.running = False
                break
            except Exception as e:
                logger.error(f"Unexpected error in main loop: {e}")
                logger.error(traceback.format_exc())
                time.sleep(60)  # Wait before retrying

def main():
    """Main entry point"""
    scraper = Reddit24_7Scraper()

    try:
        scraper.run_forever()
    except Exception as e:
        logger.error(f"Fatal error: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()