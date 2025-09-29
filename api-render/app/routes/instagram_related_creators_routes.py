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

# Import system logger
try:
    from ..utils.system_logger import system_logger, log_api_call
except ImportError:
    system_logger = None
    log_api_call = None

logger = logging.getLogger(__name__)

# Create router
router = APIRouter(prefix="/api/instagram/related-creators", tags=["instagram-related-creators"])

# Progress tracking is done in-memory since scripts run on Render

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
    "errors": []
}


def get_related_profiles(user_id: str, supabase=None) -> Optional[List[Dict]]:
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
        else:
            # Log API error
            if supabase:
                supabase.table('system_logs').insert({
                    'timestamp': datetime.now(timezone.utc).isoformat(),
                    'source': 'instagram_related_creators',
                    'script_name': 'instagram_related_creators_routes',
                    'level': 'error',
                    'message': f'API error getting related profiles: {response.status_code}',
                    'context': {
                        'action': 'api_error',
                        'endpoint': 'related-profiles',
                        'user_id': user_id,
                        'status_code': response.status_code
                    }
                }).execute()
        return None
    except Exception as e:
        logger.error(f"Error getting related profiles for {user_id}: {e}")
        # Log exception
        if supabase:
            supabase.table('system_logs').insert({
                'timestamp': datetime.now(timezone.utc).isoformat(),
                'source': 'instagram_related_creators',
                'script_name': 'instagram_related_creators_routes',
                'level': 'error',
                'message': f'Exception getting related profiles: {str(e)}',
                'context': {
                    'action': 'api_exception',
                    'endpoint': 'related-profiles',
                    'user_id': user_id,
                    'error': str(e)
                }
            }).execute()
        return None


def get_user_profile(username: str, supabase=None) -> Optional[Dict]:
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
        else:
            # Log API error
            if supabase:
                supabase.table('system_logs').insert({
                    'timestamp': datetime.now(timezone.utc).isoformat(),
                    'source': 'instagram_related_creators',
                    'script_name': 'instagram_related_creators_routes',
                    'level': 'error',
                    'message': f'API error getting user profile: {response.status_code}',
                    'context': {
                        'action': 'api_error',
                        'endpoint': 'profile',
                        'username': username,
                        'status_code': response.status_code
                    }
                }).execute()
        return None
    except Exception as e:
        logger.error(f"Error getting profile for {username}: {e}")
        # Log exception
        if supabase:
            supabase.table('system_logs').insert({
                'timestamp': datetime.now(timezone.utc).isoformat(),
                'source': 'instagram_related_creators',
                'script_name': 'instagram_related_creators_routes',
                'level': 'error',
                'message': f'Exception getting user profile: {str(e)}',
                'context': {
                    'action': 'api_exception',
                    'endpoint': 'profile',
                    'username': username,
                    'error': str(e)
                }
            }).execute()
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
    start_time = time.time()

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

        # Log process start
        supabase.table('system_logs').insert({
            'timestamp': datetime.now(timezone.utc).isoformat(),
            'source': 'instagram_related_creators',
            'script_name': 'instagram_related_creators_routes',
            'level': 'info',
            'message': f'Started processing {len(creators)} approved creators',
            'context': {
                'action': 'process_start',
                'batch_size': batch_size,
                'delay_seconds': delay_seconds,
                'total_creators': len(creators)
            }
        }).execute()

        for creator in creators:
            if processing_state["should_stop"]:
                break

            processing_state["current_creator"] = creator["username"]
            creator_start_time = time.time()

            # Log starting to process creator
            supabase.table('system_logs').insert({
                'timestamp': datetime.now(timezone.utc).isoformat(),
                'source': 'instagram_related_creators',
                'script_name': 'instagram_related_creators_routes',
                'level': 'info',
                'message': f'Processing creator: {creator["username"]}',
                'context': {
                    'action': 'process_creator',
                    'creator': creator["username"],
                    'ig_user_id': creator["ig_user_id"]
                }
            }).execute()

            # Get related profiles
            related_profiles = get_related_profiles(creator["ig_user_id"], supabase)

            if not related_profiles:
                # No related creators found - already logged above

                # Log no related profiles found
                supabase.table('system_logs').insert({
                    'timestamp': datetime.now(timezone.utc).isoformat(),
                    'source': 'instagram_related_creators',
                    'script_name': 'instagram_related_creators_routes',
                    'level': 'warning',
                    'message': f'No related profiles found for {creator["username"]}',
                    'context': {
                        'action': 'no_related_found',
                        'creator': creator["username"]
                    }
                }).execute()
            else:
                # Process each related profile
                for profile in related_profiles:
                    if processing_state["should_stop"]:
                        break

                    username = profile.get("username")
                    if username:
                        # Get full profile info
                        full_profile = get_user_profile(username, supabase)
                        if full_profile:
                            # Save to database
                            if save_creator_to_db(supabase, full_profile):
                                processing_state["new_creators_found"] += 1

                                # Log new creator saved
                                supabase.table('system_logs').insert({
                                    'timestamp': datetime.now(timezone.utc).isoformat(),
                                    'source': 'instagram_related_creators',
                                    'script_name': 'instagram_related_creators_routes',
                                    'level': 'info',
                                    'message': f'New creator discovered: {username}',
                                    'context': {
                                        'action': 'creator_saved',
                                        'new_creator': username,
                                        'source_creator': creator["username"],
                                        'followers': full_profile.get('edge_followed_by', {}).get('count', 0)
                                    }
                                }).execute()

                        # Rate limiting delay
                        time.sleep(delay_seconds)

            # Mark creator as processed
            supabase.table("instagram_creators") \
                .update({"related_creators_processed": True}) \
                .eq("id", creator["id"]) \
                .execute()

            processing_state["processed_count"] += 1

            # Log creator processing completed
            creator_duration = int((time.time() - creator_start_time) * 1000)
            related_count = len(related_profiles) if related_profiles else 0

            supabase.table('system_logs').insert({
                'timestamp': datetime.now(timezone.utc).isoformat(),
                'source': 'instagram_related_creators',
                'script_name': 'instagram_related_creators_routes',
                'level': 'info',
                'message': f'Completed processing {creator["username"]} - found {related_count} related profiles',
                'context': {
                    'action': 'creator_completed',
                    'creator': creator["username"],
                    'related_profiles_count': related_count
                },
                'duration_ms': creator_duration
            }).execute()

        processing_state["is_running"] = False
        processing_state["current_creator"] = None

        # Log process completion
        total_duration = int((time.time() - start_time) * 1000)
        supabase.table('system_logs').insert({
            'timestamp': datetime.now(timezone.utc).isoformat(),
            'source': 'instagram_related_creators',
            'script_name': 'instagram_related_creators_routes',
            'level': 'info',
            'message': f'Completed batch processing - processed {processing_state["processed_count"]} creators, found {processing_state["new_creators_found"]} new creators',
            'context': {
                'action': 'process_completed',
                'creators_processed': processing_state["processed_count"],
                'new_creators_found': processing_state["new_creators_found"]
            },
            'duration_ms': total_duration,
            'items_processed': processing_state["processed_count"]
        }).execute()

    except Exception as e:
        logger.error(f"Error processing related creators: {e}")
        processing_state["errors"].append(str(e))
        processing_state["is_running"] = False

        # Log error
        supabase.table('system_logs').insert({
            'timestamp': datetime.now(timezone.utc).isoformat(),
            'source': 'instagram_related_creators',
            'script_name': 'instagram_related_creators_routes',
            'level': 'error',
            'message': f'Error in batch processing: {str(e)}',
            'context': {
                'action': 'process_error',
                'error': str(e),
                'current_creator': processing_state.get("current_creator"),
                'processed_count': processing_state.get("processed_count", 0)
            }
        }).execute()

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


@router.get("/unprocessed-count")
def get_unprocessed_count(request: Request):
    """Get count of unprocessed approved creators"""
    try:
        supabase = get_supabase()

        # Get count of unprocessed approved creators
        result = supabase.table("instagram_creators") \
            .select("id", count="exact") \
            .eq("review_status", "ok") \
            .eq("related_creators_processed", False) \
            .limit(1) \
            .execute()

        count = result.count or 0

        # Log API call
        if log_api_call:
            log_api_call(
                request=request,
                endpoint="/api/instagram/related-creators/unprocessed-count",
                method="GET",
                status_code=200,
                response_data={"count": count}
            )

        return {"count": count}

    except Exception as e:
        logger.error(f"Error getting unprocessed count: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/status")
def get_related_creators_status(request: Request):
    """Get current status of related creators discovery"""
    global processing_state

    try:
        # Return the in-memory processing state
        status = {
            "is_running": processing_state["is_running"],
            "current": processing_state["processed_count"],
            "total": processing_state["total_count"],
            "current_creator": processing_state["current_creator"],
            "new_creators_found": processing_state["new_creators_found"],
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