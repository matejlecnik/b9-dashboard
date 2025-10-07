"""
Subreddit Fetcher API
Endpoints for fetching individual subreddit data from Reddit
"""

import logging

from fastapi import APIRouter, HTTPException

from app.models.requests import SingleSubredditRequest
from app.services.subreddit_api import fetch_subreddit


logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/subreddits", tags=["subreddits"])


@router.post("/fetch-single")
async def fetch_single_subreddit(payload: SingleSubredditRequest):
    """Fetch data for a single subreddit from Reddit"""
    logger.info(f"📊 Single subreddit fetch request: {payload.subreddit_name}")

    try:
        # Clean the subreddit name
        subreddit_name = payload.subreddit_name.replace('r/', '').replace('u/', '').strip()

        if not subreddit_name:
            raise HTTPException(status_code=400, detail="Subreddit name is required")

        # Fetch the subreddit data using the fetcher
        result = fetch_subreddit(subreddit_name)

        if not result['success']:
            logger.warning(f"⚠️ Failed to fetch r/{subreddit_name}: {result.get('error')}")
            if result.get('status') == 404:
                raise HTTPException(status_code=404, detail=f"Subreddit r/{subreddit_name} not found")
            elif result.get('status') == 403:
                raise HTTPException(status_code=403, detail=f"Subreddit r/{subreddit_name} is private or banned")
            else:
                raise HTTPException(status_code=500, detail=result.get('error', 'Failed to fetch subreddit'))

        logger.info(f"✅ Successfully fetched data for r/{subreddit_name}")

        # Return just the data part for the frontend
        return result['data']

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Failed to fetch subreddit: {e!s}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to fetch subreddit: {e!s}") from e
