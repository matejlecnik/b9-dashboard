#!/usr/bin/env python3
"""
Reddit Proxy Manager
Handles proxy loading from Supabase, testing, rotation, and health tracking
"""
import os
import sys
import time
import logging
import random
import requests
from typing import Dict
from concurrent.futures import ThreadPoolExecutor, as_completed
from fake_useragent import UserAgent
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Setup imports
current_dir = os.path.dirname(os.path.abspath(__file__))
if "/app/app/scrapers" in current_dir:
    api_root = os.path.join(current_dir, "..", "..", "..")
    sys.path.insert(0, api_root)
    from app.core.database.supabase_client import get_supabase_client
else:
    api_root = os.path.join(current_dir, "..", "..")
    sys.path.insert(0, api_root)
    from core.database.supabase_client import get_supabase_client

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")
logger = logging.getLogger(__name__)

# Reduce noise from external libraries
logging.getLogger('fake_useragent').setLevel(logging.ERROR)


class ProxyManager:
    """Manages proxy loading, testing, rotation, and health tracking"""

    def __init__(self, supabase=None):
        """Initialize proxy manager

        Args:
            supabase: Supabase client (optional, will create if not provided)
        """
        self.supabase = supabase or get_supabase_client()
        self.proxies = []
        self._proxy_index = 0
        self.ua_generator = None

        # User agent fallback pool (same as backup scraper)
        self.user_agent_pool = [
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/119.0',
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15',
            'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36'
        ]

        # Initialize fake-useragent generator
        try:
            self.ua_generator = UserAgent()
            logger.info("✅ User agent ready")
        except Exception as e:
            logger.warning(f"⚠️ User agent initialization failed: {e}")

    def generate_user_agent(self) -> str:
        """Generate random user agent (same logic as backup scraper)

        Returns:
            str: Random user agent string
        """
        # 75% fake-useragent, 25% fallback pool
        if self.ua_generator and random.random() < 0.75:
            try:
                rand = random.random()
                if rand < 0.50:
                    # Chrome user agent (most common)
                    return self.ua_generator.chrome
                elif rand < 0.70:
                    # Firefox user agent
                    return self.ua_generator.firefox
                elif rand < 0.85:
                    # Safari user agent
                    return self.ua_generator.safari
                elif rand < 0.95:
                    # Edge user agent
                    return self.ua_generator.edge
                else:
                    # Opera user agent
                    return self.ua_generator.opera
            except Exception as e:
                logger.debug(f"fake-useragent failed: {e}, using fallback")

        # Use static pool fallback
        return random.choice(self.user_agent_pool)

    def load_proxies(self) -> int:
        """Load active proxies from Supabase

        Returns:
            int: Number of proxies loaded
        """
        try:
            result = self.supabase.table("reddit_proxies")\
                .select("*")\
                .eq("is_active", True)\
                .order("priority", desc=True)\
                .execute()

            if not result.data:
                logger.error("❌ No active proxies found in database")
                return 0

            # Transform database format to internal format
            self.proxies = []
            for row in result.data:
                proxy_config = {
                    'id': row.get('id'),
                    'service': row.get('service_name'),
                    'proxy': f"{row.get('proxy_username')}:{row.get('proxy_password')}@{row.get('proxy_url')}",
                    'display_name': row.get('display_name'),
                    'max_threads': row.get('max_threads', 5),
                    'priority': row.get('priority', 100)
                }
                self.proxies.append(proxy_config)

            return len(self.proxies)

        except Exception as e:
            logger.error(f"❌ Failed to load proxies: {e}")
            return 0

    def get_next_proxy(self) -> Dict:
        """Get next proxy configuration with round-robin rotation

        Returns:
            dict: Proxy configuration with 'service', 'proxy', 'display_name', etc.
        """
        if not self.proxies:
            raise RuntimeError("No proxies available - call load_proxies() first")

        # Round-robin rotation
        config = self.proxies[self._proxy_index]
        self._proxy_index = (self._proxy_index + 1) % len(self.proxies)

        return config

    def test_proxy_fast(self, proxy_config: Dict, attempts: int = 3) -> tuple:
        """Test single proxy with early exit on first success (optimized for speed)

        Args:
            proxy_config: Proxy configuration dict
            attempts: Maximum number of test attempts (default 3, exits early on success)

        Returns:
            tuple: (success: bool, successful_attempt: int, total_time: float)
        """
        # service_name used for debugging: proxy_config['display_name']
        proxy_str = proxy_config['proxy']

        # Create proxy dict for requests (unified format - auth embedded)
        proxies = {"http": f"http://{proxy_str}", "https": f"http://{proxy_str}"}

        start_time = time.time()
        for attempt in range(attempts):
            try:
                # Test with Reddit API
                test_url = "https://www.reddit.com/api/v1/me.json"
                user_agent = self.generate_user_agent()

                response = requests.get(
                    test_url,
                    proxies=proxies,
                    timeout=15,
                    headers={'User-Agent': user_agent}
                )

                # Reddit API returns various status codes, but any response means proxy works
                if response.status_code in [200, 401, 403]:  # 401/403 are expected without auth
                    elapsed = time.time() - start_time
                    return (True, attempt + 1, elapsed)

            except Exception:
                pass

            # Small delay between attempts (but not after last attempt)
            if attempt < attempts - 1:
                time.sleep(2)

        # All attempts failed
        elapsed = time.time() - start_time
        return (False, 0, elapsed)

    def test_proxy(self, proxy_config: Dict, attempts: int = 3) -> bool:
        """Test single proxy with multiple attempts

        Args:
            proxy_config: Proxy configuration dict
            attempts: Number of test attempts (default 3)

        Returns:
            bool: True if at least 1 attempt successful
        """
        service_name = proxy_config['display_name']
        proxy_str = proxy_config['proxy']

        # Create proxy dict for requests (unified format - auth embedded)
        proxies = {"http": f"http://{proxy_str}", "https": f"http://{proxy_str}"}

        proxy_attempts = []
        for attempt in range(attempts):
            try:
                # Test with Reddit API (same endpoint as backup scraper)
                test_url = "https://www.reddit.com/api/v1/me.json"

                # Use the same user agent generation as backup scraper
                user_agent = self.generate_user_agent()
                response = requests.get(
                    test_url,
                    proxies=proxies,
                    timeout=15,
                    headers={'User-Agent': user_agent}
                )

                # Reddit API returns various status codes, but any response means proxy works
                if response.status_code in [200, 401, 403]:  # 401/403 are expected without auth
                    logger.info(f"✅ {service_name} attempt {attempt+1}/{attempts}: Success (HTTP {response.status_code})")
                    proxy_attempts.append(True)
                else:
                    logger.warning(f"⚠️ {service_name} attempt {attempt+1}/{attempts}: Failed (HTTP {response.status_code})")
                    proxy_attempts.append(False)

            except Exception as e:
                logger.warning(f"⚠️ {service_name} attempt {attempt+1}/{attempts}: Connection failed - {e}")
                proxy_attempts.append(False)

            # Small delay between attempts
            if attempt < attempts - 1:  # Don't delay after the last attempt
                time.sleep(2)

        # Evaluate proxy: at least 1 success out of attempts
        proxy_success = any(proxy_attempts)
        successful_attempts = sum(proxy_attempts)

        if proxy_success:
            logger.info(f"🎉 {service_name}: PASSED ({successful_attempts}/{attempts} attempts successful)")
        else:
            logger.error(f"❌ {service_name}: FAILED (0/{attempts} attempts successful)")

        return proxy_success

    def test_all_proxies(self) -> int:
        """Test all proxies in parallel with early exit on success

        Returns:
            int: Number of working proxies
        """
        if not self.proxies:
            logger.error("❌ No proxies to test - call load_proxies() first")
            return 0

        start_time = time.time()

        # Reset proxy index for testing
        self._proxy_index = 0

        # Test all proxies concurrently using threads
        results = {}
        status_parts = []

        with ThreadPoolExecutor(max_workers=len(self.proxies)) as executor:
            # Submit all proxy tests
            future_to_proxy = {
                executor.submit(self.test_proxy_fast, proxy, 3): proxy
                for proxy in self.proxies
            }

            # Collect results as they complete
            for future in as_completed(future_to_proxy):
                proxy_config = future_to_proxy[future]
                service_name = proxy_config['display_name']

                try:
                    success, attempt, _elapsed = future.result()
                    results[service_name] = (success, attempt, proxy_config)

                    # Build compact status for final log
                    if success:
                        status_parts.append(f"✅ {service_name}")
                    else:
                        status_parts.append(f"❌ {service_name}")

                except Exception as e:
                    logger.error(f"❌ {service_name}: ERROR during test - {e}")
                    results[service_name] = (False, 0, proxy_config)
                    status_parts.append(f"❌ {service_name}")

        # Update database stats for all proxies (silently)
        for service_name, (success, attempt, proxy_config) in results.items():
            try:
                proxy_id = proxy_config.get('id')
                current_data = self.supabase.table("reddit_proxies")\
                    .select("success_count, error_count")\
                    .eq("id", proxy_id)\
                    .execute()

                if current_data.data and len(current_data.data) > 0:
                    current_success = current_data.data[0].get('success_count', 0) or 0
                    current_error = current_data.data[0].get('error_count', 0) or 0

                    if success:
                        self.supabase.table("reddit_proxies")\
                            .update({"success_count": current_success + 1})\
                            .eq("id", proxy_id)\
                            .execute()
                    else:
                        self.supabase.table("reddit_proxies")\
                            .update({"error_count": current_error + 1})\
                            .eq("id", proxy_id)\
                            .execute()
            except Exception:
                pass  # Silent failure for stats updates

        # Calculate results
        working_proxies = sum(1 for _, (success, _, _) in results.items() if success)
        total_time = time.time() - start_time

        # Compact summary log
        status_str = " ".join(status_parts)
        logger.info(f"   🔍 Testing {len(self.proxies)} proxies... {status_str} ({working_proxies}/{len(self.proxies)} passed, {total_time:.1f}s)")

        if working_proxies == 0:
            logger.error("❌ No proxies working - scraper cannot start")

        # Reset proxy index for actual usage
        self._proxy_index = 0

        return working_proxies

    def update_proxy_stats(self, proxy_config: Dict, success: bool):
        """Update proxy statistics in database

        Args:
            proxy_config: Proxy configuration dict
            success: True if request succeeded, False if failed
        """
        try:
            proxy_id = proxy_config.get('id')
            field = "success_count" if success else "error_count"

            # Read current value, increment, write back
            current_data = self.supabase.table("reddit_proxies")\
                .select(field)\
                .eq("id", proxy_id)\
                .execute()

            if current_data.data and len(current_data.data) > 0:
                current_value = current_data.data[0].get(field, 0) or 0
                self.supabase.table("reddit_proxies")\
                    .update({field: current_value + 1})\
                    .eq("id", proxy_id)\
                    .execute()

        except Exception:
            pass  # Silent failure for stats updates


def main():
    """Standalone test of proxy manager"""
    logger.info("🧪 Testing ProxyManager standalone...")

    # Initialize proxy manager
    pm = ProxyManager()

    # Load proxies from database
    count = pm.load_proxies()
    if count == 0:
        logger.error("❌ Failed to load proxies")
        return

    # Test all proxies
    working = pm.test_all_proxies()

    if working == 0:
        logger.error("❌ No proxies working - scraper cannot start")
        sys.exit(1)

    # Test rotation
    logger.info("\n🔄 Testing round-robin rotation...")
    for i in range(6):  # Test 6 rotations (2 full cycles if 3 proxies)
        proxy = pm.get_next_proxy()
        logger.info(f"  Rotation {i+1}: {proxy['display_name']}")

    logger.info("\n✅ ProxyManager test complete!")


if __name__ == "__main__":
    main()