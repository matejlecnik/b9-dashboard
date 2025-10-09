# Hetzner Migration - Complete Deployment Guide

**Status**: ✅ Code Complete | Ready to Deploy
**Created**: 2025-10-09
**Estimated Time**: 2-3 hours

---

## What Was Built

You now have a complete Redis queue-based architecture for distributed Instagram scraping:

### **New Files Created**:
1. **`backend/worker.py`** - Redis queue consumer (pulls jobs, processes creators)
2. **`docker-compose.hetzner.yml`** - API server + Redis configuration
3. **`docker-compose.worker.yml`** - Worker server configuration
4. **`Dockerfile.worker`** - Worker container with FFmpeg
5. **`backend/app/scrapers/instagram/instagram_controller_redis.py`** - Queue-based controller
6. **`deployment/deploy-api.sh`** - API deployment script
7. **`deployment/deploy-worker.sh`** - Worker deployment script
8. **`deployment/deploy-all.sh`** - Full infrastructure deployment
9. **`.env.api.example`** / **`.env.worker.example`** - Environment templates

### **Architecture Overview**:

```
API Server (CPX11 - €3.85/mo)                Worker 1 (CPX31 - €13.10/mo)
┌────────────────────────────┐              ┌──────────────────────────┐
│  FastAPI (8 workers)       │              │  Instagram Scraper       │
│  Redis Server              │◄──BRPOP──────┤  FFmpeg Processor        │
│  Job Queue                 │              │  R2 Uploader             │
└────────────────────────────┘              └──────────────────────────┘
         │                                               
         │ LPUSH (enqueue jobs)                        
         │                                   Worker 2 (CPX31 - €13.10/mo)
         ▼                                  ┌──────────────────────────┐
┌────────────────────────────┐              │  Instagram Scraper       │
│  instagram_controller      │──────BRPOP──►│  FFmpeg Processor        │
│  _redis.py                 │              │  R2 Uploader             │
└────────────────────────────┘              └──────────────────────────┘
```

---

## Pre-Deployment Checklist

- [ ] You have access to your Hetzner servers (SSH key at `~/.ssh/hetzner_b9`)
- [ ] You have your environment variable values ready (Supabase, OpenAI, R2, etc.)
- [ ] You've generated a strong Redis password
- [ ] You have ~2-3 hours for deployment and testing
- [ ] You've backed up your current Render configuration (just in case)

---

## Step 1: Prepare Environment Files (15 minutes)

### 1.1 Create API Server Environment File

```bash
cd /Users/matejlecnik/Desktop/b9_agency/b9_dashboard

# Copy template
cp .env.api.example .env.api

# Edit with your actual values
code .env.api  # Or use your preferred editor
```

**Required values**:
- `SUPABASE_URL` - From Supabase dashboard
- `SUPABASE_SERVICE_ROLE_KEY` - From Supabase dashboard (Settings → API)
- `OPENAI_API_KEY` - From OpenAI platform
- `RAPIDAPI_KEY` - From RapidAPI dashboard
- `R2_*` - From Cloudflare R2 dashboard
- `REDIS_PASSWORD` - Generate a strong random password (e.g., use `openssl rand -base64 32`)

### 1.2 Create Worker Environment File

```bash
# Copy template
cp .env.worker.example .env.worker

# Edit - same values as .env.api EXCEPT:
# - REDIS_HOST=91.98.91.129 (your API server IP)
# - WORKER_ID=1
code .env.worker
```

---

## Step 2: Deploy API Server (30 minutes)

### 2.1 Deploy to Hetzner

```bash
# Run deployment script
./deployment/deploy-api.sh
```

This will:
1. Copy `docker-compose.hetzner.yml`, `.env.api`, and `backend/` to server
2. Build Docker images
3. Start API + Redis containers
4. Show logs

### 2.2 Verify API is Running

```bash
# SSH to API server
ssh -i ~/.ssh/hetzner_b9 root@91.98.91.129

# Check container status
cd /app/b9dashboard
docker compose ps

# Should show:
# b9-api     running
# b9-redis   running

# Check logs
docker compose logs -f
```

### 2.3 Test API Endpoint

```bash
# From your local machine
curl http://91.98.91.129:10000/health

# Expected response:
# {"status":"healthy","timestamp":"2025-10-09T..."}
```

---

## Step 3: Deploy Workers (30 minutes per worker)

### 3.1 Deploy Worker 1

```bash
# From your local machine
WORKER_ID=1 WORKER_IP=188.245.232.203 ./deployment/deploy-worker.sh
```

### 3.2 Verify Worker 1

```bash
# SSH to Worker 1
ssh -i ~/.ssh/hetzner_b9 root@188.245.232.203

# Check container
cd /app/b9dashboard
docker compose ps

# Should show:
# b9-worker-1   running

# Check logs - should see:
# "✅ Connected to Redis successfully"
# "👷 Worker 1 is ready to process jobs"
docker compose logs -f
```

### 3.3 Deploy Worker 2

```bash
# From your local machine
WORKER_ID=2 WORKER_IP=91.98.92.192 ./deployment/deploy-worker.sh
```

### 3.4 Verify Worker 2

```bash
# SSH to Worker 2
ssh -i ~/.ssh/hetzner_b9 root@91.98.92.192

# Check container
docker compose logs -f

# Should see:
# "✅ Connected to Redis successfully"
# "👷 Worker 2 is ready to process jobs"
```

---

## Step 4: Test End-to-End Workflow (30 minutes)

### 4.1 Queue Test Job

```bash
# SSH to API server
ssh -i ~/.ssh/hetzner_b9 root@91.98.91.129

# Run controller to enqueue creators
docker exec -it b9-api python backend/app/scrapers/instagram/instagram_controller_redis.py --limit 5

# Should see:
# "📊 Found 5 creators to enqueue"
# "✅ Queued: username1 (ID: ...)"
# "✅ Queued: username2 (ID: ...)"
```

### 4.2 Verify Queue

```bash
# Still on API server
docker exec -it b9-redis redis-cli -a YOUR_REDIS_PASSWORD llen instagram_scraper_queue

# Should show: 5 (or however many you queued)
```

### 4.3 Watch Workers Process Jobs

Open 3 terminal windows:

**Terminal 1 (Worker 1)**:
```bash
ssh -i ~/.ssh/hetzner_b9 root@188.245.232.203
docker compose logs -f
```

**Terminal 2 (Worker 2)**:
```bash
ssh -i ~/.ssh/hetzner_b9 root@91.98.92.192
docker compose logs -f
```

**Terminal 3 (Queue Monitoring)**:
```bash
ssh -i ~/.ssh/hetzner_b9 root@91.98.91.129
watch 'docker exec -it b9-redis redis-cli -a YOUR_REDIS_PASSWORD llen instagram_scraper_queue'
```

You should see:
- Workers pulling jobs: `"📦 Received job: username1"`
- Workers processing: `"🚀 Processing creator: username1"`
- Workers completing: `"✅ Successfully processed creator: username1"`
- Queue length decreasing: `5 → 4 → 3 → 2 → 1 → 0`

### 4.4 Verify Data in Supabase

1. Go to your Supabase dashboard
2. Check `instagram_posts` table - should have new rows with R2 URLs
3. Check `instagram_reels` table - should have new rows
4. Check `instagram_creators` table - `last_scraped` should be updated

### 4.5 Verify Media in R2

1. Go to Cloudflare R2 dashboard
2. Check your bucket - should have new compressed images/videos
3. Test a URL from Supabase - should load successfully

---

## Step 5: Setup Scheduled Scraping (15 minutes)

### Option A: Cron Job on API Server

```bash
# SSH to API server
ssh -i ~/.ssh/hetzner_b9 root@91.98.91.129

# Create cron job (runs every 4 hours)
crontab -e

# Add this line:
0 */4 * * * docker exec b9-api python backend/app/scrapers/instagram/instagram_controller_redis.py >> /app/b9dashboard/logs/cron.log 2>&1
```

### Option B: API Endpoint (Recommended)

Create an API endpoint in your FastAPI app:

```python
# backend/app/api/scraper.py

@router.post("/api/scraper/enqueue-instagram")
async def enqueue_instagram_creators():
    """Enqueue all enabled Instagram creators"""
    from app.scrapers.instagram.instagram_controller_redis import enqueue_creators
    
    count = enqueue_creators()
    return {"status": "success", "enqueued": count}
```

Then use external cron service (like Render Cron Jobs or cron-job.org) to hit the endpoint.

---

## Step 6: Monitoring Setup (15 minutes)

### 6.1 Install Uptime Robot

1. Go to https://uptimerobot.com/
2. Create account (free)
3. Add monitor:
   - Type: HTTP(s)
   - URL: `http://91.98.91.129:10000/health`
   - Name: B9 API Health Check
   - Interval: 5 minutes
   - Alert email: your email

### 6.2 Setup Log Rotation

```bash
# On each server (API + Workers)
cat > /etc/logrotate.d/b9dashboard << 'EOF'
/app/b9dashboard/logs/*.log {
    daily
    rotate 30
    compress
    delaycompress
    missingok
    notifempty
    create 0640 root root
}
EOF
```

---

## Step 7: Cut Over from Render (if applicable)

### 7.1 Update Frontend

If your frontend is pointing to Render, update the API URL:

```bash
# In your dashboard/.env or .env.local
NEXT_PUBLIC_API_URL=http://91.98.91.129:10000

# Or if you setup DNS + SSL:
NEXT_PUBLIC_API_URL=https://api.yourdomain.com
```

### 7.2 Gradual Transition

**Day 1**: Deploy to Hetzner, test thoroughly
**Day 2**: Run both Render and Hetzner in parallel, monitor logs
**Day 3**: Switch frontend to Hetzner, keep Render as backup
**Day 7**: If all good, shut down Render services

### 7.3 Decommission Render

1. Go to Render dashboard
2. **Suspend** (don't delete yet) your services
3. Wait 7 days
4. If Hetzner is stable, **delete** Render services permanently

---

## Troubleshooting

### Issue: Workers can't connect to Redis

**Symptoms**: `"❌ Failed to connect to Redis"`

**Solution**:
```bash
# On API server, check Redis is running
docker compose ps

# Check Redis logs
docker logs b9-redis

# Test connection from worker
ssh root@WORKER_IP
telnet 91.98.91.129 6379
```

### Issue: API not responding

**Symptoms**: `curl` to `/health` times out

**Solution**:
```bash
# On API server
docker compose logs api

# Check for errors, restart if needed
docker compose restart api
```

### Issue: Jobs not being processed

**Symptoms**: Queue has jobs but workers aren't processing

**Solution**:
```bash
# Check queue length
docker exec b9-redis redis-cli -a PASSWORD llen instagram_scraper_queue

# Check worker logs
ssh root@WORKER_IP
docker compose logs -f

# Restart workers
docker compose restart
```

---

## Success Criteria

- [ ] API server responding to `/health` endpoint
- [ ] Redis server accepting connections
- [ ] Both workers connected to Redis and ready
- [ ] Test job enqueued successfully
- [ ] Workers processed test job
- [ ] Data saved to Supabase correctly
- [ ] Media uploaded to R2 successfully
- [ ] Queue empties after processing
- [ ] Uptime monitoring configured
- [ ] Scheduled scraping setup
- [ ] Frontend updated (if applicable)

---

## Next Steps

1. **DNS + SSL** (optional but recommended):
   - Point `api.yourdomain.com` to `91.98.91.129`
   - Install Nginx + Let's Encrypt on API server
   - Update frontend to use `https://api.yourdomain.com`

2. **Scale Workers**:
   - When you hit 1,000+ creators, add Worker 3 and 4
   - Just provision more CPX31 instances, deploy with `deploy-worker.sh`

3. **Optimize**:
   - Monitor worker memory usage
   - Adjust `batch_size` if needed
   - Add retry logic for failed jobs

---

## Cost Comparison

**Current (Hetzner)**:
- API (CPX11): €3.85/mo
- Worker 1 (CPX31): €13.10/mo
- Worker 2 (CPX31): €13.10/mo
- **Total: €30.05/mo (~$33/mo)**

**Previous (Render)**: $625/mo

**Savings**: $592/mo = $7,104/year 🎉

---

## Support

If you encounter issues:
1. Check this guide's Troubleshooting section
2. Review server logs: `docker compose logs -f`
3. Check Redis queue: `redis-cli llen instagram_scraper_queue`
4. Verify environment variables: `docker compose config`

---

_Deployment Guide v1.0 | Created: 2025-10-09 | Status: Complete_
