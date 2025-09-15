#!/usr/bin/env python3
"""
Reddit Scraper Service - Extracted and refactored from reddit_scraper.py
"""

import asyncio
import logging
import random
import time
import aiohttp
import json
from datetime import datetime, timezone
from typing import Dict, List, Any, Optional, Callable
from dataclasses import dataclass
from collections import defaultdict

import asyncpraw
from supabase import Client
from fake_useragent import UserAgent

from .logging_service import SupabaseLoggingService
from .user_service import UserService


@dataclass
class ScrapingResult:
    """Result of a scraping operation"""
    success: bool
    subreddits_analyzed: int = 0
    posts_analyzed: int = 0
    users_analyzed: int = 0
    requests_made: int = 0
    processing_time_ms: Optional[int] = None
    error_message: Optional[str] = None
    stats: Optional[Dict[str, Any]] = None


class RedditScraperService:
    """Multi-account Reddit scraper service with proxy support and comprehensive logging"""

    def __init__(self, supabase_client: Client, logging_service: SupabaseLoggingService):
        self.supabase = supabase_client
        self.logging_service = logging_service
        self.user_service = UserService(supabase_client, logging_service)

        # Reddit clients
        self.reddit_clients = []
        self.current_client_index = 0

        # Proxy configurations
        self.proxy_configs = self._get_proxy_configs()
        
        # Performance tracking
        self.stats = {
            'accounts_used': {},
            'proxy_requests': 0,
            'direct_requests': 0,
            'total_requests': 0,
            'subreddits_analyzed': 0,
            'posts_analyzed': 0,
            'users_analyzed': 0,
            'users_skipped_rate_limited': 0,
            'start_time': datetime.now(timezone.utc)
        }
        
        # Rate limiting
        self.rate_limited_users = set()
        self.user_retry_counts = {}
        
        # Stealth configuration
        self.stealth_config = {
            'min_delay': 2.5,
            'max_delay': 6.0,
            'burst_delay': (12, 20),
            'burst_frequency': random.randint(8, 15),
            'request_count': 0,
            'last_request_time': 0
        }
        
        # User agent generator
        try:
            self.ua_generator = UserAgent()
        except Exception as e:
            logging.warning(f"fake-useragent initialization failed: {e}")
            self.ua_generator = None
        
        self.logger = logging.getLogger(__name__)

    def _get_proxy_configs(self) -> List[Dict[str, str]]:
        """Get proxy configurations for the three services"""
        return [
            {
                'service': 'beyondproxy',
                'proxy': '9b1a4c15700a:654fa0b97850@proxy.beyondproxy.io:12321',
                'host': 'proxy.beyondproxy.io',
                'port': '12321',
                'username': '9b1a4c15700a',
                'password': '654fa0b97850',
                'display_name': 'BeyondProxy'
            },
            {
                'service': 'nyronproxy',
                'proxy': 'uxJNWsLXw3XnJE-zone-resi:cjB3tG2ij@residential-ww.nyronproxies.com:16666',
                'host': 'residential-ww.nyronproxies.com',
                'port': '16666',
                'username': 'uxJNWsLXw3XnJE-zone-resi',
                'password': 'cjB3tG2ij',
                'display_name': 'NyronProxy'
            },
            {
                'service': 'rapidproxy',
                'proxy': 'admin123-residential-GLOBAL:admin123@us.rapidproxy.io:5001',
                'host': 'us.rapidproxy.io',
                'port': '5001',
                'username': 'admin123-residential-GLOBAL',
                'password': 'admin123',
                'display_name': 'RapidProxy'
            }
        ]
    
    async def initialize_reddit_clients(self, reddit_accounts: List[Dict[str, str]],
                                      use_proxies: bool = True) -> bool:
        """Initialize Reddit clients with accounts and proxy support"""
        try:
            # Use the built-in proxy configs if enabled
            proxy_configs = self.proxy_configs if use_proxies else []
            
            for i, account in enumerate(reddit_accounts):
                # Get proxy for this account if available
                proxy = proxy_configs[i % len(proxy_configs)] if proxy_configs else None
                
                # Prepare requestor kwargs for proxy support
                requestor_kwargs = {}
                if proxy:
                    proxy_url = f"http://{proxy['username']}:{proxy['password']}@{proxy['host']}:{proxy['port']}"
                    requestor_kwargs = {
                        'proxies': {
                            'http': proxy_url,
                            'https': proxy_url
                        },
                        'timeout': 30
                    }
                
                # Create Reddit client
                reddit = asyncpraw.Reddit(
                    client_id=account['client_id'],
                    client_secret=account['client_secret'],
                    user_agent=self._generate_user_agent(account['username']),
                    requestor_kwargs=requestor_kwargs
                )
                
                # Test the client
                try:
                    await reddit.user.me()
                    self.reddit_clients.append({
                        'reddit': reddit,
                        'username': account['username'],
                        'proxy': proxy,
                        'requests_made': 0,
                        'successful_requests': 0,
                        'failed_requests': 0
                    })
                    self.logger.info(f"✅ Initialized Reddit client for {account['username']}")
                except Exception as e:
                    self.logger.error(f"❌ Failed to initialize client for {account['username']}: {e}")
                    continue
            
            if not self.reddit_clients:
                self.logger.error("❌ No Reddit clients could be initialized")
                return False
            
            self.logger.info(f"✅ Initialized {len(self.reddit_clients)} Reddit clients")
            return True
            
        except Exception as e:
            self.logger.error(f"❌ Error initializing Reddit clients: {e}")
            return False
    
    def _generate_user_agent(self, base_username: str = None) -> str:
        """Generate a realistic user agent"""
        fallback_agents = [
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0"
        ]
        
        if self.ua_generator and random.random() < 0.8:
            try:
                return self.ua_generator.random
            except Exception:
                pass
        
        return random.choice(fallback_agents)
    
    def get_current_client(self) -> Dict[str, Any]:
        """Get current Reddit client with round-robin rotation"""
        if not self.reddit_clients:
            raise Exception("No Reddit clients available")
        
        client = self.reddit_clients[self.current_client_index]
        self.current_client_index = (self.current_client_index + 1) % len(self.reddit_clients)
        return client
    
    async def _retry_with_backoff(self, func: Callable, *args, max_retries: int = 8, **kwargs) -> Any:
        """Retry a function with exponential backoff"""
        for attempt in range(max_retries):
            try:
                return await func(*args, **kwargs)
            except Exception as e:
                if attempt == max_retries - 1:
                    self.logger.error(f"❌ Failed after {max_retries} attempts: {e}")
                    raise

                wait_time = min(2 ** attempt, 60)  # Max 60 seconds
                self.logger.warning(f"⚠️ Attempt {attempt + 1}/{max_retries} failed, retrying in {wait_time}s: {e}")
                await asyncio.sleep(wait_time)

        raise Exception(f"Failed after {max_retries} retries")

    async def _fetch_subreddit_rules(self, subreddit_name: str) -> Optional[List[Dict[str, Any]]]:
        """Fetch subreddit rules using Reddit's public JSON API"""
        try:
            url = f"https://www.reddit.com/r/{subreddit_name}/about/rules.json"
            headers = {
                'User-Agent': self._generate_user_agent(),
                'Accept': 'application/json'
            }

            async with aiohttp.ClientSession() as session:
                async with session.get(url, headers=headers, timeout=10) as response:
                    if response.status == 200:
                        data = await response.json()
                        rules = data.get('rules', [])

                        # Extract relevant rule fields
                        formatted_rules = []
                        for rule in rules:
                            formatted_rules.append({
                                'short_name': rule.get('short_name', ''),
                                'description': rule.get('description', ''),
                                'violation_reason': rule.get('violation_reason', ''),
                                'kind': rule.get('kind', 'all'),  # all/link/comment
                                'priority': rule.get('priority', 0)
                            })

                        return formatted_rules
                    else:
                        self.logger.warning(f"Failed to fetch rules for r/{subreddit_name}: HTTP {response.status}")
                        return None

        except Exception as e:
            self.logger.warning(f"Error fetching rules for r/{subreddit_name}: {e}")
            return None

    def _detect_verification_required(self, description: str = None, public_description: str = None,
                                     rules_data: List[Dict[str, Any]] = None) -> bool:
        """Detect if subreddit requires verification based on description and rules"""
        verification_keywords = [
            'verification required', 'verification', 'verify', 'verified',
            'verification process', 'verify account', 'verification needed',
            'must verify', 'need verification', 'require verification',
            'verification mandatory', 'verification before posting',
            'verified only', 'verification check', 'verify yourself',
            'verification submission', 'get verified'
        ]

        # Combine all text to search
        texts_to_search = []
        if description:
            texts_to_search.append(description.lower())
        if public_description:
            texts_to_search.append(public_description.lower())

        # Add rules text
        if rules_data:
            for rule in rules_data:
                if isinstance(rule, dict):
                    texts_to_search.append(rule.get('short_name', '').lower())
                    texts_to_search.append(rule.get('description', '').lower())

        combined_text = ' '.join(texts_to_search)

        # Search for verification keywords (case insensitive)
        for keyword in verification_keywords:
            if keyword.lower() in combined_text:
                return True

        return False

    def _detect_non_related(self, title: str = None, description: str = None,
                           public_description: str = None, rules_data: List[Dict[str, Any]] = None) -> Optional[str]:
        """Detect if subreddit should be marked as 'Non Related' based on keywords

        Returns the keyword that triggered detection, or None if not detected
        """
        # "Non Related" keywords - EXPANDED to include niche fetishes and hentai
        non_related_keywords = [
            # Hentai/Anime porn
            'hentai', 'anime porn', 'rule34', 'cartoon porn', 'animated porn', 'ecchi', 'doujin',
            'drawn porn', 'manga porn', 'anime girls', 'waifu', '2d girls', 'anime babes',

            # Specific/extreme fetishes (not mainstream OnlyFans content)
            'bbw', 'ssbbw', 'feederism', 'weight gain', 'fat fetish', 'feeding',
            'scat', 'watersports', 'golden shower', 'piss', 'toilet',
            'abdl', 'diaper', 'adult baby', 'little space', 'age play', 'ddlg',
            'vore', 'inflation', 'transformation', 'macro', 'giantess',
            'furry', 'yiff', 'anthro', 'fursuit', 'anthropomorphic',
            'guro', 'necro', 'gore', 'death', 'snuff',
            'femdom', 'findom', 'financial domination', 'paypig', 'sissy',
            'feet', 'foot fetish', 'soles', 'toes', 'foot worship',
            'pregnant', 'breeding', 'impregnation', 'preggo',
            'incest', 'fauxcest', 'step fantasy', 'family', 'taboo family',
            'cuckold', 'cuck', 'hotwife', 'bull',
            'chastity', 'denial', 'locked', 'keyholder',
            'ballbusting', 'cbt', 'cock torture', 'pain',
            'latex', 'rubber', 'bondage gear', 'bdsm equipment',

            # Safe-for-work content
            'nudity is required', 'nudity required', 'must be nude', 'nudity mandatory',
            'nude only', 'nudity is mandatory', 'requires nudity', 'nudity must be shown',
            'no clothes allowed', 'must show nudity', 'nude content only', 'nudity needed',
            'full nudity required', 'complete nudity', 'nudity is a requirement',

            # Professional terms
            'career advice', 'job hunting', 'resume help', 'interview tips',
            'academic discussion', 'university students', 'college advice', 'study tips',

            # Cooking terms
            'cooking recipes', 'baking recipes', 'meal prep recipes', 'cooking instructions',

            # Gaming terms
            'pc master race', 'console gaming discussion', 'indie game development',

            # Politics and government
            'government policy', 'election discussion', 'political debate', 'municipal planning',
            'city council', 'local government', 'political news',

            # Animal/pet care
            'veterinary advice', 'pet care tips', 'animal rescue', 'wildlife conservation',

            # Academic/research
            'scientific research', 'academic papers', 'research methodology', 'peer review'
        ]

        # Combine all text to search
        texts_to_search = []
        if title:
            texts_to_search.append(title.lower())
        if description:
            texts_to_search.append(description.lower())
        if public_description:
            texts_to_search.append(public_description.lower())

        # Add rules text
        if rules_data:
            for rule in rules_data:
                if isinstance(rule, dict):
                    texts_to_search.append(rule.get('short_name', '').lower())
                    texts_to_search.append(rule.get('description', '').lower())

        combined_text = ' '.join(texts_to_search)

        # Search for non-related keywords
        for keyword in non_related_keywords:
            if keyword.lower() in combined_text:
                self.logger.info(f"🚫 Non Related detected: '{keyword}'")
                return keyword

        return None

    async def analyze_subreddit(self, subreddit_name: str) -> Dict[str, Any]:
        """Analyze a single subreddit and return comprehensive data"""
        start_time = time.time()

        try:
            client_info = self.get_current_client()
            reddit = client_info['reddit']

            # Apply stealth delay
            await self._apply_stealth_delay()

            # Get subreddit info with retry
            subreddit = await self._retry_with_backoff(
                reddit.subreddit, subreddit_name
            )

            # Extract comprehensive subreddit information
            subreddit_data = await self._extract_subreddit_data(subreddit)

            # Check if subreddit already exists to get its current status
            existing = self.supabase.table('reddit_subreddits')\
                .select('category_text, review')\
                .eq('name', subreddit_name)\
                .execute()

            existing_review = None
            existing_category = None
            if existing.data and len(existing.data) > 0:
                existing_review = existing.data[0].get('review')
                existing_category = existing.data[0].get('category_text')

            # Fetch rules data from public API
            rules_data = await self._fetch_subreddit_rules(subreddit_name)
            if rules_data:
                subreddit_data['rules_data'] = json.dumps(rules_data)  # Store as JSON string for JSONB field
            else:
                subreddit_data['rules_data'] = None

            # Detect verification requirement
            subreddit_data['verification_required'] = self._detect_verification_required(
                description=subreddit_data.get('description'),
                public_description=subreddit_data.get('public_description'),
                rules_data=rules_data
            )

            # Detect if subreddit should be marked as "Non Related"
            non_related_keyword = self._detect_non_related(
                title=subreddit_data.get('title'),
                description=subreddit_data.get('description'),
                public_description=subreddit_data.get('public_description'),
                rules_data=rules_data
            )

            # Only set review to "Non Related" if no existing review and keyword detected
            if not existing_review and non_related_keyword:
                subreddit_data['review'] = 'Non Related'
                self.logger.info(f"🚫 Auto-marked r/{subreddit_name} as 'Non Related' (keyword: {non_related_keyword})")

            # Fetch HOT 30 posts for engagement metrics and minimum requirements
            hot_posts = await self._fetch_hot_posts(subreddit, limit=30)

            # Fetch TOP 100 YEARLY posts for timing analysis AND saving to database
            top_yearly_posts = await self._fetch_top_yearly_posts(subreddit, limit=100)

            # Use hot posts for user data and minimum requirements
            if hot_posts:
                # Collect user data from HOT posts for minimum requirements
                users_data = await self._collect_user_data_from_posts(hot_posts, reddit)

                # Calculate minimum requirements from hot posts users
                requirements = self._calculate_minimum_requirements(users_data if users_data else [])
                subreddit_data.update(requirements)
                subreddit_data['requirements_last_updated'] = datetime.now(timezone.utc).isoformat()

                # Calculate engagement metrics from HOT posts
                engagement_metrics = self._calculate_engagement_metrics(hot_posts)
                subreddit_data.update(engagement_metrics)
            else:
                # No hot posts, set defaults
                subreddit_data['min_post_karma'] = None
                subreddit_data['min_comment_karma'] = None
                subreddit_data['min_account_age_days'] = None
                subreddit_data['requirement_sample_size'] = 0

            # Use TOP YEARLY posts for best posting times
            if top_yearly_posts:
                best_hour, best_day = self._calculate_best_posting_times(top_yearly_posts)
                subreddit_data['best_posting_hour'] = best_hour
                subreddit_data['best_posting_day'] = best_day
            else:
                subreddit_data['best_posting_hour'] = None
                subreddit_data['best_posting_day'] = None

            # Add top content type from engagement metrics
            if 'top_content_type' in engagement_metrics:
                subreddit_data['top_content_type'] = engagement_metrics['top_content_type']

            # Combine HOT and TOP YEARLY posts for saving (avoid duplicates)
            all_posts = hot_posts.copy() if hot_posts else []
            seen_ids = {p.get('reddit_id') for p in all_posts}

            if top_yearly_posts:
                for post in top_yearly_posts:
                    if post.get('reddit_id') not in seen_ids:
                        all_posts.append(post)
                        seen_ids.add(post.get('reddit_id'))

            # Save subreddit and combined posts to database (up to 130 posts)
            await self.save_subreddit_data(subreddit_data, all_posts[:130], existing_category)

            # Update stats
            self.stats['subreddits_analyzed'] += 1
            self.stats['total_requests'] += 1
            client_info['requests_made'] += 1
            client_info['successful_requests'] += 1
            
            processing_time_ms = int((time.time() - start_time) * 1000)
            
            # Log the operation
            self.logging_service.log_scraper_operation(
                operation_type='subreddit_analysis',
                target_name=subreddit_name,
                requests_made=1,
                successful_requests=1,
                failed_requests=0,
                data_points_collected=len(hot_posts) + len(top_yearly_posts) + 1 if hot_posts else 1,
                account_used=client_info['username'],
                proxy_used=client_info['proxy']['host'] if client_info['proxy'] else None,
                success=True,
                processing_time_ms=processing_time_ms
            )
            
            return {
                'subreddit': subreddit_data,
                'reddit_posts': all_posts if 'all_posts' in locals() else [],
                'processing_time_ms': processing_time_ms,
                'account_used': client_info['username']
            }
            
        except Exception as e:
            processing_time_ms = int((time.time() - start_time) * 1000)
            error_message = str(e)
            
            # Log the error
            self.logging_service.log_scraper_operation(
                operation_type='subreddit_analysis',
                target_name=subreddit_name,
                requests_made=1,
                successful_requests=0,
                failed_requests=1,
                data_points_collected=0,
                account_used=client_info['username'] if 'client_info' in locals() else 'unknown',
                success=False,
                error_message=error_message,
                processing_time_ms=processing_time_ms
            )
            
            self.logger.error(f"❌ Error analyzing r/{subreddit_name}: {e}")
            raise
    
    async def _extract_subreddit_data(self, subreddit) -> Dict[str, Any]:
        """Extract comprehensive subreddit data matching all 69 database fields"""
        try:
            # Get full subreddit data with retry
            await self._retry_with_backoff(subreddit.load)

            # Extract all available fields matching database schema
            data = {
                'name': subreddit.display_name,
                'display_name_prefixed': getattr(subreddit, 'display_name_prefixed', f"r/{subreddit.display_name}"),
                'title': subreddit.title,
                'public_description': subreddit.public_description,
                'description': subreddit.description,
                'subscribers': subreddit.subscribers,
                'accounts_active': getattr(subreddit, 'accounts_active', getattr(subreddit, 'active_user_count', None)),
                'created_utc': datetime.fromtimestamp(subreddit.created_utc, timezone.utc).isoformat() if subreddit.created_utc else None,
                'over18': subreddit.over18,
                'lang': subreddit.lang,
                'url': f"https://reddit.com{subreddit.url}",
                'subreddit_type': subreddit.subreddit_type,

                # Posting permissions
                'allow_images': getattr(subreddit, 'allow_images', True),
                'allow_videos': getattr(subreddit, 'allow_videos', True),
                'allow_polls': getattr(subreddit, 'allow_polls', True),

                # Visual assets
                'icon_img': getattr(subreddit, 'icon_img', None),
                'banner_img': getattr(subreddit, 'banner_img', None),
                'header_img': getattr(subreddit, 'header_img', None),
                'mobile_banner_image': getattr(subreddit, 'mobile_banner_image', None),
                'community_icon': getattr(subreddit, 'community_icon', None),

                # Colors and styling
                'primary_color': getattr(subreddit, 'primary_color', None),
                'key_color': getattr(subreddit, 'key_color', None),
                'banner_background_color': getattr(subreddit, 'banner_background_color', None),

                # Submission settings
                'submit_text': getattr(subreddit, 'submit_text', None),
                'submit_text_html': getattr(subreddit, 'submit_text_html', None),
                'wiki_enabled': getattr(subreddit, 'wiki_enabled', True),
                'whitelist_status': getattr(subreddit, 'whitelist_status', None),

                # Flair settings
                'user_flair_enabled_in_sr': getattr(subreddit, 'user_flair_enabled_in_sr', True),
                'user_flair_position': getattr(subreddit, 'user_flair_position', None),
                'link_flair_enabled': getattr(subreddit, 'link_flair_enabled', True),
                'link_flair_position': getattr(subreddit, 'link_flair_position', None),

                # Timestamp
                'last_scraped_at': datetime.now(timezone.utc).isoformat()
            }
            
            return data
            
        except Exception as e:
            self.logger.error(f"❌ Error extracting subreddit data: {e}")
            return {
                'name': getattr(subreddit, 'display_name', 'Unknown'),
                'error': str(e),
                'last_scraped_at': datetime.now(timezone.utc).isoformat()
            }
    
    async def _fetch_hot_posts(self, subreddit, limit: int = 30) -> List[Dict[str, Any]]:
        """Fetch HOT posts for engagement metrics and minimum requirements"""
        posts_data = []

        try:
            # Get HOT posts (current trending content) with retry
            hot_generator = await self._retry_with_backoff(
                subreddit.hot, limit=limit
            )
            async for post in hot_generator:
                try:
                    post_data = await self._extract_post_data(post)
                    posts_data.append(post_data)

                    # Extract and save user data
                    if post.author and not post.author.name.startswith('['):
                        user_data = await self.user_service.analyze_user(post.author.name)
                        if user_data:
                            await self.user_service.save_user(user_data)

                    self.stats['posts_analyzed'] += 1

                except Exception as e:
                    self.logger.warning(f"⚠️ Error processing hot post: {e}")
                    continue

        except Exception as e:
            self.logger.error(f"❌ Error fetching hot posts: {e}")

        return posts_data

    async def _fetch_top_yearly_posts(self, subreddit, limit: int = 100) -> List[Dict[str, Any]]:
        """Fetch TOP YEARLY posts ONLY for best posting time analysis"""
        posts_data = []

        try:
            # Get TOP posts from the past YEAR for timing analysis AND saving
            top_generator = await self._retry_with_backoff(
                subreddit.top, time_filter='year', limit=limit
            )
            async for post in top_generator:
                try:
                    post_data = await self._extract_post_data(post)
                    posts_data.append(post_data)
                    
                    # Extract and save user data
                    if post.author and not post.author.name.startswith('['):
                        user_data = await self.user_service.analyze_user(post.author.name)
                        if user_data:
                            await self.user_service.save_user(user_data)
                    
                    self.stats['posts_analyzed'] += 1
                    
                except Exception as e:
                    self.logger.warning(f"⚠️ Error processing post: {e}")
                    continue
                    
        except Exception as e:
            self.logger.error(f"❌ Error analyzing posts: {e}")
        
        return posts_data
    
    async def _extract_post_data(self, post) -> Dict[str, Any]:
        """Extract comprehensive post data matching all 45 database fields"""
        try:
            # Load post data with retry
            await self._retry_with_backoff(post.load)

            # Simple engagement calculation
            created_time = datetime.fromtimestamp(post.created_utc, timezone.utc)

            # Determine content type
            if post.is_self:
                content_type = 'text'
            elif getattr(post, 'is_video', False):
                content_type = 'video'
            elif hasattr(post, 'url') and any(ext in post.url.lower() for ext in ['.jpg', '.png', '.gif', '.jpeg']):
                content_type = 'image'
            else:
                content_type = 'link'

            # Extract posting time details
            posting_hour = created_time.hour
            day_names = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
            posting_day = day_names[created_time.weekday()]

            data = {
                'reddit_id': post.id,
                'title': post.title,
                'selftext': getattr(post, 'selftext', None),
                'author_username': post.author.name if post.author else '[deleted]',
                'subreddit_name': post.subreddit.display_name,
                'created_utc': created_time.isoformat(),
                'score': post.score,
                'upvote_ratio': post.upvote_ratio,
                'num_comments': post.num_comments,
                'comment_to_upvote_ratio': post.num_comments / max(post.score, 1),
                'engagement': post.num_comments / max(post.score, 1),  # Simple engagement ratio
                'url': post.url,
                'permalink': f"https://reddit.com{post.permalink}",
                'domain': getattr(post, 'domain', None),
                'thumbnail': getattr(post, 'thumbnail', None),

                # Boolean flags
                'is_self': post.is_self,
                'is_video': getattr(post, 'is_video', False),
                'over_18': post.over_18,
                'spoiler': getattr(post, 'spoiler', False),
                'stickied': post.stickied,
                'locked': getattr(post, 'locked', False),
                'archived': getattr(post, 'archived', False),
                'edited': bool(getattr(post, 'edited', False)),
                'is_crosspost': bool(getattr(post, 'crosspost_parent_list', None)),
                'has_thumbnail': bool(getattr(post, 'thumbnail', None)),

                # Content metadata
                'content_type': content_type,
                'post_length': len(post.selftext) if post.is_self and post.selftext else 0,
                'posting_hour': posting_hour,
                'posting_day_of_week': posting_day,
                'peak_engagement_hour': posting_hour if post.num_comments > 50 else None,

                # Awards and flair
                'gilded': getattr(post, 'gilded', 0),
                'total_awards_received': getattr(post, 'total_awards_received', 0),
                'link_flair_text': getattr(post, 'link_flair_text', None),
                'author_flair_text': getattr(post, 'author_flair_text', None),
                'distinguished': getattr(post, 'distinguished', None),

                # Additional metadata
                'crosspost_parent': getattr(post, 'crosspost_parent', None),
                'approved_by': getattr(post, 'approved_by', None),
                'removed_by_category': getattr(post, 'removed_by_category', None),

                # Note: organic_engagement_score removed - using simple engagement ratio instead

                # Timestamp
                'scraped_at': datetime.now(timezone.utc).isoformat()
            }
            
            return data
            
        except Exception as e:
            self.logger.error(f"❌ Error extracting post data: {e}")
            return {
                'reddit_id': getattr(post, 'id', 'unknown'),
                'error': str(e),
                'last_scraped_at': datetime.now(timezone.utc).isoformat()
            }
    
    async def save_subreddit_data(self, subreddit_data: Dict[str, Any],
                                posts_data: List[Dict[str, Any]],
                                existing_category: Optional[str] = None) -> bool:
        """Save subreddit and posts data to database with batch processing"""
        try:
            # Use the category_text passed in or check database if not provided
            category_text = existing_category
            if category_text is None and 'name' in subreddit_data:
                # Only query if we don't already have the category
                existing = self.supabase.table('reddit_subreddits')\
                    .select('category_text')\
                    .eq('name', subreddit_data['name'])\
                    .execute()

                if existing.data and len(existing.data) > 0:
                    category_text = existing.data[0].get('category_text')

            # Get over18 from the subreddit data we just scraped
            sub_over18 = subreddit_data.get('over18')

            # Save subreddit first
            subreddit_response = self.supabase.table('reddit_subreddits').upsert(
                subreddit_data, on_conflict='name'
            ).execute()

            if hasattr(subreddit_response, 'error') and subreddit_response.error:
                self.logger.error(f"❌ Error saving subreddit: {subreddit_response.error}")
                return False

            # Process and save posts in batches to optimize memory
            if posts_data:
                batch_size = 50
                total_saved = 0

                for i in range(0, len(posts_data), batch_size):
                    batch = posts_data[i:i + batch_size]

                    # Add mirror fields to batch
                    for post in batch:
                        post['sub_category_text'] = category_text
                        post['sub_over18'] = sub_over18

                    # Save batch
                    try:
                        posts_response = self.supabase.table('reddit_posts').upsert(
                            batch, on_conflict='reddit_id'
                        ).execute()

                        if hasattr(posts_response, 'error') and posts_response.error:
                            self.logger.error(f"❌ Error saving posts batch {i//batch_size + 1}: {posts_response.error}")
                            continue

                        total_saved += len(batch)
                        self.logger.debug(f"💾 Saved batch {i//batch_size + 1} with {len(batch)} posts")

                    except Exception as e:
                        self.logger.error(f"❌ Error saving posts batch: {e}")
                        continue

                self.logger.info(f"💾 Saved r/{subreddit_data['name']} with {total_saved} posts (category: {category_text or 'none'})")
            else:
                self.logger.info(f"💾 Saved r/{subreddit_data['name']} (no posts)")

            return True

        except Exception as e:
            self.logger.error(f"❌ Error saving data: {e}")
            return False
    
    def _calculate_best_posting_times(self, posts: List[Any]) -> tuple[Optional[int], Optional[str]]:
        """Calculate best posting hour and day from top 100 yearly posts

        Analyzes when the top-performing posts were created and finds
        the most common hour and day for successful posts.
        """
        hour_counts = defaultdict(int)
        day_counts = defaultdict(int)
        hour_scores = defaultdict(list)
        day_scores = defaultdict(list)

        for post in posts:
            try:
                # Handle both async post objects and dict data
                if hasattr(post, 'created_utc'):
                    ts = post.created_utc
                    score = post.score or 0
                elif isinstance(post, dict):
                    # Handle dict format from database
                    created_utc = post.get('created_utc')
                    if isinstance(created_utc, str):
                        # Parse ISO format timestamp
                        dt = datetime.fromisoformat(created_utc.replace('Z', '+00:00'))
                        ts = dt.timestamp()
                    else:
                        ts = created_utc
                    score = post.get('score', 0) or 0
                else:
                    continue

                if ts is None:
                    continue

                # Convert timestamp to datetime
                if isinstance(ts, (int, float)):
                    dt = datetime.fromtimestamp(ts, tz=timezone.utc)
                else:
                    continue

                # Count occurrences and track scores
                hour = dt.hour
                day = dt.weekday()

                hour_counts[hour] += 1
                day_counts[day] += 1
                hour_scores[hour].append(score)
                day_scores[day].append(score)

            except Exception as e:
                self.logger.debug(f"Error processing post for timing: {e}")
                continue

        # Find best hour and day by FREQUENCY (most common) weighted by average score
        def best_key_by_frequency_and_score(counts, scores):
            best_key = None
            best_value = -1

            for key in counts:
                # Weight = frequency * average score
                # This finds times that are both common AND successful
                frequency = counts[key]
                avg_score = sum(scores[key]) / len(scores[key]) if scores[key] else 0

                # Normalize: frequency weight (70%) + score weight (30%)
                # This prioritizes consistency over outliers
                max_freq = max(counts.values()) if counts else 1
                max_avg = max([sum(s)/len(s) for s in scores.values() if s], default=1)

                weighted_value = (0.7 * frequency / max_freq) + (0.3 * avg_score / max_avg)

                if weighted_value > best_value:
                    best_value = weighted_value
                    best_key = key

            return best_key

        best_hour = best_key_by_frequency_and_score(hour_counts, hour_scores)
        best_day_idx = best_key_by_frequency_and_score(day_counts, day_scores)

        # Log the analysis
        if hour_counts:
            self.logger.info(f"📊 Posting time analysis from {sum(hour_counts.values())} posts:")
            self.logger.info(f"   Best hour: {best_hour}:00 (appeared {hour_counts.get(best_hour, 0)} times)")
            if best_day_idx is not None:
                day_names = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
                self.logger.info(f"   Best day: {day_names[best_day_idx]} (appeared {day_counts.get(best_day_idx, 0)} times)")

        day_names = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
        best_day = day_names[best_day_idx] if best_day_idx is not None else None

        return best_hour, best_day

    def _calculate_minimum_requirements(self, users_data: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Calculate ABSOLUTE MINIMUM requirements from user data

        Takes the lowest values for post karma, comment karma, and account age
        from all users who have posted in the subreddit. Each minimum can come
        from a different user.
        """
        if not users_data:
            # No user data available, return 0s
            return {
                'min_post_karma': 0,
                'min_comment_karma': 0,
                'min_account_age_days': 0,
                'requirement_sample_size': 0
            }

        post_karmas = []
        comment_karmas = []
        account_ages = []

        for user in users_data:
            # Get user metrics (use 0 as default)
            post_karma = user.get('link_karma', 0) or 0
            comment_karma = user.get('comment_karma', 0) or 0
            account_age = user.get('account_age_days', 0) or 0

            # Only track valid users (not suspended/deleted)
            # Include users with 0 karma as they still posted successfully
            if not user.get('is_suspended', False) and account_age > 0:
                post_karmas.append(post_karma)
                comment_karmas.append(comment_karma)
                account_ages.append(account_age)

        if not post_karmas:
            # All users were suspended or invalid
            return {
                'min_post_karma': 0,
                'min_comment_karma': 0,
                'min_account_age_days': 0,
                'requirement_sample_size': 0
            }

        # Calculate ABSOLUTE MINIMUMS (not percentiles)
        min_post_karma = min(post_karmas)
        min_comment_karma = min(comment_karmas)
        min_account_age_days = min(account_ages)

        self.logger.info(f"📊 Minimum requirements calculated from {len(post_karmas)} users:")
        self.logger.info(f"   Min post karma: {min_post_karma}")
        self.logger.info(f"   Min comment karma: {min_comment_karma}")
        self.logger.info(f"   Min account age: {min_account_age_days} days")

        return {
            'min_post_karma': min_post_karma,
            'min_comment_karma': min_comment_karma,
            'min_account_age_days': min_account_age_days,
            'requirement_sample_size': len(post_karmas)
        }

    async def _collect_user_data_from_posts(self, posts_data: List[Dict[str, Any]], reddit) -> List[Dict[str, Any]]:
        """Collect user data from post authors for requirements calculation"""
        users_data = []
        unique_users = set()

        for post in posts_data:
            username = post.get('author_username')
            if username and username != '[deleted]' and username not in unique_users:
                unique_users.add(username)

                try:
                    # Get user data with retry
                    user = await self._retry_with_backoff(
                        reddit.redditor, username
                    )
                    await self._retry_with_backoff(user.load)

                    # Calculate account age
                    created_utc = user.created_utc
                    account_age_days = (datetime.now(timezone.utc) - datetime.fromtimestamp(created_utc, timezone.utc)).days

                    user_data = {
                        'username': username,
                        'link_karma': getattr(user, 'link_karma', 0),
                        'comment_karma': getattr(user, 'comment_karma', 0),
                        'total_karma': getattr(user, 'total_karma', 0),
                        'account_age_days': account_age_days,
                        'is_suspended': getattr(user, 'is_suspended', False)
                    }

                    if not user_data['is_suspended']:
                        users_data.append(user_data)

                    # Limit to 30 users for requirements calculation
                    if len(users_data) >= 30:
                        break

                except Exception as e:
                    self.logger.debug(f"Could not fetch user {username}: {e}")
                    continue

        return users_data

    def _calculate_engagement_metrics(self, posts_data: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Calculate engagement metrics from HOT 30 posts"""
        if not posts_data:
            return {}

        # Use only first 30 posts (should already be limited but ensure)
        hot_30 = posts_data[:30]
        post_count = len(hot_30)

        # Calculate totals from hot 30
        total_score = sum(p.get('score', 0) for p in hot_30)
        total_comments = sum(p.get('num_comments', 0) for p in hot_30)

        # Calculate averages by content type from hot 30
        content_types = defaultdict(list)
        for post in hot_30:
            content_type = post.get('content_type', 'unknown')
            score = post.get('score', 0)
            content_types[content_type].append(score)

        # Calculate average scores per content type
        image_scores = content_types.get('image', [])
        video_scores = content_types.get('video', [])
        text_scores = content_types.get('text', [])
        link_scores = content_types.get('link', [])

        # Calculate average scores
        image_avg = sum(image_scores) / len(image_scores) if image_scores else 0
        video_avg = sum(video_scores) / len(video_scores) if video_scores else 0
        text_avg = sum(text_scores) / len(text_scores) if text_scores else 0
        link_avg = sum(link_scores) / len(link_scores) if link_scores else 0

        # Determine top content type
        content_type_scores = {
            'image': image_avg,
            'video': video_avg,
            'text': text_avg,
            'link': link_avg
        }

        # Find the content type with highest average score
        top_content_type = None
        if any(content_type_scores.values()):
            top_content_type = max(content_type_scores.items(), key=lambda x: x[1])[0]

        return {
            'total_posts_hot_30': post_count,
            'total_upvotes_hot_30': total_score,
            'avg_upvotes_per_post': total_score / post_count if post_count > 0 else 0,
            'avg_comments_per_post': total_comments / post_count if post_count > 0 else 0,
            'comment_to_upvote_ratio': total_comments / max(total_score, 1),
            'avg_engagement': total_comments / max(total_score, 1),  # Simple engagement ratio
            'image_post_avg_score': image_avg,
            'video_post_avg_score': video_avg,
            'text_post_avg_score': text_avg,
            'link_post_avg_score': link_avg,
            'top_content_type': top_content_type
        }

    async def discover_subreddits_from_users(self, usernames: List[str],
                                           max_users: int = 100,
                                           process_discovered: bool = True) -> Dict[str, Any]:
        """Discover new subreddits from user posts and optionally process them

        Args:
            usernames: List of Reddit usernames to analyze
            max_users: Maximum number of users to process
            process_discovered: If True, automatically analyze discovered subreddits

        Returns:
            Dict with discovered subreddits and processing results
        """
        discovered_subreddits = set()
        processed_users = 0
        discovered_posts = []

        # Process users and extract subreddits from their posts only
        for username in usernames[:max_users]:
            if processed_users >= max_users:
                break

            try:
                client_info = self.get_current_client()
                reddit = client_info['reddit']

                await self._apply_stealth_delay()

                # Get user with retry
                user = await self._retry_with_backoff(
                    reddit.redditor, username
                )

                # Get user's recent submissions (posts only, no comments)
                submissions_generator = await self._retry_with_backoff(
                    user.submissions.new, limit=30
                )

                async for submission in submissions_generator:
                    subreddit_name = submission.subreddit.display_name
                    discovered_subreddits.add(subreddit_name)

                    # Extract post data for potential saving
                    try:
                        post_data = await self._extract_post_data(submission)
                        discovered_posts.append(post_data)
                    except Exception as e:
                        self.logger.debug(f"Could not extract post data: {e}")

                processed_users += 1
                self.stats['users_analyzed'] += 1

                # Log user discovery
                self.logging_service.log_user_discovery(
                    username=username,
                    operation_type='subreddit_discovery',
                    discovered_subreddits=len(discovered_subreddits),
                    account_used=client_info['username'],
                    success=True
                )

            except Exception as e:
                self.logger.warning(f"⚠️ Error processing user {username}: {e}")
                continue

        # Process discovered subreddits if requested
        processed_subreddits = []
        if process_discovered and discovered_subreddits:
            self.logger.info(f"📊 Processing {len(discovered_subreddits)} discovered subreddits...")

            for subreddit_name in discovered_subreddits:
                try:
                    # Analyze each discovered subreddit
                    result = await self.analyze_subreddit(subreddit_name)
                    processed_subreddits.append(result)
                    self.logger.info(f"✅ Processed r/{subreddit_name}")

                except Exception as e:
                    self.logger.error(f"❌ Failed to process r/{subreddit_name}: {e}")
                    continue

        return {
            'discovered_subreddits': list(discovered_subreddits),
            'discovered_count': len(discovered_subreddits),
            'processed_users': processed_users,
            'discovered_posts': discovered_posts,
            'processed_subreddits': processed_subreddits if process_discovered else [],
            'processed_count': len(processed_subreddits) if process_discovered else 0
        }
    
    async def _apply_stealth_delay(self):
        """Apply stealth delays to avoid rate limiting"""
        current_time = time.time()
        
        # Calculate delay based on stealth configuration
        if self.stealth_config['last_request_time'] > 0:
            time_since_last = current_time - self.stealth_config['last_request_time']
            min_delay = self.stealth_config['min_delay']
            
            if time_since_last < min_delay:
                delay = min_delay - time_since_last
                await asyncio.sleep(delay)
        
        # Apply random delay
        delay = random.uniform(
            self.stealth_config['min_delay'],
            self.stealth_config['max_delay']
        )
        await asyncio.sleep(delay)
        
        # Apply burst delay if needed
        self.stealth_config['request_count'] += 1
        if self.stealth_config['request_count'] % self.stealth_config['burst_frequency'] == 0:
            burst_delay = random.uniform(*self.stealth_config['burst_delay'])
            self.logger.info(f"💤 Taking burst delay: {burst_delay:.1f}s")
            await asyncio.sleep(burst_delay)
        
        self.stealth_config['last_request_time'] = time.time()
    
    async def get_scraper_stats(self) -> Dict[str, Any]:
        """Get comprehensive scraper statistics"""
        current_time = datetime.now(timezone.utc)
        runtime_hours = (current_time - self.stats['start_time']).total_seconds() / 3600
        
        # Get database stats
        try:
            subreddits_response = self.supabase.table('reddit_subreddits').select('id', count='exact').execute()
            total_subreddits = subreddits_response.count or 0
            
            posts_response = self.supabase.table('reddit_posts').select('id', count='exact').execute()
            total_posts = posts_response.count or 0
            
            users_response = self.supabase.table('reddit_users').select('id', count='exact').execute()
            total_users = users_response.count or 0
        except Exception:
            total_subreddits = total_posts = total_users = 0
        
        return {
            'runtime_hours': round(runtime_hours, 2),
            'session_stats': self.stats,
            'database_totals': {
                'reddit_subreddits': total_subreddits,
                'reddit_posts': total_posts,
                'reddit_users': total_users
            },
            'client_stats': [
                {
                    'username': client['username'],
                    'requests_made': client['requests_made'],
                    'successful_requests': client['successful_requests'],
                    'failed_requests': client['failed_requests'],
                    'has_proxy': client['proxy'] is not None
                }
                for client in self.reddit_clients
            ],
            'rate_limiting': {
                'rate_limited_users': len(self.rate_limited_users),
                'users_skipped': self.stats['users_skipped_rate_limited']
            }
        }
    
    async def close(self):
        """Clean up resources"""
        for client_info in self.reddit_clients:
            try:
                await client_info['reddit'].close()
            except Exception:
                pass
        
        self.reddit_clients.clear()
        self.logger.info("🔒 Reddit scraper service closed")