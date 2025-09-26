"""
User Scraper for Reddit Scraper v2
Handles scraping of user data and discovery of new subreddits through user activity
"""
import logging
from datetime import datetime, timezone
from typing import Dict, Any, Optional, List
try:
    from .base_scraper import BaseScraper
except ImportError:
    from base_scraper import BaseScraper

logger = logging.getLogger(__name__)


class UserScraper(BaseScraper):
    """
    Scraper for Reddit user data.
    Analyzes user activity to discover new subreddits.
    """

    async def scrape(self, username: str) -> Dict[str, Any]:
        """
        Scrape user data and discover subreddits they're active in.

        Args:
            username: Reddit username to scrape

        Returns:
            Dictionary containing user data and discovered subreddits
        """
        result = {
            'success': False,
            'username': username,
            'user_data': None,
            'user_posts': [],
            'discovered_subreddits': [],
            'error': None
        }

        try:
            # Check cache first
            if self.cache_manager:
                cached_data = await self.cache_manager.get_cached_user_async(username)
                if cached_data:
                    logger.debug(f"Using cached data for u/{username}")
                    result['user_data'] = cached_data
                    result['success'] = True
                    self.stats['items_cached'] += 1
                    return result

            # Check rate limiting
            if await self.check_rate_limit():
                await self.handle_rate_limit()

            # Fetch user info
            logger.info(f"[Thread {self.thread_id}] Scraping u/{username}")
            user_info = await self.make_api_request('get_user_info', username)

            if not user_info:
                logger.warning(f"Failed to fetch info for u/{username}")
                result['error'] = "Failed to fetch user info"
                return result

            # Check for errors in response
            if isinstance(user_info, dict):
                if user_info.get('error') == 'not_found':
                    logger.warning(f"User u/{username} not found")
                    result['error'] = 'not_found'
                    return result
                elif user_info.get('error') == 'suspended':
                    logger.warning(f"User u/{username} is suspended")
                    result['error'] = 'suspended'
                    await self.save_suspended_user(username)
                    return result

            # Parse user data
            user_data = self.parse_user_info(user_info)
            result['user_data'] = user_data

            # Only fetch posts for non-suspended users with karma
            if user_data.get('total_karma', 0) > 100:
                # Fetch user posts
                user_posts = await self.make_api_request(
                    'get_user_posts',
                    username,
                    limit=100
                )

                if user_posts:
                    result['user_posts'] = self.parse_user_posts(user_posts)
                    logger.debug(f"Fetched {len(result['user_posts'])} posts for u/{username}")

                    # Discover subreddits from user activity
                    discovered = await self.discover_subreddits_from_posts(
                        username,
                        result['user_posts']
                    )
                    result['discovered_subreddits'] = discovered
                    logger.info(f"Discovered {len(discovered)} subreddits from u/{username}")

            # Cache the user data
            if self.cache_manager and user_data:
                await self.cache_manager.cache_user_async(username, user_data)
                self.cache_manager.mark_user_processed(username)

            # Save to database
            if user_data:
                await self.save_to_database('user', user_data)

            result['success'] = True
            await self.log_progress(
                f"Successfully scraped u/{username} - "
                f"karma: {user_data.get('total_karma', 0)}, "
                f"discoveries: {len(result['discovered_subreddits'])}"
            )

        except Exception as e:
            logger.error(f"Error scraping u/{username}: {e}")
            result['error'] = str(e)
            self.stats['errors'].append({
                'timestamp': datetime.now(timezone.utc).isoformat(),
                'username': username,
                'error': str(e)
            })

        return result

    def parse_user_info(self, info: Dict[str, Any]) -> Dict[str, Any]:
        """
        Parse user info from Reddit API response.

        Args:
            info: Raw user info from API

        Returns:
            Parsed user data
        """
        if not info:
            return {}

        # Handle nested data structure
        data = info.get('data', info) if 'data' in info else info

        parsed = {
            'username': data.get('name', '').lower(),
            'display_name': data.get('name', ''),
            'created_utc': self.format_timestamp(data.get('created_utc')),
            'total_karma': int(data.get('total_karma', 0)),
            'link_karma': int(data.get('link_karma', 0)),
            'comment_karma': int(data.get('comment_karma', 0)),
            'awarder_karma': int(data.get('awarder_karma', 0)),
            'awardee_karma': int(data.get('awardee_karma', 0)),
            'is_gold': bool(data.get('is_gold', False)),
            'is_mod': bool(data.get('is_mod', False)),
            'is_employee': bool(data.get('is_employee', False)),
            'verified': bool(data.get('verified', False)),
            'has_verified_email': bool(data.get('has_verified_email', False)),
            'hide_from_robots': bool(data.get('hide_from_robots', False)),
            'accept_followers': bool(data.get('accept_followers', True)),
            'has_subscribed': bool(data.get('has_subscribed', False)),
            'updated_at': datetime.now(timezone.utc).isoformat()
        }

        # Add optional fields
        if data.get('icon_img'):
            parsed['icon_img'] = data['icon_img']
        if data.get('snoovatar_img'):
            parsed['snoovatar_img'] = data['snoovatar_img']
        if data.get('subreddit'):
            subreddit = data['subreddit']
            if isinstance(subreddit, dict):
                parsed['subreddit'] = subreddit.get('display_name', '')
                parsed['subreddit_type'] = subreddit.get('subreddit_type', '')
                parsed['subreddit_subscribers'] = int(subreddit.get('subscribers', 0))

        # Calculate user quality scores
        if data.get('created_utc'):
            try:
                created_timestamp = data.get('created_utc')
                if isinstance(created_timestamp, (int, float)):
                    created_dt = datetime.fromtimestamp(created_timestamp, timezone.utc)
                else:
                    created_dt = datetime.fromisoformat(created_timestamp.replace('Z', '+00:00'))

                account_age_days = (datetime.now(timezone.utc) - created_dt).days
                quality_scores = self.calculate_user_quality_scores(
                    parsed['username'],
                    account_age_days,
                    parsed['link_karma'],
                    parsed['comment_karma']
                )

                # Add quality scores to parsed data
                parsed['username_score'] = quality_scores['username_score']
                parsed['age_score'] = quality_scores['age_score']
                parsed['karma_score'] = quality_scores['karma_score']
                parsed['overall_quality_score'] = quality_scores['overall_score']

            except Exception as e:
                logger.debug(f"Error calculating quality scores for {parsed['username']}: {e}")

        return parsed

    def parse_user_posts(self, posts: List[Dict]) -> List[Dict[str, Any]]:
        """
        Parse user posts from Reddit API response.

        Args:
            posts: List of raw post data

        Returns:
            List of parsed post data
        """
        parsed_posts = []

        for post in posts:
            # Handle nested data structure
            post_data = post.get('data', post) if 'data' in post else post

            # Skip comments (kind = t1), only process posts (kind = t3)
            if post.get('kind') != 't3':
                continue

            parsed = {
                'reddit_id': post_data.get('id', ''),
                'subreddit': post_data.get('subreddit', ''),
                'title': post_data.get('title', ''),
                'score': int(post_data.get('score', 0)),
                'num_comments': int(post_data.get('num_comments', 0)),
                'created_utc': self.format_timestamp(post_data.get('created_utc')),
                'over_18': bool(post_data.get('over_18', False)),
                'is_video': bool(post_data.get('is_video', False)),
                'post_type': self.determine_post_type(post_data)
            }

            parsed_posts.append(parsed)

        return parsed_posts

    async def discover_subreddits_from_posts(self, username: str,
                                            posts: List[Dict]) -> List[Dict[str, Any]]:
        """
        Discover new subreddits from user's post history.

        Args:
            username: Username of the poster
            posts: List of user's posts

        Returns:
            List of discovered subreddit data
        """
        discovered = []
        subreddit_activity = {}

        # Aggregate activity by subreddit
        for post in posts:
            subreddit = post.get('subreddit', '').lower()
            if not subreddit:
                continue

            if subreddit not in subreddit_activity:
                subreddit_activity[subreddit] = {
                    'post_count': 0,
                    'total_karma': 0,
                    'is_nsfw': False
                }

            subreddit_activity[subreddit]['post_count'] += 1
            subreddit_activity[subreddit]['total_karma'] += post.get('score', 0)
            if post.get('over_18'):
                subreddit_activity[subreddit]['is_nsfw'] = True

        # Process each subreddit
        for subreddit_name, activity in subreddit_activity.items():
            # Skip if already discovered or processed
            if self.cache_manager:
                if self.cache_manager.is_subreddit_discovered(subreddit_name):
                    continue

            # Only interested in subreddits where user is somewhat active
            if activity['post_count'] < 2 and activity['total_karma'] < 100:
                continue

            discovery_data = {
                'source_user': username,
                'discovered_subreddit': subreddit_name,
                'discovery_method': 'user_activity',
                'post_count': activity['post_count'],
                'karma_in_subreddit': activity['total_karma'],
                'is_nsfw': activity['is_nsfw'],
                'discovered_at': datetime.now(timezone.utc).isoformat()
            }

            discovered.append(discovery_data)

            # Save discovery
            await self.save_to_database('discovery', discovery_data)

            # Mark as discovered
            if self.cache_manager:
                self.cache_manager.mark_subreddit_discovered(subreddit_name)

        return discovered

    def determine_post_type(self, post_data: Dict) -> str:
        """Determine the type of post"""
        if post_data.get('is_video'):
            return 'video'
        elif 'gallery_data' in post_data:
            return 'gallery'
        elif post_data.get('selftext'):
            return 'text'
        elif any(domain in post_data.get('domain', '')
                for domain in ['i.redd.it', 'imgur.com', 'i.imgur.com']):
            return 'image'
        else:
            return 'link'

    def format_timestamp(self, timestamp: Any) -> Optional[str]:
        """Format timestamp to ISO string"""
        if not timestamp:
            return None

        try:
            if isinstance(timestamp, (int, float)):
                return datetime.fromtimestamp(timestamp, timezone.utc).isoformat()
            return str(timestamp)
        except Exception:
            return None

    async def save_suspended_user(self, username: str):
        """Mark user as suspended in database"""
        try:
            await self.save_to_database('user', {
                'username': username.lower(),
                'display_name': username,
                'is_suspended': True,
                'total_karma': 0,
                'updated_at': datetime.now(timezone.utc).isoformat()
            })
        except Exception as e:
            logger.error(f"Error saving suspended user u/{username}: {e}")

    def calculate_user_quality_scores(self, username: str, account_age_days: int,
                                     post_karma: int, comment_karma: int) -> dict:
        """Calculate user quality scores using Plan.md formula"""
        # Username quality (0-10): Shorter, natural usernames preferred
        username_score = max(0, 10 - len(username) * 0.3) if not any(
            char.isdigit() for char in username[-4:]
        ) else 5

        # Age quality (0-10): Sweet spot 1-3 years
        if account_age_days < 1095:  # Less than 3 years
            age_score = min(10, account_age_days / 365 * 3)
        else:
            age_score = max(5, 10 - (account_age_days - 1095) / 365 * 0.5)

        # Karma quality (0-10): Balanced comment/post ratio preferred
        total_karma = post_karma + comment_karma
        karma_ratio = comment_karma / max(1, total_karma)
        karma_score = min(10, total_karma / 1000) * (1 + karma_ratio * 0.5)

        # Final weighted score (0-10)
        overall_score = (username_score * 0.2 + age_score * 0.3 + karma_score * 0.5)

        return {
            'username_score': round(username_score, 2),
            'age_score': round(age_score, 2),
            'karma_score': round(karma_score, 2),
            'overall_score': round(overall_score, 2)
        }