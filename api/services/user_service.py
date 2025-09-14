#!/usr/bin/env python3
"""
User Management Service

Handles Reddit user discovery, analysis, and database operations.
Extracted and enhanced from reddit_scraper.py with proxy support.
"""

import asyncio
import logging
import time
import random
import requests
import asyncpraw
from datetime import datetime, timezone, timedelta
from typing import Dict, List, Any, Optional, Tuple
from supabase import Client
from fake_useragent import UserAgent

from .logging_service import SupabaseLoggingService

logger = logging.getLogger(__name__)

class UserService:
    """Service for managing Reddit users with proxy support"""
    
    def __init__(self, supabase_client: Client, logging_service: SupabaseLoggingService):
        self.supabase = supabase_client
        self.logging_service = logging_service
        
        # User scoring weights
        self.scoring_weights = {
            'username_quality': 0.2,
            'age_quality': 0.3,
            'karma_quality': 0.3,
            'posting_frequency': 0.2
        }
        
        # Proxy and user agent setup (matching reddit_scraper.py)
        self.max_retries = 3
        self.ua_generator = None
        self.scraper_accounts = []
        
        # Initialize user agent generator
        try:
            self.ua_generator = UserAgent()
            logger.info("🌐 UserAgent generator initialized successfully")
        except Exception as e:
            logger.warning(f"⚠️ Failed to initialize UserAgent generator: {e}")
        
        # Static fallback user agents (from reddit_scraper.py)
        self.fallback_user_agents = [
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/119.0',
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Safari/605.1.15',
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36 Edg/119.0.0.0'
        ]
    
    def generate_user_agent(self) -> str:
        """Generate random user agent exactly like reddit_scraper.py"""
        # 75% of the time, try fake-useragent with browser-specific calls
        if self.ua_generator and random.random() < 0.75:
            try:
                rand = random.random()
                if rand < 0.50:
                    # Chrome user agent
                    ua = self.ua_generator.chrome
                    logger.debug(f"🌐 Generated CHROME user agent via fake-useragent: {ua[:60]}...")
                elif rand < 0.70:
                    # Firefox user agent  
                    ua = self.ua_generator.firefox
                    logger.debug(f"🌐 Generated FIREFOX user agent via fake-useragent: {ua[:60]}...")
                elif rand < 0.85:
                    # Safari user agent
                    ua = self.ua_generator.safari
                    logger.debug(f"🌐 Generated SAFARI user agent via fake-useragent: {ua[:60]}...")
                elif rand < 0.95:
                    # Edge user agent
                    ua = self.ua_generator.edge
                    logger.debug(f"🌐 Generated EDGE user agent via fake-useragent: {ua[:60]}...")
                else:
                    # Opera user agent
                    ua = self.ua_generator.opera
                    logger.debug(f"🌐 Generated OPERA user agent via fake-useragent: {ua[:60]}...")
                
                return ua
            except Exception as e:
                logger.debug(f"🌐 fake-useragent failed ({e}), using fallback pool")
        
        # Use static pool fallback (25% of the time or when fake-useragent fails)
        ua = random.choice(self.fallback_user_agents)
        logger.debug(f"🌐 Using fallback user agent: {ua[:60]}...")
        return ua
    
    async def load_scraper_accounts(self) -> List[Dict]:
        """Load active Reddit accounts from Supabase table (matching reddit_scraper.py)"""
        try:
            # Get enabled accounts ordered by priority and success rate
            resp = self.supabase.table('scraper_accounts').select('*').eq(
                'is_enabled', True
            ).neq(
                'status', 'banned'  # Skip banned accounts
            ).order('priority').order('success_rate', desc=True).limit(5).execute()
            
            if not resp.data:
                logger.warning("⚠️ No enabled accounts found in database")
                return []
                
            self.scraper_accounts = resp.data
            logger.info(f"📋 Loaded {len(resp.data)} enabled accounts from Supabase")
            return resp.data
            
        except Exception as e:
            logger.error(f"❌ Error loading accounts from Supabase: {e}")
            return []
    
    def request_with_retry(self, url: str, account: Optional[Dict] = None) -> Optional[Dict]:
        """Make HTTP request with retry logic using requests (exactly like reddit_scraper.py)"""
        
        # Configure proxy with unified format (auth embedded in proxy string)
        proxies = None
        if account and account.get('proxy_host') and account.get('proxy_port'):
            proxy_str = f"{account['proxy_username']}:{account['proxy_password']}@{account['proxy_host']}:{account['proxy_port']}"
            proxies = {"http": f"http://{proxy_str}", "https": f"http://{proxy_str}"}
        
        user_agent = self.generate_user_agent()
        
        # Debug logging
        logger.info(f"🔍 Request to: {url}")
        logger.info(f"📋 Headers: User-Agent: {user_agent[:60]}...")
        logger.info(f"🌐 Proxy: {'Yes' if proxies else 'Direct'} ({'***masked***' if proxies else 'N/A'})")
        
        retries = 0
        while retries < self.max_retries:
            try:
                response = requests.get(
                    url,
                    headers={'User-agent': user_agent},
                    proxies=proxies,
                    timeout=30
                )
                response.raise_for_status()

                # Check if the response status code is 403 (Forbidden)
                if response.status_code == 403:
                    logger.warning(f"🚫 Forbidden access: {url} (user may be suspended)")
                    return {'error': 'forbidden', 'status': 403}

                # Check if the response status code is 404 (Not Found)
                if response.status_code == 404:
                    logger.warning(f"❓ Not found: {url} (user may be deleted)")
                    return {'error': 'not_found', 'status': 404}

                # Check if the response status code is 429 (Rate Limited)
                if response.status_code == 429:
                    rate_limit_delay = min(5 + (retries * 2), 30)
                    logger.warning(f"⏳ Rate limited: {url} - attempt {retries + 1}/{self.max_retries}, waiting {rate_limit_delay}s")
                    
                    if retries >= 2:  # Stop after 3 rate limit attempts
                        logger.error(f"🚫 Rate limit exceeded for {url} - giving up after {retries + 1} attempts")
                        return {'error': 'rate_limited'}
                    
                    time.sleep(rate_limit_delay)
                    retries += 1
                    continue

                # Success case
                logger.debug(f"✅ Success: {url} ({response.status_code})")
                return response.json()
                
            except requests.RequestException as e:
                logger.warning(f"Failed request for {url}: {e}")
                retries += 1
                if retries < self.max_retries:
                    time.sleep(4.0)  # Fixed delay like reddit_scraper.py
                else:
                    logger.error(f"Maximum retries reached for {url}. Skipping.")
                    break
        
        # If all retries are exhausted, return None
        logger.error(f"❌ All {self.max_retries} attempts failed for {url}")
        return None
    
    def get_user_info_direct(self, username: str, account: Optional[Dict] = None) -> Optional[Dict]:
        """Get user profile info using direct HTTP request (like reddit_scraper.py)"""
        url = f"https://www.reddit.com/user/{username}/about.json"
        response = self.request_with_retry(url, account)
        
        if response and 'data' in response:
            return response['data']
        elif response and 'error' in response:
            return response  # Return error info for suspended users
        return None
    
    def get_user_posts_direct(self, username: str, limit: int = 30, account: Optional[Dict] = None) -> List[Dict]:
        """Get user submitted posts using direct HTTP request"""
        url = f"https://www.reddit.com/user/{username}/submitted.json?limit={limit}"
        response = self.request_with_retry(url, account)
        
        if response and 'data' in response and 'children' in response['data']:
            return [child['data'] for child in response['data']['children']]
        return []
    
    async def analyze_user(self, username: str, use_proxy: bool = True) -> Optional[Dict[str, Any]]:
        """Analyze a Reddit user with proxy support and 3-attempt retry logic"""
        start_time = time.time()
        
        # Load accounts if not already loaded
        if not self.scraper_accounts:
            await self.load_scraper_accounts()
        
        # Try up to 3 different accounts/proxies
        for attempt in range(min(3, len(self.scraper_accounts) + 1)):  # +1 for direct connection
            try:
                account = None
                if use_proxy and attempt < len(self.scraper_accounts):
                    account = self.scraper_accounts[attempt]
                    logger.info(f"Attempt {attempt + 1}/3: Using account {account.get('username', 'unknown')} with proxy {account.get('proxy_host', 'none')}")
                else:
                    logger.info(f"Attempt {attempt + 1}/3: Using direct connection")
                
                # Get user info using direct HTTP request
                user_info = self.get_user_info_direct(username, account)
                
                if not user_info:
                    logger.warning(f"No user info returned for {username} on attempt {attempt + 1}")
                    continue
                
                # Check for errors
                if user_info.get('error') == 'forbidden':
                    logger.warning(f"User {username} is suspended/forbidden")
                    return {
                        'username': username,
                        'is_suspended': True,
                        'created_at': datetime.now(timezone.utc).isoformat()
                    }
                
                if user_info.get('error') == 'not_found':
                    logger.warning(f"User {username} not found")
                    continue
                
                if user_info.get('error') == 'rate_limited':
                    logger.warning(f"Rate limited for user {username}, trying next account")
                    continue
                
                # Extract user data
                created_utc = user_info.get('created_utc')
                comment_karma = user_info.get('comment_karma', 0)
                link_karma = user_info.get('link_karma', 0)
                
                if created_utc is None:
                    logger.warning(f"User {username} missing creation time, may be suspended")
                    continue
                
                # Calculate derived metrics
                account_age_days = (datetime.now(timezone.utc) - datetime.fromtimestamp(created_utc, timezone.utc)).days
                total_karma = comment_karma + link_karma
                
                # Get user's recent posts to discover subreddits
                posts = self.get_user_posts_direct(username, limit=100, account=account)
                discovered_subreddits = set()
                for post in posts:
                    if post.get('subreddit'):
                        discovered_subreddits.add(post['subreddit'])
                
                # Calculate quality scores
                username_quality = self._calculate_username_quality(username)
                age_quality = self._calculate_age_quality(account_age_days)
                karma_quality = self._calculate_karma_quality(total_karma, account_age_days)
                posting_frequency = len(posts) / max(account_age_days / 30, 1)  # posts per month estimate
                
                overall_score = (
                    username_quality * self.scoring_weights['username_quality'] +
                    age_quality * self.scoring_weights['age_quality'] +
                    karma_quality * self.scoring_weights['karma_quality'] +
                    min(posting_frequency, 10) * self.scoring_weights['posting_frequency']
                )
                
                # Check if user might be a creator based on subreddits
                is_creator = self._detect_creator_status(list(discovered_subreddits), username)
                
                user_data = {
                    'username': username,
                    'reddit_id': user_info.get('id'),
                    'created_utc': datetime.fromtimestamp(created_utc, timezone.utc).isoformat(),
                    'account_age_days': account_age_days,
                    'comment_karma': comment_karma,
                    'link_karma': link_karma,
                    'total_karma': total_karma,
                    'verified': user_info.get('verified', False),
                    'has_verified_email': user_info.get('has_verified_email', False),
                    'is_suspended': False,
                    'username_quality_score': username_quality,
                    'age_quality_score': age_quality,
                    'karma_quality_score': karma_quality,
                    'overall_user_score': overall_score,
                    'avg_posts_per_month': posting_frequency,
                    'cross_subreddit_activity': len(discovered_subreddits),
                    'primary_subreddits': list(discovered_subreddits)[:5],  # Top 5 subreddits
                    'discovered_subreddits': len(discovered_subreddits),
                    'our_creator': is_creator,
                    'last_scraped_at': datetime.now(timezone.utc).isoformat(),
                    'created_at': datetime.now(timezone.utc).isoformat(),
                    'updated_at': datetime.now(timezone.utc).isoformat(),
                }
                
                # Log successful operation
                self.logging_service.log_user_discovery(
                    username=username,
                    operation_type='analyze_user_proxy',
                    discovered_subreddits=len(discovered_subreddits),
                    is_creator=is_creator,
                    success=True,
                    processing_time_ms=int((time.time() - start_time) * 1000),
                    account_used=account.get('username') if account else 'direct'
                )
                
                logger.info(f"✅ Successfully analyzed user {username} on attempt {attempt + 1}")
                return user_data
                
            except Exception as e:
                logger.error(f"Error on attempt {attempt + 1} for user {username}: {e}")
                continue
        
        # All attempts failed
        self.logging_service.log_user_discovery(
            username=username,
            operation_type='analyze_user_proxy',
            success=False,
            error_message="All proxy attempts failed",
            processing_time_ms=int((time.time() - start_time) * 1000)
        )
        
        logger.error(f"❌ Failed to analyze user {username} after all attempts")
        return None
    
    async def save_user(self, user_data: Dict[str, Any]) -> bool:
        """Save user data to database"""
        return await self._save_user_data(user_data)
    
    async def add_user(self, username: str, reddit_instance: asyncpraw.Reddit = None,
                      source_subreddit: str = None) -> Dict[str, Any]:
        """
        Add a single user to the database with full analysis
        
        Args:
            username: Reddit username (without u/ prefix)
            reddit_instance: Authenticated Reddit instance
            source_subreddit: Where this user was discovered
            
        Returns:
            Dict with user data and operation status
        """
        start_time = time.time()
        
        try:
            # Check if user already exists
            existing_user = await self._get_existing_user(username)
            if existing_user:
                self.logging_service.log_user_discovery(
                    username=username,
                    operation_type='add_user',
                    success=True,
                    processing_time_ms=int((time.time() - start_time) * 1000),
                    source_subreddit=source_subreddit
                )
                return {
                    'status': 'exists',
                    'message': f'User {username} already exists',
                    'user_data': existing_user
                }
            
            # Use new proxy-based analysis instead of AsyncPRAW
            user_data = await self.analyze_user(username, use_proxy=True)
            
            if not user_data:
                # Fallback to minimal data if analysis fails
                user_data = await self._create_minimal_user(username, source_subreddit)
            
            if user_data.get('is_suspended', False):
                await self._save_suspended_user(username, source_subreddit)
                self.logging_service.log_user_discovery(
                    username=username,
                    operation_type='add_user',
                    is_suspended=True,
                    success=True,
                    processing_time_ms=int((time.time() - start_time) * 1000),
                    source_subreddit=source_subreddit
                )
                return {
                    'status': 'suspended',
                    'message': f'User {username} is suspended',
                    'user_data': user_data
                }
            
            # Save user to database
            await self._save_user_data(user_data)
            
            # Log successful operation
            self.logging_service.log_user_discovery(
                username=username,
                operation_type='add_user',
                discovered_subreddits=user_data.get('discovered_subreddits', 0),
                is_creator=user_data.get('our_creator', False),
                success=True,
                processing_time_ms=int((time.time() - start_time) * 1000),
                source_subreddit=source_subreddit
            )
            
            return {
                'status': 'created',
                'message': f'User {username} added successfully',
                'user_data': user_data
            }
            
        except Exception as e:
            logger.error(f"Error adding user {username}: {e}")
            self.logging_service.log_user_discovery(
                username=username,
                operation_type='add_user',
                success=False,
                error_message=str(e),
                processing_time_ms=int((time.time() - start_time) * 1000),
                source_subreddit=source_subreddit
            )
            return {
                'status': 'error',
                'message': f'Failed to add user {username}: {str(e)}',
                'user_data': None
            }
    
    async def batch_add_users(self, usernames: List[str], reddit_instance: asyncpraw.Reddit = None,
                             source_subreddit: str = None) -> Dict[str, Any]:
        """
        Add multiple users in batch with progress tracking
        
        Args:
            usernames: List of Reddit usernames
            reddit_instance: Authenticated Reddit instance
            source_subreddit: Where these users were discovered
            
        Returns:
            Dict with batch operation results
        """
        start_time = time.time()
        results = {
            'total': len(usernames),
            'created': 0,
            'exists': 0,
            'suspended': 0,
            'errors': 0,
            'reddit_users': []
        }
        
        for i, username in enumerate(usernames):
            try:
                result = await self.add_user(username, reddit_instance, source_subreddit)
                results['reddit_users'].append(result)
                
                # Update counters
                if result['status'] == 'created':
                    results['created'] += 1
                elif result['status'] == 'exists':
                    results['exists'] += 1
                elif result['status'] == 'suspended':
                    results['suspended'] += 1
                else:
                    results['errors'] += 1
                
                # Rate limiting - small delay between users
                if i < len(usernames) - 1:
                    await asyncio.sleep(0.5)
                    
            except Exception as e:
                logger.error(f"Error in batch processing user {username}: {e}")
                results['errors'] += 1
                results['reddit_users'].append({
                    'status': 'error',
                    'message': str(e),
                    'user_data': None
                })
        
        # Log batch operation
        self.logging_service.log_user_discovery(
            username=f"batch_{len(usernames)}_users",
            operation_type='batch_add_users',
            discovered_subreddits=sum(u.get('user_data', {}).get('discovered_subreddits', 0) for u in results['reddit_users'] if u.get('user_data')),
            success=results['errors'] == 0,
            error_message=f"{results['errors']} errors" if results['errors'] > 0 else None,
            processing_time_ms=int((time.time() - start_time) * 1000),
            source_subreddit=source_subreddit
        )
        
        return results
    
    async def analyze_user_subreddits(self, username: str, reddit_instance: asyncpraw.Reddit) -> List[str]:
        """
        Analyze a user's posting history to discover subreddits
        
        Args:
            username: Reddit username
            reddit_instance: Authenticated Reddit instance
            
        Returns:
            List of discovered subreddit names
        """
        discovered_subreddits = set()
        
        try:
            user = await reddit_instance.redditor(username)
            
            # Analyze recent submissions
            async for submission in user.submissions.new(limit=100):
                if submission.subreddit:
                    discovered_subreddits.add(submission.subreddit.display_name)
            
            # Analyze recent comments
            async for comment in user.comments.new(limit=50):
                if comment.subreddit:
                    discovered_subreddits.add(comment.subreddit.display_name)
            
            return list(discovered_subreddits)
            
        except Exception as e:
            logger.error(f"Error analyzing subreddits for user {username}: {e}")
            return []
    
    async def get_user_by_username(self, username: str) -> Optional[Dict[str, Any]]:
        """Get user from database by username"""
        try:
            response = self.supabase.table('reddit_users').select('*').eq('username', username).execute()
            if response.data:
                return response.data[0]
            return None
        except Exception as e:
            logger.error(f"Error getting user {username}: {e}")
            return None
    
    async def get_users_list(self, limit: int = 50, offset: int = 0, min_score: Optional[float] = None) -> List[Dict[str, Any]]:
        """Get paginated list of users"""
        try:
            query = self.supabase.table('reddit_users').select('*')
            
            if min_score is not None:
                query = query.gte('overall_user_score', min_score)
                
            response = query.order('overall_user_score', desc=True).range(offset, offset + limit - 1).execute()
            return response.data or []
            
        except Exception as e:
            logger.error(f"Error getting users list: {e}")
            return []
    
    async def get_user_stats(self, username: str) -> Optional[Dict[str, Any]]:
        """Get user statistics from database"""
        try:
            response = self.supabase.table('reddit_users').select('*').eq('username', username).execute()
            if response.data:
                return response.data[0]
            return None
        except Exception as e:
            logger.error(f"Error getting user stats for {username}: {e}")
            return None
    
    async def update_user_creator_status(self, username: str, is_creator: bool) -> bool:
        """Update whether a user is marked as our creator"""
        try:
            response = self.supabase.table('reddit_users').update({
                'our_creator': is_creator,
                'updated_at': datetime.now(timezone.utc).isoformat()
            }).eq('username', username).execute()
            
            if hasattr(response, 'error') and response.error:
                logger.error(f"Error updating creator status for {username}: {response.error}")
                return False
            
            self.logging_service.log_user_discovery(
                username=username,
                operation_type='update_creator_status',
                is_creator=is_creator,
                success=True
            )
            
            return True
            
        except Exception as e:
            logger.error(f"Error updating creator status for {username}: {e}")
            return False
    
    # Private helper methods
    
    async def _get_existing_user(self, username: str) -> Optional[Dict[str, Any]]:
        """Check if user already exists in database"""
        try:
            response = self.supabase.table('reddit_users').select('*').eq('username', username).execute()
            if response.data:
                return response.data[0]
            return None
        except Exception as e:
            logger.error(f"Error checking existing user {username}: {e}")
            return None
    
    async def _create_minimal_user(self, username: str, source_subreddit: str = None) -> Dict[str, Any]:
        """Create minimal user data without full Reddit API analysis"""
        return {
            'username': username,
            'created_utc': None,
            'account_age_days': None,
            'comment_karma': 0,
            'link_karma': 0,
            'total_karma': 0,
            'verified': False,
            'has_verified_email': False,
            'is_suspended': False,
            'username_quality_score': self._calculate_username_quality(username),
            'age_quality_score': 5.0,  # Default neutral score
            'karma_quality_score': 0.0,
            'overall_user_score': 2.5,  # Default neutral score
            'discovered_subreddits': 0,
            'our_creator': False,
            'last_scraped_at': datetime.now(timezone.utc).isoformat(),
            'created_at': datetime.now(timezone.utc).isoformat(),
            'updated_at': datetime.now(timezone.utc).isoformat(),
        }
    
    async def _analyze_user_full(self, username: str, reddit_instance: asyncpraw.Reddit,
                               source_subreddit: str = None) -> Dict[str, Any]:
        """Full user analysis using Reddit API"""
        try:
            user = await reddit_instance.redditor(username)
            
            # Check if user is suspended
            try:
                # Try to access user attributes - this will fail if suspended
                created_utc = user.created_utc
                comment_karma = user.comment_karma
                link_karma = user.link_karma
            except Exception:
                # User is likely suspended
                return {
                    'username': username,
                    'is_suspended': True,
                    'created_at': datetime.now(timezone.utc).isoformat(),
                }
            
            # Calculate derived metrics
            account_age_days = (datetime.now(timezone.utc) - datetime.fromtimestamp(created_utc, timezone.utc)).days
            total_karma = comment_karma + link_karma
            
            # Discover user's subreddits
            discovered_subreddits = await self.analyze_user_subreddits(username, reddit_instance)
            
            # Calculate quality scores
            username_quality = self._calculate_username_quality(username)
            age_quality = self._calculate_age_quality(account_age_days)
            karma_quality = self._calculate_karma_quality(total_karma, account_age_days)
            posting_frequency = len(discovered_subreddits) / max(account_age_days / 30, 1)  # posts per month estimate
            
            overall_score = (
                username_quality * self.scoring_weights['username_quality'] +
                age_quality * self.scoring_weights['age_quality'] +
                karma_quality * self.scoring_weights['karma_quality'] +
                min(posting_frequency, 10) * self.scoring_weights['posting_frequency']
            )
            
            # Check if user might be a creator based on subreddits
            is_creator = self._detect_creator_status(discovered_subreddits, username)
            
            user_data = {
                'username': username,
                'reddit_id': user.id,
                'created_utc': datetime.fromtimestamp(created_utc, timezone.utc),
                'account_age_days': account_age_days,
                'comment_karma': comment_karma,
                'link_karma': link_karma,
                'total_karma': total_karma,
                'verified': getattr(user, 'verified', False),
                'has_verified_email': getattr(user, 'has_verified_email', False),
                'is_suspended': False,
                'username_quality_score': username_quality,
                'age_quality_score': age_quality,
                'karma_quality_score': karma_quality,
                'overall_user_score': overall_score,
                'avg_posts_per_month': posting_frequency,
                'cross_subreddit_activity': len(discovered_subreddits),
                'primary_subreddits': discovered_subreddits[:5],  # Top 5 subreddits
                'discovered_subreddits': len(discovered_subreddits),
                'our_creator': is_creator,
                'last_scraped_at': datetime.now(timezone.utc).isoformat(),
                'created_at': datetime.now(timezone.utc).isoformat(),
                'updated_at': datetime.now(timezone.utc).isoformat(),
            }
            
            return user_data
            
        except Exception as e:
            logger.error(f"Error analyzing user {username}: {e}")
            # Return minimal data if analysis fails
            return await self._create_minimal_user(username, source_subreddit)
    
    def _calculate_username_quality(self, username: str) -> float:
        """Calculate username quality score (0-10)"""
        score = 5.0  # Base score
        
        # Penalize very short or very long usernames
        if len(username) < 3:
            score -= 2.0
        elif len(username) > 20:
            score -= 1.0
        
        # Penalize usernames with excessive numbers
        digit_ratio = sum(c.isdigit() for c in username) / len(username)
        if digit_ratio > 0.5:
            score -= 2.0
        elif digit_ratio > 0.3:
            score -= 1.0
        
        # Bonus for readable usernames
        if username.replace('_', '').replace('-', '').isalpha():
            score += 1.0
        
        # Penalize obvious throwaway patterns
        throwaway_patterns = ['throwaway', 'temp', 'alt', 'burner']
        if any(pattern in username.lower() for pattern in throwaway_patterns):
            score -= 3.0
        
        return max(0.0, min(10.0, score))
    
    def _calculate_age_quality(self, account_age_days: int) -> float:
        """Calculate account age quality score (0-10)"""
        if account_age_days is None:
            return 5.0
        
        if account_age_days < 30:
            return 2.0
        elif account_age_days < 90:
            return 4.0
        elif account_age_days < 365:
            return 6.0
        elif account_age_days < 365 * 2:
            return 8.0
        else:
            return 10.0
    
    def _calculate_karma_quality(self, total_karma: int, account_age_days: int) -> float:
        """Calculate karma quality score (0-10)"""
        if account_age_days is None or account_age_days == 0:
            return 0.0
        
        karma_per_day = total_karma / account_age_days
        
        if karma_per_day < 0.1:
            return 1.0
        elif karma_per_day < 1:
            return 3.0
        elif karma_per_day < 5:
            return 5.0
        elif karma_per_day < 20:
            return 7.0
        elif karma_per_day < 50:
            return 9.0
        else:
            return 10.0
    
    def _detect_creator_status(self, discovered_subreddits: List[str], username: str) -> bool:
        """Detect if user might be an OnlyFans creator"""
        creator_indicators = [
            'onlyfans', 'fansly', 'manyvids', 'chaturbate', 'cam4',
            'premium', 'custom', 'content', 'seller', 'creator'
        ]
        
        # Check username for creator indicators
        username_lower = username.lower()
        if any(indicator in username_lower for indicator in creator_indicators):
            return True
        
        # Check subreddit activity for creator-focused communities
        creator_subreddits = [
            'onlyfans', 'onlyfanspromo', 'onlyfansadvice', 'onlyfansgirls',
            'fansly', 'manyvids', 'sellingonline', 'nsfwcreators'
        ]
        
        creator_activity = sum(1 for sub in discovered_subreddits 
                             if any(creator_sub in sub.lower() for creator_sub in creator_subreddits))
        
        return creator_activity >= 2
    
    async def _save_user_data(self, user_data: Dict[str, Any]) -> bool:
        """Save user data to database"""
        if not user_data or not user_data.get('username'):
            return False
            
        try:
            response = self.supabase.table('reddit_users').upsert(user_data, on_conflict='username').execute()
            if hasattr(response, 'error') and response.error:
                logger.error(f"Error saving user data: {response.error}")
                return False
            else:
                logger.info(f"💾 Saved user data for u/{user_data['username']}")
                return True
                
        except Exception as e:
            logger.error(f"Exception saving user data: {e}")
            return False
    
    async def _save_suspended_user(self, username: str, source_subreddit: str = None) -> bool:
        """Save a suspended user to database with minimal info"""
        try:
            user_payload = {
                'username': username,
                'is_suspended': True,
                'created_at': datetime.now(timezone.utc).isoformat(),
                'updated_at': datetime.now(timezone.utc).isoformat(),
                'last_scraped_at': datetime.now(timezone.utc).isoformat(),
            }
            
            response = self.supabase.table('reddit_users').upsert(user_payload, on_conflict='username').execute()
            if hasattr(response, 'error') and response.error:
                logger.error(f"Error saving suspended user: {response.error}")
                return False
            else:
                logger.info(f"💾 Saved suspended user u/{username}")
                return True
                
        except Exception as e:
            logger.error(f"Exception saving suspended user: {e}")
            return False
    
    async def get_overall_user_stats(self) -> Dict[str, Any]:
        """Get overall user statistics from database"""
        try:
            # Get total users
            total_response = self.supabase.table('reddit_users').select('id', count='exact').execute()
            total_users = total_response.count or 0
            
            # Get creators count
            creators_response = self.supabase.table('reddit_users').select('id', count='exact').eq('our_creator', True).execute()
            creators_count = creators_response.count or 0
            
            # Get suspended users
            suspended_response = self.supabase.table('reddit_users').select('id', count='exact').eq('is_suspended', True).execute()
            suspended_count = suspended_response.count or 0
            
            # Get average score (calculate from actual data)
            try:
                avg_response = self.supabase.table('reddit_users').select('overall_user_score').not_.is_('overall_user_score', 'null').execute()
                if avg_response.data:
                    scores = [float(row['overall_user_score']) for row in avg_response.data if row['overall_user_score'] is not None]
                    avg_score = sum(scores) / len(scores) if scores else 0.0
                else:
                    avg_score = 0.0
            except Exception:
                avg_score = 0.0
            
            # Get top users by score
            top_users_response = self.supabase.table('reddit_users').select(
                'username, overall_user_score, total_karma, account_age_days'
            ).order('overall_user_score', desc=True).limit(10).execute()
            
            return {
                'total_users': total_users,
                'creators_count': creators_count,
                'suspended_count': suspended_count,
                'active_count': total_users - suspended_count,
                'creator_percentage': (creators_count / max(total_users, 1)) * 100,
                'average_user_score': round(avg_score, 2),
                'top_users': top_users_response.data or [],
                'last_updated': datetime.now(timezone.utc).isoformat()
            }
            
        except Exception as e:
            logger.error(f"Error getting overall user stats: {e}")
            return {
                'total_users': 0,
                'creators_count': 0,
                'suspended_count': 0,
                'active_count': 0,
                'creator_percentage': 0.0,
                'average_user_score': 0.0,
                'top_users': [],
                'error': str(e)
            }