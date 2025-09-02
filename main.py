#!/usr/bin/env python3
"""
Main entry point for Railway deployment
"""

import sys
import os
import asyncio

# Add src directory to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'src'))

from reddit_scraper import ProxyEnabledMultiScraper

async def main():
    """Main function for Railway deployment"""
    scraper = ProxyEnabledMultiScraper()
    
    try:
        await scraper.initialize()
        await scraper.test_proxy_scraping()
        
    except Exception as e:
        print(f"❌ Error: {e}")
    
    finally:
        await scraper.close()

if __name__ == "__main__":
    asyncio.run(main())
