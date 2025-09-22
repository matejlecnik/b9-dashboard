#!/usr/bin/env python3
"""
Instagram Related Creators Discovery Endpoints
Discovers related creators for approved Instagram accounts
"""

import os
import json
import logging
import requests
import time
from fastapi import APIRouter, HTTPException, Request, BackgroundTasks
from pydantic import BaseModel
from typing import Optional, Dict, Any, List
from datetime import datetime, timezone
from supabase import create_client
import redis

# Import system logger
try:
    from ..utils.system_logger import system_logger, log_api_call
except ImportError:
    system_logger = None
    log_api_call = None

logger = logging.getLogger(__name__)

# Create router
router = APIRouter(prefix="/api/instagram/related-creators", tags=["instagram-related-creators"])

# Redis client for progress tracking
redis_client = None
try:
    redis_url = os.getenv("REDIS_URL", "redis://localhost:6379")
    redis_client = redis.from_url(redis_url, decode_responses=True)
except Exception as e:
    logger.warning(f"Redis connection failed: {e}")

# RapidAPI Configuration
RAPIDAPI_KEY = os.getenv("RAPIDAPI_KEY", "75f3fede68msh4ac39896fdd4ed6p185621jsn83e2bdaabc08")
RAPIDAPI_HOST = "instagram-looter2.p.rapidapi.com"

# Get Supabase client
def get_supabase():
    """Get Supabase client"""
    supabase_url = os.getenv("SUPABASE_URL")
    supabase_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

    if not supabase_url or not supabase_key:
        raise HTTPException(status_code=500, detail="Supabase not configured")

    return create_client(supabase_url, supabase_key)


class RelatedCreatorsStartRequest(BaseModel):
    """Request model for starting related creators discovery"""
    batch_size: Optional[int] = 10
    delay_seconds: Optional[int] = 2


# Global processing state
processing_state = {
    "is_running": False,
    "should_stop": False,
    "current_creator": None,
    "processed_count": 0,
    "total_count": 0,
    "new_creators_found": 0,
    "creators_with_no_related": 0,
    "errors": []
}


def get_related_profiles(user_id: str) -> Optional[List[Dict]]:
    """Get related profiles from RapidAPI"""
    try:
        url = f"https://{RAPIDAPI_HOST}/related-profiles"
        headers = {
            "x-rapidapi-key": RAPIDAPI_KEY,
            "x-rapidapi-host": RAPIDAPI_HOST
        }
        params = {"id": user_id}

        response = requests.get(url, headers=headers, params=params, timeout=30)
        if response.status_code == 200:
            data = response.json()
            if data and "data" in data and "user" in data["data"]:
                edges = data["data"]["user"].get("edge_related_profiles", {}).get("edges", [])
                return [edge["node"] for edge in edges]
        return None
    except Exception as e:
        logger.error(f"Error getting related profiles for {user_id}: {e}")
        return None


def get_user_profile(username: str) -> Optional[Dict]:
    """Get full user profile from RapidAPI"""
    try:
        url = f"https://{RAPIDAPI_HOST}/profile"
        headers = {
            "x-rapidapi-key": RAPIDAPI_KEY,
            "x-rapidapi-host": RAPIDAPI_HOST
        }
        params = {"username": username}

        response = requests.get(url, headers=headers, params=params, timeout=30)
        if response.status_code == 200:
            data = response.json()
            if data and "status" in data and data["status"]:
                return data
        return None
    except Exception as e:
        logger.error(f"Error getting profile for {username}: {e}")
        return None


def save_creator_to_db(supabase, profile_data: Dict) -> bool:
    """Save creator profile to database"""
    try:
        # Check if creator already exists
        existing = supabase.table("instagram_creators").select("id").eq("ig_user_id", profile_data.get("id")).execute()
        if existing.data:
            return False  # Already exists

        # Prepare data for insertion
        creator_data = {
            "ig_user_id": profile_data.get("id"),
            "username": profile_data.get("username"),
            "full_name": profile_data.get("full_name"),
            "fbid": profile_data.get("fbid"),
            "eimu_id": profile_data.get("eimu_id"),
            "biography": profile_data.get("biography"),
            "external_url": profile_data.get("external_url"),
            "profile_pic_url": profile_data.get("profile_pic_url"),
            "profile_pic_url_hd": profile_data.get("profile_pic_url_hd"),
            "is_business_account": profile_data.get("is_business_account", False),
            "is_professional_account": profile_data.get("is_professional_account", False),
            "is_private": profile_data.get("is_private", False),
            "is_verified": profile_data.get("is_verified", False),
            "followers": profile_data.get("edge_followed_by", {}).get("count", 0),
            "following": profile_data.get("edge_follow", {}).get("count", 0),
            "posts_count": profile_data.get("edge_owner_to_timeline_media", {}).get("count", 0),
            "highlight_reel_count": profile_data.get("highlight_reel_count", 0),
            "has_clips": profile_data.get("has_clips", False),
            "has_guides": profile_data.get("has_guides", False),
            "has_channel": profile_data.get("has_channel", False),
            "has_onboarded_to_text_post_app": profile_data.get("has_onboarded_to_text_post_app", False),
            "bio_links": profile_data.get("bio_links"),
            "raw_profile_json": profile_data,
            "review_status": None,  # NULL means unreviewed
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat(),
            "last_scraped_at": datetime.now(timezone.utc).isoformat()
        }

        # Insert into database
        result = supabase.table("instagram_creators").insert(creator_data).execute()
        return bool(result.data)
    except Exception as e:
        logger.error(f"Error saving creator to database: {e}")
        return False


def process_related_creators_batch(supabase, batch_size: int = 10, delay_seconds: int = 2):
    """Process a batch of approved creators to find related creators"""
    global processing_state

    try:
        # Get unprocessed approved creators
        result = supabase.table("instagram_creators") \
            .select("id, ig_user_id, username") \
            .eq("review_status", "ok") \
            .eq("related_creators_processed", False) \
            .limit(batch_size) \
            .execute()

        creators = result.data if result.data else []
        processing_state["total_count"] = len(creators)

        for creator in creators:
            if processing_state["should_stop"]:
                break

            processing_state["current_creator"] = creator["username"]

            # Get related profiles
            related_profiles = get_related_profiles(creator["ig_user_id"])

            if not related_profiles:
                processing_state["creators_with_no_related"] += 1
            else:
                # Process each related profile
                for profile in related_profiles:
                    if processing_state["should_stop"]:
                        break

                    username = profile.get("username")
                    if username:
                        # Get full profile info
                        full_profile = get_user_profile(username)
                        if full_profile:
                            # Save to database
                            if save_creator_to_db(supabase, full_profile):
                                processing_state["new_creators_found"] += 1

                        # Rate limiting delay
                        time.sleep(delay_seconds)

            # Mark creator as processed
            supabase.table("instagram_creators") \
                .update({"related_creators_processed": True}) \
                .eq("id", creator["id"]) \
                .execute()

            processing_state["processed_count"] += 1

            # Update Redis progress if available
            if redis_client:
                redis_client.setex(
                    "instagram:related_creators:progress",
                    300,  # 5 minutes expiry
                    json.dumps({
                        "current": processing_state["processed_count"],
                        "total": processing_state["total_count"],
                        "current_creator": processing_state["current_creator"],
                        "new_creators": processing_state["new_creators_found"],
                        "no_related": processing_state["creators_with_no_related"]
                    })
                )

        processing_state["is_running"] = False
        processing_state["current_creator"] = None

    except Exception as e:
        logger.error(f"Error processing related creators: {e}")
        processing_state["errors"].append(str(e))
        processing_state["is_running"] = False
        raise


@router.post("/start")
def start_related_creators_discovery(
    request: Request,
    params: RelatedCreatorsStartRequest,
    background_tasks: BackgroundTasks
):
    """Start discovering related creators for approved accounts"""
    global processing_state

    if processing_state["is_running"]:
        raise HTTPException(status_code=400, detail="Processing already in progress")

    try:
        supabase = get_supabase()

        # Reset state
        processing_state = {
            "is_running": True,
            "should_stop": False,
            "current_creator": None,
            "processed_count": 0,
            "total_count": 0,
            "new_creators_found": 0,
            "creators_with_no_related": 0,
            "errors": []
        }

        # Get count of unprocessed approved creators
        count_result = supabase.table("instagram_creators") \
            .select("id", count="exact") \
            .eq("review_status", "ok") \
            .eq("related_creators_processed", False) \
            .limit(1) \
            .execute()

        total_to_process = count_result.count or 0

        if total_to_process == 0:
            raise HTTPException(status_code=400, detail="No unprocessed approved creators found")

        # Start processing in background
        background_tasks.add_task(
            process_related_creators_batch,
            supabase,
            params.batch_size,
            params.delay_seconds
        )

        # Log API call
        if log_api_call:
            log_api_call(
                request=request,
                endpoint="/api/instagram/related-creators/start",
                method="POST",
                status_code=200,
                response_data={"message": "Processing started", "total": total_to_process}
            )

        return {
            "status": "started",
            "message": f"Started processing {total_to_process} approved creators",
            "total_to_process": total_to_process
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error starting related creators discovery: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/status")
def get_related_creators_status(request: Request):
    """Get current status of related creators discovery"""
    global processing_state

    try:
        # Try to get progress from Redis first
        progress_data = None
        if redis_client:
            try:
                progress_json = redis_client.get("instagram:related_creators:progress")
                if progress_json:
                    progress_data = json.loads(progress_json)
            except:
                pass

        # Use Redis data if available, otherwise use global state
        if progress_data:
            status = {
                "is_running": processing_state["is_running"],
                "current": progress_data["current"],
                "total": progress_data["total"],
                "current_creator": progress_data["current_creator"],
                "new_creators_found": progress_data["new_creators"],
                "creators_with_no_related": progress_data["no_related"],
                "errors": processing_state["errors"][-5:] if processing_state["errors"] else []
            }
        else:
            status = {
                "is_running": processing_state["is_running"],
                "current": processing_state["processed_count"],
                "total": processing_state["total_count"],
                "current_creator": processing_state["current_creator"],
                "new_creators_found": processing_state["new_creators_found"],
                "creators_with_no_related": processing_state["creators_with_no_related"],
                "errors": processing_state["errors"][-5:] if processing_state["errors"] else []
            }

        # Log API call
        if log_api_call:
            log_api_call(
                request=request,
                endpoint="/api/instagram/related-creators/status",
                method="GET",
                status_code=200,
                response_data=status
            )

        return status

    except Exception as e:
        logger.error(f"Error getting status: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/stop")
def stop_related_creators_discovery(request: Request):
    """Stop the current related creators discovery process"""
    global processing_state

    if not processing_state["is_running"]:
        raise HTTPException(status_code=400, detail="No processing in progress")

    processing_state["should_stop"] = True

    # Log API call
    if log_api_call:
        log_api_call(
            request=request,
            endpoint="/api/instagram/related-creators/stop",
            method="POST",
            status_code=200,
            response_data={"message": "Stop requested"}
        )

    return {
        "status": "stopping",
        "message": "Stop requested. Processing will halt after current creator."
    }