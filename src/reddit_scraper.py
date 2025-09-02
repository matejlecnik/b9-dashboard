#!/usr/bin/env python3
"""
Proxy-Enabled Multi-Account Reddit Scraper
Uses your working Decodo proxy format with custom requestor for AsyncPRAW.
"""

import asyncio
import json
import os
import logging
import requests
from datetime import datetime, timezone
from typing import Dict, List, Any
import asyncpraw
import asyncprawcore
from supabase import create_client
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('logs/proxy_scraper.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

class ProxyRequestor(asyncprawcore.Requestor):
    """Custom requestor that uses requests library with proxy support"""
    
    def __init__(self, *args, proxy_config=None, **kwargs):
        super().__init__(*args, **kwargs)
        self.proxy_config = proxy_config
        
    async def request(self, method, url, *args, **kwargs):
        """Override request method to use requests library with proxy"""
        try:
            # Use requests library for proxy support (synchronous but works)
            headers = kwargs.get('headers', {})
            data = kwargs.get('data', None)
            json_data = kwargs.get('json', None)
            
            # Make synchronous request with proxy
            if method.upper() == 'GET':
                response = requests.get(
                    url,
                    headers=headers,
                    proxies=self.proxy_config,
                    timeout=30
                )
            elif method.upper() == 'POST':
                response = requests.post(
                    url,
                    headers=headers,
                    data=data,
                    json=json_data,
                    proxies=self.proxy_config,
                    timeout=30
                )
            else:
                # Fallback to parent method for other methods
                return await super().request(method, url, *args, **kwargs)
            
            # Convert requests response to asyncprawcore format
            return asyncprawcore.Response(
                content=response.text,
                headers=dict(response.headers),
                status_code=response.status_code,
                url=response.url
            )
            
        except Exception as e:
            logger.error(f"❌ Proxy request failed: {e}")
            # Fallback to parent method without proxy
            return await super().request(method, url, *args, **kwargs)

class ProxyEnabledMultiScraper:
    """Multi-account scraper with working proxy support"""
    
    def __init__(self):
        self.reddit_clients = []
        self.current_client_index = 0
        self.supabase = None
        
        # Performance tracking
        self.stats = {
            'accounts_used': {},
            'proxy_requests': 0,
            'direct_requests': 0,
            'total_requests': 0,
            'subreddits_analyzed': 0,
            'posts_analyzed': 0,
            'start_time': datetime.now()
        }
    
    async def initialize(self):
        """Initialize with proxy-enabled Reddit clients"""
        try:
            # Load account configuration
            with open('config/accounts_config.json', 'r') as f:
                config = json.load(f)
            
            enabled_accounts = [acc for acc in config['reddit_accounts'] if acc.get('enabled', True)]
            
            # Initialize Reddit clients with proxy support
            for account in enabled_accounts[:3]:
                # Parse proxy from your format: ip:port:username:password
                proxy_parts = account['proxy_id'].split(':')
                proxy_config = None
                
                if len(proxy_parts) >= 4:
                    proxy_host = proxy_parts[0]
                    proxy_port = proxy_parts[1]
                    proxy_username = proxy_parts[2]
                    proxy_password = proxy_parts[3]
                    
                    # Format like your working script
                    proxy_url = f"http://{proxy_username}:{proxy_password}@{proxy_host}:{proxy_port}"
                    proxy_config = {
                        'http': proxy_url,
                        'https': proxy_url
                    }
                    
                    logger.info(f"🌐 {account['username']} using proxy: {proxy_username}:***@{proxy_host}:{proxy_port}")
                
                # Create Reddit client with custom proxy requestor
                reddit_client = asyncpraw.Reddit(
                    client_id=account['client_id'],
                    client_secret=account['client_secret'],
                    username=account['username'],
                    password=account['password'],
                    user_agent=account['user_agent'],
                    requestor_class=ProxyRequestor,
                    requestor_kwargs={'proxy_config': proxy_config} if proxy_config else {}
                )
                
                # Test authentication
                try:
                    me = await reddit_client.user.me()
                    logger.info(f"✅ {account['username']} authenticated successfully (via proxy: {'Yes' if proxy_config else 'No'})")
                    
                    self.reddit_clients.append({
                        'client': reddit_client,
                        'username': account['username'],
                        'proxy_config': proxy_config,
                        'proxy_host': proxy_parts[0] if len(proxy_parts) >= 4 else 'Direct',
                        'requests_made': 0,
                        'is_healthy': True
                    })
                    
                    self.stats['accounts_used'][account['username']] = 0
                    
                except Exception as e:
                    logger.error(f"❌ {account['username']} authentication failed: {e}")
                    await reddit_client.close()
            
            # Initialize Supabase
            supabase_url = os.getenv('SUPABASE_URL')
            supabase_key = os.getenv('SUPABASE_ANON_KEY')
            self.supabase = create_client(supabase_url, supabase_key)
            
            logger.info(f"🚀 Proxy-enabled scraper initialized with {len(self.reddit_clients)} accounts")
            
        except Exception as e:
            logger.error(f"❌ Failed to initialize: {e}")
            raise
    
    def get_next_client(self):
        """Get next Reddit client with load balancing"""
        if not self.reddit_clients:
            raise Exception("No Reddit clients available")
        
        client_info = self.reddit_clients[self.current_client_index]
        client_info['requests_made'] += 1
        self.stats['accounts_used'][client_info['username']] += 1
        self.stats['total_requests'] += 1
        
        # Track proxy vs direct requests
        if client_info['proxy_config']:
            self.stats['proxy_requests'] += 1
        else:
            self.stats['direct_requests'] += 1
        
        # Move to next client
        self.current_client_index = (self.current_client_index + 1) % len(self.reddit_clients)
        
        return client_info['client'], client_info['username']
    
    async def get_target_subreddits(self) -> List[str]:
        """Get target subreddits (ONLY Ok category)"""
        try:
            response = self.supabase.table('subreddits').select('name, category').eq(
                'category', 'Ok'
            ).execute()
            
            subreddits = [item['name'] for item in response.data]
            logger.info(f"📋 Found {len(subreddits)} target subreddits (ONLY Ok category)")
            return subreddits
            
        except Exception as e:
            logger.error(f"❌ Failed to fetch target subreddits: {e}")
            return ['SFWAmIHot']
    
    async def test_proxy_scraping(self):
        """Test proxy-enabled scraping"""
        logger.info("🧪 Starting proxy-enabled scraping test...")
        
        # Get a few target subreddits
        target_subreddits = await self.get_target_subreddits()
        test_subreddits = target_subreddits[:3]  # Test with 3 subreddits
        
        for subreddit_name in test_subreddits:
            try:
                # Get next client (with proxy)
                reddit_client, account_name = self.get_next_client()
                
                logger.info(f"🔍 Testing r/{subreddit_name} with {account_name}")
                
                # Test subreddit access
                subreddit = await reddit_client.subreddit(subreddit_name, fetch=True)
                logger.info(f"✅ Subreddit access: r/{subreddit.display_name} ({subreddit.subscribers:,} subscribers)")
                
                # Test post fetching
                post_count = 0
                async for submission in subreddit.hot(limit=5):
                    post_count += 1
                    logger.info(f"   📝 Post {post_count}: {submission.title[:50]}...")
                
                logger.info(f"✅ Successfully fetched {post_count} posts from r/{subreddit_name}")
                self.stats['subreddits_analyzed'] += 1
                self.stats['posts_analyzed'] += post_count
                
            except Exception as e:
                logger.error(f"❌ Error testing r/{subreddit_name}: {e}")
        
        self.print_proxy_stats()
    
    def print_proxy_stats(self):
        """Print proxy-specific statistics"""
        runtime = datetime.now() - self.stats['start_time']
        
        print(f"\n📊 PROXY-ENABLED SCRAPER STATS:")
        print("="*60)
        print(f"⏱️  Runtime: {runtime}")
        print(f"🔍 Subreddits analyzed: {self.stats['subreddits_analyzed']}")
        print(f"📝 Posts analyzed: {self.stats['posts_analyzed']}")
        print(f"🌐 Total requests: {self.stats['total_requests']}")
        print(f"🔒 Proxy requests: {self.stats['proxy_requests']}")
        print(f"🔓 Direct requests: {self.stats['direct_requests']}")
        
        print(f"\n📊 Account usage (with proxy info):")
        for client_info in self.reddit_clients:
            username = client_info['username']
            proxy_host = client_info['proxy_host']
            count = self.stats['accounts_used'][username]
            proxy_status = "🔒 PROXY" if client_info['proxy_config'] else "🔓 DIRECT"
            print(f"   {username}: {count} requests via {proxy_host} {proxy_status}")
    
    async def close(self):
        """Close all clients"""
        for client_info in self.reddit_clients:
            try:
                await client_info['client'].close()
            except:
                pass

async def main():
    """Main test function"""
    scraper = ProxyEnabledMultiScraper()
    
    try:
        await scraper.initialize()
        await scraper.test_proxy_scraping()
        
    except Exception as e:
        logger.error(f"❌ Error: {e}")
    
    finally:
        await scraper.close()

if __name__ == "__main__":
    asyncio.run(main())
