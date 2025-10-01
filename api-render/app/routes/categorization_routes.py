"""
AI Categorization Routes - Tag-based subreddit categorization API endpoints
"""
from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
import logging
import os

from app.services.categorization_service_tags import TagCategorizationService
from supabase import create_client

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/categorization", tags=["ai-categorization"])

# Supabase configuration
SUPABASE_URL = os.getenv('SUPABASE_URL')
SUPABASE_SERVICE_ROLE_KEY = os.getenv('SUPABASE_SERVICE_ROLE_KEY')


# ============================================================
# REQUEST/RESPONSE MODELS
# ============================================================

class TagSubredditsRequest(BaseModel):
    """Request model for tagging subreddits"""
    limit: Optional[int] = 10
    batch_size: Optional[int] = 5
    subreddit_ids: Optional[List[int]] = None


class TagSubredditsResponse(BaseModel):
    """Response model for tag subreddits operation"""
    success: bool
    message: str
    stats: Dict[str, Any]


class StatsResponse(BaseModel):
    """Response model for categorization stats"""
    total_approved_subreddits: int
    total_tagged: int
    untagged_remaining: int
    tagging_progress_percent: float
    top_tags: Dict[str, int]
    tag_structure: Dict[str, List[str]]


# ============================================================
# HELPER: Get Categorization Service
# ============================================================

def get_categorization_service() -> TagCategorizationService:
    """Initialize and return categorization service"""
    if not SUPABASE_URL or not SUPABASE_SERVICE_ROLE_KEY:
        raise HTTPException(
            status_code=500,
            detail="Supabase configuration missing"
        )

    openai_api_key = os.getenv('OPENAI_API_KEY')
    if not openai_api_key:
        raise HTTPException(
            status_code=500,
            detail="OPENAI_API_KEY environment variable not set"
        )

    supabase = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
    return TagCategorizationService(supabase, openai_api_key)


# ============================================================
# ENDPOINTS
# ============================================================

@router.post("/tag-subreddits", response_model=TagSubredditsResponse)
async def tag_subreddits(request: Request, body: TagSubredditsRequest):
    """
    Tag untagged 'Ok' subreddits using AI categorization

    This endpoint:
    - Fetches subreddits with review='Ok' and tags IS NULL
    - Uses OpenAI GPT-5-mini to assign 1-2 relevant tags per subreddit
    - Updates both subreddit records and associated posts with tags
    - Returns stats including cost, success rate, and tag distribution

    Args:
        body: Request containing limit, batch_size, and optional subreddit_ids

    Returns:
        TagSubredditsResponse with success status, message, and detailed stats

    Example:
        POST /api/categorization/tag-subreddits
        {
            "limit": 10,
            "batch_size": 5
        }

    Cost: ~$0.01 per subreddit (GPT-5-mini pricing)
    """
    try:
        logger.info(f"🎯 Starting AI categorization: limit={body.limit}, batch_size={body.batch_size}")

        # Initialize service
        service = get_categorization_service()

        # Run categorization
        result = await service.tag_all_uncategorized(
            batch_size=body.batch_size,
            limit=body.limit,
            subreddit_ids=body.subreddit_ids
        )

        # Extract stats
        stats = result.get('stats', {})
        message = result.get('message', 'Categorization completed')

        # Determine success
        success = result.get('status') == 'completed'

        logger.info(f"✅ Categorization complete: {stats.get('successful', 0)} tagged, ${stats.get('total_cost', 0):.4f} cost")

        return TagSubredditsResponse(
            success=success,
            message=message,
            stats=stats
        )

    except Exception as e:
        logger.error(f"❌ Error in tag_subreddits: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/stats", response_model=StatsResponse)
async def get_stats(request: Request):
    """
    Get AI categorization statistics

    Returns:
        - Total approved (Ok) subreddits
        - How many are tagged
        - How many remain untagged
        - Progress percentage
        - Top 30 most-used tags
        - Complete tag structure

    Example:
        GET /api/categorization/stats
    """
    try:
        logger.info("📊 Fetching categorization stats")

        # Initialize service
        service = get_categorization_service()

        # Get stats
        stats = await service.get_tag_stats()

        return StatsResponse(**stats)

    except Exception as e:
        logger.error(f"❌ Error in get_stats: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/tags")
async def get_tags(request: Request):
    """
    Get complete tag structure

    Returns all 82 available tags organized by category:
    - niche (14 tags): cosplay, gaming, anime, fitness, etc.
    - focus (10 tags): breasts, ass, pussy, legs, etc.
    - body (9 tags): petite, slim, athletic, curvy, etc.
    - ass (4 tags): small, bubble, big, jiggly
    - breasts (7 tags): small, medium, large, natural, etc.
    - age (5 tags): college, adult, milf, mature, gilf
    - ethnicity (7 tags): asian, latina, ebony, white, etc.
    - style (12 tags): alt, goth, tattooed, lingerie, etc.
    - hair (4 tags): blonde, redhead, brunette, colored
    - special (8 tags): hairy, flexible, tall, breeding, etc.
    - content (2 tags): oc, professional

    Example:
        GET /api/categorization/tags
    """
    try:
        logger.info("🏷️  Fetching tag structure")

        # Initialize service
        service = get_categorization_service()

        # Get tag structure
        tags = service.get_all_tags()

        # Build flat list for easy reference
        flat_tags = []
        for category, values in tags.items():
            for value in values:
                flat_tags.append(f"{category}:{value}")

        return {
            "tag_structure": tags,
            "total_tags": len(flat_tags),
            "all_tags": sorted(flat_tags),
            "categories": list(tags.keys())
        }

    except Exception as e:
        logger.error(f"❌ Error in get_tags: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/health")
async def health_check(request: Request):
    """
    Health check for AI categorization service

    Verifies:
    - OpenAI API key is configured
    - Supabase connection is working

    Example:
        GET /api/categorization/health
    """
    try:
        # Check OpenAI API key
        openai_api_key = os.getenv('OPENAI_API_KEY')
        openai_configured = bool(openai_api_key)

        # Check Supabase
        supabase = get_supabase_client()
        supabase_configured = bool(supabase)

        return {
            "status": "healthy" if (openai_configured and supabase_configured) else "unhealthy",
            "openai_configured": openai_configured,
            "supabase_configured": supabase_configured,
            "model": "gpt-5-mini-2025-08-07",
            "cost_per_subreddit": "~$0.01"
        }

    except Exception as e:
        logger.error(f"❌ Error in health_check: {e}")
        raise HTTPException(status_code=500, detail=str(e))
