#!/usr/bin/env python3
"""
Instagram Reels API Test Script
Tests the reels endpoint with 2 creators to diagnose empty response issue
"""

import json
import os
import sys
import time
from datetime import datetime
from typing import Any, Dict

import requests
from dotenv import load_dotenv

from app.logging import get_logger
from app.core.database.supabase_client import get_supabase_client

# Initialize logger
supabase = get_supabase_client()
logger = get_logger(__name__, supabase_client=supabase)



# Load environment
load_dotenv()

# Test creators - 10 random creators from database
TEST_CREATORS = [
    {
        "username": "hopeannd",
        "id": "2066715880",
        "followers": 750527,
        "description": "Known to return 0 reels consistently",
    },
    {
        "username": "vismaramartina",
        "id": "2017771114",
        "followers": 8511745,
        "description": "Recent successful case (25 reels fetched)",
    },
    {
        "username": "iammarlynb",
        "id": "14071422551",
        "followers": 1385106,
        "description": "Random test creator",
    },
    {
        "username": "feeh_hanzen",
        "id": "1430983992",
        "followers": 1123489,
        "description": "Random test creator",
    },
    {
        "username": "maddiepricelol",
        "id": "51693878621",
        "followers": 881278,
        "description": "Random test creator",
    },
    {
        "username": "fabienne0805",
        "id": "49247198286",
        "followers": 484706,
        "description": "Random test creator",
    },
    {
        "username": "vega_thompson",
        "id": "18402460",
        "followers": 1140246,
        "description": "Random test creator",
    },
    {
        "username": "milasmilkies",
        "id": "3683258096",
        "followers": 597886,
        "description": "Random test creator",
    },
    {
        "username": "alice.rosenblum",
        "id": "4313473409",
        "followers": 552416,
        "description": "Random test creator",
    },
    {
        "username": "noelle_emily",
        "id": "2019743457",
        "followers": 1019529,
        "description": "Random test creator",
    },
]

# API Configuration
RAPIDAPI_KEY = os.getenv("RAPIDAPI_KEY")
RAPIDAPI_HOST = os.getenv("RAPIDAPI_HOST", "instagram-looter2.p.rapidapi.com")

HEADERS = {
    "x-rapidapi-key": RAPIDAPI_KEY,
    "x-rapidapi-host": RAPIDAPI_HOST,
    "accept": "application/json",
    "user-agent": "IGScraperTest/1.0",
}

# Endpoints
PROFILE_ENDPOINT = f"https://{RAPIDAPI_HOST}/profile"
REELS_ENDPOINT = f"https://{RAPIDAPI_HOST}/reels"
POSTS_ENDPOINT = f"https://{RAPIDAPI_HOST}/user-feeds"


def make_request(endpoint: str, params: Dict[str, Any], test_name: str) -> Dict[str, Any]:
    """Make API request and capture full response details"""
    logger.info(f"\n{'=' * 60}")
    logger.info(f"TEST: {test_name}")
    logger.info(f"Endpoint: {endpoint}")
    logger.info(f"Params: {json.dumps(params, indent=2)}")
    logger.info(f"{'=' * 60}")

    start_time = time.time()

    try:
        response = requests.get(endpoint, params=params, headers=HEADERS, timeout=30)

        elapsed = time.time() - start_time

        # Try to parse JSON
        try:
            data = response.json()
        except Exception:
            data = {"raw_text": response.text}

        result = {
            "test_name": test_name,
            "endpoint": endpoint,
            "params": params,
            "status_code": response.status_code,
            "response_time_ms": int(elapsed * 1000),
            "headers": dict(response.headers),
            "data": data,
            "success": response.status_code == 200,
        }

        # Print summary
        logger.info(f"Status Code: {response.status_code}")
        logger.info(f"Response Time: {elapsed * 1000:.0f}ms")
        logger.info(f"Content Length: {len(response.text)} bytes")

        if isinstance(data, dict):
            items = data.get("items", [])
            logger.info(f"Items Count: {len(items)}")
            if items:
                logger.info(f"First Item Keys: {list(items[0].keys())}")
            else:
                logger.warning("EMPTY ITEMS ARRAY", action="warning")
                logger.info(f"Response Keys: {list(data.keys())}")

        return result

    except Exception as e:
        elapsed = time.time() - start_time
        logger.error("ERROR: {e}", action="error")

        return {
            "test_name": test_name,
            "endpoint": endpoint,
            "params": params,
            "error": str(e),
            "response_time_ms": int(elapsed * 1000),
            "success": False,
        }


def test_creator(creator: Dict[str, Any]) -> Dict[str, Any]:
    """Run all tests for a single creator"""
    logger.info(f"\n\n{'#' * 60}")
    logger.info(f"# TESTING CREATOR: {creator['username']} ({creator['followers']:,} followers)")
    logger.info(f"# {creator['description']}")
    logger.info(f"{'#' * 60}")

    results = {"creator": creator, "tests": []}

    # Test 1: Reels (count=12, like production) - THE PROBLEM
    reels_result = make_request(
        REELS_ENDPOINT,
        {"id": creator["id"], "count": 12},
        f"Reels (count=12) - {creator['username']}",
    )
    results["tests"].append(reels_result)
    time.sleep(1)

    # Test 2: Reels (count=30, like new creators) - THE FIX
    reels_large_result = make_request(
        REELS_ENDPOINT,
        {"id": creator["id"], "count": 30},
        f"Reels (count=30) - {creator['username']}",
    )
    results["tests"].append(reels_large_result)

    return results


def generate_comparison_report(all_results: list) -> str:
    """Generate comparison report between count=12 vs count=30"""
    report = []
    report.append("\n" + "=" * 80)
    report.append("COMPARISON REPORT: count=12 vs count=30")
    report.append("=" * 80 + "\n")

    # Compare reels results count=12
    report.append("📊 REELS ENDPOINT - count=12 (PRODUCTION DEFAULT):\n")
    report.append(
        f"{'Creator':<20} {'Status':<10} {'Items':<10} {'Response Time':<15} {'Success':<10}"
    )
    report.append("-" * 80)

    for result in all_results:
        creator_name = result["creator"]["username"]
        reels_test = next(t for t in result["tests"] if "Reels (count=12)" in t["test_name"])

        status = reels_test.get("status_code", "ERROR")
        items_count = (
            len(reels_test.get("data", {}).get("items", [])) if "data" in reels_test else 0
        )
        response_time = f"{reels_test.get('response_time_ms', 0)}ms"
        success = "✅ YES" if reels_test.get("success") and items_count > 0 else "❌ NO"

        report.append(
            f"{creator_name:<20} {status:<10} {items_count:<10} {response_time:<15} {success:<10}"
        )

    # Compare reels results count=30
    report.append("\n\n📊 REELS ENDPOINT - count=30 (PROPOSED FIX):\n")
    report.append(
        f"{'Creator':<20} {'Status':<10} {'Items':<10} {'Response Time':<15} {'Success':<10}"
    )
    report.append("-" * 80)

    for result in all_results:
        creator_name = result["creator"]["username"]
        reels_test = next(t for t in result["tests"] if "Reels (count=30)" in t["test_name"])

        status = reels_test.get("status_code", "ERROR")
        items_count = (
            len(reels_test.get("data", {}).get("items", [])) if "data" in reels_test else 0
        )
        response_time = f"{reels_test.get('response_time_ms', 0)}ms"
        success = "✅ YES" if reels_test.get("success") and items_count > 0 else "❌ NO"

        report.append(
            f"{creator_name:<20} {status:<10} {items_count:<10} {response_time:<15} {success:<10}"
        )

    # Key findings
    report.append("\n\n🔍 KEY FINDINGS:\n")

    reels_12_working = sum(
        1
        for r in all_results
        for t in r["tests"]
        if "Reels (count=12)" in t["test_name"] and len(t.get("data", {}).get("items", [])) > 0
    )

    reels_30_working = sum(
        1
        for r in all_results
        for t in r["tests"]
        if "Reels (count=30)" in t["test_name"] and len(t.get("data", {}).get("items", [])) > 0
    )

    report.append(
        f"- count=12 success rate: {reels_12_working}/{len(all_results)} creators ({reels_12_working / len(all_results) * 100:.1f}%)"
    )
    report.append(
        f"- count=30 success rate: {reels_30_working}/{len(all_results)} creators ({reels_30_working / len(all_results) * 100:.1f}%)"
    )

    if reels_30_working > reels_12_working:
        improvement = reels_30_working - reels_12_working
        report.append(f"\n✅ SOLUTION CONFIRMED: count=30 works for {improvement} more creators!")
        report.append("   Recommendation: Change scraper to use count=30 instead of count=12")
    elif reels_12_working > reels_30_working:
        report.append("\n⚠️  UNEXPECTED: count=12 works better than count=30")
    else:
        report.append("\n➡️  EQUAL: Both counts have same success rate")

    return "\n".join(report)


def main():
    """Main test execution"""
    logger.info("\n" + "=" * 80)
    logger.info("INSTAGRAM REELS API DIAGNOSTIC TEST")
    logger.info("=" * 80)
    logger.info(f"Timestamp: {datetime.now().isoformat()}")
    logger.info(f"RapidAPI Host: {RAPIDAPI_HOST}")
    logger.info(f"RapidAPI Key: {'SET' if RAPIDAPI_KEY else 'MISSING'}")

    if not RAPIDAPI_KEY:
        logger.info("\n❌ ERROR: RAPIDAPI_KEY not found in environment")
        sys.exit(1)

    logger.info(f"\nTesting {len(TEST_CREATORS)} creators...")

    # Run tests for both creators
    all_results = []
    for creator in TEST_CREATORS:
        results = test_creator(creator)
        all_results.append(results)
        time.sleep(2)  # Pause between creators

    # Generate comparison report
    comparison = generate_comparison_report(all_results)
    logger.info(f"{\1}")

    # Save results to file
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    output_file = f"test_results_{timestamp}.json"

    with open(output_file, "w") as f:
        json.dump(
            {
                "timestamp": datetime.now().isoformat(),
                "test_config": {"rapidapi_host": RAPIDAPI_HOST, "test_creators": TEST_CREATORS},
                "results": all_results,
                "comparison_report": comparison,
            },
            f,
            indent=2,
        )

    logger.info(f"\n\n✅ Results saved to: {output_file}")
    logger.info("\n" + "=" * 80)
    logger.info("TEST COMPLETE")
    logger.info("=" * 80)


if __name__ == "__main__":
    main()
