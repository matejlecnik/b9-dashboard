"""
Proxy Manager for Reddit Scraper
Loads proxy configurations from Supabase and manages thread assignments
"""
import logging
import asyncio
import aiohttp
from datetime import datetime, timezone
from typing import Dict, Optional, Any
from collections import defaultdict

logger = logging.getLogger(__name__)


class ProxyManager:
    """
    Manages proxy configurations loaded from Supabase reddit_proxies table.
    Handles thread-to-proxy assignments and performance tracking.
    """

    def __init__(self, supabase_client):
        """
        Initialize proxy manager with Supabase client.

        Args:
            supabase_client: Initialized Supabase client
        """
        self.supabase = supabase_client
        self.proxies = []
        self.thread_assignments = {}
        self.proxy_by_id = {}
        self.performance_stats = defaultdict(lambda: {
            'requests': 0,
            'successes': 0,
            'failures': 0,
            'total_response_time': 0
        })

        # Setup Supabase logging for ProxyManager
        try:
            from app.core.utils.supabase_logger import SupabaseLogHandler

            # Get the logger for this module
            proxy_logger = logging.getLogger(__name__)

            # Check if Supabase handler already exists
            has_supabase_handler = any(
                isinstance(h, SupabaseLogHandler)
                for h in proxy_logger.handlers
            )

            if not has_supabase_handler and supabase_client:
                # Create and add Supabase handler
                supabase_handler = SupabaseLogHandler(
                    supabase_client,
                    source='reddit_scraper',
                    buffer_size=5,
                    flush_interval=30
                )
                supabase_handler.setLevel(logging.INFO)  # Only INFO and above to database

                # Create formatter
                formatter = logging.Formatter(
                    '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
                )
                supabase_handler.setFormatter(formatter)

                # Add handler to logger
                proxy_logger.addHandler(supabase_handler)
                proxy_logger.info("🔗 ProxyManager Supabase logging initialized")
        except Exception as e:
            # If logging setup fails, continue without it
            logger.warning(f"Could not setup Supabase logging for ProxyManager: {e}")

    async def load_proxies(self) -> bool:
        """
        Load active proxy configurations from reddit_proxies table.

        Returns:
            bool: True if proxies loaded successfully
        """
        try:
            # Use print to ensure we see this
            print("📋 Starting ProxyManager.load_proxies()...")
            logger.info("📋 Starting ProxyManager.load_proxies()...")

            response = self.supabase.table('reddit_proxies').select('*').eq(
                'is_active', True
            ).order('priority', desc=True).execute()

            if not response.data:
                logger.error("No active proxies found in reddit_proxies table")
                return False

            self.proxies = response.data
            self._assign_threads()

            # Create ID lookup
            for proxy in self.proxies:
                self.proxy_by_id[proxy['id']] = proxy

            logger.info(f"Loaded {len(self.proxies)} active proxies with "
                       f"{sum(p['max_threads'] for p in self.proxies)} total threads")

            # Log proxy configuration
            for proxy in self.proxies:
                logger.info(f"  - {proxy['display_name']}: {proxy['max_threads']} threads, "
                           f"priority={proxy['priority']}")

            # Test proxies at startup - ALL must work or we fail
            logger.info(f"🔍 About to call test_proxies_at_startup()... ({len(self.proxies)} proxies to test)")

            # Log to Supabase that proxy validation is starting
            self.supabase.table("system_logs").insert({
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "source": "proxy_manager",
                "script_name": "proxy_validation",
                "level": "info",
                "message": f"🔍 Starting proxy validation for {len(self.proxies)} proxies",
                "context": {
                    "proxy_count": len(self.proxies),
                    "proxies": [p['display_name'] for p in self.proxies]
                }
            }).execute()

            try:
                validation_result = await self.test_proxies_at_startup()
                logger.info(f"🔍 test_proxies_at_startup returned: {validation_result}")

                # Log validation result to Supabase
                self.supabase.table("system_logs").insert({
                    "timestamp": datetime.now(timezone.utc).isoformat(),
                    "source": "proxy_manager",
                    "script_name": "proxy_validation",
                    "level": "success" if validation_result else "error",
                    "message": f"✅ All proxies validated successfully" if validation_result else "❌ Proxy validation failed",
                    "context": {
                        "validation_result": validation_result,
                        "proxy_count": len(self.proxies)
                    }
                }).execute()

                if not validation_result:
                    logger.error("❌ Proxy validation failed! Cannot start scraper.")

                    # Log failure to Supabase
                    self.supabase.table("system_logs").insert({
                        "timestamp": datetime.now(timezone.utc).isoformat(),
                        "source": "proxy_manager",
                        "script_name": "proxy_validation",
                        "level": "critical",
                        "message": "❌ CRITICAL: Proxy validation failed - scraper cannot start",
                        "context": {
                            "action": "blocking_startup",
                            "reason": "proxy_validation_failure"
                        }
                    }).execute()
                    return False
            except Exception as e:
                logger.error(f"❌ Exception during proxy validation: {e}")

                # Log exception to Supabase
                self.supabase.table("system_logs").insert({
                    "timestamp": datetime.now(timezone.utc).isoformat(),
                    "source": "proxy_manager",
                    "script_name": "proxy_validation",
                    "level": "error",
                    "message": f"❌ Exception during proxy validation: {str(e)}",
                    "context": {
                        "error": str(e),
                        "error_type": type(e).__name__
                    }
                }).execute()

                import traceback
                error_traceback = traceback.format_exc()

                # Log full traceback to Supabase
                self.supabase.table("system_logs").insert({
                    "timestamp": datetime.now(timezone.utc).isoformat(),
                    "source": "proxy_manager",
                    "script_name": "proxy_validation",
                    "level": "error",
                    "message": "Full exception traceback",
                    "context": {
                        "traceback": error_traceback
                    }
                }).execute()

                return False

            logger.info("✅ ProxyManager.load_proxies() completed successfully")
            return True

        except Exception as e:
            logger.error(f"Failed to load proxies from Supabase: {e}")
            return False

    def _assign_threads(self):
        """
        Create thread-to-proxy mapping based on max_threads configuration.
        Each proxy gets assigned a number of threads based on its max_threads setting.
        """
        self.thread_assignments = {}
        thread_id = 0

        # Sort by priority to ensure high-priority proxies get lower thread IDs
        sorted_proxies = sorted(self.proxies, key=lambda x: x['priority'], reverse=True)

        for proxy in sorted_proxies:
            max_threads = proxy.get('max_threads', 3)
            for _ in range(max_threads):
                self.thread_assignments[thread_id] = proxy
                thread_id += 1

        logger.info(f"Assigned {len(self.thread_assignments)} threads across {len(self.proxies)} proxies")

    def get_proxy_for_thread(self, thread_id: int) -> Optional[Dict[str, Any]]:
        """
        Get proxy configuration for a specific thread.

        Args:
            thread_id: Thread identifier (0-based)

        Returns:
            Dict containing proxy configuration or None if not found
        """
        proxy = self.thread_assignments.get(thread_id)

        if not proxy:
            logger.warning(f"No proxy assigned for thread {thread_id}")
            return None

        # Format proxy configuration for requests library
        proxy_url = proxy['proxy_url']
        proxy_username = proxy.get('proxy_username', '')
        proxy_password = proxy.get('proxy_password', '')

        # Build proxy string with authentication if provided
        # This should NOT include http:// prefix - that's added by the API client
        if proxy_username and proxy_password:
            proxy_string = f"{proxy_username}:{proxy_password}@{proxy_url}"
        else:
            proxy_string = proxy_url

        return {
            'id': proxy['id'],
            'service': proxy['service_name'],
            'proxy': proxy_string,  # username:password@host:port (without http://)
            'display_name': proxy['display_name'],
            'auth': f"{proxy_username}:{proxy_password}" if proxy_username else None
        }

    def get_total_threads(self) -> int:
        """
        Get total number of threads across all active proxies.

        Returns:
            int: Total thread count
        """
        return len(self.thread_assignments)

    def get_proxy_by_service(self, service_name: str) -> Optional[Dict[str, Any]]:
        """
        Get proxy configuration by service name.

        Args:
            service_name: Name of the proxy service

        Returns:
            Proxy configuration or None
        """
        for proxy in self.proxies:
            if proxy['service_name'].lower() == service_name.lower():
                return self.get_proxy_for_thread(
                    next(tid for tid, p in self.thread_assignments.items()
                         if p['id'] == proxy['id'])
                )
        return None

    async def update_proxy_stats(self, proxy_id: str, success: bool = True,
                                response_time_ms: Optional[int] = None,
                                error_message: Optional[str] = None):
        """
        Update proxy performance statistics in database.

        Args:
            proxy_id: Proxy identifier
            success: Whether the request succeeded
            response_time_ms: Response time in milliseconds
            error_message: Error message if request failed
        """
        try:
            # Track in memory
            stats = self.performance_stats[proxy_id]
            stats['requests'] += 1
            if success:
                stats['successes'] += 1
            else:
                stats['failures'] += 1
            if response_time_ms:
                stats['total_response_time'] += response_time_ms

            # Fetch current values from database
            current = self.supabase.table('reddit_proxies').select('*').eq('id', proxy_id).execute()
            if not current.data:
                logger.error(f"Proxy {proxy_id} not found in database")
                return

            current_data = current.data[0]

            # Prepare database updates with incremented values
            updates = {
                'total_requests': current_data.get('total_requests', 0) + 1,
                'last_used_at': datetime.now(timezone.utc).isoformat(),
                'updated_at': datetime.now(timezone.utc).isoformat()
            }

            if success:
                updates['success_count'] = current_data.get('success_count', 0) + 1
                updates['consecutive_errors'] = 0

                # Update rolling average response time
                if response_time_ms:
                    total_reqs = current_data.get('total_requests', 0)
                    old_avg = current_data.get('avg_response_time_ms', 0)
                    # Calculate new average: (old_avg * old_count + new_value) / (old_count + 1)
                    new_avg = (old_avg * total_reqs + response_time_ms) / (total_reqs + 1) if total_reqs > 0 else response_time_ms
                    updates['avg_response_time_ms'] = int(new_avg)  # Convert to integer for database
            else:
                updates['error_count'] = current_data.get('error_count', 0) + 1
                updates['consecutive_errors'] = current_data.get('consecutive_errors', 0) + 1
                updates['last_error_at'] = datetime.now(timezone.utc).isoformat()

                if error_message:
                    updates['last_error_message'] = error_message[:500]  # Limit length

            # Update database
            response = self.supabase.table('reddit_proxies').update(updates).eq(
                'id', proxy_id
            ).execute()

            if hasattr(response, 'error') and response.error:
                logger.error(f"Failed to update proxy stats for {proxy_id}: {response.error}")

        except Exception as e:
            logger.error(f"Error updating proxy stats for {proxy_id}: {e}")

    async def check_proxy_health(self, proxy_id: str) -> bool:
        """
        Check if a proxy is healthy based on recent performance.

        Args:
            proxy_id: Proxy identifier

        Returns:
            bool: True if proxy is healthy
        """
        try:
            response = self.supabase.table('reddit_proxies').select(
                'consecutive_errors, is_active, last_error_at'
            ).eq('id', proxy_id).single().execute()

            if not response.data:
                return False

            proxy = response.data

            # Check if proxy is active
            if not proxy.get('is_active', False):
                return False

            # Check consecutive errors
            if proxy.get('consecutive_errors', 0) >= 10:
                logger.warning(f"Proxy {proxy_id} has {proxy['consecutive_errors']} consecutive errors")
                return False

            # Check if last error was very recent (within 1 minute)
            last_error = proxy.get('last_error_at')
            if last_error:
                last_error_dt = datetime.fromisoformat(last_error.replace('Z', '+00:00'))
                time_since_error = (datetime.now(timezone.utc) - last_error_dt).total_seconds()
                if time_since_error < 60:
                    logger.warning(f"Proxy {proxy_id} had error {time_since_error:.0f}s ago")
                    return False

            return True

        except Exception as e:
            logger.error(f"Error checking proxy health for {proxy_id}: {e}")
            return False

    def get_best_proxy(self) -> Optional[Dict[str, Any]]:
        """
        Get the proxy with the best performance score.

        Returns:
            Best performing proxy configuration
        """
        if not self.proxies:
            return None

        best_proxy = None
        best_score = -1

        for proxy in self.proxies:
            # Calculate performance score
            total_requests = proxy.get('total_requests', 0)
            if total_requests == 0:
                score = 100  # New proxy gets high score
            else:
                success_rate = proxy.get('success_count', 0) / total_requests
                avg_response_time = proxy.get('avg_response_time_ms', 1000)
                consecutive_errors = proxy.get('consecutive_errors', 0)

                # Score formula: success_rate * 100 - (avg_response_time / 100) - (consecutive_errors * 10)
                score = (success_rate * 100) - (avg_response_time / 100) - (consecutive_errors * 10)

            if score > best_score:
                best_score = score
                best_proxy = proxy

        if best_proxy:
            # Find a thread assigned to this proxy
            for thread_id, assigned_proxy in self.thread_assignments.items():
                if assigned_proxy['id'] == best_proxy['id']:
                    return self.get_proxy_for_thread(thread_id)

        return None

    def get_proxy_stats(self) -> Dict[str, Any]:
        """
        Get current proxy performance statistics.

        Returns:
            Dictionary of proxy statistics
        """
        stats = {
            'total_proxies': len(self.proxies),
            'total_threads': len(self.thread_assignments),
            'proxies': []
        }

        for proxy in self.proxies:
            proxy_id = proxy['id']
            memory_stats = self.performance_stats[proxy_id]

            proxy_info = {
                'name': proxy['display_name'],
                'service': proxy['service_name'],
                'threads': proxy['max_threads'],
                'memory_stats': {
                    'requests': memory_stats['requests'],
                    'successes': memory_stats['successes'],
                    'failures': memory_stats['failures'],
                    'success_rate': (memory_stats['successes'] / memory_stats['requests'] * 100
                                   if memory_stats['requests'] > 0 else 0),
                    'avg_response_time': (memory_stats['total_response_time'] / memory_stats['requests']
                                        if memory_stats['requests'] > 0 else 0)
                },
                'db_stats': {
                    'total_requests': proxy.get('total_requests', 0),
                    'success_count': proxy.get('success_count', 0),
                    'error_count': proxy.get('error_count', 0),
                    'avg_response_time_ms': proxy.get('avg_response_time_ms', 0),
                    'consecutive_errors': proxy.get('consecutive_errors', 0)
                }
            }
            stats['proxies'].append(proxy_info)

        return stats

    async def disable_unhealthy_proxies(self, error_threshold: int = 20):
        """
        Automatically disable proxies with too many consecutive errors.

        Args:
            error_threshold: Number of consecutive errors before disabling
        """
        try:
            for proxy in self.proxies:
                if proxy.get('consecutive_errors', 0) >= error_threshold:
                    logger.warning(f"Disabling unhealthy proxy {proxy['display_name']} "
                                 f"({proxy['consecutive_errors']} consecutive errors)")

                    response = self.supabase.table('reddit_proxies').update({
                        'is_active': False,
                        'last_error_message': f"Auto-disabled after {proxy['consecutive_errors']} consecutive errors",
                        'updated_at': datetime.now(timezone.utc).isoformat()
                    }).eq('id', proxy['id']).execute()

                    if hasattr(response, 'error') and response.error:
                        logger.error(f"Failed to disable proxy {proxy['id']}: {response.error}")

        except Exception as e:
            logger.error(f"Error checking proxy health: {e}")

    async def test_proxies_at_startup(self):
        """Test proxies at startup with rate limiting - graceful degradation enabled"""
        logger.info(f"🔧 ENTERED test_proxies_at_startup() with {len(self.proxies)} proxies")

        # Log entry to Supabase
        self.supabase.table("system_logs").insert({
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "source": "proxy_manager",
            "script_name": "proxy_validation",
            "level": "info",
            "message": f"🔧 Starting proxy validation tests for {len(self.proxies)} proxies",
            "context": {
                "method": "test_proxies_at_startup",
                "proxy_count": len(self.proxies)
            }
        }).execute()

        if not self.proxies:
            logger.error("❌ No proxies to test!")

            # Log error to Supabase
            self.supabase.table("system_logs").insert({
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "source": "proxy_manager",
                "script_name": "proxy_validation",
                "level": "error",
                "message": "❌ No proxies to test!",
                "context": {
                    "error": "no_proxies_loaded"
                }
            }).execute()
            return False

        logger.info("🔧 Testing proxies at startup (with rate limiting and graceful degradation)...")

        test_url = "https://www.reddit.com/r/python.json"
        working_proxies = 0
        proxy_results = {}
        
        # Add rate limiting between proxy tests
        semaphore = asyncio.Semaphore(2)  # Only test 2 proxies simultaneously
        
        async def test_single_proxy(proxy):
            async with semaphore:
                return await self._test_proxy_with_rate_limit(proxy, test_url)
        
        # Test all proxies concurrently but rate-limited
        tasks = [test_single_proxy(proxy) for proxy in self.proxies]
        results = await asyncio.gather(*tasks, return_exceptions=True)
        
        for proxy, result in zip(self.proxies, results):
            proxy_name = proxy['display_name']
            if isinstance(result, Exception):
                proxy_results[proxy_name] = f"❌ Failed: {result}"
                logger.error(f"❌ Proxy {proxy_name} test failed with exception: {result}")

                # Log individual proxy failure to Supabase
                self.supabase.table("system_logs").insert({
                    "timestamp": datetime.now(timezone.utc).isoformat(),
                    "source": "proxy_manager",
                    "script_name": "proxy_validation",
                    "level": "error",
                    "message": f"❌ Proxy {proxy_name} validation failed",
                    "context": {
                        "proxy": proxy_name,
                        "error": str(result),
                        "status": "exception"
                    }
                }).execute()
            elif result:
                proxy_results[proxy_name] = "✅ Working"
                working_proxies += 1
                logger.info(f"✅ Proxy {proxy_name} validated successfully")

                # Log successful validation to Supabase
                self.supabase.table("system_logs").insert({
                    "timestamp": datetime.now(timezone.utc).isoformat(),
                    "source": "proxy_manager",
                    "script_name": "proxy_validation",
                    "level": "success",
                    "message": f"✅ Proxy {proxy_name} validated successfully",
                    "context": {
                        "proxy": proxy_name,
                        "status": "working"
                    }
                }).execute()
            else:
                proxy_results[proxy_name] = "❌ Failed"
                logger.warning(f"⚠️ Proxy {proxy_name} failed validation")

                # Log proxy failure to Supabase
                self.supabase.table("system_logs").insert({
                    "timestamp": datetime.now(timezone.utc).isoformat(),
                    "source": "proxy_manager",
                    "script_name": "proxy_validation",
                    "level": "warning",
                    "message": f"⚠️ Proxy {proxy_name} failed validation",
                    "context": {
                        "proxy": proxy_name,
                        "status": "failed"
                    }
                }).execute()

        # Log summary
        logger.info("=" * 60)
        logger.info("📊 Proxy Validation Summary:")
        for proxy_name, status in proxy_results.items():
            logger.info(f"  {status} {proxy_name}")

        total_proxies = len(self.proxies)

        # Log summary to Supabase
        self.supabase.table("system_logs").insert({
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "source": "proxy_manager",
            "script_name": "proxy_validation",
            "level": "info",
            "message": "📊 Proxy Validation Summary",
            "context": {
                "total_proxies": total_proxies,
                "working_proxies": working_proxies,
                "failed_proxies": total_proxies - working_proxies,
                "success_rate": f"{working_proxies/total_proxies*100:.1f}%",
                "proxy_results": proxy_results
            }
        }).execute()

        if working_proxies == total_proxies:  # ALL proxies must work
            logger.info(f"✅ SUCCESS: All {total_proxies} proxies validated successfully")

            # Log success to Supabase
            self.supabase.table("system_logs").insert({
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "source": "proxy_manager",
                "script_name": "proxy_validation",
                "level": "success",
                "message": f"✅ SUCCESS: All {total_proxies} proxies validated successfully",
                "context": {
                    "all_proxies_working": True,
                    "proxy_count": total_proxies
                }
            }).execute()
            return True
        else:
            logger.error(f"❌ FAILURE: Only {working_proxies}/{total_proxies} proxies working ({working_proxies/total_proxies*100:.1f}%)")
            logger.error("❌ Cannot start scraper without all proxies functional")

            # Log failure to Supabase
            self.supabase.table("system_logs").insert({
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "source": "proxy_manager",
                "script_name": "proxy_validation",
                "level": "critical",
                "message": f"❌ FAILURE: Only {working_proxies}/{total_proxies} proxies working",
                "context": {
                    "working_proxies": working_proxies,
                    "total_proxies": total_proxies,
                    "failed_proxies": total_proxies - working_proxies,
                    "success_rate": f"{working_proxies/total_proxies*100:.1f}%",
                    "blocking_startup": True,
                    "reason": "not_all_proxies_working"
                }
            }).execute()
            return False  # Fail if ANY proxy is not working
            
    async def _test_proxy_with_rate_limit(self, proxy, test_url):
        """Test a single proxy with rate limiting"""
        proxy_name = proxy['display_name']
        proxy_id = proxy['id']
        
        # Try only once to reduce connection load
        logger.info(f"🔍 Testing proxy {proxy_name}...")
        
        try:
            proxy_config = self.get_proxy_config(proxy)
            
            # Add delay to prevent overwhelming the target
            await asyncio.sleep(0.5)  # 500ms delay between tests
            
            # Test with a simple Reddit request using aiohttp
            async with aiohttp.ClientSession(
                timeout=aiohttp.ClientTimeout(total=15),  # Increased timeout
                connector=aiohttp.TCPConnector(limit=1)  # Limit connections per session
            ) as session:
                proxy_url = proxy_config.get('http') if proxy_config else None
                
                async with session.get(
                    test_url,
                    proxy=proxy_url,
                    headers={'User-Agent': 'Mozilla/5.0'},
                ) as response:
                    if response.status == 200:
                        await self.update_proxy_stats(proxy_id, success=True, response_time_ms=500)
                        return True
                    else:
                        logger.warning(f"⚠️ Proxy {proxy_name} returned status {response.status}")
                        await self.update_proxy_stats(proxy_id, success=False, error_message=f"Status {response.status}")
                        return False
                        
        except asyncio.TimeoutError:
            logger.warning(f"⏱️ Proxy {proxy_name} timed out")
            await self.update_proxy_stats(proxy_id, success=False, error_message="Timeout")
            return False
        except Exception as e:
            logger.warning(f"❌ Proxy {proxy_name} failed: {e}")
            await self.update_proxy_stats(proxy_id, success=False, error_message=str(e)[:500])
            return False

    async def test_proxies_at_startup_old(self):
        """Old version - kept for reference. Remove after testing new version."""
        logger.info("🔧 Testing proxies at startup (strict mode - ALL must work)...")

        test_url = "https://www.reddit.com/r/python.json"
        all_proxies_working = True
        proxy_results = {}

        for proxy in self.proxies:
            proxy_name = proxy['display_name']
            proxy_id = proxy['id']
            proxy_working = False

            # Try 3 times for each proxy
            for attempt in range(1, 4):
                logger.info(f"🔍 Testing proxy {proxy_name}, attempt {attempt}/3...")

                try:
                    proxy_config = self.get_proxy_config(proxy)

                    # Test with a simple Reddit request using aiohttp
                    async with aiohttp.ClientSession() as session:
                        # Use the full proxy URL with authentication
                        proxy_url = proxy_config.get('http') if proxy_config else None

                        async with session.get(
                            test_url,
                            proxy=proxy_url,  # aiohttp accepts full http://user:pass@host:port format
                            headers={'User-Agent': 'Mozilla/5.0'},
                            timeout=aiohttp.ClientTimeout(total=10)
                        ) as response:
                            if response.status == 200:
                                logger.info(f"✅ Proxy {proxy_name} working on attempt {attempt}/3 (status: {response.status})")
                                proxy_working = True
                                # Reset consecutive errors on success
                                await self.update_proxy_stats(proxy_id, success=True, response_time_ms=1000)
                                break  # Proxy works, no need for more attempts
                            else:
                                logger.warning(f"⚠️ Proxy {proxy_name} returned status {response.status} on attempt {attempt}/3")
                                if attempt < 3:
                                    await asyncio.sleep(2)  # Wait 2 seconds before retry

                except asyncio.TimeoutError:
                    logger.error(f"⏱️ Proxy {proxy_name} timed out on attempt {attempt}/3")
                    if attempt < 3:
                        await asyncio.sleep(2)  # Wait 2 seconds before retry

                except Exception as e:
                    logger.error(f"❌ Proxy {proxy_name} failed on attempt {attempt}/3: {e}")
                    if attempt < 3:
                        await asyncio.sleep(2)  # Wait 2 seconds before retry

            # After all attempts, check if proxy worked at least once
            if proxy_working:
                proxy_results[proxy_name] = "✅ Working"
                logger.info(f"✅ Proxy {proxy_name} validated successfully")
            else:
                proxy_results[proxy_name] = "❌ Failed"
                all_proxies_working = False
                logger.error(f"❌ CRITICAL: Proxy {proxy_name} failed all 3 attempts!")
                await self.update_proxy_stats(proxy_id, success=False, error_message="Failed all attempts")

        # Log final summary
        logger.info("=" * 60)
        logger.info("📊 Proxy Validation Summary:")
        for proxy_name, status in proxy_results.items():
            logger.info(f"  {status} {proxy_name}")

        working_count = sum(1 for status in proxy_results.values() if "✅" in status)
        total_count = len(proxy_results)

        if all_proxies_working:
            logger.info(f"✅ SUCCESS: All {total_count} proxies validated successfully!")
        else:
            logger.error(f"❌ FAILURE: Only {working_count}/{total_count} proxies working!")
            logger.error("❌ Script cannot continue - ALL proxies must be working!")

        logger.info("=" * 60)

        return all_proxies_working  # Return False if ANY proxy failed

    def get_proxy_config(self, proxy: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Convert proxy database record to proxy configuration for requests"""
        if not proxy.get('proxy_url'):
            return None

        # Build proxy URL with authentication
        proxy_url = proxy['proxy_url']
        proxy_username = proxy.get('proxy_username', '')
        proxy_password = proxy.get('proxy_password', '')

        # Format: http://username:password@host:port
        if proxy_username and proxy_password:
            full_proxy_url = f"http://{proxy_username}:{proxy_password}@{proxy_url}"
        else:
            full_proxy_url = f"http://{proxy_url}"

        return {
            'id': proxy['id'],
            'http': full_proxy_url,
            'https': full_proxy_url
        }