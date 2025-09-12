#!/usr/bin/env python3
"""
Reddit Scraper Service - Extracted and refactored from reddit_scraper.py
"""

import asyncio
import json
import logging
import random
import time
from datetime import datetime, timezone, timedelta
from typing import Dict, List, Any, Optional, Tuple
from dataclasses import dataclass
from collections import defaultdict

import asyncpraw
import asyncprawcore
import aiohttp
import requests
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
    
    async def initialize_reddit_clients(self, reddit_accounts: List[Dict[str, str]], 
                                      proxy_configs: List[Dict[str, str]] = None) -> bool:
        """Initialize Reddit clients with accounts and optional proxy support"""
        try:
            proxy_configs = proxy_configs or []
            
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
    
    async def analyze_subreddit(self, subreddit_name: str) -> Dict[str, Any]:
        """Analyze a single subreddit and return comprehensive data"""
        start_time = time.time()
        
        try:
            client_info = self.get_current_client()
            reddit = client_info['reddit']
            
            # Apply stealth delay
            await self._apply_stealth_delay()
            
            # Get subreddit info
            subreddit = await reddit.subreddit(subreddit_name)
            
            # Extract basic information
            subreddit_data = await self._extract_subreddit_data(subreddit)
            
            # Analyze recent posts
            posts_data = await self._analyze_recent_posts(subreddit, limit=50)
            
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
                data_points_collected=len(posts_data) + 1,
                account_used=client_info['username'],
                proxy_used=client_info['proxy']['host'] if client_info['proxy'] else None,
                success=True,
                processing_time_ms=processing_time_ms
            )
            
            return {
                'subreddit': subreddit_data,
                'posts': posts_data,
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
        """Extract comprehensive subreddit data"""
        try:
            # Get basic data
            await subreddit.load()
            
            # Extract all available fields
            data = {
                'name': subreddit.display_name,
                'title': subreddit.title,
                'public_description': subreddit.public_description,
                'description': subreddit.description,
                'subscribers': subreddit.subscribers,
                'active_users': getattr(subreddit, 'active_user_count', None),
                'created_utc': datetime.fromtimestamp(subreddit.created_utc, timezone.utc).isoformat() if subreddit.created_utc else None,
                'over18': subreddit.over18,
                'lang': subreddit.lang,
                'url': f"https://reddit.com{subreddit.url}",
                'subreddit_type': subreddit.subreddit_type,
                'is_crosspostable': getattr(subreddit, 'allow_crossposts', None),
                'is_video_enabled': getattr(subreddit, 'allow_videos', None),
                'is_image_enabled': getattr(subreddit, 'allow_images', None),
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
    
    async def _analyze_recent_posts(self, subreddit, limit: int = 50) -> List[Dict[str, Any]]:
        """Analyze recent posts from a subreddit"""
        posts_data = []
        
        try:
            # Get hot posts
            async for post in subreddit.hot(limit=limit):
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
        """Extract comprehensive post data"""
        try:
            # Load post data
            await post.load()
            
            # Calculate engagement velocity (score per hour since posting)
            created_time = datetime.fromtimestamp(post.created_utc, timezone.utc)
            hours_since_posted = (datetime.now(timezone.utc) - created_time).total_seconds() / 3600
            engagement_velocity = post.score / max(hours_since_posted, 0.1)
            
            data = {
                'reddit_id': post.id,
                'title': post.title,
                'author': post.author.name if post.author else '[deleted]',
                'subreddit_name': post.subreddit.display_name,
                'created_utc': created_time.isoformat(),
                'score': post.score,
                'upvote_ratio': post.upvote_ratio,
                'num_comments': post.num_comments,
                'engagement_velocity': round(engagement_velocity, 2),
                'url': post.url,
                'permalink': f"https://reddit.com{post.permalink}",
                'is_nsfw': post.over_18,
                'is_pinned': post.pinned,
                'post_type': 'text' if post.is_self else 'link',
                'has_media': bool(getattr(post, 'media', None)),
                'last_scraped_at': datetime.now(timezone.utc).isoformat()
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
                                posts_data: List[Dict[str, Any]]) -> bool:
        """Save subreddit and posts data to database"""
        try:
            # Save subreddit
            subreddit_response = self.supabase.table('subreddits').upsert(
                subreddit_data, on_conflict='name'
            ).execute()
            
            if hasattr(subreddit_response, 'error') and subreddit_response.error:
                self.logger.error(f"❌ Error saving subreddit: {subreddit_response.error}")
                return False
            
            # Save posts if any
            if posts_data:
                posts_response = self.supabase.table('posts').upsert(
                    posts_data, on_conflict='reddit_id'
                ).execute()
                
                if hasattr(posts_response, 'error') and posts_response.error:
                    self.logger.error(f"❌ Error saving posts: {posts_response.error}")
                    return False
            
            self.logger.info(f"💾 Saved r/{subreddit_data['name']} with {len(posts_data)} posts")
            return True
            
        except Exception as e:
            self.logger.error(f"❌ Error saving data: {e}")
            return False
    
    async def discover_subreddits_from_users(self, usernames: List[str], 
                                           max_users: int = 100) -> List[str]:
        """Discover new subreddits from user activity"""
        discovered = set()
        processed_count = 0
        
        for username in usernames[:max_users]:
            if processed_count >= max_users:
                break
                
            try:
                client_info = self.get_current_client()
                reddit = client_info['reddit']
                
                await self._apply_stealth_delay()
                
                user = await reddit.redditor(username)
                
                # Get user's recent submissions
                async for submission in user.submissions.new(limit=20):
                    subreddit_name = submission.subreddit.display_name
                    discovered.add(subreddit_name)
                
                # Get user's recent comments
                async for comment in user.comments.new(limit=20):
                    subreddit_name = comment.subreddit.display_name
                    discovered.add(subreddit_name)
                
                processed_count += 1
                self.stats['users_analyzed'] += 1
                
                # Log user discovery
                self.logging_service.log_user_discovery(
                    username=username,
                    operation_type='subreddit_discovery',
                    discovered_subreddits=len(discovered),
                    account_used=client_info['username'],
                    success=True
                )
                
            except Exception as e:
                self.logger.warning(f"⚠️ Error processing user {username}: {e}")
                continue
        
        return list(discovered)
    
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
            subreddits_response = self.supabase.table('subreddits').select('id', count='exact').execute()
            total_subreddits = subreddits_response.count or 0
            
            posts_response = self.supabase.table('posts').select('id', count='exact').execute()
            total_posts = posts_response.count or 0
            
            users_response = self.supabase.table('users').select('id', count='exact').execute()
            total_users = users_response.count or 0
        except Exception:
            total_subreddits = total_posts = total_users = 0
        
        return {
            'runtime_hours': round(runtime_hours, 2),
            'session_stats': self.stats,
            'database_totals': {
                'subreddits': total_subreddits,
                'posts': total_posts,
                'users': total_users
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