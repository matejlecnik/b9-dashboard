"""
System Statistics API
Endpoint for retrieving comprehensive system statistics
"""

import logging
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, HTTPException

from app.services.ai_categorizer import TagCategorizationService


logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api", tags=["stats"])

# Global service reference (set during startup)
tag_categorization_service: Optional[TagCategorizationService] = None


def set_categorization_service(service: TagCategorizationService):
    """Set the categorization service instance"""
    global tag_categorization_service
    tag_categorization_service = service


@router.get("/stats")
async def get_system_stats():
    """Get comprehensive system statistics"""
    try:
        stats = {}

        # Gather stats from all services
        if tag_categorization_service:
            stats["categorization"] = await tag_categorization_service.get_tag_stats()

        # Scraper stats can be fetched from Supabase logs directly if needed
        stats["scraper"] = {"status": "Use /api/scraper/status endpoint for details"}

        result = {
            "status": "success",
            "stats": stats,
            "timestamp": datetime.now().isoformat()
        }

        return result

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e)) from e
