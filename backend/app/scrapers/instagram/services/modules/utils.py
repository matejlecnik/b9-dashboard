"""
Instagram Scraper Utilities
Pure utility functions for data transformation and extraction
"""

import re
from datetime import datetime, timezone
from typing import Dict, List, Optional


def identify_external_url_type(url: str) -> Optional[str]:
    """
    Identify the type of external URL (OnlyFans, Linktree, etc.)

    Args:
        url: The URL to classify

    Returns:
        String identifier for the URL type, or None if URL is empty
    """
    if not url:
        return None

    url_lower = url.lower()

    # Common link types for OnlyFans creators
    if "onlyfans.com" in url_lower:
        return "onlyfans"
    elif "linktr.ee" in url_lower or "linktree" in url_lower:
        return "linktree"
    elif "allmylinks" in url_lower or "all.my" in url_lower:
        return "allmylinks"
    elif "beacons.ai" in url_lower:
        return "beacons"
    elif "bio.link" in url_lower:
        return "biolink"
    elif "fans.ly" in url_lower or "fansly" in url_lower:
        return "fansly"
    elif "mym.fans" in url_lower:
        return "mym"
    elif "patreon.com" in url_lower:
        return "patreon"
    elif "cashapp" in url_lower or "cash.app" in url_lower:
        return "cashapp"
    elif "paypal" in url_lower:
        return "paypal"
    elif "twitter.com" in url_lower or "x.com" in url_lower:
        return "twitter"
    elif "youtube.com" in url_lower or "youtu.be" in url_lower:
        return "youtube"
    elif "tiktok.com" in url_lower:
        return "tiktok"
    elif "snapchat.com" in url_lower:
        return "snapchat"
    elif "telegram" in url_lower or "t.me" in url_lower:
        return "telegram"
    elif "discord" in url_lower:
        return "discord"
    else:
        # Check for personal website patterns
        if any(ext in url_lower for ext in [".com", ".net", ".org", ".io", ".co"]):
            return "personal_site"
        return "other"


def extract_bio_links(bio_data: Dict) -> List[Dict]:
    """
    Extract and parse bio links from Instagram bio data

    Args:
        bio_data: Raw bio data from Instagram API

    Returns:
        List of dicts with url, title, and type keys
    """
    bio_links = []

    try:
        # Check for bio_links array in profile data
        if bio_data and isinstance(bio_data.get("bio_links"), list):
            for link in bio_data["bio_links"]:
                if isinstance(link, dict):
                    url = link.get("url", "")
                    title = link.get("title", "")
                    link_type = identify_external_url_type(url)
                    bio_links.append({"url": url, "title": title, "type": link_type})
    except Exception:
        # Silently handle parsing errors
        pass

    return bio_links


def extract_hashtags(text: str) -> List[str]:
    """
    Extract hashtags from text

    Args:
        text: Text content to search

    Returns:
        List of hashtags (including # symbol)
    """
    hashtags = re.findall(r"#[A-Za-z0-9_]+", text)
    return hashtags


def extract_mentions(text: str) -> List[str]:
    """
    Extract mentions from text

    Args:
        text: Text content to search

    Returns:
        List of mentions (including @ symbol)
    """
    mentions = re.findall(r"@[A-Za-z0-9_.]+", text)
    return mentions


def calculate_engagement_rate(likes: int, comments: int, followers: int) -> float:
    """
    Calculate engagement rate as percentage

    Args:
        likes: Number of likes
        comments: Number of comments
        followers: Follower count

    Returns:
        Engagement rate as percentage (0-100)
    """
    if followers == 0:
        return 0
    return ((likes + comments) / followers) * 100


def to_iso(timestamp: Optional[int]) -> Optional[str]:
    """
    Convert Unix timestamp to ISO format

    Args:
        timestamp: Unix timestamp (seconds since epoch)

    Returns:
        ISO 8601 formatted timestamp string, or None if input is None
    """
    if not timestamp:
        return None
    try:
        return datetime.fromtimestamp(int(timestamp), tz=timezone.utc).isoformat()
    except Exception:
        return None
