# 🧪 B9 Dashboard API - Complete Testing Execution Plan

**Date:** 2025-10-09
**Environment:** Production (Hetzner)
**Base URL:** http://91.98.91.129:10000
**Estimated Duration:** 2.5 hours
**Estimated Cost:** ~$0.034

---

## 📋 EXECUTIVE SUMMARY

This document provides a **step-by-step testing plan** to validate all 38+ API endpoints in production. Each test includes:
- **Exact curl commands** to execute
- **Expected results** for validation
- **Success criteria** to verify functionality
- **Cost tracking** for paid operations
- **Safety measures** to prevent issues

### What This Plan Tests

| Category | Endpoints | Key Operations |
|----------|-----------|----------------|
| **Health & Monitoring** | 4 | System health, stats, docs |
| **Reddit Scraper** | 6 | Start/stop, status, monitoring |
| **Instagram Creator Addition** | 2 | Add creators, validation |
| **Instagram Scraper** | 7 | Start/stop, status, cost tracking |
| **Related Creators Discovery** | 3 | Auto-discovery, monitoring |
| **AI Categorization** | 4 | Tag subreddits, stats |
| **Cron Jobs** | 3 | Log cleanup, CDN migration |
| **TOTAL** | **29+** | Full system validation |

---

## 🎯 PRE-TEST PREPARATION

### Step 1: Create Test Environment

```bash
# Create test results directory
mkdir -p ~/b9_test_results
cd ~/b9_test_results

# Create test log file
TEST_LOG="api_test_$(date +%Y%m%d_%H%M%S).log"
touch $TEST_LOG

echo "B9 Dashboard API Testing - $(date)" | tee -a $TEST_LOG
echo "Production URL: http://91.98.91.129:10000" | tee -a $TEST_LOG
echo "========================================" | tee -a $TEST_LOG
echo "" | tee -a $TEST_LOG
```

### Step 2: Verify Production Access

```bash
echo "=== INITIAL HEALTH CHECK ===" | tee -a $TEST_LOG

# Test 1: Basic connectivity
curl -w "\nHTTP Status: %{http_code}\nTime: %{time_total}s\n" \
  http://91.98.91.129:10000/health | tee -a $TEST_LOG

# Expected:
# - HTTP Status: 200
# - status: "healthy"
# - supabase: healthy
# - openai: healthy

echo "" | tee -a $TEST_LOG
```

### Step 3: Record Baseline Metrics

```bash
echo "=== BASELINE METRICS ===" | tee -a $TEST_LOG

# Record timestamp
BASELINE_TIME=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
echo "Test started: $BASELINE_TIME" | tee -a $TEST_LOG

# Reddit API calls
echo "Reddit API Stats:" | tee -a $TEST_LOG
curl -s http://91.98.91.129:10000/api/reddit/scraper/reddit-api-stats | \
  jq '{daily_calls, daily_limit, remaining}' | tee -a $TEST_LOG

# Instagram API calls
echo "" >> $TEST_LOG
echo "Instagram API Stats:" | tee -a $TEST_LOG
curl -s http://91.98.91.129:10000/api/instagram/scraper/cost-metrics | \
  jq '.metrics | {api_calls_today, daily_cost, projected_monthly_cost}' | tee -a $TEST_LOG

echo "" | tee -a $TEST_LOG
echo "========================================" | tee -a $TEST_LOG
echo "" | tee -a $TEST_LOG
```

---

## 🔍 PHASE 1: CORE HEALTH & MONITORING (15 minutes)

### Test 1.1: Root Endpoint

```bash
echo "PHASE 1.1: Root Endpoint" | tee -a $TEST_LOG
echo "--------------------" | tee -a $TEST_LOG

curl -w "\nHTTP Status: %{http_code}\n" \
  http://91.98.91.129:10000/ | jq . | tee -a $TEST_LOG

echo "" | tee -a $TEST_LOG
```

**✓ Expected Results:**
- HTTP Status: 200
- service: "B9 Dashboard API"
- version: "3.7.0"
- status: "operational"
- environment: "production"

### Test 1.2: System Health

```bash
echo "PHASE 1.2: System Health" | tee -a $TEST_LOG
echo "--------------------" | tee -a $TEST_LOG

curl http://91.98.91.129:10000/health | jq . | tee -a $TEST_LOG

echo "" | tee -a $TEST_LOG
```

**✓ Expected Results:**
- status: "healthy"
- dependencies.supabase.status: "healthy"
- dependencies.openai.status: "healthy"
- uptime_seconds: >0

### Test 1.3: System Stats

```bash
echo "PHASE 1.3: System Stats" | tee -a $TEST_LOG
echo "--------------------" | tee -a $TEST_LOG

curl http://91.98.91.129:10000/api/stats | jq . | tee -a $TEST_LOG

echo "" | tee -a $TEST_LOG
```

**✓ Expected Results:**
- subreddits.total: 2155
- subreddits.tagged: 2155
- instagram_creators.total: >400
- Tag structure present

### Phase 1 Success Criteria

- [ ] All endpoints return HTTP 200
- [ ] Response times <500ms
- [ ] Database shows healthy
- [ ] Baseline data matches expected values

---

## 🔴 PHASE 2: REDDIT SCRAPER CONTROL (20 minutes)

### Test 2.1: Reddit Scraper Initial Status

```bash
echo "PHASE 2.1: Reddit Scraper Initial Status" | tee -a $TEST_LOG
echo "--------------------" | tee -a $TEST_LOG

# Basic status
curl http://91.98.91.129:10000/api/reddit/scraper/status | jq . | tee -a $TEST_LOG
echo "" >> $TEST_LOG

# Health check
curl http://91.98.91.129:10000/api/reddit/scraper/health | jq . | tee -a $TEST_LOG
echo "" >> $TEST_LOG

# API stats
curl http://91.98.91.129:10000/api/reddit/scraper/reddit-api-stats | jq . | tee -a $TEST_LOG

echo "" | tee -a $TEST_LOG
```

**Record:** enabled=?, status=?, pid=?

### Test 2.2: Start Reddit Scraper ⚠️

```bash
echo "PHASE 2.2: START REDDIT SCRAPER" | tee -a $TEST_LOG
echo "--------------------" | tee -a $TEST_LOG
echo "⚠️  This will start the Reddit scraper and fetch subreddit data" | tee -a $TEST_LOG

curl -X POST http://91.98.91.129:10000/api/reddit/scraper/start | jq . | tee -a $TEST_LOG

echo "" >> $TEST_LOG
echo "Waiting 30 seconds for initialization..." | tee -a $TEST_LOG
sleep 30

echo "" | tee -a $TEST_LOG
```

**✓ Expected Results:**
- success: true
- message: "Reddit scraper ... started successfully"
- status: "running"
- pid: <process_id>

### Test 2.3: Verify Scraper Running

```bash
echo "PHASE 2.3: Verify Scraper Running" | tee -a $TEST_LOG
echo "--------------------" | tee -a $TEST_LOG

# Check status
curl http://91.98.91.129:10000/api/reddit/scraper/status | \
  jq '.system_health.scraper' | tee -a $TEST_LOG
echo "" >> $TEST_LOG

# Detailed status
curl http://91.98.91.129:10000/api/reddit/scraper/status-detailed | jq . | tee -a $TEST_LOG
echo "" >> $TEST_LOG

# Cycle status
curl http://91.98.91.129:10000/api/reddit/scraper/cycle-status | jq . | tee -a $TEST_LOG
echo "" >> $TEST_LOG

# Success rate
curl http://91.98.91.129:10000/api/reddit/scraper/success-rate | \
  jq '.stats' | tee -a $TEST_LOG

echo "" | tee -a $TEST_LOG
```

**✓ Expected Results:**
- system_health.scraper: "running"
- enabled: true
- cycle.running: true
- success_rate: >90%

### Test 2.4: Monitor Activity (2 minutes)

```bash
echo "PHASE 2.4: Monitor Scraper Activity (2 minutes)" | tee -a $TEST_LOG
echo "--------------------" | tee -a $TEST_LOG

for i in {1..4}; do
  echo "Check $i/4:" | tee -a $TEST_LOG

  curl -s http://91.98.91.129:10000/api/reddit/scraper/status-detailed | \
    jq '{
      enabled,
      status,
      daily_api_calls: .statistics.daily_api_calls,
      successful: .statistics.successful_requests,
      failed: .statistics.failed_requests
    }' | tee -a $TEST_LOG

  echo "" >> $TEST_LOG
  sleep 30
done
```

**✓ Expected Results:**
- API calls should increase over time
- Successful requests > failed requests

### Test 2.5: Stop Reddit Scraper

```bash
echo "PHASE 2.5: STOP REDDIT SCRAPER" | tee -a $TEST_LOG
echo "--------------------" | tee -a $TEST_LOG

curl -X POST http://91.98.91.129:10000/api/reddit/scraper/stop | jq . | tee -a $TEST_LOG

echo "" >> $TEST_LOG
echo "Waiting 5 seconds..." | tee -a $TEST_LOG
sleep 5

# Verify stopped
curl http://91.98.91.129:10000/api/reddit/scraper/status | \
  jq '.system_health.scraper' | tee -a $TEST_LOG

echo "" | tee -a $TEST_LOG
```

**✓ Expected Results:**
- success: true
- status: "stopped"
- Verification shows: "stopped"

### Phase 2 Success Criteria

- [ ] Scraper starts with PID
- [ ] Status shows "running" while active
- [ ] API calls increase during monitoring
- [ ] Scraper stops cleanly
- [ ] Success rate >90%

---

## 📸 PHASE 3: INSTAGRAM CREATOR ADDITION (30 minutes)

### Test 3.1: Creator Addition Health Check

```bash
echo "PHASE 3.1: Instagram Creator Addition Health" | tee -a $TEST_LOG
echo "--------------------" | tee -a $TEST_LOG

curl http://91.98.91.129:10000/api/instagram/creator/health | jq . | tee -a $TEST_LOG

echo "" | tee -a $TEST_LOG
```

**✓ Expected Results:**
- status: "healthy"
- rapidapi_configured: true
- new_creator_config present

### Test 3.2: Add Valid Creator (Test Account) ⚠️ COSTS ~$0.00036

```bash
echo "PHASE 3.2: ADD CREATOR 'nasa' (Small verified account)" | tee -a $TEST_LOG
echo "--------------------" | tee -a $TEST_LOG
echo "⚠️  This will cost approximately \$0.00036 (12 API calls)" | tee -a $TEST_LOG
echo "⏱️  Expected processing time: 7-20 seconds" | tee -a $TEST_LOG
echo "" >> $TEST_LOG

START_TIME=$(date +%s)

curl -X POST http://91.98.91.129:10000/api/instagram/creator/add \
  -H "Content-Type: application/json" \
  -d '{
    "username": "nasa",
    "niche": "Science"
  }' | jq . | tee -a $TEST_LOG

END_TIME=$(date +%s)
ELAPSED=$((END_TIME - START_TIME))

echo "" >> $TEST_LOG
echo "Actual processing time: ${ELAPSED}s" | tee -a $TEST_LOG
echo "" | tee -a $TEST_LOG
```

**✓ Expected Results:**
- success: true
- creator.id: <number>
- creator.ig_user_id: <string>
- creator.username: "nasa"
- creator.review_status: "ok"
- creator.discovery_source: "manual_add"
- stats.reels_fetched: 90
- stats.posts_fetched: 30
- stats.api_calls_used: ~12
- stats.processing_time_seconds: 7-20

### Test 3.3: Test Duplicate Creator Handling

```bash
echo "PHASE 3.3: Test Duplicate Creator (should update existing)" | tee -a $TEST_LOG
echo "--------------------" | tee -a $TEST_LOG

curl -X POST http://91.98.91.129:10000/api/instagram/creator/add \
  -H "Content-Type: application/json" \
  -d '{
    "username": "nasa",
    "niche": "Science & Space"
  }' | jq . | tee -a $TEST_LOG

echo "" | tee -a $TEST_LOG
```

**✓ Expected Results:**
- success: true
- Should update existing creator
- Same ig_user_id as Test 3.2
- Niche updated to "Science & Space"

### Test 3.4: Test Invalid Creator

```bash
echo "PHASE 3.4: Test Invalid Creator (should fail gracefully)" | tee -a $TEST_LOG
echo "--------------------" | tee -a $TEST_LOG

curl -X POST http://91.98.91.129:10000/api/instagram/creator/add \
  -H "Content-Type: application/json" \
  -d '{
    "username": "thisuserdoesnotexist123456789",
    "niche": "Test"
  }' | jq . | tee -a $TEST_LOG

echo "" | tee -a $TEST_LOG
```

**✓ Expected Results:**
- success: false
- error: "Username not found or private account"

### Test 3.5: Test Empty Username

```bash
echo "PHASE 3.5: Test Empty Username (should fail validation)" | tee -a $TEST_LOG
echo "--------------------" | tee -a $TEST_LOG

curl -X POST http://91.98.91.129:10000/api/instagram/creator/add \
  -H "Content-Type: application/json" \
  -d '{
    "username": "",
    "niche": "Test"
  }' | jq . | tee -a $TEST_LOG

echo "" | tee -a $TEST_LOG
```

**✓ Expected Results:**
- success: false
- error: "Username is required"

### Phase 3 Success Criteria

- [ ] Valid creator added successfully
- [ ] Processing time 7-20 seconds
- [ ] 90 reels + 30 posts fetched
- [ ] ~12 API calls used (~$0.00036)
- [ ] Duplicate handling works
- [ ] Invalid usernames rejected gracefully
- [ ] Empty username validation works

**Total Cost for Phase 3:** ~$0.0007 (2 valid additions counting duplicate)

---

## 📸 PHASE 4: INSTAGRAM SCRAPER CONTROL (25 minutes)

### Test 4.1: Instagram Scraper Initial Status

```bash
echo "PHASE 4.1: Instagram Scraper Initial Status" | tee -a $TEST_LOG
echo "--------------------" | tee -a $TEST_LOG

# Health check
curl http://91.98.91.129:10000/api/instagram/scraper/health | jq . | tee -a $TEST_LOG
echo "" >> $TEST_LOG

# Basic status
curl http://91.98.91.129:10000/api/instagram/scraper/status | jq . | tee -a $TEST_LOG
echo "" >> $TEST_LOG

# Detailed status
curl http://91.98.91.129:10000/api/instagram/scraper/status-detailed | jq . | tee -a $TEST_LOG

echo "" | tee -a $TEST_LOG
```

**Record:** enabled=?, status=?, pid=?

### Test 4.2: Start Instagram Scraper ⚠️ PROCESSES ALL OK CREATORS

```bash
echo "PHASE 4.2: START INSTAGRAM SCRAPER" | tee -a $TEST_LOG
echo "--------------------" | tee -a $TEST_LOG
echo "⚠️  WARNING: This will process ALL creators with review_status='ok'" | tee -a $TEST_LOG
echo "⚠️  Cost depends on number of 'ok' creators (~\$0.00036 each)" | tee -a $TEST_LOG
echo "⚠️  We will STOP after 3 minutes of monitoring" | tee -a $TEST_LOG
echo "" >> $TEST_LOG

read -p "Press ENTER to start Instagram scraper (or Ctrl+C to skip): "

curl -X POST http://91.98.91.129:10000/api/instagram/scraper/start | jq . | tee -a $TEST_LOG

echo "" >> $TEST_LOG
echo "Waiting 30 seconds for initialization..." | tee -a $TEST_LOG
sleep 30

echo "" | tee -a $TEST_LOG
```

**✓ Expected Results:**
- success: true
- status: "running"
- message confirms start

### Test 4.3: Monitor Instagram Scraper (3 minutes)

```bash
echo "PHASE 4.3: Monitor Instagram Scraper (3 minutes)" | tee -a $TEST_LOG
echo "--------------------" | tee -a $TEST_LOG

for i in {1..6}; do
  echo "Check $i/6:" | tee -a $TEST_LOG

  curl -s http://91.98.91.129:10000/api/instagram/scraper/status-detailed | \
    jq '{
      enabled,
      status,
      daily_api_calls: .statistics.daily_api_calls,
      successful: .statistics.successful_requests,
      failed: .statistics.failed_requests,
      cycle: .cycle
    }' | tee -a $TEST_LOG

  echo "" >> $TEST_LOG
  sleep 30
done
```

**✓ Expected Results:**
- API calls should increase
- Workers processing jobs
- No critical errors

### Test 4.4: Check Cost Metrics

```bash
echo "PHASE 4.4: Check Cost Metrics" | tee -a $TEST_LOG
echo "--------------------" | tee -a $TEST_LOG

curl http://91.98.91.129:10000/api/instagram/scraper/cost-metrics | jq . | tee -a $TEST_LOG

echo "" | tee -a $TEST_LOG
```

**✓ Expected Results:**
- api_calls_today increased
- daily_cost calculated
- projected_monthly_cost shown

### Test 4.5: Stop Instagram Scraper

```bash
echo "PHASE 4.5: STOP INSTAGRAM SCRAPER" | tee -a $TEST_LOG
echo "--------------------" | tee -a $TEST_LOG

curl -X POST http://91.98.91.129:10000/api/instagram/scraper/stop | jq . | tee -a $TEST_LOG

echo "" >> $TEST_LOG
echo "Waiting 5 seconds..." | tee -a $TEST_LOG
sleep 5

# Verify stopped
curl http://91.98.91.129:10000/api/instagram/scraper/status | \
  jq '.system_health.scraper' | tee -a $TEST_LOG

echo "" | tee -a $TEST_LOG
```

**✓ Expected Results:**
- success: true
- status: "stopped"

### Phase 4 Success Criteria

- [ ] Scraper starts successfully
- [ ] Workers process jobs from Redis queue
- [ ] API calls tracked correctly
- [ ] Cost metrics accurate
- [ ] Scraper stops cleanly
- [ ] No crashes or errors

---

## 🔍 PHASE 5: RELATED CREATORS DISCOVERY (20 minutes)

### Test 5.1: Related Creators Initial Status

```bash
echo "PHASE 5.1: Related Creators Initial Status" | tee -a $TEST_LOG
echo "--------------------" | tee -a $TEST_LOG

curl http://91.98.91.129:10000/api/instagram/related-creators/status | jq . | tee -a $TEST_LOG

echo "" | tee -a $TEST_LOG
```

**✓ Expected Results:**
- is_running: false
- current: 0
- total: 0

### Test 5.2: Start Related Creators Discovery ⚠️ COSTS ~$0.0036

```bash
echo "PHASE 5.2: START RELATED CREATORS DISCOVERY (10 creators max)" | tee -a $TEST_LOG
echo "--------------------" | tee -a $TEST_LOG
echo "⚠️  This will discover and add up to 10 related creators" | tee -a $TEST_LOG
echo "⚠️  Cost: ~\$0.00036 per creator = ~\$0.0036 total" | tee -a $TEST_LOG
echo "" >> $TEST_LOG

curl -X POST http://91.98.91.129:10000/api/instagram/related-creators/start \
  -H "Content-Type: application/json" \
  -d '{
    "max_creators": 10
  }' | jq . | tee -a $TEST_LOG

echo "" | tee -a $TEST_LOG
```

**✓ Expected Results:**
- success: true
- status: "running"
- settings.max_creators: 10

### Test 5.3: Monitor Discovery Progress

```bash
echo "PHASE 5.3: Monitor Discovery Progress (check every 30s, max 5 minutes)" | tee -a $TEST_LOG
echo "--------------------" | tee -a $TEST_LOG

for i in {1..10}; do
  echo "Discovery Check $i/10:" | tee -a $TEST_LOG

  curl -s http://91.98.91.129:10000/api/instagram/related-creators/status | \
    jq '{is_running, current, total, progress_percentage}' | tee -a $TEST_LOG

  # Check if complete
  IS_RUNNING=$(curl -s http://91.98.91.129:10000/api/instagram/related-creators/status | jq -r '.is_running')

  if [ "$IS_RUNNING" = "false" ]; then
    echo "" >> $TEST_LOG
    echo "✅ Discovery complete!" | tee -a $TEST_LOG
    break
  fi

  echo "" >> $TEST_LOG
  sleep 30
done

echo "" | tee -a $TEST_LOG
```

**✓ Expected Results:**
- Progress increases over time
- current and total values shown
- Eventually completes or reaches max_creators

### Test 5.4: Stop Discovery (if still running)

```bash
echo "PHASE 5.4: Stop Discovery (if needed)" | tee -a $TEST_LOG
echo "--------------------" | tee -a $TEST_LOG

# Check if still running
IS_RUNNING=$(curl -s http://91.98.91.129:10000/api/instagram/related-creators/status | jq -r '.is_running')

if [ "$IS_RUNNING" = "true" ]; then
  echo "Discovery still running, stopping it..." | tee -a $TEST_LOG
  curl -X POST http://91.98.91.129:10000/api/instagram/related-creators/stop | jq . | tee -a $TEST_LOG
else
  echo "Discovery already complete, no need to stop" | tee -a $TEST_LOG
fi

echo "" | tee -a $TEST_LOG
```

### Phase 5 Success Criteria

- [ ] Discovery starts successfully
- [ ] Progress updates correctly
- [ ] New creators discovered and added
- [ ] Can stop discovery mid-process
- [ ] Total cost ~$0.0036 (10 creators)

---

## 🤖 PHASE 6: AI CATEGORIZATION (15 minutes)

### Test 6.1: AI Categorization Health

```bash
echo "PHASE 6.1: AI Categorization Health" | tee -a $TEST_LOG
echo "--------------------" | tee -a $TEST_LOG

curl http://91.98.91.129:10000/api/ai/categorization/health | jq . | tee -a $TEST_LOG

echo "" | tee -a $TEST_LOG
```

**✓ Expected Results:**
- status: "healthy"
- openai_configured: true
- supabase_configured: true
- model: "gpt-5-mini-2025-08-07"

### Test 6.2: Get AI Stats

```bash
echo "PHASE 6.2: AI Categorization Stats" | tee -a $TEST_LOG
echo "--------------------" | tee -a $TEST_LOG

curl http://91.98.91.129:10000/api/ai/categorization/stats | jq . | tee -a $TEST_LOG

echo "" | tee -a $TEST_LOG
```

**✓ Expected Results:**
- total_subreddits: 2155
- tagged_subreddits: 2155
- coverage: 100%

### Test 6.3: Get Tag Structure

```bash
echo "PHASE 6.3: AI Tag Structure" | tee -a $TEST_LOG
echo "--------------------" | tee -a $TEST_LOG

curl http://91.98.91.129:10000/api/ai/categorization/tags | \
  jq '{total_tags: .tags | length, categories: .tags | keys}' | tee -a $TEST_LOG

echo "" | tee -a $TEST_LOG
```

**✓ Expected Results:**
- 82 total tags
- 11 categories

### Test 6.4: Re-tag Subreddits (3 test) ⚠️ COSTS ~$0.03

```bash
echo "PHASE 6.4: Re-tag 3 Subreddits (AI test)" | tee -a $TEST_LOG
echo "--------------------" | tee -a $TEST_LOG
echo "⚠️  This will re-tag 3 existing subreddits" | tee -a $TEST_LOG
echo "⚠️  Cost: ~\$0.01 per subreddit = ~\$0.03 total" | tee -a $TEST_LOG
echo "" >> $TEST_LOG

curl -X POST http://91.98.91.129:10000/api/ai/categorization/tag-subreddits \
  -H "Content-Type: application/json" \
  -d '{
    "max_subreddits": 3,
    "skip_existing": false
  }' | jq . | tee -a $TEST_LOG

echo "" | tee -a $TEST_LOG
```

**✓ Expected Results:**
- success: true
- tagged_count: 3
- api_calls_used: 3
- total_cost_usd: ~0.03
- processing_time_seconds: <60

### Phase 6 Success Criteria

- [ ] AI service healthy
- [ ] Tag structure complete (82 tags)
- [ ] Can re-tag subreddits
- [ ] Cost ~$0.01 per subreddit
- [ ] Processing time reasonable
- [ ] Total cost ~$0.03

---

## 🔐 PHASE 7: CRON JOBS (15 minutes)

### Test 7.1: Cron Health Check

```bash
echo "PHASE 7.1: Cron Jobs Health" | tee -a $TEST_LOG
echo "--------------------" | tee -a $TEST_LOG

curl http://91.98.91.129:10000/api/cron/health | jq . | tee -a $TEST_LOG

echo "" | tee -a $TEST_LOG
```

**✓ Expected Results:**
- status: "healthy"
- cron_secret_configured: true
- available_jobs: ["cleanup-logs", "migrate-cdn-to-r2"]

### Test 7.2: Log Cleanup (Dry Run)

```bash
echo "PHASE 7.2: Log Cleanup (Dry Run)" | tee -a $TEST_LOG
echo "--------------------" | tee -a $TEST_LOG

curl -X POST "http://91.98.91.129:10000/api/cron/cleanup-logs?dry_run=true" \
  -H "Authorization: Bearer B9Dashboard2025SecureCron!" | jq . | tee -a $TEST_LOG

echo "" | tee -a $TEST_LOG
```

**✓ Expected Results:**
- success: true
- dry_run: true
- old_logs_found: X
- would_delete: X

### Test 7.3: Test Invalid Auth

```bash
echo "PHASE 7.3: Test Invalid Cron Auth (should fail)" | tee -a $TEST_LOG
echo "--------------------" | tee -a $TEST_LOG

curl -w "\nHTTP Status: %{http_code}\n" \
  -X POST "http://91.98.91.129:10000/api/cron/cleanup-logs?dry_run=true" \
  -H "Authorization: Bearer INVALID_SECRET" | tee -a $TEST_LOG

echo "" | tee -a $TEST_LOG
```

**✓ Expected Results:**
- HTTP Status: 401 or 403
- Error about invalid authentication

### Test 7.4: Log Cleanup (Execute - 60 days retention) ⚠️ DELETES DATA

```bash
echo "PHASE 7.4: Log Cleanup (EXECUTE - 60 days retention)" | tee -a $TEST_LOG
echo "--------------------" | tee -a $TEST_LOG
echo "⚠️  This will DELETE logs older than 60 days" | tee -a $TEST_LOG
echo "" >> $TEST_LOG

read -p "Press ENTER to execute log cleanup (or Ctrl+C to skip): "

curl -X POST "http://91.98.91.129:10000/api/cron/cleanup-logs?dry_run=false&retention_days=60" \
  -H "Authorization: Bearer B9Dashboard2025SecureCron!" | jq . | tee -a $TEST_LOG

echo "" | tee -a $TEST_LOG
```

**✓ Expected Results:**
- success: true
- logs_deleted: X
- disk_space_freed_mb: X

### Test 7.5: CDN Migration (Dry Run)

```bash
echo "PHASE 7.5: CDN to R2 Migration (Dry Run)" | tee -a $TEST_LOG
echo "--------------------" | tee -a $TEST_LOG

curl -X POST "http://91.98.91.129:10000/api/cron/migrate-cdn-to-r2?media_type=all&batch_size=5&dry_run=true" \
  -H "Authorization: Bearer B9Dashboard2025SecureCron!" | jq . | tee -a $TEST_LOG

echo "" | tee -a $TEST_LOG
```

**✓ Expected Results:**
- success: true
- dry_run: true
- files_to_migrate: X

### Phase 7 Success Criteria

- [ ] Cron secret configured
- [ ] Authentication working
- [ ] Dry runs show what would happen
- [ ] Cleanup only removes old logs
- [ ] Migration lists files correctly

---

## 📊 PHASE 8: FINAL VERIFICATION (10 minutes)

### Test 8.1: Collect Final Metrics

```bash
echo "PHASE 8.1: Final Metrics Collection" | tee -a $TEST_LOG
echo "--------------------" | tee -a $TEST_LOG

# Reddit API usage
echo "Reddit API Stats (Final):" | tee -a $TEST_LOG
curl -s http://91.98.91.129:10000/api/reddit/scraper/reddit-api-stats | \
  jq '{daily_calls, daily_limit, remaining}' | tee -a $TEST_LOG

echo "" >> $TEST_LOG

# Instagram API usage
echo "Instagram API Stats (Final):" | tee -a $TEST_LOG
curl -s http://91.98.91.129:10000/api/instagram/scraper/cost-metrics | \
  jq '.metrics' | tee -a $TEST_LOG

echo "" | tee -a $TEST_LOG
```

### Test 8.2: System Health (Final)

```bash
echo "PHASE 8.2: System Health (Final)" | tee -a $TEST_LOG
echo "--------------------" | tee -a $TEST_LOG

curl http://91.98.91.129:10000/health | jq . | tee -a $TEST_LOG

echo "" | tee -a $TEST_LOG
```

**✓ Expected Results:**
- status: "healthy"
- All dependencies healthy

### Test 8.3: Verify All Scrapers Stopped

```bash
echo "PHASE 8.3: Verify All Scrapers Stopped" | tee -a $TEST_LOG
echo "--------------------" | tee -a $TEST_LOG

echo "Reddit Scraper:" | tee -a $TEST_LOG
curl -s http://91.98.91.129:10000/api/reddit/scraper/status | \
  jq '.system_health.scraper' | tee -a $TEST_LOG

echo "" >> $TEST_LOG

echo "Instagram Scraper:" | tee -a $TEST_LOG
curl -s http://91.98.91.129:10000/api/instagram/scraper/status | \
  jq '.system_health.scraper' | tee -a $TEST_LOG

echo "" >> $TEST_LOG

echo "Related Creators Discovery:" | tee -a $TEST_LOG
curl -s http://91.98.91.129:10000/api/instagram/related-creators/status | \
  jq '.is_running' | tee -a $TEST_LOG

echo "" | tee -a $TEST_LOG
```

**✓ Expected Results:**
- All should show "stopped" or false

### Test 8.4: Generate Test Summary

```bash
echo "PHASE 8.4: Test Summary" | tee -a $TEST_LOG
echo "--------------------" | tee -a $TEST_LOG

FINAL_TIME=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
echo "Test completed: $FINAL_TIME" | tee -a $TEST_LOG
echo "" | tee -a $TEST_LOG

echo "Test log saved to: $TEST_LOG" | tee -a $TEST_LOG
echo "" | tee -a $TEST_LOG

echo "========================================" | tee -a $TEST_LOG
echo "TESTING COMPLETE" | tee -a $TEST_LOG
echo "========================================" | tee -a $TEST_LOG
```

---

## 💰 COST SUMMARY

| Phase | Operation | Estimated Cost |
|-------|-----------|----------------|
| Phase 3 | Instagram Creator Addition (2) | $0.0007 |
| Phase 4 | Instagram Scraper (stopped early) | $0.00 |
| Phase 5 | Related Creators Discovery (10) | $0.0036 |
| Phase 6 | AI Categorization (3 subreddits) | $0.03 |
| **TOTAL** | | **~$0.034** |

---

## ✅ FINAL SUCCESS CHECKLIST

### Infrastructure
- [ ] All 3 servers responding (API + 2 Workers)
- [ ] Redis queue operational
- [ ] Database connections healthy
- [ ] No container crashes

### Functionality
- [ ] Reddit scraper: start/stop working
- [ ] Instagram scraper: start/stop working
- [ ] Creator addition: 100% success for valid accounts
- [ ] Related creators: discovers new creators
- [ ] AI categorization: tags subreddits correctly
- [ ] Cron jobs: authentication and execution working

### Performance
- [ ] Creator addition: 7-20 seconds
- [ ] API response times: <500ms
- [ ] Success rates: >90%
- [ ] No memory leaks or CPU spikes

### Cost Control
- [ ] Total test cost: <$0.05
- [ ] API calls tracked accurately
- [ ] No runaway processes

---

## 📝 POST-TEST ACTIONS

1. **Review Test Log**
   ```bash
   cat ~/b9_test_results/$TEST_LOG
   ```

2. **Document Results**
   - Create `API_TEST_RESULTS_2025-10-09.md`
   - Include any failures with reproduction steps
   - Note any unexpected behaviors

3. **Update Status**
   - Update HETZNER_DEPLOYMENT_REPORT.md if needed
   - Mark any issues found

4. **Database Verification** (Manual)
   - Check `instagram_creators` table for new entries
   - Verify `instagram_reels` and `instagram_posts` populated
   - Check `system_logs` for test activity

---

**Test Plan Version:** 1.0
**Created:** 2025-10-09
**Status:** Ready for Execution
**Estimated Duration:** 2.5 hours
**Estimated Cost:** ~$0.034
