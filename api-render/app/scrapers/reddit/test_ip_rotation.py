#!/usr/bin/env python3
"""Test if proxies are rotating IPs correctly with our aiohttp setup"""
import asyncio
import sys
import os
from dotenv import load_dotenv

load_dotenv()

# Setup path
current_dir = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(current_dir, "..", ".."))

from proxy_manager import ProxyManager
from public_reddit_api import PublicRedditAPI

async def test_ip_rotation():
    """Test if IPs rotate across requests"""

    # Initialize
    from core.database.supabase_client import get_supabase_client
    supabase = get_supabase_client()
    proxy_manager = ProxyManager(supabase)

    # Load and test proxies
    proxy_count = proxy_manager.load_proxies()
    print(f"✅ Loaded {proxy_count} proxies")

    working = proxy_manager.test_all_proxies()
    print(f"✅ {working} proxies working")

    # Get ONE proxy (should auto-rotate IPs)
    proxy = proxy_manager.get_next_proxy()
    print(f"\n🔍 Testing IP rotation with: {proxy['display_name']}")
    print(f"Proxy endpoint: {proxy['proxy'].split('@')[1]}")
    print("-" * 60)

    # Make 10 CONCURRENT requests using same proxy config (IPs should rotate)
    # This simulates what happens when we process 10 users in parallel
    async with PublicRedditAPI(proxy_manager) as api:
        async def check_ip(request_num):
            # Generate fresh user agent for each request (like scraper does)
            user_agent = proxy_manager.generate_user_agent()

            result = await api._request_with_retry(
                "https://api.ipify.org?format=json",
                proxy
            )
            if result and 'ip' in result:
                return (request_num, result['ip'], user_agent[:50])
            else:
                return (request_num, "FAILED", user_agent[:50])

        # Run all 10 requests concurrently (simulates batch processing)
        print("\n🚀 Firing 10 concurrent requests with unique user agents...")
        results = await asyncio.gather(*[check_ip(i+1) for i in range(10)])

        # Print results
        print("\nResults:")
        for req_num, ip, ua in sorted(results):
            print(f"Request {req_num}: IP = {ip:20} | UA = {ua}...")

    print("-" * 60)
    print("\n✅ If IPs are different → Rotation working")
    print("❌ If IPs are same → aiohttp session preventing rotation")

if __name__ == "__main__":
    asyncio.run(test_ip_rotation())