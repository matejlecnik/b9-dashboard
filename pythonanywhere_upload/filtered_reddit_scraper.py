#!/usr/bin/env python3
"""
Enhanced Reddit Scraper with Smart Filtering Integration
Adds the SmartSubredditFilter to the existing scraper pipeline
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from reddit_scraper import *
from smart_subreddit_filter import SmartSubredditFilter

class FilteredProxyEnabledMultiScraper(ProxyEnabledMultiScraper):
    """Enhanced scraper with smart filtering capabilities"""
    
    def __init__(self):
        super().__init__()
        self.smart_filter = None
    
    async def initialize(self):
        """Initialize the scraper and smart filter"""
        await super().initialize()
        
        # Initialize smart filter with same Supabase client
        self.smart_filter = SmartSubredditFilter(self.supabase)
        logger.info("🧠 Smart Subreddit Filter initialized")
    
    def save_subreddit_with_filtering(self, subreddit_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Save subreddit data with smart filtering applied.
        Returns the filtered subreddit data.
        """
        try:
            # Apply smart filtering
            filtered_data = self.smart_filter.filter_subreddit(subreddit_data)
            
            # Log filtering results
            name = filtered_data.get('name', 'unknown')
            filter_status = filtered_data.get('filter_status', 'unprocessed')
            filter_reason = filtered_data.get('filter_reason', '')
            
            if filter_status == 'filtered':
                logger.info(f"🚫 Filtered r/{name}: {filter_reason}")
            elif filter_status == 'whitelist':
                logger.info(f"✅ Whitelisted r/{name}: {filter_reason}")
            else:
                logger.info(f"🔍 Passed r/{name}: Ready for manual review")
            
            # Save to database with filter information
            try:
                resp = self.supabase.table('subreddits').upsert(filtered_data, on_conflict='name').execute()
                if hasattr(resp, 'error') and resp.error:
                    logger.error(f"❌ Database error for r/{name}: {resp.error}")
                else:
                    logger.info(f"💾 Saved r/{name} with filter status: {filter_status}")
            except Exception as e:
                logger.error(f"❌ Error saving filtered subreddit r/{name}: {e}")
            
            return filtered_data
            
        except Exception as e:
            logger.error(f"❌ Error in filtering pipeline: {e}")
            # Fallback: save without filtering
            try:
                resp = self.supabase.table('subreddits').upsert(subreddit_data, on_conflict='name').execute()
                logger.info(f"💾 Saved r/{subreddit_data.get('name', 'unknown')} without filtering (fallback)")
            except Exception as save_error:
                logger.error(f"❌ Fallback save failed: {save_error}")
            
            return subreddit_data
    
    def analyze_subreddit_public_api_with_proxy_sync(self, subreddit_name: str, proxy_config: dict):
        """Enhanced version with filtering integration"""
        try:
            proxy_service = proxy_config.get('display_name', 'direct') if proxy_config else 'direct'
            logger.info(f"🔍 Analyzing r/{subreddit_name} using public API (proxy: {proxy_service})")
            
            # Get subreddit info, hot posts, top posts, and rules (synchronous calls)
            subreddit_info = self.public_api.get_subreddit_info(subreddit_name, proxy_config)
            hot_posts = self.public_api.get_subreddit_hot_posts(subreddit_name, 30, proxy_config)
            top_posts = self.public_api.get_subreddit_top_posts(subreddit_name, 'year', 100, proxy_config)
            rules = self.public_api.get_subreddit_rules(subreddit_name, proxy_config)
            
            # Handle errors in any of the API calls
            if any(data.get('error') for data in [subreddit_info, hot_posts, top_posts]):
                error_msgs = [data.get('error') for data in [subreddit_info, hot_posts, top_posts] if data.get('error')]
                logger.error(f"❌ API errors for r/{subreddit_name}: {error_msgs}")
                return False
                
            # Extract subreddit basic info
            if not subreddit_info or 'data' not in subreddit_info:
                logger.error(f"❌ Invalid subreddit info for r/{subreddit_name}")
                return False
            
            info = subreddit_info['data']
            name = info.get('display_name', subreddit_name)
            
            # Process hot posts for engagement metrics
            posts_data = []
            if hot_posts.get('data', {}).get('children'):
                for post_data in hot_posts['data']['children']:
                    post_info = post_data['data']
                    posts_data.append({
                        'reddit_id': post_info.get('id'),
                        'title': post_info.get('title', ''),
                        'author': post_info.get('author'),
                        'score': post_info.get('score', 0),
                        'num_comments': post_info.get('num_comments', 0),
                        'created_utc': post_info.get('created_utc'),
                        'content_type': self.determine_content_type(post_info)
                    })
            
            # Calculate engagement metrics
            hot_count = len(posts_data)
            total_score = sum(post.get('score', 0) for post in posts_data)
            avg_score = total_score / hot_count if hot_count > 0 else 0
            
            # Process rules data
            rules_data = {}
            if rules and isinstance(rules, dict) and 'rules' in rules:
                for rule in rules['rules']:
                    if isinstance(rule, dict):
                        short_name = rule.get('short_name', f"rule_{rule.get('priority', 'unknown')}")
                        rules_data[short_name] = rule.get('description', '')
            
            # Build subreddit payload
            payload = {
                'name': name,
                'display_name_prefixed': f"r/{name}",
                'title': info.get('title', ''),
                'public_description': info.get('public_description', ''),
                'description': info.get('description', ''),
                'rules_data': rules_data,  # Include rules for filtering
                'subscribers': info.get('subscribers', 0),
                'accounts_active': info.get('accounts_active', 0),
                'over18': info.get('over18', False),
                'created_utc': datetime.fromtimestamp(info.get('created_utc', 0), tz=timezone.utc) if info.get('created_utc') else None,
                'total_upvotes_hot_30': total_score,
                'total_posts_hot_30': hot_count,
                'avg_upvotes_per_post': avg_score,
                'last_scraped_at': datetime.now(timezone.utc).isoformat(),
                # Add filtering-specific fields
                'seller_ban_detected': False,
                'verification_required_detected': False,
                'filter_status': 'unprocessed'
            }
            
            # Apply smart filtering and save
            filtered_payload = self.save_subreddit_with_filtering(payload)
            
            # Return success with filter information
            return {
                'success': True,
                'subreddit_name': name,
                'filter_status': filtered_payload.get('filter_status'),
                'filter_reason': filtered_payload.get('filter_reason'),
                'posts_count': hot_count,
                'total_score': total_score
            }
            
        except Exception as e:
            logger.error(f"❌ Error analyzing r/{subreddit_name}: {e}")
            return False
    
    def batch_refilter_existing_subreddits(self, limit: int = 100) -> Dict[str, int]:
        """
        Re-filter existing subreddits that haven't been processed yet.
        Used for applying filters to already-scraped data.
        """
        try:
            # Get unprocessed subreddits
            response = self.supabase.table('subreddits')\
                .select('*')\
                .or_('filter_status.is.null,filter_status.eq.unprocessed')\
                .limit(limit)\
                .execute()
            
            if not response.data:
                logger.info("📭 No unprocessed subreddits found")
                return {'processed': 0, 'filtered': 0, 'passed': 0}
            
            stats = {'processed': 0, 'filtered': 0, 'passed': 0}
            
            # Process each subreddit
            for subreddit_data in response.data:
                try:
                    # Apply filtering
                    filtered_data = self.smart_filter.filter_subreddit(subreddit_data)
                    
                    # Update database
                    update_data = {
                        'filter_status': filtered_data['filter_status'],
                        'filter_reason': filtered_data.get('filter_reason'),
                        'filter_keywords': filtered_data.get('filter_keywords', []),
                        'seller_ban_detected': filtered_data.get('seller_ban_detected', False),
                        'verification_required_detected': filtered_data.get('verification_required_detected', False),
                        'filtered_at': filtered_data['filtered_at']
                    }
                    
                    # Include review update if auto-categorized
                    if 'review' in filtered_data:
                        update_data['review'] = filtered_data['review']
                    
                    self.supabase.table('subreddits')\
                        .update(update_data)\
                        .eq('id', subreddit_data['id'])\
                        .execute()
                    
                    stats['processed'] += 1
                    if filtered_data['filter_status'] == 'filtered':
                        stats['filtered'] += 1
                    else:
                        stats['passed'] += 1
                    
                    name = subreddit_data.get('name', 'unknown')
                    logger.info(f"🔄 Re-filtered r/{name}: {filtered_data['filter_status']}")
                    
                except Exception as e:
                    logger.error(f"❌ Error re-filtering {subreddit_data.get('name', 'unknown')}: {e}")
            
            logger.info(f"📊 Batch re-filtering complete: {stats['processed']} processed, {stats['filtered']} filtered, {stats['passed']} passed")
            return stats
            
        except Exception as e:
            logger.error(f"❌ Error in batch re-filtering: {e}")
            return {'error': str(e)}
    
    async def test_filtering_integration(self):
        """Test the filtering integration with a few subreddits"""
        test_subreddits = [
            'gonewild',  # Should be filtered (explicit)
            'programming',  # Should be filtered (unrelated)
            'rateme',  # Should pass
            'SFWAmIHot'  # Should be whitelisted
        ]
        
        logger.info("🧪 Testing Smart Filter Integration...")
        
        for subreddit_name in test_subreddits:
            try:
                # Create test subreddit data
                test_data = {
                    'name': subreddit_name,
                    'title': f'Test Subreddit {subreddit_name}',
                    'description': f'This is a test for {subreddit_name}',
                    'public_description': f'Public description for {subreddit_name}',
                    'rules_data': {}
                }
                
                # Apply filtering
                result = self.smart_filter.filter_subreddit(test_data)
                
                logger.info(f"🔍 r/{subreddit_name}: {result['filter_status']} - {result.get('filter_reason', 'No reason')}")
                
            except Exception as e:
                logger.error(f"❌ Test failed for r/{subreddit_name}: {e}")
        
        # Test stats
        stats = self.smart_filter.get_filter_stats()
        logger.info(f"📊 Filter Stats: {stats}")

# Enhanced main function with filtering capabilities
async def main_with_filtering():
    """Main execution with smart filtering enabled"""
    
    scraper = FilteredProxyEnabledMultiScraper()
    
    try:
        await scraper.initialize()
        logger.info("🚀 Enhanced scraper with filtering initialized")
        
        # Test filtering integration first
        await scraper.test_filtering_integration()
        
        # Option 1: Re-filter existing data
        logger.info("🔄 Starting batch re-filtering of existing subreddits...")
        refilter_stats = scraper.batch_refilter_existing_subreddits(limit=500)
        logger.info(f"📊 Re-filtering results: {refilter_stats}")
        
        # Option 2: Continue with normal scraping (with filtering integrated)
        # await scraper.test_proxy_scraping()
        
        # Display filter statistics
        filter_stats = scraper.smart_filter.get_filter_stats()
        logger.info(f"🎯 Final Filter Statistics: {filter_stats}")
        
    except Exception as e:
        logger.error(f"❌ Error in filtered scraping: {e}")
        
    finally:
        await scraper.close()

if __name__ == "__main__":
    asyncio.run(main_with_filtering())