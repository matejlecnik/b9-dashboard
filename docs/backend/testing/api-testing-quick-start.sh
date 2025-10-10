#!/bin/bash
# B9 Dashboard API - Quick Test Execution Script
# This script sets up the testing environment and provides helper functions
#
# Usage:
#   1. Review API_TESTING_EXECUTION_PLAN.md for full details
#   2. Source this script: source API_TESTING_QUICK_START.sh
#   3. Execute test phases manually following the plan
#
# DO NOT RUN THIS SCRIPT DIRECTLY - It's meant to be sourced for helper functions

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Base URL
API_URL="http://91.98.91.129:10000"
CRON_SECRET="B9Dashboard2025SecureCron!"

# Create test directory and log file
setup_test_env() {
    echo -e "${BLUE}Setting up test environment...${NC}"

    mkdir -p ~/b9_test_results
    cd ~/b9_test_results

    export TEST_LOG="api_test_$(date +%Y%m%d_%H%M%S).log"
    touch "$TEST_LOG"

    echo "B9 Dashboard API Testing - $(date)" | tee -a "$TEST_LOG"
    echo "Production URL: $API_URL" | tee -a "$TEST_LOG"
    echo "========================================" | tee -a "$TEST_LOG"
    echo "" | tee -a "$TEST_LOG"

    echo -e "${GREEN}✓ Test environment ready${NC}"
    echo -e "${GREEN}✓ Log file: ~/b9_test_results/$TEST_LOG${NC}"
    echo ""
}

# Helper function to make GET requests
api_get() {
    local endpoint="$1"
    local label="$2"

    if [ -n "$label" ]; then
        echo -e "${BLUE}Testing: $label${NC}"
        echo "=== $label ===" >> "$TEST_LOG"
    fi

    curl -s "$API_URL$endpoint" | jq . | tee -a "$TEST_LOG"
    echo "" >> "$TEST_LOG"
}

# Helper function to make POST requests
api_post() {
    local endpoint="$1"
    local data="$2"
    local label="$3"

    if [ -n "$label" ]; then
        echo -e "${BLUE}Testing: $label${NC}"
        echo "=== $label ===" >> "$TEST_LOG"
    fi

    if [ -n "$data" ]; then
        curl -s -X POST "$API_URL$endpoint" \
            -H "Content-Type: application/json" \
            -d "$data" | jq . | tee -a "$TEST_LOG"
    else
        curl -s -X POST "$API_URL$endpoint" | jq . | tee -a "$TEST_LOG"
    fi

    echo "" >> "$TEST_LOG"
}

# Helper function for authenticated cron requests
api_cron() {
    local endpoint="$1"
    local params="$2"
    local label="$3"

    if [ -n "$label" ]; then
        echo -e "${BLUE}Testing: $label${NC}"
        echo "=== $label ===" >> "$TEST_LOG"
    fi

    if [ -n "$params" ]; then
        curl -s -X POST "$API_URL/api/cron/$endpoint?$params" \
            -H "Authorization: Bearer $CRON_SECRET" | jq . | tee -a "$TEST_LOG"
    else
        curl -s -X POST "$API_URL/api/cron/$endpoint" \
            -H "Authorization: Bearer $CRON_SECRET" | jq . | tee -a "$TEST_LOG"
    fi

    echo "" >> "$TEST_LOG"
}

# Quick health check
quick_health() {
    echo -e "${BLUE}Running quick health check...${NC}"
    echo ""

    echo -e "${YELLOW}System Health:${NC}"
    api_get "/health"

    echo -e "${YELLOW}System Stats:${NC}"
    api_get "/api/stats"

    echo -e "${GREEN}✓ Health check complete${NC}"
}

# Check all scraper statuses
check_scrapers() {
    echo -e "${BLUE}Checking all scraper statuses...${NC}"
    echo ""

    echo -e "${YELLOW}Reddit Scraper:${NC}"
    api_get "/api/reddit/scraper/status" | jq '.system_health.scraper'

    echo -e "${YELLOW}Instagram Scraper:${NC}"
    api_get "/api/instagram/scraper/status" | jq '.system_health.scraper'

    echo -e "${YELLOW}Related Creators Discovery:${NC}"
    api_get "/api/instagram/related-creators/status" | jq '.is_running'

    echo ""
    echo -e "${GREEN}✓ Scraper status check complete${NC}"
}

# Start Reddit scraper
start_reddit() {
    echo -e "${YELLOW}⚠️  Starting Reddit scraper...${NC}"
    api_post "/api/reddit/scraper/start" "" "Start Reddit Scraper"
    sleep 5
    api_get "/api/reddit/scraper/status" "Verify Reddit Scraper Status"
}

# Stop Reddit scraper
stop_reddit() {
    echo -e "${YELLOW}⚠️  Stopping Reddit scraper...${NC}"
    api_post "/api/reddit/scraper/stop" "" "Stop Reddit Scraper"
    sleep 5
    api_get "/api/reddit/scraper/status" "Verify Reddit Scraper Stopped"
}

# Start Instagram scraper
start_instagram() {
    echo -e "${RED}⚠️  WARNING: This will process ALL 'ok' creators!${NC}"
    echo -e "${RED}⚠️  Cost depends on number of creators (~\$0.00036 each)${NC}"
    read -p "Press ENTER to continue or Ctrl+C to cancel: "

    api_post "/api/instagram/scraper/start" "" "Start Instagram Scraper"
    sleep 5
    api_get "/api/instagram/scraper/status" "Verify Instagram Scraper Status"
}

# Stop Instagram scraper
stop_instagram() {
    echo -e "${YELLOW}⚠️  Stopping Instagram scraper...${NC}"
    api_post "/api/instagram/scraper/stop" "" "Stop Instagram Scraper"
    sleep 5
    api_get "/api/instagram/scraper/status" "Verify Instagram Scraper Stopped"
}

# Add Instagram creator
add_creator() {
    local username="$1"
    local niche="$2"

    if [ -z "$username" ]; then
        echo -e "${RED}Error: Username required${NC}"
        echo "Usage: add_creator <username> [niche]"
        return 1
    fi

    echo -e "${YELLOW}⚠️  Adding creator: @$username (Cost: ~\$0.00036)${NC}"

    local data="{\"username\":\"$username\""
    if [ -n "$niche" ]; then
        data="$data,\"niche\":\"$niche\""
    fi
    data="$data}"

    api_post "/api/instagram/creator/add" "$data" "Add Creator: @$username"
}

# Show usage information
show_usage() {
    echo ""
    echo -e "${GREEN}=== B9 Dashboard API Testing Helper ===${NC}"
    echo ""
    echo -e "${BLUE}Setup:${NC}"
    echo "  setup_test_env              - Initialize test environment"
    echo ""
    echo -e "${BLUE}Quick Checks:${NC}"
    echo "  quick_health                - Run basic health checks"
    echo "  check_scrapers              - Check all scraper statuses"
    echo ""
    echo -e "${BLUE}Reddit Scraper:${NC}"
    echo "  start_reddit                - Start Reddit scraper"
    echo "  stop_reddit                 - Stop Reddit scraper"
    echo "  api_get '/api/reddit/scraper/reddit-api-stats' - Check Reddit API usage"
    echo ""
    echo -e "${BLUE}Instagram Scraper:${NC}"
    echo "  start_instagram             - Start Instagram scraper ⚠️ Processes all creators"
    echo "  stop_instagram              - Stop Instagram scraper"
    echo "  api_get '/api/instagram/scraper/cost-metrics' - Check costs"
    echo ""
    echo -e "${BLUE}Instagram Creator Addition:${NC}"
    echo "  add_creator <username> [niche] - Add a creator ⚠️ Costs ~\$0.00036"
    echo "  Example: add_creator nasa 'Science'"
    echo ""
    echo -e "${BLUE}Low-Level API Calls:${NC}"
    echo "  api_get <endpoint> [label]  - Make GET request"
    echo "  api_post <endpoint> [data] [label] - Make POST request"
    echo "  api_cron <endpoint> [params] [label] - Make authenticated cron request"
    echo ""
    echo -e "${BLUE}Examples:${NC}"
    echo "  api_get '/api/stats' 'System Stats'"
    echo "  api_post '/api/reddit/scraper/start' '' 'Start Scraper'"
    echo "  api_cron 'cleanup-logs' 'dry_run=true' 'Dry Run Cleanup'"
    echo ""
    echo -e "${YELLOW}For full testing plan, see: API_TESTING_EXECUTION_PLAN.md${NC}"
    echo ""
}

# Auto-run setup when sourced
if [ -z "$TEST_LOG" ]; then
    setup_test_env
    show_usage
else
    echo -e "${GREEN}✓ Test environment already initialized${NC}"
    echo -e "${GREEN}✓ Log file: ~/b9_test_results/$TEST_LOG${NC}"
    echo ""
    echo -e "${BLUE}Type 'show_usage' for available commands${NC}"
    echo ""
fi
