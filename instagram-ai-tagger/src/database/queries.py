"""Database queries for Instagram AI Tagger"""
from typing import List, Dict, Any, Optional
from .client import supabase


def get_creators_for_processing(
    limit: int = 100,
    skip_existing: bool = True,
    creator_ids: Optional[List[int]] = None
) -> List[Dict[str, Any]]:
    """
    Fetch Instagram creators that need tagging.

    Args:
        limit: Max number of creators to fetch
        skip_existing: Skip creators already tagged
        creator_ids: Process specific creator IDs (overrides other filters)

    Returns:
        List of creator records
    """
    query = supabase.table('instagram_creators').select('*')

    # Filter by specific IDs if provided
    if creator_ids:
        query = query.in_('id', creator_ids)
    elif skip_existing:
        # Skip creators that already have tags
        query = query.is_('body_tags', 'null')

    query = query.limit(limit)

    result = query.execute()
    return result.data


def get_creator_by_id(creator_id: int) -> Optional[Dict[str, Any]]:
    """
    Fetch a single creator by ID.

    Args:
        creator_id: Database ID of creator

    Returns:
        Creator record or None
    """
    result = supabase.table('instagram_creators')\
        .select('*')\
        .eq('id', creator_id)\
        .execute()

    return result.data[0] if result.data else None


def get_creator_images(creator_id: str, limit: int = 10) -> List[Dict[str, Any]]:
    """
    Fetch top images for a creator (reels + posts sorted by engagement).

    Args:
        creator_id: Instagram user ID (ig_user_id)
        limit: Max images to fetch

    Returns:
        List of image URLs with metadata
    """
    images = []

    # Fetch reels (top by views)
    reels = supabase.table('instagram_reels')\
        .select('cover_url, play_count, like_count, created_at, media_pk')\
        .eq('creator_id', creator_id)\
        .order('play_count', desc=True)\
        .limit(limit // 2)\
        .execute()

    # Process reels
    for reel in reels.data:
        if reel.get('cover_url'):
            images.append({
                'url': reel['cover_url'],
                'type': 'reel',
                'engagement': reel.get('play_count', 0),
                'media_pk': reel.get('media_pk'),
                'created_at': reel.get('created_at')
            })

    # Fetch posts (top by likes)
    posts = supabase.table('instagram_posts')\
        .select('image_urls, like_count, created_at, media_pk')\
        .eq('creator_id', creator_id)\
        .order('like_count', desc=True)\
        .limit(limit // 2)\
        .execute()

    # Process posts
    for post in posts.data:
        image_urls = post.get('image_urls')
        if image_urls:
            # Handle both array and single URL
            url = image_urls[0] if isinstance(image_urls, list) else image_urls
            if url:
                images.append({
                    'url': url,
                    'type': 'post',
                    'engagement': post.get('like_count', 0),
                    'media_pk': post.get('media_pk'),
                    'created_at': post.get('created_at')
                })

    # Sort by engagement and limit
    images.sort(key=lambda x: x['engagement'], reverse=True)
    return images[:limit]


def save_creator_tags(
    creator_id: int,
    tags: List[str],
    confidence: Dict[str, float],
    features: Dict[str, Any],
    model_version: str = "1.0.0"
) -> None:
    """
    Save AI-generated tags to database.

    Args:
        creator_id: Database ID of creator
        tags: List of assigned tags
        confidence: Dict of tag -> confidence score
        features: Geometric features (ratios, measurements)
        model_version: Version of model used
    """
    # Update creator
    update_data = {
        'body_tags': tags,
        'tag_confidence': confidence,
        'tags_analyzed_at': 'now()',
        'model_version': model_version
    }

    supabase.table('instagram_creators')\
        .update(update_data)\
        .eq('id', creator_id)\
        .execute()

    # Save to history (audit trail) if table exists
    try:
        supabase.table('instagram_tag_analysis_history').insert({
            'creator_id': creator_id,
            'tags': tags,
            'confidence': confidence,
            'features': features,
            'model_version': model_version
        }).execute()
    except Exception as e:
        # History table might not exist yet
        print(f"⚠️  Could not save to history: {str(e)}")

    print(f"✅ Saved {len(tags)} tags for creator {creator_id}")


def get_creators_by_tags(
    tags: List[str],
    min_confidence: float = 0.70,
    limit: int = 50
) -> List[Dict[str, Any]]:
    """
    Query creators by tags.

    Args:
        tags: List of tags to match
        min_confidence: Minimum average confidence
        limit: Max results

    Returns:
        List of matching creators
    """
    # Note: This uses PostgreSQL JSONB operators
    # ?| checks if any of the tags exist in the array
    query = supabase.table('instagram_creators')\
        .select('id, username, profile_pic_url, followers, body_tags, tag_confidence')\
        .filter('body_tags', 'ov', tags)\
        .limit(limit)

    result = query.execute()

    # Filter by confidence (done in Python since Supabase doesn't support complex JSONB aggregations easily)
    filtered = []
    for creator in result.data:
        if creator.get('tag_confidence'):
            avg_conf = sum(creator['tag_confidence'].values()) / len(creator['tag_confidence'])
            if avg_conf >= min_confidence:
                filtered.append(creator)

    return filtered


def get_tagging_stats() -> Dict[str, Any]:
    """
    Get statistics about tagged creators.

    Returns:
        Dict with stats
    """
    # Total creators
    total = supabase.table('instagram_creators').select('id', count='exact').execute()
    total_count = total.count

    # Tagged creators
    tagged = supabase.table('instagram_creators')\
        .select('id', count='exact')\
        .not_.is_('body_tags', 'null')\
        .execute()
    tagged_count = tagged.count

    return {
        'total_creators': total_count,
        'tagged_creators': tagged_count,
        'untagged_creators': total_count - tagged_count,
        'completion_percentage': (tagged_count / total_count * 100) if total_count > 0 else 0
    }


def get_calibration_dataset() -> List[Dict[str, Any]]:
    """
    Fetch manually labeled images for calibration.

    Returns:
        List of labeled images (if calibration table exists)
    """
    try:
        result = supabase.table('instagram_tag_calibration')\
            .select('*')\
            .execute()
        return result.data
    except Exception:
        print("⚠️  Calibration table does not exist yet")
        return []
