#!/usr/bin/env python3
"""
Single Subreddit Fetcher - Standalone script for fetching individual subreddit data
Enhanced to match reddit_scraper.py processing:
- Uses ProxyManager (database-backed proxies)
- Auto-categorization ("Non Related" detection)
- Verification detection
- Complete database save with all fields
- Uses top_10_weekly for metrics (not hot_30)
"""

import json
import math
import os
import random
import sys
import time
from datetime import datetime, timezone
from typing import Dict, List, Optional

import requests
from fake_useragent import UserAgent
from supabase import Client


# Add parent directories to path for imports
current_dir = os.path.dirname(os.path.abspath(__file__))
api_root = os.path.join(current_dir, "..", "..")
sys.path.insert(0, api_root)

# Import database singleton and unified logger
from app.core.database import get_db  # noqa: E402
from app.logging import get_logger  # noqa: E402


# Import ProxyManager from scraper
try:
    from app.scrapers.reddit.proxy_manager import ProxyManager
except ImportError:
    # Fallback for standalone execution
    import importlib.util

    proxy_path = os.path.join(api_root, "app", "scrapers", "reddit", "proxy_manager.py")
    spec = importlib.util.spec_from_file_location("proxy_manager", proxy_path)
    assert spec is not None
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)  # type: ignore[union-attr]
    ProxyManager = module.ProxyManager  # type: ignore[misc]

# Use unified logger
logger = get_logger(__name__)


# Module-level function to get Supabase singleton
def _get_db() -> Client:
    """Get database client from singleton"""
    return get_db()


class PublicRedditAPI:
    """Public Reddit JSON API client with retry logic and proxy support"""

    def __init__(self, max_retries: int = 3):  # Limited to 3 retries as requested
        self.max_retries = max_retries
        self.base_delay = 1.0

        # Initialize fake-useragent with better error handling
        try:
            self.ua_generator = UserAgent()
            logger.info("✅ fake-useragent initialized successfully")
        except Exception as e:
            logger.warning(
                f"⚠️ fake-useragent initialization failed: {e}. Will use fallback user agents."
            )
            self.ua_generator = None

    def generate_user_agent(self) -> str:
        """Generate a unique realistic user agent"""
        # Extended fallback pool of realistic user agents
        user_agents = [
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0",
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:121.0) Gecko/20100101 Firefox/121.0",
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36 Edg/121.0.0.0",
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Safari/605.1.15",
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36",
            "Mozilla/5.0 (X11; Ubuntu; Linux x86_64; rv:121.0) Gecko/20100101 Firefox/121.0",
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/118.0.0.0 Safari/537.36",
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:120.0) Gecko/20100101 Firefox/120.0",
            "Mozilla/5.0 (X11; Linux x86_64; rv:121.0) Gecko/20100101 Firefox/121.0",
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Safari/605.1.15",
        ]

        # Prefer fake-useragent (80% chance) using correct API
        use_fake_useragent = self.ua_generator and random.random() < 0.80

        if use_fake_useragent:
            try:
                # Use correct fake-useragent API (properties, not methods)
                rand = random.random()
                if rand < 0.30:
                    ua = self.ua_generator.random
                    logger.debug(f"Generated RANDOM user agent: {ua[:60]}...")
                elif rand < 0.50:
                    ua = self.ua_generator.chrome
                    logger.debug(f"Generated CHROME user agent: {ua[:60]}...")
                elif rand < 0.70:
                    ua = self.ua_generator.firefox
                    logger.debug(f"Generated FIREFOX user agent: {ua[:60]}...")
                elif rand < 0.85:
                    ua = self.ua_generator.safari
                    logger.debug(f"Generated SAFARI user agent: {ua[:60]}...")
                elif rand < 0.95:
                    ua = self.ua_generator.edge
                    logger.debug(f"Generated EDGE user agent: {ua[:60]}...")
                else:
                    ua = self.ua_generator.opera
                    logger.debug(f"Generated OPERA user agent: {ua[:60]}...")

                return ua  # type: ignore[no-any-return]
            except Exception as e:
                logger.debug(f"fake-useragent failed ({e}), using fallback pool")

        # Use static pool fallback
        ua = random.choice(user_agents)
        return ua

    def request_with_retry(self, url: str, proxy_config: Optional[Dict] = None) -> Optional[Dict]:
        """Make HTTP request with retry logic (max 3 retries)"""

        # Configure proxy
        proxies = None
        if proxy_config:
            proxy_str = proxy_config["proxy"]
            proxies = {"http": f"http://{proxy_str}", "https": f"http://{proxy_str}"}

        # Debug logging
        logger.info(f"🔍 Request to: {url}")
        logger.debug(f"📋 Headers: User-Agent: {self.generate_user_agent()[:60]}...")
        logger.debug(f"🌐 Proxy: {'Yes' if proxies else 'Direct'}")

        retries = 0
        while retries < self.max_retries:
            try:
                start_time = time.time()
                response = requests.get(
                    url,
                    headers={"User-agent": self.generate_user_agent()},
                    proxies=proxies,
                    timeout=30,
                )
                response_time_ms = int((time.time() - start_time) * 1000)

                # Handle different status codes
                if response.status_code == 403:
                    logger.warning(f"🚫 Forbidden access: {url} (may be suspended)")
                    return {"error": "forbidden", "status": 403}

                if response.status_code == 404:
                    logger.warning(f"❓ Not found: {url} (may be deleted)")
                    return {"error": "not_found", "status": 404}

                if response.status_code == 429:
                    rate_limit_delay = min(2**retries, 4)  # Exponential backoff: 1s, 2s, 4s
                    logger.warning(
                        f"⏳ Rate limited: attempt {retries + 1}/{self.max_retries}, waiting {rate_limit_delay}s"
                    )

                    if retries >= self.max_retries - 1:
                        logger.error(
                            f"🚫 Rate limit exceeded - giving up after {retries + 1} attempts"
                        )
                        return {"error": "rate_limited", "status": 429}

                    time.sleep(rate_limit_delay)
                    retries += 1
                    continue

                response.raise_for_status()

                # Success
                logger.info(
                    f"✅ Success: {url.split('/')[-2]} - {response.status_code} in {response_time_ms}ms"
                )
                return response.json()  # type: ignore[no-any-return]

            except requests.RequestException as e:
                retries += 1
                if retries < self.max_retries:
                    delay = self.base_delay * (2 ** (retries - 1))  # Exponential backoff
                    logger.warning(
                        f"⚠️ Request failed (attempt {retries}/{self.max_retries}): {str(e)[:100]}"
                    )
                    time.sleep(delay)
                else:
                    logger.error(
                        f"❌ Request failed after {self.max_retries} retries: {str(e)[:100]}"
                    )
                    break

        # If all retries exhausted
        logger.error(f"❌ All {self.max_retries} attempts failed for {url}")
        return None

    def get_subreddit_info(
        self, subreddit_name: str, proxy_config: Optional[Dict] = None
    ) -> Optional[Dict]:
        """Get subreddit metadata from about.json"""
        url = f"https://www.reddit.com/r/{subreddit_name}/about.json"
        response = self.request_with_retry(url, proxy_config)

        if response and "data" in response:
            return response["data"]  # type: ignore[no-any-return]
        elif response and "error" in response:
            return response
        return None

    def get_subreddit_hot_posts(
        self, subreddit_name: str, limit: int = 30, proxy_config: Optional[Dict] = None
    ) -> List[Dict]:
        """Get hot posts from subreddit"""
        url = f"https://www.reddit.com/r/{subreddit_name}/hot.json?limit={limit}"
        response = self.request_with_retry(url, proxy_config)

        if response and "data" in response and "children" in response["data"]:
            return [child["data"] for child in response["data"]["children"]]
        return []

    def get_subreddit_rules(
        self, subreddit_name: str, proxy_config: Optional[Dict] = None
    ) -> List[Dict]:
        """Get subreddit rules"""
        url = f"https://www.reddit.com/r/{subreddit_name}/about/rules.json"
        response = self.request_with_retry(url, proxy_config)

        if response and "rules" in response:
            return response["rules"]  # type: ignore[no-any-return]
        return []

    def get_subreddit_top_posts(
        self,
        subreddit_name: str,
        limit: int = 10,
        timeframe: str = "week",
        proxy_config: Optional[Dict] = None,
    ) -> List[Dict]:
        """Get top posts from subreddit for a given timeframe

        Args:
            subreddit_name: Name of the subreddit
            limit: Number of posts to fetch (default 10)
            timeframe: 'hour', 'day', 'week', 'month', 'year', 'all' (default 'week')
            proxy_config: Optional proxy configuration

        Returns:
            List of post dicts
        """
        url = f"https://www.reddit.com/r/{subreddit_name}/top.json?t={timeframe}&limit={limit}"
        response = self.request_with_retry(url, proxy_config)

        if response and "data" in response and "children" in response["data"]:
            return [child["data"] for child in response["data"]["children"]]
        return []


class SubredditFetcher:
    """Main class for fetching single subreddit data with full reddit_scraper processing"""

    def __init__(self):
        self.api = PublicRedditAPI(max_retries=3)
        # Use singleton database client
        db = _get_db()
        self.proxy_manager = ProxyManager(db)
        self.supabase = db

        # Load proxies from database
        logger.info("🔄 Loading proxies from database...")
        self.proxy_manager.load_proxies()
        logger.info(f"✅ Loaded {len(self.proxy_manager.proxies)} proxies")

    def detect_verification(self, rules: list, description: str) -> bool:
        """Detect if subreddit requires verification from rules/description

        Args:
            rules: List of rule dicts (can be None)
            description: Subreddit description text (can be None)

        Returns:
            True if verification keywords found
        """
        # Handle None inputs
        rules = rules or []
        description = description or ""

        # Combine all text from rules and description
        search_text = " ".join([r.get("description") or "" for r in rules]) + " " + description
        verification_keywords = ["verification", "verified", "verify"]
        return any(keyword in search_text.lower() for keyword in verification_keywords)

    def analyze_rules_for_review(
        self, rules_text: str, description: Optional[str] = None
    ) -> Optional[str]:
        """Analyze rules/description for automatic 'Non Related' classification

        Uses comprehensive keyword detection across multiple categories to identify
        subreddits that are not relevant for OnlyFans creator promotion.

        Args:
            rules_text: Combined rules text from subreddit
            description: Subreddit description (optional)

        Returns:
            'Non Related' if detected, None otherwise (for manual review)
        """
        if not rules_text and not description:
            return None

        # Combine all text for searching
        combined = f"{rules_text or ''} {description or ''}".lower()

        # Comprehensive "Non Related" keywords across 10 categories
        non_related_keywords = [
            # Hentai/anime porn (14 keywords)
            "hentai",
            "anime porn",
            "rule34",
            "cartoon porn",
            "animated porn",
            "ecchi",
            "doujin",
            "drawn porn",
            "manga porn",
            "anime girls",
            "waifu",
            "2d girls",
            "anime babes",
            # Extreme fetishes (30+ keywords - not mainstream OnlyFans)
            "bbw",
            "ssbbw",
            "feederism",
            "weight gain",
            "fat fetish",
            "scat",
            "watersports",
            "golden shower",
            "piss",
            "abdl",
            "diaper",
            "adult baby",
            "little space",
            "age play",
            "ddlg",
            "vore",
            "inflation",
            "transformation",
            "macro",
            "giantess",
            "furry",
            "yiff",
            "anthro",
            "fursuit",
            "anthropomorphic",
            "guro",
            "necro",
            "gore",
            "death",
            "snuff",
            "femdom",
            "findom",
            "financial domination",
            "paypig",
            "sissy",
            "pregnant",
            "breeding",
            "impregnation",
            "preggo",
            "cuckold",
            "cuck",
            "hotwife",
            "bull",
            "chastity",
            "denial",
            "locked",
            "keyholder",
            "ballbusting",
            "cbt",
            "cock torture",
            "latex",
            "rubber",
            "bondage gear",
            "bdsm equipment",
            # SFW content requiring nudity (12 keywords)
            "nudity is required",
            "nudity required",
            "must be nude",
            "nudity mandatory",
            "nude only",
            "nudity is mandatory",
            "requires nudity",
            "no clothes allowed",
            "must show nudity",
            "nude content only",
            "full nudity required",
            "complete nudity",
            # Professional/career content (5 keywords)
            "career advice",
            "job hunting",
            "resume help",
            "interview tips",
            "academic discussion",
            # Cooking/recipe content
            "cooking recipes",
            "baking recipes",
            "meal prep recipes",
            # Gaming communities
            "pc master race",
            "console gaming discussion",
            "indie game development",
            # Politics/government
            "government policy",
            "election discussion",
            "political debate",
            "city council",
            "local government",
            # Animal/pet care
            "veterinary advice",
            "pet care tips",
            "animal rescue",
            # Academic/research
            "scientific research",
            "academic papers",
            "peer review",
        ]

        # Check for keyword matches
        for keyword in non_related_keywords:
            if keyword in combined:
                logger.info(f"🚫 Auto-categorized as 'Non Related': detected '{keyword}'")
                return "Non Related"

        # No match - leave for manual review
        return None

    def calculate_metrics(self, posts: List[Dict]) -> Dict:
        """Calculate engagement metrics from top weekly posts"""
        if not posts:
            return {
                "avg_upvotes_per_post": 0,
                "comment_to_upvote_ratio": 0,
                "total_upvotes_hot_30": 0,
                "total_posts_hot_30": 0,
            }

        total_upvotes = sum(post.get("score", 0) for post in posts)
        total_comments = sum(post.get("num_comments", 0) for post in posts)
        avg_upvotes = total_upvotes / len(posts) if posts else 0
        comment_ratio = total_comments / total_upvotes if total_upvotes > 0 else 0

        return {
            "avg_upvotes_per_post": round(avg_upvotes, 2),
            "comment_to_upvote_ratio": round(comment_ratio, 4),
            "total_upvotes_hot_30": total_upvotes,
            "total_posts_hot_30": len(posts),
        }

    def fetch_single_subreddit(self, subreddit_name: str) -> Dict:
        """Fetch and save subreddit with complete reddit_scraper processing"""

        logger.info(f"📊 Fetching data for r/{subreddit_name}")

        try:
            # Get proxy configuration from ProxyManager
            proxy_config = self.proxy_manager.get_next_proxy()

            # 1. Fetch subreddit info
            subreddit_info = self.api.get_subreddit_info(subreddit_name, proxy_config)

            if not subreddit_info:
                return {"success": False, "error": "Failed to fetch subreddit info", "data": None}

            # Handle errors
            if isinstance(subreddit_info, dict) and "error" in subreddit_info:
                return {
                    "success": False,
                    "error": subreddit_info.get("error"),
                    "status": subreddit_info.get("status"),
                    "data": None,
                }

            # 2. Fetch rules
            rules = self.api.get_subreddit_rules(subreddit_name, proxy_config)

            # 3. Fetch top 10 weekly posts for accurate metrics
            top_10_weekly = self.api.get_subreddit_top_posts(
                subreddit_name, limit=10, timeframe="week", proxy_config=proxy_config
            )

            # 4. Auto-categorize using rules and description
            description = subreddit_info.get("description", "")
            rules_combined = " ".join([r.get("description") or "" for r in rules]) if rules else ""
            auto_review = self.analyze_rules_for_review(rules_combined, description)

            # 5. Detect verification requirement
            verification_required = self.detect_verification(rules, description)

            # 6. Calculate metrics from top_10_weekly
            # Filter out stickied/announcement posts
            actual_posts = [p for p in top_10_weekly if not p.get("stickied", False)]
            actual_count = len(actual_posts)

            total_score = sum(p.get("score", 0) for p in actual_posts)
            total_comments = sum(p.get("num_comments", 0) for p in actual_posts)

            avg_upvotes = total_score / actual_count if actual_count > 0 else 0
            engagement = total_comments / total_score if total_score > 0 else 0
            subreddit_score = (
                math.sqrt(engagement * avg_upvotes * 1000)
                if (engagement > 0 and avg_upvotes > 0)
                else 0
            )

            # 7. Load cached metadata from database (preserve manual review/categorization)
            cached = (
                self.supabase.table("reddit_subreddits")
                .select("review, primary_category, tags, over18")
                .eq("name", subreddit_name)
                .execute()
            )
            cached_data = cached.data[0] if cached.data else {}

            review = (
                cached_data.get("review") or auto_review
            )  # Use cached review, fallback to auto_review
            primary_category = cached_data.get("primary_category")
            tags = cached_data.get("tags")
            over18 = cached_data.get("over18", subreddit_info.get("over18", False))

            # 8. Extract all fields from Reddit API
            name = subreddit_info.get("display_name", subreddit_name)
            subscribers = subreddit_info.get("subscribers", 0)
            created_utc = (
                datetime.fromtimestamp(
                    subreddit_info.get("created_utc", 0), tz=timezone.utc
                ).isoformat()
                if subreddit_info.get("created_utc")
                else None
            )

            # Format rules data
            rules_data = None
            if rules:
                rules_data = []
                for rule in rules:
                    rules_data.append(
                        {
                            "short_name": rule.get("short_name", ""),
                            "title": rule.get("kind", ""),
                            "description": rule.get("description", ""),
                            "violation_reason": rule.get("violation_reason", ""),
                        }
                    )

            # 9. Build comprehensive payload (exact match with reddit_scraper)
            payload = {
                "name": name,
                "title": subreddit_info.get("title"),
                "description": description,
                "public_description": subreddit_info.get("public_description"),
                "subscribers": subscribers,
                "over18": over18,
                "created_utc": created_utc,
                "allow_images": subreddit_info.get("allow_images", False),
                "allow_videos": subreddit_info.get("allow_videos", False),
                "allow_polls": subreddit_info.get("allow_polls", False),
                "spoilers_enabled": subreddit_info.get("spoilers_enabled", False),
                "verification_required": verification_required,
                "rules_data": json.dumps(rules_data) if rules_data else None,
                "engagement": round(engagement, 6),
                "subreddit_score": round(subreddit_score, 2),
                "avg_upvotes_per_post": round(avg_upvotes, 2),
                "icon_img": subreddit_info.get("icon_img"),
                "banner_img": subreddit_info.get("banner_img"),
                "community_icon": subreddit_info.get("community_icon"),
                "header_img": subreddit_info.get("header_img"),
                "banner_background_color": subreddit_info.get("banner_background_color"),
                "primary_color": subreddit_info.get("primary_color"),
                "key_color": subreddit_info.get("key_color"),
                "display_name_prefixed": subreddit_info.get("display_name_prefixed", f"r/{name}"),
                "is_quarantined": subreddit_info.get("quarantine", False),
                "lang": subreddit_info.get("lang", "en"),
                "link_flair_enabled": subreddit_info.get("link_flair_enabled", False),
                "link_flair_position": subreddit_info.get("link_flair_position"),
                "mobile_banner_image": subreddit_info.get("mobile_banner_image"),
                "submission_type": subreddit_info.get("submission_type"),
                "submit_text": subreddit_info.get("submit_text"),
                "submit_text_html": subreddit_info.get("submit_text_html"),
                "subreddit_type": subreddit_info.get("subreddit_type"),
                "url": subreddit_info.get("url"),
                "user_flair_enabled_in_sr": subreddit_info.get("user_flair_enabled_in_sr", False),
                "user_flair_position": subreddit_info.get("user_flair_position"),
                "wiki_enabled": subreddit_info.get("wiki_enabled", False),
                "review": review,  # Preserved from cache or auto-detected
                "primary_category": primary_category,  # Preserved from cache
                "tags": tags,  # Preserved from cache
                "last_scraped_at": datetime.now(timezone.utc).isoformat(),
            }

            # 10. UPSERT to database with retry logic
            max_retries = 3
            retry_delay = 0.5

            for attempt in range(max_retries):
                try:
                    _result = (
                        self.supabase.table("reddit_subreddits")
                        .upsert(payload, on_conflict="name")
                        .execute()
                    )
                    logger.info(
                        f"   💾 SUPABASE SAVE: r/{name} | subs={subscribers:,} | avg_upvotes={avg_upvotes:.1f} | score={subreddit_score:.1f} | review={review}"
                    )
                    break  # Success - exit retry loop
                except Exception as db_error:
                    if attempt < max_retries - 1:
                        logger.warning(
                            f"⚠️  DB save failed (attempt {attempt + 1}/{max_retries}) - retrying in {retry_delay}s: {db_error}"
                        )
                        time.sleep(retry_delay)
                    else:
                        logger.error(
                            f"❌ Failed to save subreddit r/{name} after {max_retries} attempts: {db_error}"
                        )
                        return {
                            "success": False,
                            "error": f"Database save failed: {db_error}",
                            "data": None,
                        }

            logger.info(f"✅ Successfully fetched and saved r/{subreddit_name}")

            return {"success": True, "data": payload}

        except Exception as e:
            logger.error(f"❌ Failed to fetch subreddit r/{subreddit_name}: {e}")
            return {"success": False, "error": str(e), "data": None}


def fetch_subreddit(subreddit_name: str) -> Dict:
    """Main function to fetch a single subreddit"""
    fetcher = SubredditFetcher()
    return fetcher.fetch_single_subreddit(subreddit_name)


if __name__ == "__main__":
    # Test the fetcher
    import sys

    if len(sys.argv) > 1:
        subreddit_name = sys.argv[1]
        result = fetch_subreddit(subreddit_name)
        # Use logging instead of print for test output
        logger.info(f"Result: {json.dumps(result, indent=2)}")
    else:
        logger.info("Usage: python subreddit_api.py <subreddit_name>")
        logger.info("Example: python subreddit_api.py technology")
