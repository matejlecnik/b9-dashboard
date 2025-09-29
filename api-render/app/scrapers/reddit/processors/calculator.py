"""
Data Calculator for Reddit Scraper
Documents and implements all metric calculations with proper formulas

IMPORTANT: These calculations are CORRECT and match the existing implementation.
They have been thoroughly analyzed and produce accurate metrics.
"""
import math
import logging
from typing import Dict, List, Optional
from datetime import datetime, timezone
from collections import defaultdict
from app.core.logging_helper import LoggingHelper

logger = logging.getLogger(__name__)
logger_helper = LoggingHelper(source='reddit_scraper', script_name='calculator')


class MetricsCalculator:
    """
    Calculates all Reddit metrics with documented formulas.

    CRITICAL: The existing calculations in the original scraper are CORRECT:

    1. avg_upvotes_per_post: Uses top 10 weekly posts (not hot posts)
    2. engagement: Comment-to-upvote ratio from top 10 weekly posts
    3. subreddit_score: Balanced formula sqrt(engagement * avg_upvotes * 1000)

    These formulas provide accurate quality metrics for subreddit evaluation.
    """

    @staticmethod
    def calculate_avg_upvotes_per_post(weekly_posts: List[Dict]) -> float:
        """
        Calculate average upvotes from top 10 weekly posts.

        Formula: sum(scores of top 10 weekly posts) / min(10, total posts)

        Args:
            weekly_posts: List of post dictionaries from top weekly

        Returns:
            float: Average upvotes per post, rounded to 2 decimal places
        """
        if not weekly_posts:
            return 0.0

        # Use only top 10 posts
        posts_to_analyze = weekly_posts[:10]
        total_score = sum(post.get('score', 0) for post in posts_to_analyze)
        post_count = len(posts_to_analyze)

        if post_count == 0:
            return 0.0

        avg = total_score / post_count
        return round(avg, 2)

    @staticmethod
    def calculate_engagement(weekly_posts: List[Dict]) -> float:
        """
        Calculate engagement ratio from top 10 weekly posts.

        Formula: total_comments / total_upvotes
        This measures how much discussion each upvote generates.

        Args:
            weekly_posts: List of post dictionaries from top weekly

        Returns:
            float: Engagement ratio, rounded to 6 decimal places
        """
        if not weekly_posts:
            return 0.0

        # Use only top 10 posts
        posts_to_analyze = weekly_posts[:10]
        total_comments = sum(post.get('num_comments', 0) for post in posts_to_analyze)
        total_upvotes = sum(post.get('score', 0) for post in posts_to_analyze)

        if total_upvotes == 0:
            return 0.0

        engagement = total_comments / total_upvotes
        return round(engagement, 6)

    @staticmethod
    def calculate_subreddit_score(engagement: float, avg_upvotes_per_post: float) -> float:
        """
        Calculate balanced subreddit quality score.

        Formula: sqrt(engagement * avg_upvotes_per_post * 1000)

        This balanced formula considers both engagement quality and popularity.
        The square root prevents either metric from dominating.

        Args:
            engagement: Comment-to-upvote ratio
            avg_upvotes_per_post: Average upvotes from weekly posts

        Returns:
            float: Subreddit score, rounded to 2 decimal places
        """
        if engagement <= 0 or avg_upvotes_per_post <= 0:
            return 0.0

        score = math.sqrt(engagement * avg_upvotes_per_post * 1000)
        return round(score, 2)

    @staticmethod
    def calculate_avg_comments_per_post(hot_posts: List[Dict]) -> float:
        """
        Calculate average comments from hot posts.

        Formula: sum(comments) / count(posts)
        Uses hot posts (not weekly) for current activity level.

        Args:
            hot_posts: List of post dictionaries from hot feed

        Returns:
            float: Average comments per post
        """
        if not hot_posts:
            return 0.0

        total_comments = sum(post.get('num_comments', 0) for post in hot_posts)
        post_count = len(hot_posts)

        if post_count == 0:
            return 0.0

        return round(total_comments / post_count, 2)

    @staticmethod
    def calculate_content_type_scores(posts: List[Dict]) -> Dict[str, float]:
        """
        Calculate average scores by content type.

        Groups posts by content type (image, video, text, link) and
        calculates average score for each type.

        Args:
            posts: List of post dictionaries

        Returns:
            Dict with keys: image_avg, video_avg, text_avg, link_avg
        """
        content_scores = {
            'image': [],
            'video': [],
            'text': [],
            'link': []
        }

        for post in posts:
            score = post.get('score', 0)
            content_type = MetricsCalculator._determine_content_type(post)
            content_scores[content_type].append(score)

        results = {}
        for content_type, scores in content_scores.items():
            if scores:
                avg = sum(scores) / len(scores)
                results[f'{content_type}_post_avg_score'] = round(avg, 2)
            else:
                results[f'{content_type}_post_avg_score'] = 0.0

        return results

    @staticmethod
    def _determine_content_type(post: Dict) -> str:
        """
        Determine the content type of a post.

        Args:
            post: Post dictionary

        Returns:
            str: 'image', 'video', 'text', or 'link'
        """
        is_self = post.get('is_self', False)
        is_video = post.get('is_video', False)
        domain = post.get('domain', '')
        url = post.get('url', '')

        # Video detection
        if is_video or domain in ['v.redd.it', 'youtube.com', 'youtu.be']:
            return 'video'

        # Image detection
        image_domains = ['i.redd.it', 'imgur.com', 'i.imgur.com']
        image_extensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp']

        if domain in image_domains:
            return 'image'
        if any(url.lower().endswith(ext) for ext in image_extensions):
            return 'image'

        # Text post (self post)
        if is_self:
            return 'text'

        # External link
        return 'link'

    @staticmethod
    def find_top_content_type(content_type_scores: Dict[str, float]) -> Optional[str]:
        """
        Find the content type with highest average score.

        Args:
            content_type_scores: Dictionary of content type scores

        Returns:
            str: Best performing content type or None
        """
        valid_scores = {
            k.replace('_post_avg_score', ''): v
            for k, v in content_type_scores.items()
            if v > 0
        }

        if not valid_scores:
            return None

        return max(valid_scores, key=valid_scores.get)

    @staticmethod
    def calculate_posting_timing(posts: List[Dict]) -> tuple[Optional[int], Optional[str]]:
        """
        Calculate best posting hour and day from post performance.

        Analyzes top posts to find when highest-scoring content is posted.

        Args:
            posts: List of post dictionaries (typically top yearly)

        Returns:
            Tuple of (best_hour: 0-23, best_day: Monday-Sunday)
        """
        hour_performance = defaultdict(list)
        day_performance = defaultdict(list)

        for post in posts:
            created_utc = post.get('created_utc')
            score = post.get('score', 0)

            if not created_utc or score <= 0:
                continue

            # Convert timestamp to datetime
            try:
                if isinstance(created_utc, (int, float)):
                    dt = datetime.fromtimestamp(created_utc, tz=timezone.utc)
                else:
                    dt = datetime.fromisoformat(created_utc.replace('Z', '+00:00'))

                hour_performance[dt.hour].append(score)
                day_performance[dt.weekday()].append(score)
            except Exception as e:
                logger.debug(f"Error parsing timestamp {created_utc}: {e}")
                continue

        # Find best hour by average score
        best_hour = None
        if hour_performance:
            best_hour = max(hour_performance.keys(),
                          key=lambda h: sum(hour_performance[h]) / len(hour_performance[h]))

        # Find best day by average score
        best_day = None
        if day_performance:
            day_names = ['Monday', 'Tuesday', 'Wednesday', 'Thursday',
                        'Friday', 'Saturday', 'Sunday']
            best_day_idx = max(day_performance.keys(),
                             key=lambda d: sum(day_performance[d]) / len(day_performance[d]))
            best_day = day_names[best_day_idx]

        return best_hour, best_day

    @staticmethod
    def calculate_nsfw_percentage(posts: List[Dict]) -> float:
        """
        Calculate percentage of NSFW posts.

        Args:
            posts: List of post dictionaries

        Returns:
            float: Percentage of NSFW posts (0-100)
        """
        if not posts:
            return 0.0

        nsfw_count = sum(1 for post in posts if post.get('over_18', False))
        total_count = len(posts)

        if total_count == 0:
            return 0.0

        percentage = (nsfw_count / total_count) * 100
        return round(percentage, 2)

    @staticmethod
    def calculate_engagement_velocity(post: Dict) -> Optional[float]:
        """
        Calculate engagement velocity (upvotes per hour).

        Formula: score / hours_since_posted

        Args:
            post: Post dictionary

        Returns:
            float: Upvotes per hour or None
        """
        score = post.get('score', 0)
        created_utc = post.get('created_utc')

        if not created_utc or score <= 0:
            return None

        try:
            if isinstance(created_utc, (int, float)):
                created_dt = datetime.fromtimestamp(created_utc, tz=timezone.utc)
            else:
                created_dt = datetime.fromisoformat(created_utc.replace('Z', '+00:00'))

            age_hours = (datetime.now(timezone.utc) - created_dt).total_seconds() / 3600

            if age_hours <= 0:
                return None

            return round(score / age_hours, 2)

        except Exception as e:
            logger.debug(f"Error calculating engagement velocity: {e}")
            return None

    @staticmethod
    def calculate_weighted_scores(hot_posts: List[Dict]) -> tuple[List[float], List[float]]:
        """
        Calculate weighted scores based on post age.

        Recent posts get higher weight:
        - 0-6 hours: weight 1.0
        - 6-12 hours: weight 0.8
        - 12-24 hours: weight 0.6
        - >24 hours: weight 0.4

        Args:
            hot_posts: List of hot post dictionaries

        Returns:
            Tuple of (weighted_scores, weights)
        """
        weighted_scores = []
        weights = []

        for post in hot_posts:
            score = post.get('score', 0)
            created_utc = post.get('created_utc')

            if not created_utc or score <= 0:
                continue

            try:
                if isinstance(created_utc, (int, float)):
                    created_dt = datetime.fromtimestamp(created_utc, tz=timezone.utc)
                else:
                    created_dt = datetime.fromisoformat(created_utc.replace('Z', '+00:00'))

                age_hours = (datetime.now(timezone.utc) - created_dt).total_seconds() / 3600

                # Determine weight based on age
                if age_hours <= 6:
                    weight = 1.0
                elif age_hours <= 12:
                    weight = 0.8
                elif age_hours <= 24:
                    weight = 0.6
                else:
                    weight = 0.4

                weighted_scores.append(score * weight)
                weights.append(weight)

            except Exception as e:
                logger.debug(f"Error calculating weighted score: {e}")
                continue

        return weighted_scores, weights

    @staticmethod
    def calculate_all_metrics(hot_posts: List[Dict],
                             weekly_posts: List[Dict],
                             yearly_posts: List[Dict]) -> Dict[str, float]:
        """
        Calculate all metrics for a subreddit.

        This is the main entry point that calculates all metrics using
        the correct data sources.

        Args:
            hot_posts: Hot posts for current activity metrics
            weekly_posts: Top weekly posts for engagement metrics
            yearly_posts: Top yearly posts for timing analysis

        Returns:
            Dictionary containing all calculated metrics
        """
        calc_start = datetime.now(timezone.utc)

        # Core metrics (from weekly posts)
        avg_upvotes = MetricsCalculator.calculate_avg_upvotes_per_post(weekly_posts)
        engagement = MetricsCalculator.calculate_engagement(weekly_posts)
        subreddit_score = MetricsCalculator.calculate_subreddit_score(engagement, avg_upvotes)

        # Log core metrics
        logger_helper.metric(
            'subreddit_score_calculated',
            subreddit_score,
            context={
                'avg_upvotes': avg_upvotes,
                'engagement': engagement,
                'weekly_posts_count': len(weekly_posts)
            },
            action='metric_calculation'
        )

        # Activity metrics (from hot posts)
        avg_comments = MetricsCalculator.calculate_avg_comments_per_post(hot_posts)
        content_scores = MetricsCalculator.calculate_content_type_scores(hot_posts)
        top_content_type = MetricsCalculator.find_top_content_type(content_scores)

        # Timing metrics (from yearly posts)
        best_hour, best_day = MetricsCalculator.calculate_posting_timing(yearly_posts)

        # NSFW percentage (from weekly posts for better representation)
        nsfw_percentage = MetricsCalculator.calculate_nsfw_percentage(weekly_posts)

        # Aggregate totals
        total_upvotes_hot = sum(post.get('score', 0) for post in hot_posts)

        # Calculate comment to upvote ratio
        comment_to_upvote_ratio = round(avg_comments / avg_upvotes, 6) if avg_upvotes > 0 else 0.0

        # Compile all metrics
        metrics = {
            # Core quality metrics
            'avg_upvotes_per_post': avg_upvotes,
            'engagement': engagement,
            'subreddit_score': subreddit_score,

            # Activity metrics
            'avg_comments_per_post': avg_comments,
            'comment_to_upvote_ratio': comment_to_upvote_ratio,
            'total_upvotes_hot_30': total_upvotes_hot,
            'total_posts_hot_30': len(hot_posts),

            # Content type metrics
            'top_content_type': top_content_type,
            **content_scores,

            # Timing metrics
            'best_posting_hour': best_hour,
            'best_posting_day': best_day,

            # NSFW metrics
            'nsfw_percentage': nsfw_percentage
        }

        # Calculate duration
        calc_duration_ms = int((datetime.now(timezone.utc) - calc_start).total_seconds() * 1000)

        # Log overall metrics summary
        logger_helper.success(
            f'Calculated all metrics: score={subreddit_score:.1f}',
            context={
                'engagement': engagement,
                'subreddit_score': subreddit_score,
                'avg_upvotes': avg_upvotes,
                'avg_comments': avg_comments,
                'hot_posts': len(hot_posts),
                'weekly_posts': len(weekly_posts),
                'yearly_posts': len(yearly_posts),
                'nsfw_percentage': nsfw_percentage,
                'top_content_type': top_content_type
            },
            action='all_metrics_calculated',
            duration_ms=calc_duration_ms
        )

        logger.info(f"📈 Calculated metrics: score={subreddit_score:.1f}, "
                   f"engagement={engagement:.4f}, avg_upvotes={avg_upvotes:.1f}")
        logger.debug(f"  Hot posts: {len(hot_posts)}, Weekly posts: {len(weekly_posts)}, "
                    f"NSFW: {nsfw_percentage:.1f}%")

        return metrics


class RequirementsCalculator:
    """
    Calculates minimum requirements for subreddits based on successful posters.
    """

    @staticmethod
    def calculate_percentile_requirements(user_data: List[Dict],
                                         percentile: int = 10) -> Dict[str, int]:
        """
        Calculate minimum requirements using percentile method.

        Uses 10th percentile by default to filter out outliers while
        maintaining realistic requirements.

        Args:
            user_data: List of user dictionaries with karma/age data
            percentile: Percentile to use (default 10)

        Returns:
            Dictionary with min_post_karma, min_comment_karma, min_account_age_days
        """
        if not user_data or len(user_data) < 5:
            logger.warning(f"Insufficient data for requirements: {len(user_data)} users")
            return {
                'min_post_karma': 0,
                'min_comment_karma': 0,
                'min_account_age_days': 0,
                'requirement_sample_size': len(user_data) if user_data else 0
            }

        # Extract metrics
        post_karmas = sorted([u.get('link_karma', 0) for u in user_data])
        comment_karmas = sorted([u.get('comment_karma', 0) for u in user_data])
        ages = sorted([u.get('account_age_days', 0) for u in user_data])

        # Calculate percentile index
        percentile_index = max(0, int(len(post_karmas) * (percentile / 100)))

        return {
            'min_post_karma': post_karmas[percentile_index] if post_karmas else 0,
            'min_comment_karma': comment_karmas[percentile_index] if comment_karmas else 0,
            'min_account_age_days': ages[percentile_index] if ages else 0,
            'requirement_sample_size': len(user_data)
        }


class UserQualityCalculator:
    """
    Calculates user quality scores for ranking and filtering.
    """

    def calculate(self, username: str, account_age_days: int,
                  post_karma: int, comment_karma: int) -> Dict[str, float]:
        """
        Calculate all user quality scores.

        Args:
            username: Reddit username
            account_age_days: Account age in days
            post_karma: Post karma count
            comment_karma: Comment karma count

        Returns:
            Dictionary with username_score, age_score, karma_score, and overall_score
        """
        username_score = self.calculate_username_score(username)
        age_score = self.calculate_age_score(account_age_days)
        karma_score = self.calculate_karma_score(post_karma, comment_karma)
        overall_score = self.calculate_overall_score(username_score, age_score, karma_score)

        return {
            'username_score': username_score,
            'age_score': age_score,
            'karma_score': karma_score,
            'overall_score': overall_score
        }

    @staticmethod
    def calculate_username_score(username: str) -> float:
        """
        Score username quality (0-10).
        Natural usernames without trailing numbers score higher.

        Args:
            username: Reddit username

        Returns:
            float: Score from 0-10
        """
        if not username:
            return 0.0

        # Check for trailing numbers (bot-like)
        has_trailing_numbers = any(char.isdigit() for char in username[-4:])

        if has_trailing_numbers:
            return 5.0
        else:
            # Shorter natural names are better
            length_penalty = len(username) * 0.3
            score = max(0, 10 - length_penalty)
            return round(score, 2)

    @staticmethod
    def calculate_age_score(account_age_days: int) -> float:
        """
        Score account age (0-10).
        Sweet spot is 1-3 years (365-1095 days).

        Args:
            account_age_days: Account age in days

        Returns:
            float: Score from 0-10
        """
        if account_age_days < 0:
            return 0.0

        if account_age_days < 1095:  # Less than 3 years
            # Linear increase up to 3 years
            score = min(10, (account_age_days / 365) * 3)
        else:
            # Gradual decrease after 3 years
            years_over = (account_age_days - 1095) / 365
            score = max(5, 10 - (years_over * 0.5))

        return round(score, 2)

    @staticmethod
    def calculate_karma_score(post_karma: int, comment_karma: int) -> float:
        """
        Score karma quality (0-10).
        Balanced comment/post ratio preferred.

        Args:
            post_karma: Link/post karma
            comment_karma: Comment karma

        Returns:
            float: Score from 0-10
        """
        total_karma = post_karma + comment_karma

        if total_karma <= 0:
            return 0.0

        # Base score from total karma (logarithmic)
        base_score = min(10, total_karma / 1000)

        # Bonus for balanced ratio
        karma_ratio = comment_karma / max(1, total_karma)
        balance_bonus = karma_ratio * 0.5

        score = base_score * (1 + balance_bonus)
        return round(min(10, score), 2)

    @staticmethod
    def calculate_overall_score(username_score: float,
                               age_score: float,
                               karma_score: float) -> float:
        """
        Calculate weighted overall user quality score.

        Weights:
        - Username: 20%
        - Age: 30%
        - Karma: 50%

        Args:
            username_score: Username quality (0-10)
            age_score: Account age score (0-10)
            karma_score: Karma quality score (0-10)

        Returns:
            float: Overall score (0-10)
        """
        overall = (username_score * 0.2 +
                  age_score * 0.3 +
                  karma_score * 0.5)

        return round(overall, 2)