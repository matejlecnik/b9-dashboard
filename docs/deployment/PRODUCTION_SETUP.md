# Production Setup Guide - B9 Dashboard

```
┌─ COMPLETE PRODUCTION SETUP ─────────────────────────────┐
│ Target: Professional HTTPS Infrastructure                │
│ Time: ~2-3 hours | Difficulty: Intermediate              │
│ Prerequisites: Domain, Cloudflare account, Hetzner VPS  │
└─────────────────────────────────────────────────────────┘
```

This guide walks you through setting up the complete B9 Dashboard production infrastructure from scratch, including:
- ✅ Custom domain with Cloudflare DNS
- ✅ HTTPS for frontend, API, and media
- ✅ Nginx reverse proxy configuration
- ✅ Professional media CDN setup
- ✅ Zero Mixed Content errors

## Prerequisites

Before you begin, ensure you have:

- [x] Domain name (e.g., `b9-dashboard.com`)
- [x] Cloudflare account (free tier is fine)
- [x] Hetzner Cloud VPS with Docker installed
- [x] Vercel account with Next.js app deployed
- [x] SSH access to your Hetzner server
- [x] Cloudflare R2 bucket created

## Architecture Overview

```
Users → Cloudflare DNS → [Vercel Frontend | Nginx → API | R2 Media]
        (HTTPS)           (HTTPS)         (HTTPS)    (HTTPS)
```

---

## Phase 1: Cloudflare DNS Migration

### Step 1.1: Add Domain to Cloudflare

1. Log in to [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. Click **"Add a Site"** in the top right
3. Enter your domain: `b9-dashboard.com`
4. Click **"Continue"**

### Step 1.2: Select Plan

1. Choose **"Free"** plan
2. Click **"Continue"**

### Step 1.3: Review DNS Records (Auto-Import)

Cloudflare will scan your existing DNS records. You should see:

```
Type    Name    Content              Proxy Status
────────────────────────────────────────────────────
A       @       76.76.21.21          Proxied
CNAME   www     b9-dashboard.com     Proxied
```

**Important:** If you don't see these records, add them manually:

#### Add Root Domain (@ / apex)
- **Type:** A
- **Name:** `@`
- **IPv4 address:** `76.76.21.21` (Vercel IP)
- **Proxy status:** Proxied (orange cloud) - **We'll change this later**
- **TTL:** Auto

#### Add WWW Subdomain
- **Type:** CNAME
- **Name:** `www`
- **Target:** `b9-dashboard.com`
- **Proxy status:** Proxied (orange cloud) - **We'll change this later**
- **TTL:** Auto

Click **"Continue"** when done.

### Step 1.4: Change Nameservers at Domain Registrar

Cloudflare will show you two nameservers (example):
```
arya.ns.cloudflare.com
sam.ns.cloudflare.com
```

**Update your domain registrar** (GoDaddy, Namecheap, etc.):

#### For GoDaddy:
1. Go to GoDaddy DNS Management
2. Click **"Change Nameservers"**
3. Select **"Custom"**
4. Enter the two Cloudflare nameservers
5. Click **"Save"**

#### For other registrars:
- Look for "Nameservers", "DNS Management", or "Domain Settings"
- Change from default nameservers to Cloudflare nameservers
- Save changes

**Note:** DNS propagation can take up to 24 hours, but usually completes in 5-30 minutes.

### Step 1.5: Verify DNS Propagation

Use [whatsmydns.net](https://www.whatsmydns.net/) to check:

1. Enter `b9-dashboard.com`
2. Select **"NS"** record type
3. Click **"Search"**

You should see green checkmarks showing Cloudflare nameservers worldwide.

---

## Phase 2: SSL/TLS Configuration

### Step 2.1: Configure SSL/TLS Mode

In Cloudflare Dashboard:

1. Go to **SSL/TLS** → **Overview**
2. Select **"Flexible"** encryption mode
3. Wait for confirmation (usually instant)

**Why Flexible?**
- Client → Cloudflare: HTTPS (encrypted)
- Cloudflare → Origin: HTTP (unencrypted)
- Simplifies setup (no SSL cert needed on Nginx)

### Step 2.2: Enable HTTPS Redirects

1. Go to **SSL/TLS** → **Edge Certificates**
2. Enable **"Always Use HTTPS"** → ON
3. Enable **"Automatic HTTPS Rewrites"** → ON

### Step 2.3: Verify SSL

Wait 1-2 minutes, then test:
```bash
curl -I https://b9-dashboard.com
```

You should see `HTTP/2 200` or `HTTP/2 301/302`.

---

## Phase 3: API Subdomain Setup

### Step 3.1: Add API DNS Record

In Cloudflare DNS settings:

- **Type:** A
- **Name:** `api`
- **IPv4 address:** `91.98.91.129` (your Hetzner server IP)
- **Proxy status:** **Proxied (orange cloud)**
- **TTL:** Auto

Click **"Save"**.

### Step 3.2: Install Nginx on Hetzner Server

SSH into your Hetzner server:
```bash
ssh -i ~/.ssh/hetzner_b9 root@91.98.91.129
```

Install Nginx:
```bash
# Update package list
apt update

# Install Nginx
apt install nginx -y

# Verify installation
nginx -v
```

### Step 3.3: Create Nginx Configuration

Create configuration file:
```bash
nano /etc/nginx/sites-available/api.b9-dashboard.com
```

Paste this configuration:
```nginx
server {
    listen 80;
    server_name api.b9-dashboard.com;

    # Increase client body size for file uploads
    client_max_body_size 100M;

    location / {
        # Proxy to backend on localhost:10000
        proxy_pass http://localhost:10000;

        # HTTP version
        proxy_http_version 1.1;

        # WebSocket support
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";

        # Standard proxy headers
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Forwarded-Host $host;
        proxy_set_header X-Forwarded-Port $server_port;

        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;

        # Buffering
        proxy_buffering on;
        proxy_buffer_size 4k;
        proxy_buffers 8 4k;
        proxy_busy_buffers_size 8k;

        # Disable cache bypass
        proxy_cache_bypass $http_upgrade;
    }

    # Health check endpoint
    location /health {
        proxy_pass http://localhost:10000/health;
        proxy_set_header Host $host;
        access_log off;
    }
}
```

Save and exit (Ctrl+X, Y, Enter).

### Step 3.4: Enable Site and Test

```bash
# Create symbolic link to enable site
ln -s /etc/nginx/sites-available/api.b9-dashboard.com /etc/nginx/sites-enabled/

# Test configuration
nginx -t

# If test passes, reload Nginx
systemctl reload nginx

# Verify Nginx is running
systemctl status nginx
```

Expected output from `nginx -t`:
```
nginx: configuration file /etc/nginx/nginx.conf syntax is ok
nginx: configuration file /etc/nginx/nginx.conf test is successful
```

### Step 3.5: Update Backend Docker Container

Your backend needs to accept requests from `api.b9-dashboard.com`. Stop and recreate the container:

```bash
# Stop existing container
docker stop b9-api
docker rm b9-api

# Recreate with correct environment variables
docker run -d \
  --name b9-api \
  --restart unless-stopped \
  -p 10000:10000 \
  -e ENVIRONMENT=production \
  -e PORT=10000 \
  -e LOG_LEVEL=info \
  -e CORS_ORIGINS='https://b9-dashboard.com,https://www.b9-dashboard.com,https://api.b9-dashboard.com,http://localhost:3000' \
  -e CUSTOM_DOMAIN='*.b9-dashboard.com' \
  -e SUPABASE_URL=https://cetrhongdrjztsrsffuh.supabase.co \
  -e SUPABASE_SERVICE_ROLE_KEY=<your-key> \
  -e OPENAI_API_KEY=<your-key> \
  -e RAPIDAPI_KEY=<your-key> \
  -e R2_ACCOUNT_ID=<your-account-id> \
  -e R2_ACCESS_KEY_ID=<your-access-key> \
  -e R2_SECRET_ACCESS_KEY=<your-secret-key> \
  -e R2_BUCKET_NAME=b9-instagram-media \
  -e R2_PUBLIC_URL=https://media.b9-dashboard.com \
  -e ENABLE_R2_STORAGE=true \
  -e REDIS_HOST=127.0.0.1 \
  -e REDIS_PORT=6379 \
  -e REDIS_PASSWORD=<your-redis-password> \
  -e CRON_SECRET=<your-cron-secret> \
  b9dashboard-api:latest
```

**⚠️ IMPORTANT:** Replace `<your-key>` placeholders with actual values from `.env.api` file.

**Critical Environment Variables:**
- `CUSTOM_DOMAIN='*.b9-dashboard.com'` - Allows TrustedHostMiddleware to accept requests
- `R2_PUBLIC_URL=https://media.b9-dashboard.com` - Generates proper media URLs
- `CORS_ORIGINS` - Allows frontend to make API requests

### Step 3.6: Verify API Access

```bash
# Test API health endpoint
curl https://api.b9-dashboard.com/health

# Expected response:
# {"status":"healthy","uptime_seconds":...}
```

If you get `Invalid host header` error, check:
1. `CUSTOM_DOMAIN` environment variable is set correctly
2. Docker container restarted with new environment
3. Backend logs: `docker logs b9-api`

---

## Phase 4: Media CDN Setup (R2 Custom Domain)

### Step 4.1: Add Media DNS Record

In Cloudflare DNS settings:

- **Type:** CNAME
- **Name:** `media`
- **Target:** `pub-497baa9dc05748f98aaed739c2a5ef08.r2.dev` (your R2 dev URL)
- **Proxy status:** **Proxied (orange cloud)**
- **TTL:** Auto

Click **"Save"**.

### Step 4.2: Configure R2 Custom Domain

1. In Cloudflare Dashboard, go to **R2** → **Your Bucket** (`b9-instagram-media`)
2. Click **"Settings"** → **"Custom Domains"**
3. Click **"Connect Domain"**
4. Enter: `media.b9-dashboard.com`
5. Click **"Continue"**
6. Confirm the settings

**Note:** Cloudflare will automatically create the necessary DNS record if it doesn't exist.

### Step 4.3: Update Backend Environment

The backend is already configured with `R2_PUBLIC_URL=https://media.b9-dashboard.com` from Step 3.5.

### Step 4.4: Verify Media Access

Test by uploading a file or checking existing media:
```bash
# Test media URL (replace with actual file)
curl -I https://media.b9-dashboard.com/test.jpg
```

Expected: `HTTP/2 200` or `HTTP/2 404` (if file doesn't exist, but domain works).

---

## Phase 5: Vercel Configuration

### Step 5.1: Fix Redirect Loop (DNS Only for Vercel)

**Problem:** Vercel and Cloudflare both proxying causes `ERR_TOO_MANY_REDIRECTS`.

**Solution:** Change Vercel domains to **DNS only** mode:

In Cloudflare DNS settings:

1. Click **"Edit"** on `@` (root) A record
2. Change **Proxy status** from **Proxied (orange)** to **DNS only (gray)**
3. Click **"Save"**

4. Click **"Edit"** on `www` CNAME record
5. Change **Proxy status** from **Proxied (orange)** to **DNS only (gray)**
6. Click **"Save"**

**Final DNS Configuration:**

| Record | Content | Proxy Mode |
|--------|---------|------------|
| @ | 76.76.21.21 | **DNS only (gray)** |
| www | b9-dashboard.com | **DNS only (gray)** |
| api | 91.98.91.129 | Proxied (orange) |
| media | pub-497...r2.dev | Proxied (orange) |

### Step 5.2: Update Frontend Environment Variable

In your **local** `.env.local` (for development):
```env
NEXT_PUBLIC_API_URL=https://api.b9-dashboard.com
NEXT_PUBLIC_SUPABASE_URL=https://cetrhongdrjztsrsffuh.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-anon-key>
```

In **Vercel Dashboard** (for production):

1. Go to your project → **Settings** → **Environment Variables**
2. Update `NEXT_PUBLIC_API_URL` to: `https://api.b9-dashboard.com`
3. Click **"Save"**
4. Redeploy your app: **Deployments** → **⋯** → **"Redeploy"**

### Step 5.3: Verify Frontend

```bash
# Check frontend loads
curl -I https://b9-dashboard.com

# Expected: HTTP/2 200
```

Visit `https://b9-dashboard.com` in your browser and check:
- ✅ No Mixed Content warnings in console
- ✅ API requests work
- ✅ Images load from `media.b9-dashboard.com`

---

## Phase 6: Clean Up Old Data (Optional but Recommended)

If you're migrating from old URLs (e.g., direct R2 dev URLs), clean up:

### Step 6.1: Clear Old Media URLs from Database

**⚠️ WARNING:** This will DELETE all media URLs from your database. Only proceed if you're starting fresh.

```sql
-- Clear instagram_reels media URLs
UPDATE instagram_reels SET
  video_urls = NULL,
  cover_url = NULL,
  thumbnail_url = NULL,
  video_url = NULL;

-- Clear instagram_posts media URLs
UPDATE instagram_posts SET
  image_urls = NULL,
  video_url = NULL,
  thumbnail_url = NULL;

-- Clear instagram_creators media URLs
UPDATE instagram_creators SET
  profile_pic_url = NULL,
  profile_pic_url_hd = NULL;

-- Clear instagram_stories media URLs
UPDATE instagram_stories SET
  video_url = NULL,
  image_url = NULL,
  thumbnail_url = NULL;
```

**Note:** This preserves non-media URLs like `permalink`, `external_url`, and `bio_links`.

### Step 6.2: Clear R2 Bucket (Optional)

If you want to delete all old media files:

Create a Python script `clear_r2.py`:
```python
#!/usr/bin/env python3
import boto3
from botocore.config import Config

ACCOUNT_ID = "<your-r2-account-id>"
ACCESS_KEY_ID = "<your-r2-access-key>"
SECRET_ACCESS_KEY = "<your-r2-secret-key>"
BUCKET_NAME = "b9-instagram-media"

s3_client = boto3.client(
    's3',
    endpoint_url=f'https://{ACCOUNT_ID}.r2.cloudflarestorage.com',
    aws_access_key_id=ACCESS_KEY_ID,
    aws_secret_access_key=SECRET_ACCESS_KEY,
    config=Config(signature_version='s3v4')
)

print(f"🗑️  Clearing R2 bucket: {BUCKET_NAME}")
paginator = s3_client.get_paginator('list_objects_v2')
pages = paginator.paginate(Bucket=BUCKET_NAME)

total_deleted = 0
for page in pages:
    if 'Contents' not in page:
        print("✅ Bucket is empty")
        break

    objects_to_delete = [{'Key': obj['Key']} for obj in page['Contents']]

    if objects_to_delete:
        response = s3_client.delete_objects(
            Bucket=BUCKET_NAME,
            Delete={'Objects': objects_to_delete}
        )

        deleted_count = len(response.get('Deleted', []))
        total_deleted += deleted_count
        print(f"🗑️  Deleted {deleted_count} objects (Total: {total_deleted})")

print(f"✅ Successfully deleted {total_deleted} objects from {BUCKET_NAME}")
```

Run it:
```bash
python3 clear_r2.py
```

---

## Phase 7: Testing and Verification

### Test Checklist

Run these tests to verify everything works:

#### Frontend Tests
```bash
# ✅ Frontend loads
curl -I https://b9-dashboard.com
# Expected: HTTP/2 200

# ✅ WWW redirect works
curl -I https://www.b9-dashboard.com
# Expected: HTTP/2 200 or 301 → b9-dashboard.com

# ✅ HTTPS redirect works
curl -I http://b9-dashboard.com
# Expected: HTTP/1.1 301 → https://b9-dashboard.com
```

#### API Tests
```bash
# ✅ API health endpoint
curl https://api.b9-dashboard.com/health
# Expected: {"status":"healthy",...}

# ✅ API accepts requests
curl https://api.b9-dashboard.com/api/instagram/creators
# Expected: Valid JSON response

# ✅ CORS headers present
curl -I https://api.b9-dashboard.com/health
# Expected: access-control-allow-origin header present
```

#### Media Tests
```bash
# ✅ Media domain resolves
curl -I https://media.b9-dashboard.com/
# Expected: HTTP/2 200 or 404 (domain works)

# ✅ Test actual media file (after scraper runs)
# Check database for a media URL, then:
curl -I https://media.b9-dashboard.com/videos/2025/10/.../video.mp4
# Expected: HTTP/2 200
```

#### Browser Tests
1. ✅ Open `https://b9-dashboard.com`
2. ✅ Open DevTools → Console
3. ✅ Check for errors (no Mixed Content warnings)
4. ✅ Check Network tab → API requests use HTTPS
5. ✅ Check Images tab → Media uses `media.b9-dashboard.com`

---

## Troubleshooting

### Issue 1: "Invalid host header" (403 Error)

**Cause:** Backend's TrustedHostMiddleware rejecting requests.

**Fix:**
```bash
# Check Docker environment
docker exec b9-api env | grep CUSTOM_DOMAIN

# Should show: CUSTOM_DOMAIN=*.b9-dashboard.com
# If not, recreate container with correct environment (see Step 3.5)
```

### Issue 2: "ERR_TOO_MANY_REDIRECTS"

**Cause:** Both Cloudflare and Vercel proxying traffic.

**Fix:**
1. In Cloudflare DNS, change `@` and `www` records to **DNS only (gray cloud)**
2. Keep `api` and `media` as **Proxied (orange cloud)**
3. Wait 1-2 minutes for DNS propagation
4. Clear browser cache

### Issue 3: API Returns CORS Error

**Cause:** Frontend domain not in CORS_ORIGINS.

**Fix:**
```bash
# Check CORS configuration
docker exec b9-api env | grep CORS_ORIGINS

# Should include: https://b9-dashboard.com,https://www.b9-dashboard.com
# If not, recreate container with correct CORS_ORIGINS (see Step 3.5)
```

### Issue 4: Media URLs Return 404

**Cause:** R2 custom domain not configured correctly.

**Fix:**
1. In Cloudflare R2, verify custom domain `media.b9-dashboard.com` is connected
2. Check DNS record: `media` CNAME → `pub-497...r2.dev` is **Proxied**
3. Wait 5 minutes for DNS propagation
4. Test with existing R2 object

### Issue 5: Nginx 502 Bad Gateway

**Cause:** Backend Docker container not running.

**Fix:**
```bash
# Check container status
docker ps | grep b9-api

# If not running, start it
docker start b9-api

# Check logs
docker logs b9-api --tail 50

# Restart Nginx
systemctl reload nginx
```

For more issues, see: [TROUBLESHOOTING.md](TROUBLESHOOTING.md)

---

## Maintenance

### Nginx Logs
```bash
# Access logs
tail -f /var/log/nginx/access.log

# Error logs
tail -f /var/log/nginx/error.log

# Filter for API subdomain
grep "api.b9-dashboard.com" /var/log/nginx/access.log
```

### Docker Logs
```bash
# Real-time logs
docker logs b9-api -f

# Last 100 lines
docker logs b9-api --tail 100

# Filter for errors
docker logs b9-api 2>&1 | grep ERROR
```

### DNS Monitoring
```bash
# Check DNS resolution
dig api.b9-dashboard.com
dig media.b9-dashboard.com

# Check nameservers
dig NS b9-dashboard.com

# Check from different location
https://www.whatsmydns.net/
```

---

## Security Best Practices

### 1. Environment Variables
- ✅ Never commit `.env.*` files to Git
- ✅ Use strong passwords for REDIS_PASSWORD and CRON_SECRET
- ✅ Rotate API keys periodically
- ✅ Keep `.env.api` and `.env.worker` files as backup

### 2. Cloudflare Security
- ✅ Enable "Always Use HTTPS"
- ✅ Enable "Automatic HTTPS Rewrites"
- ✅ Consider enabling "Bot Fight Mode" (free tier)
- ✅ Review Firewall Rules periodically

### 3. Nginx Security
- ✅ Keep Nginx updated: `apt update && apt upgrade nginx`
- ✅ Review access logs for suspicious activity
- ✅ Limit client_max_body_size to prevent abuse
- ✅ Consider adding rate limiting

### 4. Docker Security
- ✅ Run containers with `--restart unless-stopped`
- ✅ Don't expose internal ports (10000 only on localhost)
- ✅ Review container logs regularly
- ✅ Keep Docker images updated

---

## Next Steps

After completing this setup:

1. ✅ Test all functionality thoroughly
2. ✅ Run Instagram scraper to populate with new media URLs
3. ✅ Monitor logs for 24 hours for any errors
4. ✅ Set up monitoring/alerting (optional)
5. ✅ Update all documentation references

---

## Related Documentation

- [INFRASTRUCTURE.md](../../INFRASTRUCTURE.md) - Architecture overview
- [TROUBLESHOOTING.md](TROUBLESHOOTING.md) - Detailed troubleshooting
- [DEPLOYMENT.md](DEPLOYMENT.md) - Deployment procedures
- [Hetzner Deployment](../backend/deployment/hetzner-deployment.md) - Server details

---

**Last Updated:** 2025-10-10
**Version:** 2.0
**Maintained By:** B9 Agency Development Team
