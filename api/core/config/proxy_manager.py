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

    async def load_proxies(self) -> bool:
        """
        Load active proxy configurations from reddit_proxies table.

        Returns:
            bool: True if proxies loaded successfully
        """
        try:
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

            # Test proxies at startup
            await self.test_proxies_at_startup()

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
        """Test all proxies at startup to verify they're working"""
        logger.info("🔧 Testing proxies at startup...")

        test_url = "https://www.reddit.com/r/python.json"
        working_count = 0
        failed_count = 0

        for proxy in self.proxies:
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
                            logger.info(f"✅ Proxy {proxy['display_name']} working (status: {response.status})")
                            working_count += 1
                            # Reset consecutive errors on success
                            await self.update_proxy_stats(proxy['id'], success=True, response_time_ms=1000)
                        else:
                            logger.warning(f"⚠️ Proxy {proxy['display_name']} returned status {response.status}")
                            failed_count += 1
                            await self.update_proxy_stats(proxy['id'], success=False,
                                                        error_message=f"Status {response.status}")
            except asyncio.TimeoutError:
                logger.error(f"❌ Proxy {proxy['display_name']} timed out")
                failed_count += 1
                await self.update_proxy_stats(proxy['id'], success=False, error_message="Timeout")
            except Exception as e:
                logger.error(f"❌ Proxy {proxy['display_name']} failed: {e}")
                failed_count += 1
                await self.update_proxy_stats(proxy['id'], success=False, error_message=str(e)[:200])

        logger.info(f"Proxy test complete: {working_count} working, {failed_count} failed")

        if working_count == 0:
            logger.error("⚠️ WARNING: No working proxies found! Scraper may fail.")
            # Don't raise exception during testing - proxies might work for actual requests

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