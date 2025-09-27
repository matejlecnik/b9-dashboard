"""
Subreddit Scraper for Reddit Scraper v2
Handles scraping of subreddit data including metadata, posts, and rules
"""
import logging
from datetime import datetime, timezone
from typing import Dict, Any, Optional, List
try:
    from .base_scraper import BaseScraper
except ImportError:
    from base_scraper import BaseScraper

logger = logging.getLogger(__name__)


class SubredditScraper(BaseScraper):
    """
    Scraper for Reddit subreddit data.
    Fetches subreddit info, hot posts, top posts, and rules.
    """

    async def scrape(self, subreddit_name: str) -> Dict[str, Any]:
        """
        Scrape comprehensive data for a subreddit.

        Args:
            subreddit_name: Name of the subreddit to scrape

        Returns:
            Dictionary containing subreddit data and posts
        """
        result = {
            'success': False,
            'subreddit_name': subreddit_name,
            'subreddit_data': None,
            'hot_posts': [],
            'top_posts': [],
            'yearly_posts': [],
            'rules': [],
            'error': None
        }

        try:
            # Check cache first
            cached_data = None
            if self.cache_manager:
                cached_data = await self.cache_manager.get_cached_subreddit_async(subreddit_name)

            if cached_data:
                logger.debug(f"Using cached data for r/{subreddit_name}")
                result['subreddit_data'] = cached_data
                result['success'] = True
                self.stats['items_cached'] += 1
                return result

            # Check rate limiting
            if await self.check_rate_limit():
                await self.handle_rate_limit()

            # Fetch subreddit info
            logger.info(f"[Thread {self.thread_id}] Scraping r/{subreddit_name}")
            subreddit_info = await self.make_api_request(
                'get_subreddit_info',
                subreddit_name
            )

            if not subreddit_info:
                logger.warning(f"Failed to fetch info for r/{subreddit_name}")
                result['error'] = "Failed to fetch subreddit info"
                return result

            # Check for errors in response
            if isinstance(subreddit_info, dict):
                if subreddit_info.get('error') == 'banned':
                    logger.warning(f"Subreddit r/{subreddit_name} is banned")
                    result['error'] = 'banned'
                    await self.save_banned_status(subreddit_name)
                    return result
                elif subreddit_info.get('error') == 'not_found':
                    logger.warning(f"Subreddit r/{subreddit_name} not found")
                    result['error'] = 'not_found'
                    return result
                elif subreddit_info.get('error') == 'forbidden':
                    logger.warning(f"Subreddit r/{subreddit_name} is private")
                    result['error'] = 'private'
                    await self.save_private_status(subreddit_name)
                    return result

            # Parse subreddit data
            subreddit_data = self.parse_subreddit_info(subreddit_info)
            result['subreddit_data'] = subreddit_data

            # Fetch hot posts
            hot_posts = await self.make_api_request(
                'get_subreddit_hot_posts',
                subreddit_name,
                limit=30
            )

            if hot_posts:
                result['hot_posts'] = self.parse_posts(hot_posts, subreddit_name)
                logger.debug(f"Fetched {len(result['hot_posts'])} hot posts")

            # Fetch top posts (weekly)
            top_posts = await self.make_api_request(
                'get_subreddit_top_posts',
                subreddit_name,
                time_filter='week',
                limit=100
            )

            if top_posts:
                result['top_posts'] = self.parse_posts(top_posts, subreddit_name)
                logger.debug(f"Fetched {len(result['top_posts'])} top weekly posts")

            # Fetch yearly posts for timing analysis
            yearly_posts = await self.make_api_request(
                'get_subreddit_top_posts',
                subreddit_name,
                time_filter='year',
                limit=100
            )

            if yearly_posts:
                result['yearly_posts'] = self.parse_posts(yearly_posts, subreddit_name)
                logger.debug(f"Fetched {len(result['yearly_posts'])} top yearly posts for timing")

            # Fetch rules
            rules = await self.make_api_request(
                'get_subreddit_rules',
                subreddit_name
            )

            if rules:
                result['rules'] = self.parse_rules(rules)
                logger.debug(f"Fetched {len(result['rules'])} rules")

                # Check for verification requirements
                rules_text = ' '.join([r.get('description', '') for r in result['rules']])
                if self.detect_verification_required(
                    subreddit_data.get('description'),
                    subreddit_data.get('public_description'),
                    rules_text
                ):
                    subreddit_data['requires_verification'] = True
                    logger.info(f"🔒 Verification required detected for r/{subreddit_name}")

                # Analyze rules for auto-review categorization
                auto_review = self.analyze_rules_for_review(rules_text)
                if auto_review:
                    subreddit_data['auto_review'] = auto_review
                    logger.info(f"📋 Auto-review category: {auto_review} for r/{subreddit_name}")

            # Cache the data
            if self.cache_manager and subreddit_data:
                await self.cache_manager.cache_subreddit_async(
                    subreddit_name,
                    subreddit_data
                )

            result['success'] = True
            await self.log_progress(
                f"Successfully scraped r/{subreddit_name} - "
                f"{len(result['hot_posts'])} hot, {len(result['top_posts'])} top posts"
            )

        except Exception as e:
            logger.error(f"Error scraping r/{subreddit_name}: {e}")
            result['error'] = str(e)
            self.stats['errors'].append({
                'timestamp': datetime.now(timezone.utc).isoformat(),
                'subreddit': subreddit_name,
                'error': str(e)
            })

        return result

    def parse_subreddit_info(self, info: Dict[str, Any]) -> Dict[str, Any]:
        """
        Parse subreddit info from Reddit API response.

        Args:
            info: Raw subreddit info from API

        Returns:
            Parsed subreddit data
        """
        if not info:
            return {}

        # Handle nested data structure
        data = info.get('data', info) if 'data' in info else info

        parsed = {
            'name': data.get('display_name', '').lower(),
            'display_name': data.get('display_name', ''),
            'title': data.get('title', ''),
            'description': data.get('public_description', '') or data.get('description', ''),
            'subscribers': int(data.get('subscribers', 0)),
            'created_utc': self.format_timestamp(data.get('created_utc')),
            'over_18': bool(data.get('over18', False)),
            'subreddit_type': data.get('subreddit_type', 'public'),
            'submission_type': data.get('submission_type', ''),
            'allow_images': bool(data.get('allow_images', True)),
            'allow_videos': bool(data.get('allow_videos', True)),
            'spoilers_enabled': bool(data.get('spoilers_enabled', False)),
            'active_user_count': int(data.get('active_user_count', 0)),
            'accounts_active': int(data.get('accounts_active', 0)),
            'is_gold_only': bool(data.get('is_gold_only', False)),
            'is_quarantined': bool(data.get('quarantine', False)),
            'lang': data.get('lang', 'en'),
            'whitelist_status': data.get('whitelist_status', ''),
            'updated_at': datetime.now(timezone.utc).isoformat()
        }

        # Add URL fields
        if data.get('url'):
            parsed['url'] = data['url']
        if data.get('header_img'):
            parsed['header_img'] = data['header_img']
        if data.get('banner_img'):
            parsed['banner_img'] = data['banner_img']
        if data.get('icon_img'):
            parsed['icon_img'] = data['icon_img']

        return parsed

    def parse_posts(self, posts: List[Dict], subreddit_name: str) -> List[Dict[str, Any]]:
        """
        Parse posts from Reddit API response.

        Args:
            posts: List of raw post data
            subreddit_name: Name of the subreddit

        Returns:
            List of parsed post data
        """
        parsed_posts = []

        # Fetch subreddit tags and category once for all posts
        subreddit_tags = []
        subreddit_primary_category = None
        try:
            if hasattr(self, 'supabase') and self.supabase:
                sub_resp = self.supabase.table('reddit_subreddits').select(
                    'tags, primary_category'
                ).eq('name', subreddit_name.lower()).limit(1).execute()
                if sub_resp.data and len(sub_resp.data) > 0:
                    subreddit_tags = sub_resp.data[0].get('tags', [])
                    subreddit_primary_category = sub_resp.data[0].get('primary_category')
        except Exception as e:
            logger.debug(f"Could not fetch tags for r/{subreddit_name}: {e}")

        for post in posts:
            # Handle nested data structure
            post_data = post.get('data', post) if 'data' in post else post

            # Skip if deleted or removed
            if post_data.get('selftext') == '[removed]':
                continue
            if post_data.get('author') == '[deleted]':
                continue

            # Calculate additional metrics
            score = int(post_data.get('score', 0))
            num_comments = int(post_data.get('num_comments', 0))
            comment_to_upvote_ratio = round(num_comments / max(1, score), 6) if score > 0 else 0

            # Extract posting time info
            created_utc = post_data.get('created_utc')
            posting_hour = None
            posting_day_of_week = None
            if created_utc:
                try:
                    dt = datetime.fromtimestamp(created_utc, timezone.utc)
                    posting_hour = dt.hour
                    posting_day_of_week = dt.weekday()
                except Exception:
                    pass

            # Get thumbnail info
            thumbnail = post_data.get('thumbnail', '')
            has_thumbnail = bool(thumbnail and thumbnail not in ['self', 'default', 'nsfw', ''])

            parsed = {
                'reddit_id': post_data.get('id', ''),
                'name': post_data.get('name', ''),  # Full Reddit ID (t3_xxxxx)
                'title': post_data.get('title', ''),
                'author': post_data.get('author', ''),
                'author_username': post_data.get('author', ''),  # Compatibility field
                'subreddit': subreddit_name,
                'subreddit_name': subreddit_name.lower(),
                'created_utc': self.format_timestamp(created_utc),
                'score': score,
                'upvote_ratio': float(post_data.get('upvote_ratio', 0)),
                'num_comments': num_comments,
                'comment_to_upvote_ratio': comment_to_upvote_ratio,
                'over_18': bool(post_data.get('over_18', False)),
                'spoiler': bool(post_data.get('spoiler', False)),
                'stickied': bool(post_data.get('stickied', False)),
                'locked': bool(post_data.get('locked', False)),
                'is_self': bool(post_data.get('is_self', False)),
                'is_video': bool(post_data.get('is_video', False)),
                'is_gallery': 'gallery_data' in post_data,
                'gilded': int(post_data.get('gilded', 0)),
                'distinguished': post_data.get('distinguished'),
                'post_type': self.determine_post_type(post_data),
                'content_type': self.determine_post_type(post_data),  # Duplicate for compatibility
                'domain': post_data.get('domain', ''),
                'url': post_data.get('url', ''),
                'permalink': post_data.get('permalink', ''),
                'selftext': post_data.get('selftext', ''),
                'post_length': len(post_data.get('selftext', '')),
                'link_flair_text': post_data.get('link_flair_text', ''),
                'author_flair_text': post_data.get('author_flair_text', ''),
                'total_awards_received': int(post_data.get('total_awards_received', 0)),
                'thumbnail': thumbnail,
                'has_thumbnail': has_thumbnail,
                'posting_hour': posting_hour,
                'posting_day_of_week': posting_day_of_week,
                'sub_tags': subreddit_tags,
                'sub_primary_category': subreddit_primary_category,
                'scraped_at': datetime.now(timezone.utc).isoformat(),
                'updated_at': datetime.now(timezone.utc).isoformat()
            }

            # Add media metadata if available
            if post_data.get('media'):
                parsed['has_media'] = True
            if post_data.get('media_metadata'):
                parsed['media_count'] = len(post_data['media_metadata'])

            parsed_posts.append(parsed)

        return parsed_posts

    def parse_rules(self, rules: List[Dict]) -> List[Dict[str, Any]]:
        """
        Parse subreddit rules.

        Args:
            rules: List of raw rule data

        Returns:
            List of parsed rules
        """
        parsed_rules = []

        for i, rule in enumerate(rules):
            parsed = {
                'priority': i,
                'short_name': rule.get('short_name', ''),
                'kind': rule.get('kind', ''),
                'description': rule.get('description', ''),
                'violation_reason': rule.get('violation_reason', ''),
                'created_utc': self.format_timestamp(rule.get('created_utc'))
            }
            parsed_rules.append(parsed)

        return parsed_rules

    def determine_post_type(self, post_data: Dict) -> str:
        """Determine the type of post"""
        if post_data.get('is_video'):
            return 'video'
        elif 'gallery_data' in post_data:
            return 'gallery'
        elif 'poll_data' in post_data:
            return 'poll'
        elif post_data.get('selftext'):
            return 'text'
        elif any(domain in post_data.get('domain', '')
                for domain in ['i.redd.it', 'imgur.com', 'i.imgur.com', 'redgifs.com']):
            return 'image'
        elif post_data.get('is_reddit_media_domain'):
            return 'media'
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

    async def save_banned_status(self, subreddit_name: str):
        """Mark subreddit as banned in database"""
        try:
            await self.save_to_database('subreddit', {
                'name': subreddit_name.lower(),
                'display_name': subreddit_name,
                'review': 'Banned',
                'over_18': False,
                'subscribers': 0,
                'updated_at': datetime.now(timezone.utc).isoformat()
            })
        except Exception as e:
            logger.error(f"Error saving banned status for r/{subreddit_name}: {e}")

    async def save_private_status(self, subreddit_name: str):
        """Mark subreddit as private in database"""
        try:
            await self.save_to_database('subreddit', {
                'name': subreddit_name.lower(),
                'display_name': subreddit_name,
                'review': 'Non Related',
                'subreddit_type': 'private',
                'over_18': False,
                'subscribers': 0,
                'updated_at': datetime.now(timezone.utc).isoformat()
            })
        except Exception as e:
            logger.error(f"Error saving private status for r/{subreddit_name}: {e}")

    def detect_verification_required(self, description: str = None,
                                    public_description: str = None,
                                    rules_text: str = None) -> bool:
        """Detect if subreddit requires verification based on description, rules, etc."""
        verification_keywords = [
            'verification required', 'verification', 'verify', 'verified',
            'verification process', 'verify account', 'verification needed',
            'must verify', 'need verification', 'require verification',
            'verification mandatory', 'verification before posting',
            'verified only', 'verification check', 'verify yourself',
            'verification submission', 'get verified'
        ]

        # Collect all text to search
        text_sources = [description or '', public_description or '', rules_text or '']
        combined_text = ' '.join(text_sources).lower()

        # Search for verification keywords (case insensitive)
        for keyword in verification_keywords:
            if keyword.lower() in combined_text:
                logger.info(f"🔒 Verification required detected: '{keyword}'")
                return True

        return False

    def analyze_rules_for_review(self, rules_text: str) -> Optional[str]:
        """Analyze rules text for automatic review classification"""
        if not rules_text:
            return None

        # Convert to lowercase for case-insensitive matching
        rules_lower = rules_text.lower()

        # "Non Related" review keywords - EXPANDED to include niche fetishes and hentai
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
            'pregnant', 'breeding', 'impregnation', 'preggo',
            'incest', 'fauxcest', 'step fantasy', 'family', 'taboo family',
            'cuckold', 'cuck', 'hotwife', 'bull',
            'chastity', 'denial', 'locked', 'keyholder',
            'ballbusting', 'cbt', 'cock torture', 'pain',
            'latex', 'rubber', 'bondage gear', 'bdsm equipment',

            # Safe-for-work content indicators
            'nudity is required', 'nudity required', 'must be nude', 'nudity mandatory',
            'nude only', 'nudity is mandatory', 'requires nudity', 'nudity must be shown',
            'no clothes allowed', 'must show nudity', 'nude content only', 'nudity needed',

            # Professional/Non-adult terms
            'career advice', 'job hunting', 'resume help', 'interview tips',
            'academic discussion', 'university students', 'college advice', 'study tips',
            'cooking recipes', 'baking recipes', 'meal prep recipes',
            'pc master race', 'console gaming discussion', 'indie game development',
            'government policy', 'election discussion', 'political debate',
            'veterinary advice', 'pet care tips', 'animal rescue',
            'scientific research', 'academic papers', 'research methodology'
        ]

        for keyword in non_related_keywords:
            if keyword in rules_lower:
                logger.info(f"🚫 Non Related detected: '{keyword}'")
                return "Non Related"

        # If no automatic review detected, leave empty for manual review
        logger.debug("📋 No automatic review detected - leaving empty for manual review")
        return None