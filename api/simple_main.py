#!/usr/bin/env python3
"""
Simplified B9 Dashboard API for local testing
Provides basic categorization endpoints without complex dependencies
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
import time
from dotenv import load_dotenv

load_dotenv()

app = FastAPI(title="B9 Dashboard API (Simple)", version="1.0.0")

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class CategorizationRequest(BaseModel):
    batchSize: int = 30
    limit: Optional[int] = None
    subredditIds: Optional[List[int]] = None

@app.get("/")
async def root():
    return {"message": "B9 Dashboard API (Simple)", "status": "running", "time": time.time()}

@app.get("/api/health")
async def health():
    return {"status": "healthy", "service": "categorization", "timestamp": time.time()}

@app.post("/api/categorization/start")
async def start_categorization(request: CategorizationRequest):
    """Simulate AI categorization job start"""
    batch_size = request.batchSize or 30
    subreddits_to_process = 50  # Simulated count
    
    # Simulate processing time estimation
    estimated_cost = round((subreddits_to_process / 1000) * 2.5, 3)  # $2.50 per 1k items
    job_id = f"job_{int(time.time())}"
    
    return {
        "success": True,
        "message": "AI categorization job started successfully",
        "job_id": job_id,
        "subreddits_to_process": subreddits_to_process,
        "batch_size": batch_size,
        "estimated_cost": estimated_cost,
        "estimated_time_minutes": subreddits_to_process // batch_size * 2,
        "status": "started"
    }

@app.get("/api/categorization/stats")
async def get_categorization_stats():
    """Return categorization statistics"""
    return {
        "success": True,
        "uncategorized_count": 125,
        "categorized_count": 300,
        "total_subreddits": 425,
        "categories": [
            "Ass & Booty", "Body Types & Features", "Lingerie & Underwear",
            "Clothed & Dressed", "Feet & Foot Fetish", "Selfie & Amateur",
            "Goth & Alternative", "Lifestyle & Themes", "Cosplay & Fantasy",
            "Ethnic & Cultural", "Onlyfans Promotion", "Age Demographics",
            "Boobs & Chest", "Full Body & Nude", "Gym & Fitness",
            "Interactive & Personalized"
        ],
        "last_categorization": "2025-09-11T20:00:00Z"
    }

@app.get("/api/categorization/categories")
async def get_categories():
    """Return available categories for categorization"""
    return {
        "success": True,
        "categories": [
            "Ass & Booty", "Body Types & Features", "Lingerie & Underwear",
            "Clothed & Dressed", "Feet & Foot Fetish", "Selfie & Amateur",
            "Goth & Alternative", "Lifestyle & Themes", "Cosplay & Fantasy",
            "Ethnic & Cultural", "Onlyfans Promotion", "Age Demographics",
            "Boobs & Chest", "Full Body & Nude", "Gym & Fitness",
            "Interactive & Personalized"
        ]
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("simple_main:app", host="0.0.0.0", port=8000, reload=True)