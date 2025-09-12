#!/usr/bin/env python3
"""
B9 Dashboard API - Background Worker Service
Render Background Workers for long-running tasks (replaces Celery)
"""

import os
import asyncio
import json
import logging
from datetime import datetime
from typing import Dict, Any, Optional
from dotenv import load_dotenv
import signal
import sys

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

class BackgroundWorker:
    """
    Background worker for processing long-running tasks
    Replaces Celery with simpler Redis queue-based processing
    """
    
    def __init__(self):
        self.running = False
        self.supabase = None
        self.services = {}
        self.job_queue = None
        self.current_job = None
        self.stats = {
            'jobs_processed': 0,
            'jobs_failed': 0,
            'start_time': datetime.now(),
            'last_job_time': None
        }
    
    async def initialize(self):
        """Initialize worker and all services"""
        logger.info("🔧 Initializing Background Worker...")
        
        try:
            # Initialize Supabase
            supabase_url = os.getenv("SUPABASE_URL")
            supabase_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
            openai_key = os.getenv("OPENAI_API_KEY")
            
            if not all([supabase_url, supabase_key, openai_key]):
                raise Exception("Missing required environment variables")
            
            self.supabase = create_client(supabase_url, supabase_key)
            
            # Initialize logging service
            logging_service = SupabaseLoggingService(self.supabase)
            
            # Initialize all services
            self.services = {
                'categorization': CategorizationService(self.supabase, openai_key, logging_service),
                'scraper': RedditScraperService(self.supabase, logging_service),
                'user': UserService(self.supabase, logging_service)
            }
            
            # Initialize cache
            await cache_manager.initialize()
            
            logger.info("✅ Background Worker initialized successfully")
            return True
            
        except Exception as e:
            logger.error(f"❌ Failed to initialize Background Worker: {e}")
            return False
    
    async def cleanup(self):
        """Cleanup resources"""
        logger.info("🧹 Cleaning up worker resources...")
        
        try:
            if cache_manager.is_connected:
                await cache_manager.close()
            
            logger.info("✅ Worker cleanup completed")
            
        except Exception as e:
            logger.error(f"Error during cleanup: {e}")

async def main():
    """Main entry point for the worker"""
    logger.info("🔧 B9 Dashboard Background Worker starting...")
    
    worker = BackgroundWorker()
    
    # Initialize worker
    if not await worker.initialize():
        logger.error("Failed to initialize worker")
        sys.exit(1)
    
    logger.info("✅ Worker initialized and ready")
    
    # Keep worker alive
    try:
        while True:
            await asyncio.sleep(30)
    except KeyboardInterrupt:
        logger.info("Worker stopped by user")
    finally:
        await worker.cleanup()
        logger.info("Worker shutting down...")

if __name__ == "__main__":
    asyncio.run(main())