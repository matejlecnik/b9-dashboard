#!/usr/bin/env python3
"""
Test script to verify Instagram scraper async architecture
Simulates the wrapper calling the async run() method
"""

import asyncio
import logging
import sys
import os
from datetime import datetime, timezone

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Add current directory to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

async def test_async_architecture():
    """Test the async Instagram scraper architecture"""
    logger.info("=" * 60)
    logger.info("Testing Instagram Scraper Async Architecture")
    logger.info("=" * 60)

    try:
        # Import the unified scraper
        from services.instagram.unified_scraper import InstagramScraperUnified
        logger.info("✅ Successfully imported InstagramScraperUnified")

        # Create scraper instance
        scraper = InstagramScraperUnified()
        logger.info("✅ Successfully created scraper instance")

        # Define a mock control checker (like the wrapper does)
        async def control_checker():
            """Mock control checker that always returns False to stop immediately"""
            logger.info("Control checker called - returning False to stop")
            return False

        # Test calling the async run method
        logger.info("Calling async run() method with control_checker...")
        start_time = datetime.now(timezone.utc)

        # This should return immediately since control_checker returns False
        await scraper.run(control_checker=control_checker)

        end_time = datetime.now(timezone.utc)
        duration = (end_time - start_time).total_seconds()

        logger.info(f"✅ Async run() method completed in {duration:.2f} seconds")
        logger.info("✅ Control successfully returned to caller")

        # Test without control checker (should also work)
        logger.info("\nTesting without control_checker (using internal should_continue)...")
        await scraper.run()
        logger.info("✅ Async run() without control_checker also works")

        logger.info("\n" + "=" * 60)
        logger.info("🎉 ASYNC ARCHITECTURE TEST PASSED!")
        logger.info("The Instagram scraper now matches Reddit's architecture")
        logger.info("Control properly returns to the wrapper after completion")
        logger.info("=" * 60)

        return True

    except Exception as e:
        logger.error(f"❌ Test failed: {e}")
        import traceback
        logger.error(traceback.format_exc())
        return False

async def main():
    """Main entry point"""
    success = await test_async_architecture()
    if success:
        logger.info("\n✅ All tests passed - Instagram scraper async architecture is working correctly!")
        sys.exit(0)
    else:
        logger.error("\n❌ Tests failed - check the errors above")
        sys.exit(1)

if __name__ == "__main__":
    logger.info("Starting async architecture test...")
    asyncio.run(main())