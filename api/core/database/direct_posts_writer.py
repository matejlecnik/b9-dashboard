"""
Direct Posts Writer for Reddit Scraper
Emergency workaround for the BatchWriter async method issue
Writes posts directly to Supabase without batching
"""
import logging
from typing import List, Dict, Any
from datetime import datetime, timezone

# Setup logger
logger = logging.getLogger(__name__)


class DirectPostsWriter:
    """
    Direct writer for Reddit posts - bypasses the problematic BatchWriter
    This is a temporary workaround for the async method issue
    """

    def __init__(self, supabase_client):
        """Initialize with Supabase client"""
        self.supabase = supabase_client
        self.posts_written = 0
        self.errors = 0
        print(f"[DirectPostsWriter] Initialized at {datetime.now(timezone.utc)}", flush=True)

    def clean_post_data(self, post: Dict[str, Any]) -> Dict[str, Any]:
        """Clean and prepare post data for database insertion"""
        # Extract basic fields
        cleaned = {
            'reddit_id': post.get('reddit_id') or post.get('id'),
            'name': post.get('name'),
            'title': post.get('title', '')[:500],  # Limit title length
            'author': post.get('author'),
            'author_username': post.get('author_username') or post.get('author'),
            'subreddit': post.get('subreddit'),
            'subreddit_name': (post.get('subreddit_name') or post.get('subreddit', '')).lower(),
            'created_utc': post.get('created_utc'),
            'score': post.get('score', 0),
            'upvote_ratio': post.get('upvote_ratio', 0),
            'num_comments': post.get('num_comments', 0),
            'over_18': post.get('over_18', False),
            'spoiler': post.get('spoiler', False),
            'stickied': post.get('stickied', False),
            'locked': post.get('locked', False),
            'is_self': post.get('is_self', False),
            'is_video': post.get('is_video', False),
            'is_gallery': post.get('is_gallery', False),
            'permalink': post.get('permalink'),
            'url': post.get('url'),
            'domain': post.get('domain'),
            'selftext': (post.get('selftext') or '')[:2000],  # Limit selftext length
            'thumbnail': post.get('thumbnail'),
            'post_type': post.get('post_type', 'unknown'),
            'content_type': post.get('content_type', 'unknown'),
            'gilded': post.get('gilded', 0),
            'total_awards_received': post.get('total_awards_received', 0),
            'distinguished': post.get('distinguished'),
            'link_flair_text': post.get('link_flair_text'),
            'author_flair_text': post.get('author_flair_text'),
            'has_thumbnail': post.get('has_thumbnail', False),
            'post_length': len(post.get('selftext', '')),
            'comment_to_upvote_ratio': post.get('comment_to_upvote_ratio', 0),
            'posting_hour': post.get('posting_hour'),
            'posting_day': post.get('posting_day'),
            'subreddit_type': post.get('subreddit_type'),
            'rank': post.get('rank'),
            'position': post.get('position'),
            'time_period': post.get('time_period'),
            'scrape_type': post.get('scrape_type'),
            'created_at': datetime.now(timezone.utc).isoformat(),
            'updated_at': datetime.now(timezone.utc).isoformat()
        }

        # Remove None values
        cleaned = {k: v for k, v in cleaned.items() if v is not None}

        return cleaned

    def write_posts(self, posts_data) -> bool:
        """
        Write posts directly to the database
        Returns True if successful, False otherwise
        """
        # Remove type hint and add validation
        try:
            if posts_data is None:
                print(f"[DirectPostsWriter] posts_data is None", flush=True)
                logger.info(f"[DirectPostsWriter] posts_data is None")
                return False

            if not isinstance(posts_data, list):
                print(f"[DirectPostsWriter] posts_data is not a list: {type(posts_data)}", flush=True)
                logger.info(f"[DirectPostsWriter] posts_data is not a list: {type(posts_data)}")
                return False

            if not posts_data:
                print(f"[DirectPostsWriter] No posts to write (empty list)", flush=True)
                return True

            print(f"[DirectPostsWriter] Writing {len(posts_data)} posts...", flush=True)
            logger.info(f"[DirectPostsWriter] Writing {len(posts_data)} posts...")
        except Exception as e:
            print(f"[DirectPostsWriter] Exception in validation: {e}", flush=True)
            logger.error(f"[DirectPostsWriter] Exception in validation: {e}")
            return False

        try:
            # Clean all posts
            cleaned_posts = []
            for i, post in enumerate(posts_data):
                try:
                    cleaned = self.clean_post_data(post)
                    cleaned_posts.append(cleaned)
                except Exception as e:
                    print(f"[DirectPostsWriter] Error cleaning post {i}: {e}", flush=True)
                    self.errors += 1

            if not cleaned_posts:
                print(f"[DirectPostsWriter] No posts remained after cleaning", flush=True)
                return False

            # Write to database in chunks of 100 to avoid timeouts
            chunk_size = 100
            total_written = 0

            for i in range(0, len(cleaned_posts), chunk_size):
                chunk = cleaned_posts[i:i + chunk_size]

                try:
                    response = self.supabase.table('reddit_posts').upsert(
                        chunk,
                        on_conflict='reddit_id'
                    ).execute()

                    total_written += len(chunk)
                    print(f"[DirectPostsWriter] Successfully wrote chunk {i//chunk_size + 1} ({len(chunk)} posts)", flush=True)

                except Exception as e:
                    print(f"[DirectPostsWriter] Error writing chunk {i//chunk_size + 1}: {e}", flush=True)
                    self.errors += 1
                    # Continue with next chunk even if one fails

            self.posts_written += total_written
            print(f"[DirectPostsWriter] ✅ Wrote {total_written}/{len(posts_data)} posts (Total: {self.posts_written})", flush=True)
            logger.info(f"✅ DirectPostsWriter: Wrote {total_written} posts to database")

            return total_written > 0

        except Exception as e:
            print(f"[DirectPostsWriter] ❌ Fatal error writing posts: {e}", flush=True)
            logger.error(f"❌ DirectPostsWriter fatal error: {e}")
            self.errors += 1
            return False

    def get_stats(self) -> Dict[str, int]:
        """Get writer statistics"""
        return {
            'posts_written': self.posts_written,
            'errors': self.errors
        }