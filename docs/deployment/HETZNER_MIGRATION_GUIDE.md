# Hetzner Cloud Migration Guide - Complete Step-by-Step Tutorial

**Target Audience**: Beginner coders
**Time Required**: 8-12 hours (spread over 2-3 days recommended)
**Cost Savings**: $538/month ($625 Render → $87 Hetzner)
**Difficulty**: ⭐⭐⭐ Intermediate

---

## Table of Contents

1. [Why Migrate to Hetzner?](#why-migrate-to-hetzner)
2. [What You're Migrating](#what-youre-migrating)
3. [Prerequisites](#prerequisites)
4. [Phase 1: Hetzner Account Setup (30 minutes)](#phase-1-hetzner-account-setup)
5. [Phase 2: Create VPS Instances (1 hour)](#phase-2-create-vps-instances)
6. [Phase 3: Configure Docker (2 hours)](#phase-3-configure-docker)
7. [Phase 4: Setup Redis Queue (1 hour)](#phase-4-setup-redis-queue)
8. [Phase 5: Deploy API & Scrapers (2 hours)](#phase-5-deploy-api--scrapers)
9. [Phase 6: Setup Monitoring (1 hour)](#phase-6-setup-monitoring)
10. [Phase 7: DNS & Domain Setup (30 minutes)](#phase-7-dns--domain-setup)
11. [Phase 8: Testing & Validation (1 hour)](#phase-8-testing--validation)
12. [Phase 9: Cut Over from Render (30 minutes)](#phase-9-cut-over-from-render)
13. [Phase 10: Cleanup & Documentation (30 minutes)](#phase-10-cleanup--documentation)
14. [Troubleshooting](#troubleshooting)
15. [Scaling Guide (Future)](#scaling-guide)

---

## Why Migrate to Hetzner?

### Current Situation (Render)
- **Cost**: ~$625/month (API + Workers + Bandwidth)
- **CPU/Memory**: Limited, causing overflows during scraping
- **Bandwidth**: $255/month overage charges
- **Scaling**: Manual, expensive ($85+ per instance)

### After Migration (Hetzner)
- **Cost**: ~$87/month (7× cheaper!)
- **CPU/Memory**: 32 vCPU, 64 GB RAM total
- **Bandwidth**: 80 TB included (320 TB across 4 instances)
- **Scaling**: Just spin up more $18/month instances

### Cost Breakdown Comparison

| Component | Render | Hetzner | Savings |
|-----------|--------|---------|---------|
| API Server | $25/month | $3.60/month (CX11) | $21.40 |
| Workers (4×) | $340/month | $72/month (4× CX42) | $268 |
| Bandwidth | $255/month | $0 (included) | $255 |
| Professional Plan | $19/month | $0 | $19 |
| **TOTAL** | **$639/month** | **$75.60/month** | **$563.40/month** |

**Annual Savings**: $6,760.80

---

## What You're Migrating

Your B9 Dashboard API consists of:

### 1. FastAPI Application (`main.py`)
- **Purpose**: Main API server handling HTTP requests
- **Routes**: Instagram, Reddit, health checks, cron jobs
- **Dependencies**: Supabase, OpenAI, RapidAPI
- **Port**: 10000 (configurable via PORT env var)

### 2. Instagram Scraper (`instagram_scraper.py`)
- **Purpose**: Scrapes Instagram creator data, processes videos/images with FFmpeg
- **Function**: Downloads media → Compresses → Uploads to R2 → Saves to Supabase
- **Runs**: As background subprocess, controlled via Supabase `system_control` table
- **Heavy workload**: Video compression, R2 uploads

### 3. Reddit Scraper (`reddit_controller.py`)
- **Purpose**: Scrapes Reddit users and posts
- **Function**: Similar pattern to Instagram scraper
- **Runs**: Background subprocess

### 4. Supabase Database
- **Status**: Stays where it is (no migration needed)
- **Connection**: Via environment variables

### 5. Cloudflare R2 Storage
- **Status**: Stays where it is (no migration needed)
- **Connection**: Via boto3 S3 client

---

## Prerequisites

### Required Accounts & Services
- ✅ **Hetzner Cloud account** (will create in Phase 1)
- ✅ **Domain name** (you likely already have this for your Render deployment)
- ✅ **Supabase account** (already configured)
- ✅ **Cloudflare R2** (already configured)
- ✅ **GitHub repository** (your existing b9dashboard repo)

### Required Software on Your Local Machine
- ✅ **Terminal/Command Line** (already have this)
- ✅ **SSH client** (built into macOS/Linux, use PuTTY on Windows)
- ✅ **Git** (already have this)
- ✅ **Text editor** (VS Code, Sublime, etc.)

### Required Knowledge (Don't worry, I'll explain everything!)
- Basic command line navigation (`cd`, `ls`, `pwd`)
- Basic understanding of environment variables
- Copy/paste skills (seriously, that's most of it!)

---

## Phase 1: Hetzner Account Setup (30 minutes)

### Step 1.1: Create Hetzner Account

1. **Go to**: https://www.hetzner.com/cloud
2. **Click**: "Sign Up" in top right
3. **Fill out registration form**:
   - Email address
   - Password
   - Company info (optional, can use personal name)
4. **Verify email**: Check inbox and click verification link
5. **Add payment method**:
   - Credit card or PayPal
   - No charges yet, just on file

### Step 1.2: Create Cloud Project

1. **Log in** to Hetzner Cloud Console: https://console.hetzner.cloud/
2. **Click**: "New Project"
3. **Name it**: `b9-dashboard-production`
4. **Click**: "Create Project"

You should now see your empty project dashboard.

### Step 1.3: Add SSH Key (Security!)

**What is SSH?** It's a secure way to log into servers without passwords. Think of it as a special key card.

**Generate SSH key on your Mac:**

```bash
# Open Terminal and run this:
cd ~/.ssh

# Generate a new key (press Enter for all prompts to use defaults)
ssh-keygen -t ed25519 -C "your-email@example.com" -f hetzner_b9

# This creates two files:
# hetzner_b9 (private key - NEVER share this!)
# hetzner_b9.pub (public key - this goes on servers)

# View your public key:
cat hetzner_b9.pub
```

**Add SSH key to Hetzner:**

1. **In Hetzner Console**, click "Security" in left sidebar
2. **Click**: "SSH Keys" tab
3. **Click**: "Add SSH Key" button
4. **Paste** the contents of `hetzner_b9.pub` (the output from `cat` command above)
5. **Name it**: `b9-dashboard-key`
6. **Click**: "Add SSH Key"

✅ **Checkpoint**: You should see your SSH key listed with a fingerprint

---

## Phase 2: Create VPS Instances (1 hour)

We'll create **5 servers total**:
- 1× **CX11** for API server (small, cheap)
- 4× **CX42** for Instagram scraper workers (powerful)

### Step 2.1: Create API Server (CX11)

1. **In project dashboard**, click "Add Server"
2. **Select Location**: `Falkenstein` (Germany - cheapest, good EU location)
3. **Select Image**: `Ubuntu 22.04` (latest stable)
4. **Select Type**:
   - Click "Shared vCPU" tab
   - Select **CX11**: 2 vCPU, 4 GB RAM, €3.29/month
5. **Select Networking**:
   - ✅ Check "Public IPv4" (included)
   - ✅ Check "Public IPv6" (included, free)
6. **Select SSH Key**: Check your `b9-dashboard-key`
7. **Firewall**: Skip for now (we'll configure later)
8. **Volumes**: Skip (not needed)
9. **Additional Features**:
   - ✅ Check "Backups" (€0.66/month - recommended!)
10. **Server Name**: `b9-api-server`
11. **Labels** (optional but helpful):
    - Add label: `role` = `api`
    - Add label: `project` = `b9dashboard`
12. **Cloud Config**: Leave empty
13. **Click**: "Create & Buy Now"

**Wait 30-60 seconds** for server to be created.

✅ **Checkpoint**: You should see `b9-api-server` with a green "Running" status and an IP address like `123.45.67.89`

### Step 2.2: Create Worker Server 1 (CX42)

Repeat the same process, but:
- **Select Type**: **CX42**: 8 vCPU, 16 GB RAM, €16.40/month
- **Server Name**: `b9-worker-1`
- **Labels**:
  - `role` = `worker`
  - `worker_id` = `1`

### Step 2.3: Create Workers 2, 3, 4

Repeat for:
- `b9-worker-2` (CX42)
- `b9-worker-3` (CX42)
- `b9-worker-4` (CX42)

✅ **Checkpoint**: You should have 5 servers total:

| Server | Type | IP Address | Monthly Cost |
|--------|------|------------|--------------|
| b9-api-server | CX11 | (note IP) | €3.29 |
| b9-worker-1 | CX42 | (note IP) | €16.40 |
| b9-worker-2 | CX42 | (note IP) | €16.40 |
| b9-worker-3 | CX42 | (note IP) | €16.40 |
| b9-worker-4 | CX42 | (note IP) | €16.40 |
| **TOTAL** | | | **€69.89** (~$76/month) |

**IMPORTANT**: Copy all IP addresses to a note file. You'll need them constantly!

---

## Phase 3: Configure Docker (2 hours)

**What is Docker?** Think of it as a shipping container for your app. It bundles your code + dependencies into a portable package that runs anywhere.

We'll install Docker on all 5 servers. I'll show you how to do it once, then you'll repeat for the others.

### Step 3.1: Connect to API Server via SSH

```bash
# In your Terminal:
ssh -i ~/.ssh/hetzner_b9 root@YOUR_API_SERVER_IP

# Example:
# ssh -i ~/.ssh/hetzner_b9 root@123.45.67.89

# First time connecting, you'll see:
# "Are you sure you want to continue connecting (yes/no)?"
# Type: yes
```

You should now see a prompt like:
```
root@b9-api-server:~#
```

**Congratulations!** You're inside your server.

### Step 3.2: Install Docker on API Server

Copy and paste this entire block (yes, all of it at once!):

```bash
# Update package list
apt-get update

# Install required packages
apt-get install -y \
    apt-transport-https \
    ca-certificates \
    curl \
    gnupg \
    lsb-release

# Add Docker's official GPG key
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg

# Set up Docker repository
echo \
  "deb [arch=amd64 signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu \
  $(lsb_release -cs) stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null

# Install Docker
apt-get update
apt-get install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin

# Start Docker
systemctl start docker
systemctl enable docker

# Verify installation
docker --version
docker compose version
```

✅ **Checkpoint**: You should see:
```
Docker version 24.x.x
Docker Compose version v2.x.x
```

### Step 3.3: Install Docker on All Worker Servers

**Open 4 new Terminal tabs** (CMD+T on Mac) and repeat Step 3.1 and 3.2 for:
- `b9-worker-1`
- `b9-worker-2`
- `b9-worker-3`
- `b9-worker-4`

**Pro tip**: You can copy/paste the same commands in all 4 terminals simultaneously!

### Step 3.4: Create Application Directory Structure

**On API server** (`b9-api-server`):

```bash
# Create main app directory
mkdir -p /app/b9dashboard

# Create subdirectories
cd /app/b9dashboard
mkdir -p logs data

# Set permissions
chmod 755 /app/b9dashboard
```

**On all 4 worker servers**, run the same commands above.

---

## Phase 4: Setup Redis Queue (1 hour)

**What is Redis?** It's a super-fast database that stores data in memory. We'll use it as a "job queue" to distribute work across your 4 worker servers.

**How it works:**
1. API server adds "process creator X" to Redis queue
2. Worker 1, 2, 3, or 4 grabs the job (whoever is free first)
3. Worker processes the creator and marks job as done

### Step 4.1: Install Redis on API Server

**Only on `b9-api-server`**:

```bash
# Install Redis
apt-get install -y redis-server

# Configure Redis to listen on all interfaces
sed -i 's/bind 127.0.0.1 ::1/bind 0.0.0.0/' /etc/redis/redis.conf

# Set password (replace YOUR_SECURE_PASSWORD with a strong password!)
echo "requirepass YOUR_SECURE_PASSWORD" >> /etc/redis/redis.conf

# Restart Redis
systemctl restart redis-server
systemctl enable redis-server

# Verify it's running
redis-cli -a YOUR_SECURE_PASSWORD ping
# Should output: PONG
```

✅ **Checkpoint**: `redis-cli` should respond with `PONG`

### Step 4.2: Configure Firewall to Allow Worker Access

Still on `b9-api-server`:

```bash
# Allow Redis port 6379 from worker IPs only
ufw allow from WORKER_1_IP to any port 6379
ufw allow from WORKER_2_IP to any port 6379
ufw allow from WORKER_3_IP to any port 6379
ufw allow from WORKER_4_IP to any port 6379

# Allow SSH (port 22) from anywhere
ufw allow 22/tcp

# Allow HTTP/HTTPS for API
ufw allow 80/tcp
ufw allow 443/tcp
ufw allow 10000/tcp

# Enable firewall
ufw --force enable

# Check status
ufw status
```

### Step 4.3: Test Redis Connection from Workers

**On `b9-worker-1`** (and repeat for 2, 3, 4):

```bash
# Install Redis CLI tool (not the server, just the client)
apt-get install -y redis-tools

# Test connection to API server's Redis
redis-cli -h API_SERVER_IP -a YOUR_SECURE_PASSWORD ping
# Should output: PONG
```

✅ **Checkpoint**: All 4 workers can `PONG` the API server's Redis

---

## Phase 5: Deploy API & Scrapers (2 hours)

This is the big one! We'll deploy your actual application code.

### Step 5.1: Prepare Your Code for Hetzner

**On your local machine**, open your project:

```bash
cd /Users/matejlecnik/Desktop/b9_agency/b9dashboard
```

Create a new file: `docker-compose.hetzner.yml`

```yaml
version: '3.8'

services:
  api:
    build:
      context: .
      dockerfile: Dockerfile
    container_name: b9-api
    restart: unless-stopped
    ports:
      - "10000:10000"
    environment:
      # Supabase
      - SUPABASE_URL=${SUPABASE_URL}
      - SUPABASE_SERVICE_ROLE_KEY=${SUPABASE_SERVICE_ROLE_KEY}

      # OpenAI
      - OPENAI_API_KEY=${OPENAI_API_KEY}

      # RapidAPI
      - RAPIDAPI_KEY=${RAPIDAPI_KEY}

      # Cloudflare R2
      - R2_ACCOUNT_ID=${R2_ACCOUNT_ID}
      - R2_ACCESS_KEY_ID=${R2_ACCESS_KEY_ID}
      - R2_SECRET_ACCESS_KEY=${R2_SECRET_ACCESS_KEY}
      - R2_BUCKET_NAME=${R2_BUCKET_NAME}
      - R2_PUBLIC_URL=${R2_PUBLIC_URL}
      - ENABLE_R2_STORAGE=true

      # Server Config
      - PORT=10000
      - ENVIRONMENT=production
      - LOG_LEVEL=info

      # Redis Queue (for worker coordination)
      - REDIS_HOST=${REDIS_HOST}
      - REDIS_PORT=6379
      - REDIS_PASSWORD=${REDIS_PASSWORD}
    volumes:
      - /app/b9dashboard/logs:/app/logs
    networks:
      - b9-network
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:10000/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s

networks:
  b9-network:
    driver: bridge
```

Create another file for workers: `docker-compose.worker.yml`

```yaml
version: '3.8'

services:
  worker:
    build:
      context: .
      dockerfile: Dockerfile.worker
    container_name: b9-worker-${WORKER_ID}
    restart: unless-stopped
    environment:
      # Supabase
      - SUPABASE_URL=${SUPABASE_URL}
      - SUPABASE_SERVICE_ROLE_KEY=${SUPABASE_SERVICE_ROLE_KEY}

      # OpenAI
      - OPENAI_API_KEY=${OPENAI_API_KEY}

      # RapidAPI
      - RAPIDAPI_KEY=${RAPIDAPI_KEY}

      # Cloudflare R2
      - R2_ACCOUNT_ID=${R2_ACCOUNT_ID}
      - R2_ACCESS_KEY_ID=${R2_ACCESS_KEY_ID}
      - R2_SECRET_ACCESS_KEY=${R2_SECRET_ACCESS_KEY}
      - R2_BUCKET_NAME=${R2_BUCKET_NAME}
      - R2_PUBLIC_URL=${R2_PUBLIC_URL}
      - ENABLE_R2_STORAGE=true

      # Worker Config
      - WORKER_ID=${WORKER_ID}
      - ENVIRONMENT=production
      - LOG_LEVEL=info

      # Redis Queue
      - REDIS_HOST=${REDIS_HOST}
      - REDIS_PORT=6379
      - REDIS_PASSWORD=${REDIS_PASSWORD}
    volumes:
      - /app/b9dashboard/logs:/app/logs
    networks:
      - b9-network

networks:
  b9-network:
    driver: bridge
```

Create `Dockerfile.worker`:

```dockerfile
# Worker-specific Dockerfile (focuses on scraping, no web server)
FROM python:3.12-slim-bullseye as builder

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libffi-dev \
    libssl-dev \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

FROM python:3.12-slim-bullseye

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    ENVIRONMENT=production

RUN apt-get update && apt-get install -y --no-install-recommends \
    libpq5 \
    curl \
    ffmpeg \
    redis-tools \
    && rm -rf /var/lib/apt/lists/* \
    && apt-get clean

RUN useradd --create-home --shell /bin/bash worker

WORKDIR /app

COPY --from=builder /usr/local/lib/python3.12/site-packages /usr/local/lib/python3.12/site-packages
COPY --from=builder /usr/local/bin /usr/local/bin

COPY --chown=worker:worker backend/ ./backend/

RUN mkdir -p logs && chown -R worker:worker logs

USER worker

# Worker startup script (pulls jobs from Redis queue)
CMD ["python", "backend/worker.py"]
```

### Step 5.2: Create Worker Script

Create `backend/worker.py`:

```python
#!/usr/bin/env python3
"""
B9 Dashboard Worker - Redis Queue Processor
Pulls Instagram scraper jobs from Redis queue and processes them
"""

import asyncio
import logging
import os
import signal
import sys
from datetime import datetime, timezone

import redis

# Add backend to path
sys.path.insert(0, '/app/backend')

from app.scrapers.instagram.services.instagram_scraper import InstagramScraperUnified
from app.core.database.supabase_client import get_supabase_client

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Global flag for graceful shutdown
should_stop = False

def signal_handler(sig, frame):
    """Handle shutdown signals"""
    global should_stop
    logger.info("\n🛑 Shutdown signal received, finishing current job...")
    should_stop = True

async def process_job(job_data: dict):
    """Process a single scraper job"""
    try:
        creator_id = job_data.get('creator_id')
        logger.info(f"🚀 Processing creator: {creator_id}")

        # Initialize scraper
        supabase = get_supabase_client()
        scraper = InstagramScraperUnified(supabase_client=supabase)

        # Fetch creator data from database
        creator_result = supabase.table('instagram_creators').select('*').eq('id', creator_id).single().execute()

        if creator_result.data:
            # Process the creator
            success = scraper.process_creator(creator_result.data)

            if success:
                logger.info(f"✅ Successfully processed creator: {creator_id}")
                return True
            else:
                logger.error(f"❌ Failed to process creator: {creator_id}")
                return False
        else:
            logger.error(f"❌ Creator not found in database: {creator_id}")
            return False

    except Exception as e:
        logger.error(f"❌ Error processing job: {e}", exc_info=True)
        return False

async def worker_loop():
    """Main worker loop - pulls jobs from Redis queue"""
    global should_stop

    worker_id = os.getenv('WORKER_ID', 'unknown')
    redis_host = os.getenv('REDIS_HOST', 'localhost')
    redis_port = int(os.getenv('REDIS_PORT', 6379))
    redis_password = os.getenv('REDIS_PASSWORD', '')

    # Connect to Redis
    r = redis.Redis(
        host=redis_host,
        port=redis_port,
        password=redis_password,
        decode_responses=True
    )

    logger.info(f"🔗 Worker {worker_id} connected to Redis at {redis_host}:{redis_port}")
    logger.info(f"👷 Worker {worker_id} is ready to process jobs")

    while not should_stop:
        try:
            # Block and wait for a job (BRPOP waits up to 5 seconds)
            job = r.brpop('instagram_scraper_queue', timeout=5)

            if job:
                # job is a tuple: (queue_name, job_data)
                queue_name, job_data_json = job

                # Parse job data
                import json
                job_data = json.loads(job_data_json)

                logger.info(f"📦 Worker {worker_id} received job: {job_data}")

                # Process the job
                success = await process_job(job_data)

                if success:
                    logger.info(f"✅ Worker {worker_id} completed job successfully")
                else:
                    logger.error(f"❌ Worker {worker_id} failed to complete job")
                    # Optionally: re-queue failed jobs
                    # r.lpush('instagram_scraper_queue', job_data_json)
            else:
                # No jobs available, continue waiting
                pass

        except redis.ConnectionError as e:
            logger.error(f"❌ Redis connection error: {e}")
            await asyncio.sleep(10)  # Wait before retry
        except Exception as e:
            logger.error(f"❌ Worker error: {e}", exc_info=True)
            await asyncio.sleep(5)  # Brief pause before continuing

    logger.info(f"👋 Worker {worker_id} shutting down gracefully")

if __name__ == "__main__":
    # Handle shutdown signals
    signal.signal(signal.SIGINT, signal_handler)
    signal.signal(signal.SIGTERM, signal_handler)

    logger.info("🚀 Starting B9 Dashboard Worker...")

    # Run worker loop
    asyncio.run(worker_loop())
```

### Step 5.3: Update `instagram_controller.py` to Use Redis Queue

We need to modify your Instagram controller to PUSH jobs to Redis instead of processing directly.

**This is a significant refactor. I'll create a new file**:

Create `backend/app/scrapers/instagram/instagram_controller_redis.py`:

```python
#!/usr/bin/env python3
"""
Instagram Scraper Controller - Redis Queue Version
Instead of processing creators directly, adds them to Redis queue for workers to process
"""

import json
import logging
import os
import redis

from app.core.database.supabase_client import get_supabase_client

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

def enqueue_creators():
    """Fetch enabled creators and add them to Redis queue"""
    try:
        # Connect to Supabase
        supabase = get_supabase_client()

        # Connect to Redis
        redis_host = os.getenv('REDIS_HOST', 'localhost')
        redis_port = int(os.getenv('REDIS_PORT', 6379))
        redis_password = os.getenv('REDIS_PASSWORD', '')

        r = redis.Redis(
            host=redis_host,
            port=redis_port,
            password=redis_password,
            decode_responses=True
        )

        # Fetch all enabled creators
        result = supabase.table('instagram_creators').select('*').eq('enabled', True).execute()

        creators = result.data
        logger.info(f"📊 Found {len(creators)} enabled creators")

        # Add each creator to queue
        queued_count = 0
        for creator in creators:
            job_data = {
                'creator_id': creator['id'],
                'username': creator.get('username', 'unknown'),
                'timestamp': datetime.now(timezone.utc).isoformat()
            }

            # Push to Redis queue (LPUSH adds to left/head of list)
            r.lpush('instagram_scraper_queue', json.dumps(job_data))
            queued_count += 1

            logger.info(f"✅ Queued creator: {creator.get('username')} (ID: {creator['id']})")

        logger.info(f"🎉 Successfully queued {queued_count} creators for processing")
        return queued_count

    except Exception as e:
        logger.error(f"❌ Error enqueueing creators: {e}", exc_info=True)
        return 0

if __name__ == "__main__":
    logger.info("🚀 Starting Instagram Scraper Controller (Redis Queue Mode)")
    enqueue_creators()
```

### Step 5.4: Deploy to API Server

**On your local machine**:

```bash
# Create .env file for API server
cat > .env.api << 'EOF'
# Copy from your existing backend/.env file
SUPABASE_URL=your_value_here
SUPABASE_SERVICE_ROLE_KEY=your_value_here
OPENAI_API_KEY=your_value_here
RAPIDAPI_KEY=your_value_here
R2_ACCOUNT_ID=your_value_here
R2_ACCESS_KEY_ID=your_value_here
R2_SECRET_ACCESS_KEY=your_value_here
R2_BUCKET_NAME=your_value_here
R2_PUBLIC_URL=your_value_here
REDIS_HOST=127.0.0.1
REDIS_PASSWORD=YOUR_SECURE_PASSWORD
EOF

# Create .env file for workers
cat > .env.worker << 'EOF'
# Same as .env.api, but REDIS_HOST points to API server
SUPABASE_URL=your_value_here
SUPABASE_SERVICE_ROLE_KEY=your_value_here
OPENAI_API_KEY=your_value_here
RAPIDAPI_KEY=your_value_here
R2_ACCOUNT_ID=your_value_here
R2_ACCESS_KEY_ID=your_value_here
R2_SECRET_ACCESS_KEY=your_value_here
R2_BUCKET_NAME=your_value_here
R2_PUBLIC_URL=your_value_here
REDIS_HOST=API_SERVER_IP_HERE
REDIS_PASSWORD=YOUR_SECURE_PASSWORD
WORKER_ID=1
EOF

# Copy files to API server
scp -i ~/.ssh/hetzner_b9 docker-compose.hetzner.yml root@API_SERVER_IP:/app/b9dashboard/docker-compose.yml
scp -i ~/.ssh/hetzner_b9 .env.api root@API_SERVER_IP:/app/b9dashboard/.env
scp -i ~/.ssh/hetzner_b9 Dockerfile root@API_SERVER_IP:/app/b9dashboard/
scp -r -i ~/.ssh/hetzner_b9 backend root@API_SERVER_IP:/app/b9dashboard/

# SSH into API server
ssh -i ~/.ssh/hetzner_b9 root@API_SERVER_IP

# Build and start
cd /app/b9dashboard
docker compose up -d --build

# Check logs
docker compose logs -f
```

### Step 5.5: Deploy to Worker Servers

**For each worker (1, 2, 3, 4)**:

```bash
# On your local machine
# Update WORKER_ID in .env.worker to 1, 2, 3, or 4

# Copy files to worker
scp -i ~/.ssh/hetzner_b9 docker-compose.worker.yml root@WORKER_IP:/app/b9dashboard/docker-compose.yml
scp -i ~/.ssh/hetzner_b9 .env.worker root@WORKER_IP:/app/b9dashboard/.env
scp -i ~/.ssh/hetzner_b9 Dockerfile.worker root@WORKER_IP:/app/b9dashboard/
scp -r -i ~/.ssh/hetzner_b9 backend root@WORKER_IP:/app/b9dashboard/

# SSH into worker
ssh -i ~/.ssh/hetzner_b9 root@WORKER_IP

# Build and start
cd /app/b9dashboard
docker compose up -d --build

# Check logs
docker compose logs -f
```

✅ **Checkpoint**:
- API server shows: `✅ Started B9 Dashboard API on port 10000`
- Workers show: `👷 Worker X is ready to process jobs`

---

## Phase 6: Setup Monitoring (1 hour)

We need to know if things break! Let's set up basic monitoring.

### Step 6.1: Install Uptime Robot (Free)

1. Go to: https://uptimerobot.com/
2. Sign up for free account
3. Click "Add New Monitor"
4. **Monitor Type**: HTTP(s)
5. **Friendly Name**: `B9 Dashboard API`
6. **URL**: `http://YOUR_API_SERVER_IP:10000/health`
7. **Monitoring Interval**: 5 minutes
8. **Alert Contacts**: Your email
9. Click "Create Monitor"

Repeat for each worker's health endpoint (if you add one).

### Step 6.2: Setup Log Aggregation (Optional but Recommended)

**Install Grafana Cloud (Free Tier - 10k logs/month)**:

1. Go to: https://grafana.com/products/cloud/
2. Sign up for free
3. Follow their "Getting Started" guide to install Grafana Agent on each server

This is optional but HIGHLY recommended for debugging.

---

## Phase 7: DNS & Domain Setup (30 minutes)

### Step 7.1: Point Your Domain to Hetzner

1. **Go to your domain registrar** (Cloudflare, Namecheap, GoDaddy, etc.)
2. **Find DNS settings**
3. **Add A record**:
   - **Name**: `api` (or whatever subdomain you use)
   - **Type**: `A`
   - **Value**: `YOUR_API_SERVER_IP`
   - **TTL**: `300` (5 minutes, for fast updates)
4. **Save changes**

Wait 5-10 minutes for DNS to propagate.

**Test**:
```bash
# On your local machine
dig api.yourdomain.com

# Should show your Hetzner IP
```

### Step 7.2: Setup SSL Certificate (Free with Let's Encrypt)

**On API server**:

```bash
# Install Certbot
apt-get install -y certbot python3-certbot-nginx

# Install Nginx
apt-get install -y nginx

# Create Nginx config
cat > /etc/nginx/sites-available/b9-api << 'EOF'
server {
    listen 80;
    server_name api.yourdomain.com;

    location / {
        proxy_pass http://localhost:10000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
EOF

# Enable site
ln -s /etc/nginx/sites-available/b9-api /etc/nginx/sites-enabled/
rm /etc/nginx/sites-enabled/default

# Test Nginx config
nginx -t

# Restart Nginx
systemctl restart nginx

# Get SSL certificate
certbot --nginx -d api.yourdomain.com
# Follow prompts, enter your email, agree to terms

# Test auto-renewal
certbot renew --dry-run
```

✅ **Checkpoint**: Visit `https://api.yourdomain.com/health` - should see health check response with SSL!

---

## Phase 8: Testing & Validation (1 hour)

### Test 1: API Health Check

```bash
curl https://api.yourdomain.com/health
# Expected: {"status": "ok", "timestamp": "..."}
```

### Test 2: Queue a Single Creator

```bash
# SSH into API server
ssh -i ~/.ssh/hetzner_b9 root@API_SERVER_IP

# Run controller to queue creators
cd /app/b9dashboard
docker compose exec api python backend/app/scrapers/instagram/instagram_controller_redis.py

# Check Redis queue
redis-cli -a YOUR_SECURE_PASSWORD llen instagram_scraper_queue
# Should show number of queued jobs
```

### Test 3: Watch Workers Process Jobs

```bash
# On worker 1
ssh -i ~/.ssh/hetzner_b9 root@WORKER_1_IP
docker compose logs -f

# Should see:
# "📦 Worker 1 received job: ..."
# "🚀 Processing creator: ..."
# "✅ Worker 1 completed job successfully"
```

### Test 4: Verify R2 Uploads

Check your Cloudflare R2 dashboard - you should see new files appearing!

### Test 5: Verify Database Saves

Check Supabase - `instagram_reels` and `instagram_posts` tables should have new rows with R2 URLs.

---

## Phase 9: Cut Over from Render (30 minutes)

**IMPORTANT**: Do this during low-traffic time!

### Step 9.1: Update Frontend Environment Variables

**In your dashboard (Next.js) `.env`**:

```bash
# Old (Render)
NEXT_PUBLIC_API_URL=https://your-render-app.onrender.com

# New (Hetzner)
NEXT_PUBLIC_API_URL=https://api.yourdomain.com
```

### Step 9.2: Deploy Frontend Update

```bash
# Commit and push to trigger Vercel rebuild
git add .env
git commit -m "Switch API to Hetzner"
git push

# Or if using manual deploy, rebuild your frontend
```

### Step 9.3: Disable Render Services

1. Go to Render dashboard
2. **Suspend** (don't delete yet!) your services
3. Wait 5 minutes, monitor logs to ensure no errors

### Step 9.4: Monitor Hetzner for 24 Hours

Watch logs, Uptime Robot, check Supabase to ensure everything works.

✅ **Checkpoint**: After 24 hours with no issues, you can **delete** Render services permanently.

---

## Phase 10: Cleanup & Documentation (30 minutes)

### Step 10.1: Document Your Setup

Create `/app/b9dashboard/README.md` on each server:

```markdown
# B9 Dashboard Production Server

**Server**: b9-api-server (or b9-worker-X)
**IP**: YOUR_IP_HERE
**Role**: API Server (or Worker)
**Deployed**: 2025-XX-XX

## Quick Commands

# View logs
cd /app/b9dashboard && docker compose logs -f

# Restart services
cd /app/b9dashboard && docker compose restart

# Update code
cd /app/b9dashboard
git pull  # If using git deployment
docker compose up -d --build

# Check Redis queue length
redis-cli -a PASSWORD llen instagram_scraper_queue
```

### Step 10.2: Create Backup Script

**On API server**:

```bash
cat > /root/backup.sh << 'EOF'
#!/bin/bash
# Backup logs and configs
tar -czf /root/backups/b9-backup-$(date +%Y%m%d).tar.gz \
  /app/b9dashboard/logs \
  /app/b9dashboard/.env \
  /app/b9dashboard/docker-compose.yml

# Keep only last 7 days
find /root/backups -name "b9-backup-*.tar.gz" -mtime +7 -delete
EOF

chmod +x /root/backup.sh

# Add to crontab (runs daily at 2am)
(crontab -l 2>/dev/null; echo "0 2 * * * /root/backup.sh") | crontab -
```

---

## Troubleshooting

### Issue: "Cannot connect to Redis"

**Solution**:
```bash
# On API server, check Redis is running
systemctl status redis-server

# Check firewall
ufw status

# Test from worker
redis-cli -h API_SERVER_IP -a PASSWORD ping
```

### Issue: "Docker container keeps restarting"

**Solution**:
```bash
# Check logs
docker compose logs

# Common issues:
# 1. Missing environment variable
# 2. Port already in use
# 3. Syntax error in code

# Fix and rebuild
docker compose up -d --build --force-recreate
```

### Issue: "Out of memory"

**Solution**:
```bash
# Check memory usage
free -h

# Check Docker container memory
docker stats

# If a worker is using too much memory:
# Option 1: Restart it
docker compose restart

# Option 2: Reduce concurrent creators in config
# Edit instagram_config.py: CONCURRENT_CREATORS = 5 (reduce from 10)
```

### Issue: "Workers not picking up jobs"

**Solution**:
```bash
# On API server, check queue length
redis-cli -a PASSWORD llen instagram_scraper_queue

# If queue has jobs but workers aren't processing:
# Check worker logs
ssh root@WORKER_IP
docker compose logs -f

# Restart workers
docker compose restart
```

---

## Scaling Guide (Future)

When you hit 50K-100K creators:

### Option 1: Add More Workers

Simply create more CX42 instances and deploy the worker container. They'll automatically join the Redis queue pool.

### Option 2: Upgrade to Dedicated CPU Instances

Hetzner offers CCX instances (dedicated vCPUs):
- **CCX33**: €58/month - 16 vCPU, 32 GB RAM (2× the power of CX42)

### Option 3: Multiple Redis Queues

Separate queues for different platforms:
- `instagram_scraper_queue`
- `reddit_scraper_queue`
- `tiktok_scraper_queue`

Each platform gets dedicated workers.

---

## Success Checklist

- [  ] Hetzner account created and payment added
- [  ] SSH key created and added to Hetzner
- [  ] 5 servers created (1 API + 4 workers)
- [  ] Docker installed on all servers
- [  ] Redis installed and configured on API server
- [  ] Application code deployed to all servers
- [  ] Docker containers running successfully
- [  ] Uptime Robot monitoring configured
- [  ] DNS pointing to Hetzner
- [  ] SSL certificate installed (HTTPS working)
- [  ] Test scraper job completed successfully
- [  ] Frontend updated to use new API URL
- [  ] Render services suspended/deleted
- [  ] 24-hour monitoring completed
- [  ] Documentation created on servers
- [  ] Backup script configured

---

## Estimated Costs

### One-Time Setup
- **Time**: 8-12 hours (your time)
- **Money**: €0 (no setup fees)

### Monthly Recurring
- **Hetzner Servers**: €69.89 (~$76/month)
- **Cloudflare R2 Storage**: ~$11.46/month (Year 1 average ~$15/month)
- **Uptime Robot**: $0 (free tier)
- **Grafana Cloud Logs**: $0 (free tier)
- **Domain + SSL**: $0 (already have domain, SSL is free via Let's Encrypt)

**Total Monthly**: ~$87-91/month

**vs. Render**: $625/month

**Savings**: $534-538/month = **$6,408-6,456 per year**

---

## Next Steps

After completing this migration:

1. **Monitor for 1 week**: Watch logs, check Supabase, ensure R2 uploads work
2. **Optimize**: Adjust `CONCURRENT_CREATORS` if needed
3. **Document**: Add any custom configs to this guide
4. **Scale**: When you hit 100K creators, add more workers or upgrade to CCX instances

**Questions?** Check the Troubleshooting section or reach out for help!

---

**Document Version**: 1.0
**Last Updated**: 2025-01-XX
**Author**: Claude (AI Assistant)
**Maintained By**: B9 Dashboard Team
