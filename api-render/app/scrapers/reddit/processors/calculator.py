"""
User Quality Score Calculator
Calculates quality scores for Reddit users based on username, age, and karma
"""
import re
from typing import Dict


class UserQualityCalculator:
    """Calculate quality scores for Reddit users"""

    def calculate(self, username: str, account_age_days: int,
                  post_karma: int, comment_karma: int) -> Dict[str, float]:
        """
        Calculate user quality scores

        Args:
            username: Reddit username
            account_age_days: Account age in days
            post_karma: Link/post karma
            comment_karma: Comment karma

        Returns:
            Dict with username_score, age_score, karma_score, overall_score
        """
        username_score = self._calculate_username_score(username)
        age_score = self._calculate_age_score(account_age_days)
        karma_score = self._calculate_karma_score(post_karma, comment_karma)

        # Overall score is weighted average
        overall_score = round(
            (username_score * 0.2) + (age_score * 0.3) + (karma_score * 0.5),
            2
        )

        return {
            'username_score': round(username_score, 2),
            'age_score': round(age_score, 2),
            'karma_score': round(karma_score, 2),
            'overall_score': overall_score
        }

    def _calculate_username_score(self, username: str) -> float:
        """
        Score username quality (0-100)
        Lower score for suspicious patterns (numbers, underscores, etc.)
        """
        score = 100.0

        # Penalize numbers
        num_count = sum(c.isdigit() for c in username)
        score -= min(num_count * 5, 30)

        # Penalize underscores
        underscore_count = username.count('_')
        score -= min(underscore_count * 10, 20)

        # Penalize very short usernames
        if len(username) < 4:
            score -= 20

        # Bonus for reasonable length (6-15 chars)
        if 6 <= len(username) <= 15:
            score += 10

        return max(0, min(score, 100))

    def _calculate_age_score(self, account_age_days: int) -> float:
        """
        Score account age (0-100)
        Higher score for older accounts
        """
        if account_age_days < 30:
            return 20.0
        elif account_age_days < 90:
            return 40.0
        elif account_age_days < 180:
            return 60.0
        elif account_age_days < 365:
            return 80.0
        else:
            return 100.0

    def _calculate_karma_score(self, post_karma: int, comment_karma: int) -> float:
        """
        Score karma (0-100)
        Higher score for more karma
        """
        total_karma = post_karma + comment_karma

        if total_karma < 100:
            return 20.0
        elif total_karma < 500:
            return 40.0
        elif total_karma < 1000:
            return 60.0
        elif total_karma < 5000:
            return 80.0
        else:
            return 100.0
