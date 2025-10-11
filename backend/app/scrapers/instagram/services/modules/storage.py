"""
Instagram Storage Module
Handles all database operations, R2 uploads, and data persistence
"""

from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Optional, Tuple

from supabase import Client

from .utils import extract_hashtags, extract_mentions, to_iso


try:
    from app.utils.media_storage import (
        MediaStorageError,
        process_and_upload_image,
        process_and_upload_video,
    )
except ImportError:
    # Graceful fallback if media_storage not available
    MediaStorageError = Exception  # type: ignore
    process_and_upload_video = None  # type: ignore
    process_and_upload_image = None  # type: ignore


class InstagramStorage:
    """
    Instagram storage handler

    Handles:
    - Reels storage to database + R2
    - Posts storage to database + R2
    - Profile updates
    - Follower growth tracking
    - Analytics updates
    """

    def __init__(self, supabase: Client, logger, r2_config=None, media_utils=None):
        """
        Initialize storage handler

        Args:
            supabase: Supabase client instance
            logger: Logger instance
            r2_config: R2 storage configuration (optional)
            media_utils: Media upload utilities (optional)
        """
        self.supabase = supabase
        self.logger = logger
        self.r2_config = r2_config
        self.media_utils = media_utils or {}

    def get_creator_content_counts(self, creator_id: str) -> Tuple[int, int]:
        """
        Get existing content counts for a creator

        Args:
            creator_id: Instagram creator ID

        Returns:
            Tuple of (reels_count, posts_count)
        """
        try:
            # Get reels count
            reels_result = (
                self.supabase.table("instagram_reels")
                .select("media_pk", count="exact")  # type: ignore[arg-type]
                .eq("creator_id", creator_id)
                .execute()
            )
            reels_count = int(getattr(reels_result, "count", 0) or 0)

            # Get posts count
            posts_result = (
                self.supabase.table("instagram_posts")
                .select("media_pk", count="exact")  # type: ignore[arg-type]
                .eq("creator_id", creator_id)
                .execute()
            )
            posts_count = int(getattr(posts_result, "count", 0) or 0)

            return reels_count, posts_count

        except Exception as e:
            self.logger.warning(f"Failed to get content counts for {creator_id}: {e}")
            return 0, 0

    def store_reels(
        self,
        creator_id: str,
        username: str,
        reels: List[Dict],
        creator_niche: Optional[str] = None,
        current_creator_followers: int = 0,
    ) -> Tuple[int, int, int]:
        """
        Store reels in database with R2 upload

        Args:
            creator_id: Instagram creator ID
            username: Creator username
            reels: List of reel data dicts
            creator_niche: Creator's niche category
            current_creator_followers: Follower count for engagement calc

        Returns:
            Tuple of (total_saved, new_count, existing_count)
        """
        if not reels:
            return 0, 0, 0

        # First check which reels already exist and if they have R2 URLs
        media_pks = [str(reel.get("pk")) for reel in reels if reel.get("pk")]
        existing_pks = set()
        existing_r2_urls = {}  # media_pk -> video_url mapping for R2 URLs
        if media_pks:
            try:
                result = (
                    self.supabase.table("instagram_reels")
                    .select("media_pk, video_url")
                    .in_("media_pk", media_pks)
                    .execute()
                )
                for row in result.data or []:
                    existing_pks.add(row["media_pk"])
                    # Check if video already has custom domain R2 URL
                    if row.get("video_url") and "media.b9dashboard.com" in row["video_url"]:
                        existing_r2_urls[row["media_pk"]] = row["video_url"]
                        self.logger.info(
                            f"🔄 Skipping R2 upload for reel {row['media_pk']} (already using custom domain)"
                        )
            except Exception as e:
                self.logger.debug(f"Failed to check existing reels: {e}")

        new_count = 0
        existing_count = 0
        rows = []

        for reel in reels:
            try:
                # Extract caption text and hashtags
                caption_data = reel.get("caption", {})
                if isinstance(caption_data, dict):
                    caption_text = caption_data.get("text", "")
                else:
                    caption_text = str(caption_data) if caption_data else ""

                hashtags = extract_hashtags(caption_text) if caption_text else []
                mentions = extract_mentions(caption_text) if caption_text else []

                # Extract engagement metrics
                engagement = (reel.get("like_count", 0) or 0) + (reel.get("comment_count", 0) or 0)

                # Calculate engagement rate if we have follower count
                engagement_rate = 0
                if current_creator_followers > 0:
                    engagement_rate = (engagement / current_creator_followers) * 100

                # Check if this reel already has R2 URL (deduplication)
                reel_pk = str(reel.get("pk"))
                if reel_pk in existing_r2_urls:
                    # Already in R2, use existing URL
                    video_url = existing_r2_urls[reel_pk]
                    self.logger.info(f"✅ Using existing R2 URL for reel {reel_pk}")
                else:
                    # Extract video URL from API response (video_versions array)
                    video_url = None
                    video_versions = reel.get("video_versions", [])
                    if video_versions and len(video_versions) > 0:
                        video_url = video_versions[0].get("url")  # Highest quality video

                    if (
                        self.r2_config
                        and getattr(self.r2_config, "ENABLED", False)
                        and process_and_upload_video
                        and video_url
                    ):
                        try:
                            self.logger.info(
                                f"📤 Starting R2 upload for reel {reel.get('pk')} (creator: {creator_id})",
                                action="r2_upload_start",
                            )
                            r2_video_url = process_and_upload_video(
                                cdn_url=video_url,
                                creator_id=str(creator_id),
                                media_pk=str(reel.get("pk")),
                            )
                            if r2_video_url:
                                video_url = r2_video_url  # Use R2 URL instead of CDN
                                self.logger.info(
                                    "✅ Uploaded reel video to R2",
                                    action="r2_video_uploaded",
                                    context={
                                        "media_pk": str(reel.get("pk")),
                                        "creator_id": str(creator_id),
                                        "r2_url": r2_video_url[:80] + "...",
                                    },
                                )
                            else:
                                self.logger.warning(
                                    f"⚠️ R2 upload returned None for reel {reel.get('pk')}",
                                    action="r2_upload_failed",
                                    context={
                                        "media_pk": str(reel.get("pk")),
                                        "creator_id": str(creator_id),
                                    },
                                )
                        except MediaStorageError as e:
                            self.logger.error(
                                "❌ R2 upload failed (MediaStorageError), using CDN URL - continuing with CDN",
                                action="r2_upload_error",
                                context={
                                    "media_pk": str(reel.get("pk")),
                                    "creator_id": str(creator_id),
                                    "error": str(e),
                                },
                                exc_info=True,
                            )
                        except Exception as e:
                            self.logger.error(
                                "❌ R2 upload failed (unexpected error), using CDN URL - continuing with CDN",
                                action="r2_upload_exception",
                                context={
                                    "media_pk": str(reel.get("pk")),
                                    "creator_id": str(creator_id),
                                    "error": str(e),
                                },
                                exc_info=True,
                            )
                            # Continue with CDN URL on error

                row = {
                    "media_pk": reel.get("pk"),
                    "media_id": reel.get("id"),
                    "shortcode": reel.get("code"),
                    "creator_id": str(creator_id),
                    "creator_username": username,
                    "creator_niche": creator_niche,
                    "product_type": reel.get("product_type"),
                    "media_type": reel.get("media_type"),
                    "taken_at": to_iso(reel.get("taken_at") or reel.get("device_timestamp")),
                    "caption_text": caption_text[:2000] if caption_text else None,
                    "hashtags": hashtags,
                    "hashtag_count": len(hashtags),
                    "mention_count": len(mentions),
                    "play_count": reel.get("play_count", 0),
                    "ig_play_count": reel.get("ig_play_count"),
                    "like_count": reel.get("like_count", 0),
                    "comment_count": reel.get("comment_count", 0),
                    "share_count": reel.get("share_count"),
                    "save_count": reel.get("save_count"),
                    "engagement_count": engagement,
                    "engagement_rate": round(engagement_rate, 2),
                    "has_audio": reel.get("has_audio"),
                    "video_duration": reel.get("video_duration") or reel.get("media_duration"),
                    "video_url": video_url,
                    "thumbnail_url": (
                        reel.get("image_versions2", {}).get("candidates", [{}])[0].get("url")
                        if reel.get("image_versions2")
                        else None
                    ),
                    "is_paid_partnership": reel.get("is_paid_partnership", False),
                    "has_shared_to_fb": reel.get("has_shared_to_fb", 0),
                    "is_unified_video": reel.get("is_unified_video", False),
                    "is_dash_eligible": reel.get("is_dash_eligible"),
                    "number_of_qualities": reel.get("number_of_qualities"),
                    "raw_media_json": reel,
                    "scraped_at": datetime.now(timezone.utc).isoformat(),
                }

                if row["media_pk"]:
                    rows.append(row)
                    # Track if this is new or existing
                    if str(row["media_pk"]) in existing_pks:
                        existing_count += 1
                    else:
                        new_count += 1

            except Exception as e:
                self.logger.debug(f"Failed to process reel: {e}")
                continue

        total_saved = 0
        if rows:
            try:
                self.supabase.table("instagram_reels").upsert(
                    rows, on_conflict="media_pk"
                ).execute()
                total_saved = len(rows)
                self.logger.info(
                    f"Saved {total_saved} reels for {username}: {new_count} new records, {existing_count} existing updated"
                )
            except Exception as e:
                self.logger.error(f"Failed to store reels: {e}")

        return total_saved, new_count, existing_count

    def store_posts(
        self,
        creator_id: str,
        username: str,
        posts: List[Dict],
        creator_niche: Optional[str] = None,
        current_creator_followers: int = 0,
    ) -> Tuple[int, int, int]:
        """
        Store posts in database with R2 upload

        Args:
            creator_id: Instagram creator ID
            username: Creator username
            posts: List of post data dicts
            creator_niche: Creator's niche category
            current_creator_followers: Follower count for engagement calc

        Returns:
            Tuple of (total_saved, new_count, existing_count)
        """
        if not posts:
            return 0, 0, 0

        # First check which posts already exist and if they have R2 URLs
        media_pks = [str(post.get("pk")) for post in posts if post.get("pk")]
        existing_pks = set()
        existing_r2_images = {}  # media_pk -> image_urls mapping for R2 URLs
        if media_pks:
            try:
                result = (
                    self.supabase.table("instagram_posts")
                    .select("media_pk, image_urls")
                    .in_("media_pk", media_pks)
                    .execute()
                )
                for row in result.data or []:
                    existing_pks.add(row["media_pk"])
                    # Check if post already has custom domain R2 URLs
                    if (
                        row.get("image_urls")
                        and len(row["image_urls"]) > 0
                        and "media.b9dashboard.com" in row["image_urls"][0]
                    ):
                        existing_r2_images[row["media_pk"]] = row["image_urls"]
                        self.logger.info(
                            f"🔄 Skipping R2 upload for post {row['media_pk']} (already using custom domain)"
                        )
            except Exception as e:
                self.logger.debug(f"Failed to check existing posts: {e}")

        new_count = 0
        existing_count = 0
        rows = []

        for post in posts:
            try:
                # Extract caption text and hashtags
                caption_data = post.get("caption", {})
                if isinstance(caption_data, dict):
                    caption_text = caption_data.get("text", "")
                else:
                    caption_text = str(caption_data) if caption_data else ""

                hashtags = extract_hashtags(caption_text) if caption_text else []
                mentions = extract_mentions(caption_text) if caption_text else []

                # Extract engagement metrics
                engagement = (post.get("like_count", 0) or 0) + (post.get("comment_count", 0) or 0)

                # Calculate engagement rate if we have follower count
                engagement_rate = 0
                if current_creator_followers > 0:
                    engagement_rate = (engagement / current_creator_followers) * 100

                # Determine post type (single image, carousel, video)
                carousel_media_count = 0
                image_urls = None

                if post.get("carousel_media"):
                    carousel_media_count = len(post.get("carousel_media", []))
                    post_type = "carousel"

                    # Extract ALL media URLs from carousel (photos and videos)
                    image_urls = []
                    for item in post.get("carousel_media", []):
                        # Check if this carousel item is a photo or video
                        item_media_type = item.get("media_type", 1)

                        if item_media_type == 1:  # Photo
                            # Get highest quality image URL (first candidate)
                            candidates = item.get("image_versions2", {}).get("candidates", [])
                            if candidates and candidates[0].get("url"):
                                image_urls.append(candidates[0].get("url"))
                        elif item_media_type == 2:  # Video in carousel
                            # Get video thumbnail as fallback
                            candidates = item.get("image_versions2", {}).get("candidates", [])
                            if candidates and candidates[0].get("url"):
                                image_urls.append(candidates[0].get("url"))

                    # Check if this post already has R2 URLs (deduplication)
                    post_pk = str(post.get("pk"))
                    if post_pk in existing_r2_images:
                        # Already in R2, use existing URLs
                        image_urls = existing_r2_images[post_pk]
                        self.logger.info(
                            f"✅ Using existing R2 URLs for post {post_pk} ({len(image_urls)} photos)"
                        )
                    else:
                        # Only set image_urls if we extracted any
                        if not image_urls:
                            image_urls = None

                        # Upload photos to R2 (if enabled)
                        if (
                            image_urls
                            and self.r2_config
                            and getattr(self.r2_config, "ENABLED", False)
                            and process_and_upload_image
                        ):
                            r2_image_urls = []
                            for index, cdn_url in enumerate(image_urls):
                                try:
                                    r2_url = process_and_upload_image(
                                        cdn_url=cdn_url,
                                        creator_id=str(creator_id),
                                        media_pk=str(post.get("pk")),
                                        index=index,
                                    )
                                    if r2_url:
                                        r2_image_urls.append(r2_url)
                                    else:
                                        r2_image_urls.append(cdn_url)  # Fallback to CDN
                                except Exception as e:
                                    self.logger.warning(
                                        f"Failed to upload photo {index} to R2, using CDN URL: {e}"
                                    )
                                    r2_image_urls.append(cdn_url)  # Fallback to CDN

                            if r2_image_urls:
                                image_urls = r2_image_urls
                                self.logger.info(
                                    f"✅ Uploaded {len(r2_image_urls)} carousel photos to R2: {post.get('pk')}"
                                )

                elif post.get("media_type") == 2 or post.get("product_type") == "clips":
                    post_type = "video"
                else:
                    post_type = "image"

                row = {
                    "media_pk": post.get("pk"),
                    "media_id": post.get("id"),
                    "shortcode": post.get("code"),
                    "creator_id": str(creator_id),
                    "creator_username": username,
                    "creator_niche": creator_niche,
                    "product_type": post.get("product_type", "feed"),
                    "media_type": post.get("media_type"),
                    "post_type": post_type,
                    "carousel_media_count": carousel_media_count,
                    "taken_at": to_iso(post.get("taken_at") or post.get("device_timestamp")),
                    "caption_text": caption_text[:2000] if caption_text else None,
                    "hashtags": hashtags,
                    "hashtag_count": len(hashtags),
                    "mention_count": len(mentions),
                    "like_count": post.get("like_count", 0),
                    "comment_count": post.get("comment_count", 0),
                    "save_count": post.get("save_count"),
                    "share_count": post.get("share_count"),
                    "engagement_count": engagement,
                    "engagement_rate": round(engagement_rate, 2),
                    "is_paid_partnership": post.get("is_paid_partnership", False),
                    "has_shared_to_fb": post.get("has_shared_to_fb", 0),
                    "comments_disabled": post.get("comments_disabled", False),
                    "sharing_friction_info": post.get("sharing_friction_info"),
                    "original_width": post.get("original_width"),
                    "original_height": post.get("original_height"),
                    "accessibility_caption": post.get("accessibility_caption"),
                    "thumbnail_url": (
                        post.get("image_versions2", {}).get("candidates", [{}])[0].get("url")
                        if post.get("image_versions2")
                        else None
                    ),
                    "image_urls": image_urls,
                    "video_duration": post.get("video_duration") if post_type == "video" else None,
                    "view_count": post.get("view_count") or post.get("play_count"),
                    "raw_media_json": post,
                    "scraped_at": datetime.now(timezone.utc).isoformat(),
                }

                if row["media_pk"]:
                    rows.append(row)
                    # Track if this is new or existing
                    if str(row["media_pk"]) in existing_pks:
                        existing_count += 1
                    else:
                        new_count += 1

            except Exception as e:
                self.logger.debug(f"Failed to process post: {e}")
                continue

        total_saved = 0
        if rows:
            try:
                self.supabase.table("instagram_posts").upsert(
                    rows, on_conflict="media_pk"
                ).execute()
                total_saved = len(rows)
                self.logger.info(
                    f"Saved {total_saved} posts for {username}: {new_count} new records, {existing_count} existing updated"
                )
            except Exception as e:
                self.logger.error(f"Failed to store posts: {e}")

        return total_saved, new_count, existing_count

    def track_follower_growth(
        self,
        creator_id: str,
        username: str,
        current_followers: int,
        current_following: Optional[int] = None,
        media_count: Optional[int] = None,
    ) -> Dict[str, Optional[float]]:
        """
        Track follower history and calculate growth rates

        Args:
            creator_id: Instagram creator ID
            username: Creator username
            current_followers: Current follower count
            current_following: Current following count
            media_count: Current media count

        Returns:
            Dict with daily_growth_rate, weekly_growth_rate, previous_followers_count
        """
        try:
            # Record current follower count in history table
            history_entry = {
                "creator_id": creator_id,
                "username": username,
                "followers_count": current_followers,
                "following_count": current_following,
                "media_count": media_count,
                "recorded_at": datetime.now(timezone.utc).isoformat(),
            }

            self.supabase.table("instagram_follower_history").insert(history_entry).execute()

            # Get previous follower counts for growth calculation
            # Daily growth: compare with 24 hours ago
            day_ago = datetime.now(timezone.utc) - timedelta(days=1)
            daily_result = (
                self.supabase.table("instagram_follower_history")
                .select("followers_count")
                .eq("creator_id", creator_id)
                .lte("recorded_at", day_ago.isoformat())
                .order("recorded_at", desc=True)
                .limit(1)
                .execute()
            )

            daily_growth_rate = None
            if daily_result.data and daily_result.data[0]["followers_count"] > 0:
                prev_daily = daily_result.data[0]["followers_count"]
                daily_growth_rate = ((current_followers - prev_daily) / prev_daily) * 100

            # Weekly growth: compare with 7 days ago
            week_ago = datetime.now(timezone.utc) - timedelta(days=7)
            weekly_result = (
                self.supabase.table("instagram_follower_history")
                .select("followers_count")
                .eq("creator_id", creator_id)
                .lte("recorded_at", week_ago.isoformat())
                .order("recorded_at", desc=True)
                .limit(1)
                .execute()
            )

            weekly_growth_rate = None
            if weekly_result.data and weekly_result.data[0]["followers_count"] > 0:
                prev_weekly = weekly_result.data[0]["followers_count"]
                weekly_growth_rate = ((current_followers - prev_weekly) / prev_weekly) * 100

            # Get most recent previous count
            prev_result = (
                self.supabase.table("instagram_follower_history")
                .select("followers_count")
                .eq("creator_id", creator_id)
                .neq("followers_count", current_followers)
                .order("recorded_at", desc=True)
                .limit(1)
                .execute()
            )

            previous_followers = (
                prev_result.data[0]["followers_count"] if prev_result.data else None
            )

            return {
                "daily_growth_rate": round(daily_growth_rate, 2) if daily_growth_rate else None,
                "weekly_growth_rate": round(weekly_growth_rate, 2) if weekly_growth_rate else None,
                "previous_followers_count": previous_followers,
            }

        except Exception as e:
            self.logger.warning(f"Failed to track follower growth for {creator_id}: {e}")
            return {
                "daily_growth_rate": None,
                "weekly_growth_rate": None,
                "previous_followers_count": None,
            }

    def update_creator_profile(
        self,
        creator_id: str,
        profile_data: Dict[str, Any],
        growth_data: Dict[str, Optional[float]],
        external_url_type: Optional[str] = None,
        bio_links: Optional[List[Dict]] = None,
        profile_pic_url: Optional[str] = None,
    ) -> None:
        """
        Update creator profile with fresh data

        Args:
            creator_id: Instagram creator ID
            profile_data: Profile data from API
            growth_data: Growth rates from track_follower_growth()
            external_url_type: Classified URL type
            bio_links: Extracted bio links
            profile_pic_url: Profile picture URL (possibly R2)
        """
        # Implementation will be extracted from instagram_scraper.py
        # This is a placeholder stub
        pass

    def update_creator_analytics(
        self, creator_id: str, analytics: Dict[str, Any], api_calls_made: int = 0
    ) -> None:
        """
        Update creator with calculated analytics

        Args:
            creator_id: Instagram creator ID
            analytics: Analytics dict from InstagramAnalytics.calculate_analytics()
            api_calls_made: Number of API calls used for this creator
        """
        try:
            # Get current total API calls first
            current_calls_result = (
                self.supabase.table("instagram_creators")
                .select("total_api_calls")
                .eq("ig_user_id", creator_id)
                .single()
                .execute()
            )
            current_calls = (
                current_calls_result.data.get("total_api_calls", 0)
                if current_calls_result.data
                else 0
            )

            update_data = {
                # Reel metrics
                "avg_views_per_reel_cached": analytics.get("avg_reel_views"),
                "avg_likes_per_reel_cached": analytics.get("avg_likes_per_reel_cached"),
                "avg_comments_per_reel_cached": analytics.get("avg_comments_per_reel_cached"),
                # Post metrics
                "avg_likes_per_post_cached": analytics.get("avg_likes_per_post_cached"),
                "avg_comments_per_post_cached": analytics.get("avg_comments_per_post_cached"),
                # Engagement metrics
                "avg_engagement_rate": analytics.get("avg_engagement_rate"),
                "engagement_rate_cached": analytics.get("engagement_rate"),
                # Content analysis
                "best_content_type": analytics.get("best_content_type"),
                "viral_content_count_cached": analytics.get("viral_content_count"),
                "viral_threshold_multiplier": analytics.get("viral_threshold_multiplier"),
                # Posting metrics
                "posting_frequency_per_week": analytics.get("posting_frequency_per_week"),
                "posting_consistency_score": analytics.get("posting_consistency_score"),
                "last_post_days_ago": analytics.get("last_post_days_ago"),
                # Metadata
                "last_scraped_at": datetime.now(timezone.utc).isoformat(),
                "total_api_calls": current_calls + api_calls_made,
            }

            # Remove None values to avoid overwriting with nulls
            update_data = {k: v for k, v in update_data.items() if v is not None}

            self.supabase.table("instagram_creators").update(update_data).eq(
                "ig_user_id", creator_id
            ).execute()

            self.logger.debug(f"Updated analytics for {creator_id}: {len(update_data)} fields")

        except Exception as e:
            self.logger.warning(f"Failed to update creator analytics for {creator_id}: {e}")
