"""
Instagram Analytics Module
Calculates creator metrics, engagement rates, and performance analysis
"""

import time
from collections import Counter
from datetime import datetime
from typing import Any, Dict, List, Optional

from .utils import extract_hashtags


class InstagramAnalytics:
    """
    Instagram analytics calculator

    Handles:
    - Engagement rate calculations
    - Viral content detection
    - Posting pattern analysis
    - Performance comparisons
    """

    def __init__(self, config, logger):
        """
        Initialize analytics calculator

        Args:
            config: Instagram scraper configuration (config.instagram)
            logger: Logger instance
        """
        self.config = config
        self.logger = logger

    def calculate_analytics(
        self,
        creator_id: str,
        reels: List[Dict],
        posts: List[Dict],
        profile_data: Optional[Dict] = None,
    ) -> Dict[str, Any]:
        """
        Calculate comprehensive creator analytics with enhanced post and reel metrics

        Args:
            creator_id: Instagram creator ID
            reels: List of reel data
            posts: List of post data
            profile_data: Optional profile data for follower count

        Returns:
            Dict with all analytics metrics
        """
        analytics = {
            # Basic reel metrics
            "avg_reel_views": 0,
            "avg_reel_likes": 0,
            "avg_reel_comments": 0,
            "avg_reel_saves": 0,
            "avg_reel_shares": 0,
            "avg_likes_per_reel_cached": 0,
            "avg_comments_per_reel_cached": 0,
            "avg_saves_per_reel_cached": 0,
            "avg_shares_per_reel_cached": 0,
            # Basic post metrics
            "avg_post_likes": 0,
            "avg_post_comments": 0,
            "avg_post_saves": 0,
            "avg_post_shares": 0,
            "avg_post_engagement": 0,
            "avg_likes_per_post_cached": 0,
            "avg_comments_per_post_cached": 0,
            "avg_saves_per_post_cached": 0,
            "avg_shares_per_post_cached": 0,
            # Aggregate metrics
            "total_views": 0,
            "total_likes": 0,
            "total_comments": 0,
            "total_saves": 0,
            "total_shares": 0,
            "total_engagement": 0,
            "save_to_like_ratio": 0,
            # Advanced metrics
            "engagement_rate": 0,
            "avg_engagement_rate": 0,
            "post_engagement_rate": 0,
            "reel_engagement_rate": 0,
            "avg_engagement_per_content": 0,
            "reels_vs_posts_performance": 0,
            "viral_content_rate": 0,
            "viral_content_count": 0,
            "viral_threshold_multiplier": self.config.viral_multiplier,
            "posting_frequency_per_week": 0,
            "posting_consistency_score": 0,
            "content_reach_rate": 0,
            "comment_to_like_ratio": 0,
            "last_post_days_ago": None,
            # Content analysis
            "total_content_analyzed": 0,
            "reels_analyzed": len(reels),
            "posts_analyzed": len(posts),
            "best_performing_type": "unknown",
            "best_content_type": None,
            "avg_caption_length": 0,
            "uses_hashtags": False,
            "avg_hashtag_count": 0,
            # Time-based metrics
            "most_active_day": None,
            "most_active_hour": None,
            "days_since_last_post": None,
        }

        if not self.config.enable_analytics:
            return analytics

        try:
            followers_count = 0
            if profile_data:
                followers_count = profile_data.get("follower_count", 0)

            # Calculate reel metrics
            if reels:
                analytics = self._calculate_reel_metrics(reels, analytics, followers_count)

            # Calculate post metrics
            if posts:
                analytics = self._calculate_post_metrics(posts, analytics, followers_count)

            # Calculate combined metrics
            analytics = self._calculate_combined_metrics(
                analytics, followers_count, len(reels), len(posts)
            )

            # Calculate posting patterns
            all_content = reels + posts
            if all_content:
                analytics = self._calculate_posting_patterns(all_content, analytics)

        except Exception as e:
            self.logger.warning(f"Failed to calculate analytics for {creator_id}: {e}")

        return analytics

    def _calculate_reel_metrics(
        self, reels: List[Dict], analytics: Dict[str, Any], followers_count: int
    ) -> Dict[str, Any]:
        """Calculate metrics specific to reels"""
        reel_views = []
        reel_likes = []
        reel_comments = []
        reel_saves = []
        reel_shares = []

        for reel in reels:
            views = reel.get("play_count", 0)
            likes = reel.get("like_count", 0)
            comments = reel.get("comment_count", 0)
            saves = reel.get("save_count", 0) or 0
            shares = reel.get("share_count", 0) or 0

            if views:
                reel_views.append(views)
            if likes:
                reel_likes.append(likes)
            if comments:
                reel_comments.append(comments)
            if saves:
                reel_saves.append(saves)
            if shares:
                reel_shares.append(shares)

        if reel_views:
            analytics["avg_reel_views"] = sum(reel_views) / len(reel_views)
            analytics["total_views"] = sum(reel_views)

            # Content reach rate
            if followers_count > 0:
                analytics["content_reach_rate"] = (
                    analytics["avg_reel_views"] / followers_count
                ) * 100  # type: ignore[operator]

        if reel_likes:
            analytics["avg_reel_likes"] = sum(reel_likes) / len(reel_likes)
            analytics["avg_likes_per_reel_cached"] = analytics["avg_reel_likes"]
            analytics["total_likes"] += sum(reel_likes)

        if reel_comments:
            analytics["avg_reel_comments"] = sum(reel_comments) / len(reel_comments)
            analytics["avg_comments_per_reel_cached"] = analytics["avg_reel_comments"]
            analytics["total_comments"] += sum(reel_comments)

        if reel_saves:
            analytics["avg_reel_saves"] = sum(reel_saves) / len(reel_saves)
            analytics["avg_saves_per_reel_cached"] = analytics["avg_reel_saves"]
            analytics["total_saves"] += sum(reel_saves)  # type: ignore[operator]

        if reel_shares:
            analytics["avg_reel_shares"] = sum(reel_shares) / len(reel_shares)
            analytics["avg_shares_per_reel_cached"] = analytics["avg_reel_shares"]
            analytics["total_shares"] += sum(reel_shares)  # type: ignore[operator]

        # Calculate reel engagement rate
        if followers_count > 0 and reel_likes:
            reel_engagement = (
                sum(reel_likes) + sum(reel_comments) if reel_comments else sum(reel_likes)
            )
            analytics["reel_engagement_rate"] = (
                reel_engagement / len(reels) / followers_count
            ) * 100

        # Viral detection for reels
        if self.config.enable_viral_detection and reel_views:
            viral_count = sum(
                1
                for v in reel_views  # type: ignore[misc]
                if v >= self.config.viral_min_views
                and v >= analytics["avg_reel_views"] * self.config.viral_multiplier
            )  # type: ignore[operator]
            analytics["viral_content_count"] = viral_count
            analytics["viral_content_rate"] = (viral_count / len(reel_views)) * 100

        return analytics

    def _calculate_post_metrics(
        self, posts: List[Dict], analytics: Dict[str, Any], followers_count: int
    ) -> Dict[str, Any]:
        """Calculate metrics specific to posts"""
        post_likes = []
        post_comments = []
        post_saves = []
        post_shares = []
        post_engagements = []
        caption_lengths = []
        hashtag_counts = []

        for post in posts:
            likes = post.get("like_count", 0)
            comments = post.get("comment_count", 0)
            saves = post.get("save_count", 0) or 0
            shares = post.get("share_count", 0) or 0
            engagement = likes + comments

            if likes:
                post_likes.append(likes)
            if comments:
                post_comments.append(comments)
            if saves:
                post_saves.append(saves)
            if shares:
                post_shares.append(shares)
            if engagement:
                post_engagements.append(engagement)

            # Caption analysis
            caption = post.get("caption", {})
            caption_text = caption.get("text", "") if isinstance(caption, dict) else str(caption)

            if caption_text:
                caption_lengths.append(len(caption_text))
                hashtags = extract_hashtags(caption_text)
                hashtag_counts.append(len(hashtags))

        if post_likes:
            analytics["avg_post_likes"] = sum(post_likes) / len(post_likes)
            analytics["avg_likes_per_post_cached"] = analytics["avg_post_likes"]
            analytics["total_likes"] += sum(post_likes)

        if post_comments:
            analytics["avg_post_comments"] = sum(post_comments) / len(post_comments)
            analytics["avg_comments_per_post_cached"] = analytics["avg_post_comments"]
            analytics["total_comments"] += sum(post_comments)

        if post_saves:
            analytics["avg_post_saves"] = sum(post_saves) / len(post_saves)
            analytics["avg_saves_per_post_cached"] = analytics["avg_post_saves"]
            analytics["total_saves"] += sum(post_saves)  # type: ignore[operator]

        if post_shares:
            analytics["avg_post_shares"] = sum(post_shares) / len(post_shares)
            analytics["avg_shares_per_post_cached"] = analytics["avg_post_shares"]
            analytics["total_shares"] += sum(post_shares)  # type: ignore[operator]

        if post_engagements:
            analytics["avg_post_engagement"] = sum(post_engagements) / len(post_engagements)
            analytics["total_engagement"] += sum(post_engagements)

        # Calculate post engagement rate
        if followers_count > 0 and post_engagements:
            analytics["post_engagement_rate"] = (
                sum(post_engagements) / len(posts) / followers_count
            ) * 100

        # Check for viral posts
        if (
            self.config.enable_viral_detection
            and post_engagements
            and analytics["avg_post_engagement"] > 0
        ):  # type: ignore[operator]
            viral_posts = sum(
                1
                for e in post_engagements  # type: ignore[misc]
                if e >= analytics["avg_post_engagement"] * self.config.viral_multiplier
            )  # type: ignore[operator]
            analytics["viral_content_count"] += viral_posts  # type: ignore[operator]

        if caption_lengths:
            analytics["avg_caption_length"] = sum(caption_lengths) / len(caption_lengths)

        if hashtag_counts:
            analytics["uses_hashtags"] = any(h > 0 for h in hashtag_counts)
            analytics["avg_hashtag_count"] = sum(hashtag_counts) / len(hashtag_counts)

        return analytics

    def _calculate_combined_metrics(
        self, analytics: Dict[str, Any], followers_count: int, reels_count: int, posts_count: int
    ) -> Dict[str, Any]:
        """Calculate combined/aggregate metrics"""
        analytics["total_content_analyzed"] = reels_count + posts_count
        analytics["total_engagement"] = analytics["total_likes"] + analytics["total_comments"]  # type: ignore[operator]

        # Engagement rate calculation (overall)
        if followers_count > 0 and analytics["total_content_analyzed"] > 0:  # type: ignore[operator]
            avg_engagement = analytics["total_engagement"] / analytics["total_content_analyzed"]  # type: ignore[operator]
            analytics["engagement_rate"] = (avg_engagement / followers_count) * 100
            analytics["avg_engagement_rate"] = analytics["engagement_rate"]
            analytics["avg_engagement_per_content"] = avg_engagement

        # Comment to like ratio
        if analytics["total_likes"] > 0:  # type: ignore[operator]
            analytics["comment_to_like_ratio"] = (
                analytics["total_comments"] / analytics["total_likes"]
            )  # type: ignore[operator]

        # Save to like ratio (important viral indicator)
        if analytics["total_likes"] > 0 and analytics["total_saves"] > 0:  # type: ignore[operator]
            analytics["save_to_like_ratio"] = analytics["total_saves"] / analytics["total_likes"]  # type: ignore[operator]

        # Reels vs Posts performance
        if analytics["avg_reel_views"] > 0 and analytics["avg_post_engagement"] > 0:  # type: ignore[operator]
            analytics["reels_vs_posts_performance"] = (
                analytics["avg_reel_views"] / analytics["avg_post_engagement"]
            )  # type: ignore[operator]

        # Determine best performing content type
        reel_score = (
            analytics["reel_engagement_rate"] if analytics["reel_engagement_rate"] > 0 else 0
        )  # type: ignore[operator]
        post_score = (
            analytics["post_engagement_rate"] if analytics["post_engagement_rate"] > 0 else 0
        )  # type: ignore[operator]

        if reel_score > post_score * 1.5:  # type: ignore[operator]
            analytics["best_performing_type"] = "reels"
            analytics["best_content_type"] = "reels"
        elif post_score > reel_score * 1.5:  # type: ignore[operator]
            analytics["best_performing_type"] = "posts"
            analytics["best_content_type"] = "posts"
        elif reel_score > 0 and post_score > 0:  # type: ignore[operator]
            analytics["best_performing_type"] = "mixed"
            analytics["best_content_type"] = "mixed"
        elif analytics["avg_reel_views"] > analytics["avg_post_engagement"]:  # type: ignore[operator]
            analytics["best_performing_type"] = "reels"
            analytics["best_content_type"] = "reels"
        elif analytics["avg_post_engagement"] > 0:  # type: ignore[operator]
            analytics["best_performing_type"] = "posts"
            analytics["best_content_type"] = "posts"

        return analytics

    def _calculate_posting_patterns(
        self, content: List[Dict], analytics: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Calculate posting frequency and consistency"""
        timestamps = []
        for item in content:
            timestamp = item.get("taken_at") or item.get("device_timestamp")
            if timestamp:
                timestamps.append(timestamp)

        if not timestamps:
            return analytics

        timestamps.sort()
        current_time = int(time.time())

        # Days since last post
        days_ago = (current_time - timestamps[-1]) / 86400
        analytics["days_since_last_post"] = days_ago
        analytics["last_post_days_ago"] = days_ago

        # Posting frequency
        if len(timestamps) > 1:
            date_range_weeks = (timestamps[-1] - timestamps[0]) / (7 * 86400)
            if date_range_weeks > 0:
                analytics["posting_frequency_per_week"] = len(timestamps) / date_range_weeks

            # Consistency score (0-100, based on standard deviation of posting intervals)
            intervals = [timestamps[i + 1] - timestamps[i] for i in range(len(timestamps) - 1)]
            if intervals:
                avg_interval = sum(intervals) / len(intervals)
                if avg_interval > 0:
                    variance = sum((x - avg_interval) ** 2 for x in intervals) / len(intervals)
                    std_dev = variance**0.5
                    consistency = max(0, 100 - (std_dev / avg_interval * 100))
                    analytics["posting_consistency_score"] = min(100, consistency)

        # Time analysis
        posting_times = [datetime.fromtimestamp(ts) for ts in timestamps]

        # Most active day of week
        days = [dt.strftime("%A") for dt in posting_times]
        if days:
            day_counts = Counter(days)
            analytics["most_active_day"] = day_counts.most_common(1)[0][0]

        # Most active hour
        hours = [dt.hour for dt in posting_times]
        if hours:
            hour_counts = Counter(hours)
            analytics["most_active_hour"] = hour_counts.most_common(1)[0][0]

        return analytics

    def format_analytics_summary(self, analytics: Dict[str, Any]) -> str:
        """
        Format analytics into readable summary

        Args:
            analytics: Analytics dict from calculate_analytics()

        Returns:
            Human-readable string summary
        """
        summary = []
        summary.append("📊 Analytics Summary")
        summary.append("━━━━━━━━━━━━━━━━━━")
        summary.append(f"Total Content: {analytics.get('total_content_analyzed', 0)}")
        summary.append(f"Engagement Rate: {analytics.get('engagement_rate', 0):.2f}%")
        summary.append(f"Avg Views: {analytics.get('avg_reel_views', 0):,.0f}")
        summary.append(f"Viral Rate: {analytics.get('viral_content_rate', 0):.1f}%")
        summary.append(f"Best Type: {analytics.get('best_performing_type', 'N/A')}")
        summary.append(f"Post Frequency: {analytics.get('posting_frequency_per_week', 0):.1f}/week")
        summary.append(f"Consistency: {analytics.get('posting_consistency_score', 0):.0f}/100")
        if analytics.get("most_active_day"):
            summary.append(
                f"Most Active: {analytics['most_active_day']} @ {analytics.get('most_active_hour', 0)}:00"
            )
        return "\n".join(summary)
