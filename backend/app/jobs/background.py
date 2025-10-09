"""
Background Job Management API
Endpoints for managing background jobs (replaces Celery functionality)
"""

import json
import time
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from supabase import Client

from app.core.database import get_db

# Use unified logger
from app.logging import get_logger
from app.models.requests import BackgroundJobRequest


logger = get_logger(__name__)

router = APIRouter(prefix="/api/jobs", tags=["jobs"])


@router.post("/start")
async def start_background_job(job_request: BackgroundJobRequest, db: Client = Depends(get_db)):
    """Start a background job (replaces Celery functionality)"""
    try:
        # Generate job ID
        job_id = f"job_{int(time.time() * 1000)}"

        # Create job record
        job_data = {
            "job_id": job_id,
            "job_type": job_request.job_type,
            "status": "pending",
            "parameters": job_request.parameters,
            "priority": job_request.priority,
            "created_at": datetime.now().isoformat(),
            "started_at": None,
            "completed_at": None,
            "result": None,
            "error_message": None,
        }

        # Save to database using singleton
        db.table("background_jobs").insert(job_data).execute()

        return {
            "job_id": job_id,
            "status": "queued",
            "message": f"Background job {job_request.job_type} queued successfully",
            "parameters": job_request.parameters,
        }

    except Exception as e:
        logger.error(f"Failed to start background job: {e}")
        raise HTTPException(status_code=500, detail=str(e)) from e


@router.get("/{job_id}")
async def get_job_status(job_id: str, db: Client = Depends(get_db)):
    """Get background job status"""
    try:
        response = db.table("background_jobs").select("*").eq("job_id", job_id).execute()

        if not response.data:
            raise HTTPException(status_code=404, detail="Job not found")

        job_data = response.data[0]

        # Parse result if it's JSON string
        result = job_data.get("result")
        if isinstance(result, str):
            from contextlib import suppress

            with suppress(json.JSONDecodeError):
                result = json.loads(result)

        return {
            "job_id": job_id,
            "status": job_data["status"],
            "job_type": job_data["job_type"],
            "created_at": job_data["created_at"],
            "started_at": job_data.get("started_at"),
            "completed_at": job_data.get("completed_at"),
            "result": result,
            "error_message": job_data.get("error_message"),
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get job status: {e}")
        raise HTTPException(status_code=500, detail=str(e)) from e
