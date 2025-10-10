# Infrastructure Troubleshooting Guide

```
┌─ TROUBLESHOOTING CENTER ────────────────────────────────┐
│ Common Issues & Solutions for Production Infrastructure │
│ Last Updated: 2025-10-10 | Version: 2.0                 │
└─────────────────────────────────────────────────────────┘
```

## Navigation

```json
{
  "parent": "../../CLAUDE.md",
  "current": "TROUBLESHOOTING.md",
  "siblings": [
    {"path": "PRODUCTION_SETUP.md", "desc": "Setup guide", "status": "REFERENCE"},
    {"path": "DEPLOYMENT.md", "desc": "Deployment procedures", "status": "REFERENCE"}
  ],
  "related": [
    {"path": "../../INFRASTRUCTURE.md", "desc": "Architecture overview", "status": "REFERENCE"}
  ]
}
```

## Quick Diagnostic Commands

```bash
## Health Checks
curl https://b9-dashboard.com/api/health          # Frontend
curl https://api.b9-dashboard.com/health          # API
curl -I https://media.b9-dashboard.com/           # Media CDN

## DNS Verification
dig b9-dashboard.com
dig api.b9-dashboard.com
dig media.b9-dashboard.com
dig NS b9-dashboard.com                           # Check nameservers

## Server Status (SSH to Hetzner)
ssh -i ~/.ssh/hetzner_b9 root@91.98.91.129
docker ps | grep b9-api                           # Check container
docker logs b9-api --tail 100                     # View logs
systemctl status nginx                            # Check Nginx
nginx -t                                          # Test Nginx config
```

---

## Issue 1: "Invalid host header" (403 Error)

### Symptoms
```
HTTP/2 403
Invalid host header
```

API requests return 403 Forbidden with "Invalid host header" error message.

### Root Cause
FastAPI's `TrustedHostMiddleware` is rejecting requests from domains not in the allowed hosts list. The backend validates the `Host` header for security.

### Diagnosis
```bash
# SSH into Hetzner server
ssh -i ~/.ssh/hetzner_b9 root@91.98.91.129

# Check if CUSTOM_DOMAIN is set correctly
docker exec b9-api env | grep CUSTOM_DOMAIN

# Expected output:
# CUSTOM_DOMAIN=*.b9-dashboard.com

# Check backend logs
docker logs b9-api --tail 50 | grep -i "trusted\|host"
```

### Solution

1. **Verify Environment Variable:**
```bash
docker exec b9-api env | grep CUSTOM_DOMAIN
```

If missing or incorrect, recreate the container with correct environment:

```bash
# Stop and remove container
docker stop b9-api
docker rm b9-api

# Recreate with CUSTOM_DOMAIN
docker run -d \
  --name b9-api \
  --restart unless-stopped \
  -p 10000:10000 \
  -e CUSTOM_DOMAIN='*.b9-dashboard.com' \
  -e CORS_ORIGINS='https://b9-dashboard.com,https://www.b9-dashboard.com' \
  # ... (other env vars from .env.api)
  b9dashboard-api:latest
```

2. **Verify the fix:**
```bash
curl https://api.b9-dashboard.com/health
# Expected: {"status":"healthy","uptime_seconds":...}
```

### Prevention
- Always reference `.env.api` file when recreating Docker containers
- Document all required environment variables

---

## Issue 2: "ERR_TOO_MANY_REDIRECTS"

### Symptoms
```
This page isn't working
b9-dashboard.com redirected you too many times.
ERR_TOO_MANY_REDIRECTS
```

Frontend cannot load, browser shows infinite redirect loop error.

### Root Cause
Both Cloudflare and Vercel are trying to proxy traffic, creating a redirect loop:
- Vercel expects direct connection for DDoS protection
- Cloudflare proxy intercepts and forwards request
- Vercel redirects to HTTPS
- Loop repeats

### Diagnosis
```bash
# Check Cloudflare DNS settings
curl -I https://b9-dashboard.com

# Check for warning in Vercel Dashboard:
# "Proxy Detected: Using a proxy in front of Vercel prevents..."
```

### Solution

In Cloudflare Dashboard → DNS:

1. **Edit root domain (@) A record:**
   - Click "Edit" on `@` record
   - Change **Proxy status** from **Proxied (orange cloud)** to **DNS only (gray cloud)**
   - Click "Save"

2. **Edit www CNAME record:**
   - Click "Edit" on `www` record
   - Change **Proxy status** from **Proxied (orange cloud)** to **DNS only (gray cloud)**
   - Click "Save"

**Final DNS Configuration:**

| Record | Content | Proxy Mode | Purpose |
|--------|---------|------------|---------|
| @ | 76.76.21.21 | **DNS only (gray)** | Vercel direct |
| www | b9-dashboard.com | **DNS only (gray)** | Vercel direct |
| api | 91.98.91.129 | Proxied (orange) | Cloudflare protection |
| media | pub-497...r2.dev | Proxied (orange) | R2 routing |

3. **Verify the fix:**
```bash
# Wait 1-2 minutes for DNS propagation
curl -I https://b9-dashboard.com
# Expected: HTTP/2 200
```

4. **Clear browser cache:**
```
Chrome: Ctrl+Shift+Delete → Clear browsing data
```

### Prevention
- Keep Vercel domains on **DNS only** mode
- Only proxy API and media subdomains through Cloudflare

---

## Issue 3: CORS Errors from API

### Symptoms
```javascript
// Browser Console
Access to fetch at 'https://api.b9-dashboard.com/api/...' from origin
'https://b9-dashboard.com' has been blocked by CORS policy
```

### Root Cause
Frontend domain not included in `CORS_ORIGINS` environment variable.

### Diagnosis
```bash
# Check CORS configuration
docker exec b9-api env | grep CORS_ORIGINS

# Test CORS headers
curl -I -H "Origin: https://b9-dashboard.com" \
  https://api.b9-dashboard.com/health

# Should see:
# access-control-allow-origin: https://b9-dashboard.com
```

### Solution

Update Docker container with correct CORS origins:

```bash
docker stop b9-api
docker rm b9-api

docker run -d \
  --name b9-api \
  --restart unless-stopped \
  -p 10000:10000 \
  -e CORS_ORIGINS='https://b9-dashboard.com,https://www.b9-dashboard.com,https://api.b9-dashboard.com,http://localhost:3000' \
  # ... (other env vars)
  b9dashboard-api:latest
```

**Required Origins:**
- `https://b9-dashboard.com` - Production frontend
- `https://www.b9-dashboard.com` - WWW subdomain
- `https://api.b9-dashboard.com` - API docs/Swagger
- `http://localhost:3000` - Local development

### Verification
```bash
curl -I -H "Origin: https://b9-dashboard.com" \
  https://api.b9-dashboard.com/health | grep -i access-control
```

---

## Issue 4: Media URLs Return 404

### Symptoms
```
https://media.b9-dashboard.com/videos/2025/10/.../video.mp4
HTTP/2 404 Not Found
```

Images and videos from R2 return 404 errors.

### Root Cause
1. R2 custom domain not configured correctly
2. Object doesn't exist in bucket
3. DNS not propagated

### Diagnosis

**Step 1: Verify DNS**
```bash
dig media.b9-dashboard.com

# Should show CNAME → pub-497baa9dc05748f98aaed739c2a5ef08.r2.dev
```

**Step 2: Check R2 Custom Domain**
```bash
# In Cloudflare Dashboard:
# R2 → b9-instagram-media → Settings → Custom Domains
# Should show: media.b9-dashboard.com (Connected)
```

**Step 3: Test R2 Direct URL**
```bash
# If media.b9-dashboard.com/file.mp4 fails, try:
curl -I https://pub-497baa9dc05748f98aaed739c2a5ef08.r2.dev/file.mp4

# If this works, DNS/custom domain issue
# If this fails, object doesn't exist
```

### Solution

**If DNS Issue:**
1. In Cloudflare DNS, verify CNAME record:
   - **Name:** `media`
   - **Target:** `pub-497baa9dc05748f98aaed739c2a5ef08.r2.dev`
   - **Proxy:** Proxied (orange cloud)
2. Wait 5-10 minutes for propagation

**If Custom Domain Not Connected:**
1. Go to Cloudflare R2 → b9-instagram-media → Settings
2. Click "Custom Domains" → "Connect Domain"
3. Enter `media.b9-dashboard.com`
4. Click "Continue"

**If Object Doesn't Exist:**
- The scraper hasn't uploaded this file yet
- Check `instagram_reels` table for correct URL
- Run scraper to populate media

### Verification
```bash
# Test with known file
curl -I https://media.b9-dashboard.com/

# Check backend logs for R2 uploads
docker logs b9-api | grep "Uploaded to R2"
```

---

## Issue 5: Nginx 502 Bad Gateway

### Symptoms
```
HTTP/1.1 502 Bad Gateway
Server: nginx
```

API endpoint returns 502 when accessed via `https://api.b9-dashboard.com`.

### Root Cause
Nginx cannot connect to backend on `localhost:10000`:
- Docker container not running
- Container crashed
- Port mismatch

### Diagnosis
```bash
# SSH to server
ssh -i ~/.ssh/hetzner_b9 root@91.98.91.129

# Check container status
docker ps | grep b9-api

# If not running, check why
docker logs b9-api --tail 100

# Check if port 10000 is listening
lsof -i :10000

# Test local connection
curl http://localhost:10000/health
```

### Solution

**If container stopped:**
```bash
docker start b9-api
docker logs b9-api -f  # Watch startup
```

**If container crashed:**
```bash
# Check logs for error
docker logs b9-api --tail 200

# Common issues:
# - Missing environment variable
# - Database connection failure
# - Redis connection failure

# Recreate container with correct config
docker stop b9-api && docker rm b9-api
docker run -d --name b9-api ... b9dashboard-api:latest
```

**If Nginx config issue:**
```bash
# Test Nginx configuration
nginx -t

# Check Nginx error logs
tail -f /var/log/nginx/error.log

# Reload Nginx
systemctl reload nginx
```

### Verification
```bash
# Test local API
curl http://localhost:10000/health

# Test via Nginx
curl https://api.b9-dashboard.com/health

# Check Nginx logs
tail -f /var/log/nginx/access.log
```

---

## Issue 6: DNS Not Propagating

### Symptoms
```bash
dig api.b9-dashboard.com
# Returns SERVFAIL or old IP
```

DNS changes not visible after 30+ minutes.

### Root Cause
- Nameserver change not complete
- Cached DNS records
- Incorrect DNS records

### Diagnosis
```bash
# Check nameservers
dig NS b9-dashboard.com

# Expected:
# arya.ns.cloudflare.com
# sam.ns.cloudflare.com

# Check from multiple locations
# Visit: https://www.whatsmydns.net/
# Enter: b9-dashboard.com
# Type: A or CNAME
```

### Solution

**If Nameservers Not Updated:**
1. Go to your domain registrar (GoDaddy, Namecheap, etc.)
2. Find DNS/Nameserver settings
3. Change to Cloudflare nameservers shown in Cloudflare dashboard
4. Save changes
5. Wait 1-24 hours (usually 5-30 minutes)

**If DNS Records Wrong:**
1. In Cloudflare Dashboard → DNS
2. Verify records match:
```
Type    Name    Content              Proxy
────────────────────────────────────────────
A       @       76.76.21.21          DNS only
CNAME   www     b9-dashboard.com     DNS only
A       api     91.98.91.129         Proxied
CNAME   media   pub-497...r2.dev     Proxied
```
3. Click "Edit" to fix any incorrect records
4. Wait 5 minutes for propagation

**Clear Local DNS Cache:**
```bash
# macOS
sudo dscacheutil -flushcache

# Linux
sudo systemd-resolve --flush-caches

# Windows
ipconfig /flushdns
```

### Verification
```bash
# Check propagation globally
curl https://www.whatsmydns.net/api/check\?query\=api.b9-dashboard.com\&type\=A

# Test local resolution
dig api.b9-dashboard.com +short
# Expected: Cloudflare IP (if proxied) or 91.98.91.129
```

---

## Issue 7: SSL/TLS Certificate Errors

### Symptoms
```
ERR_CERT_COMMON_NAME_INVALID
NET::ERR_CERT_AUTHORITY_INVALID
```

Browser shows SSL certificate warning.

### Root Cause
- SSL not provisioned yet
- Cloudflare SSL mode incorrect
- Domain not verified

### Diagnosis
```bash
# Check SSL status
curl -I https://api.b9-dashboard.com

# Should see: HTTP/2 200
# If error, check certificate:
openssl s_client -connect api.b9-dashboard.com:443 -servername api.b9-dashboard.com
```

### Solution

**In Cloudflare Dashboard:**

1. Go to **SSL/TLS** → **Overview**
2. Ensure mode is **Flexible** (not Full or Strict)
3. Go to **Edge Certificates**
4. Verify **Always Use HTTPS** is ON
5. Wait 5 minutes for certificate provisioning

**If still failing:**
```bash
# Check if domain is active in Cloudflare
# Status should be "Active" not "Pending"
```

### Verification
```bash
curl -I https://api.b9-dashboard.com
# Should return HTTP/2 200

# Test in browser (no warning)
https://api.b9-dashboard.com/health
```

---

## Issue 8: Environment Variables Not Loading

### Symptoms
```
docker logs b9-api | grep ERROR
# Missing configuration values
# API key errors
# R2 upload failures
```

### Root Cause
Docker container created without required environment variables.

### Diagnosis
```bash
# List all environment variables
docker exec b9-api env | sort

# Check specific vars
docker exec b9-api env | grep -E 'CUSTOM_DOMAIN|R2_PUBLIC_URL|RAPIDAPI_KEY|CORS_ORIGINS'
```

### Solution

**Always use `.env.api` and `.env.worker` files as reference:**

```bash
# On local machine, read the files
cat .env.api
cat .env.worker

# Recreate container with ALL variables
docker stop b9-api && docker rm b9-api

docker run -d \
  --name b9-api \
  --restart unless-stopped \
  -p 10000:10000 \
  -e ENVIRONMENT=production \
  -e PORT=10000 \
  -e CUSTOM_DOMAIN='*.b9-dashboard.com' \
  -e CORS_ORIGINS='https://b9-dashboard.com,https://www.b9-dashboard.com' \
  -e R2_PUBLIC_URL=https://media.b9-dashboard.com \
  -e RAPIDAPI_KEY=<from-.env.api> \
  -e SUPABASE_URL=<from-.env.api> \
  -e SUPABASE_SERVICE_ROLE_KEY=<from-.env.api> \
  -e OPENAI_API_KEY=<from-.env.api> \
  -e R2_ACCOUNT_ID=<from-.env.api> \
  -e R2_ACCESS_KEY_ID=<from-.env.api> \
  -e R2_SECRET_ACCESS_KEY=<from-.env.api> \
  -e R2_BUCKET_NAME=b9-instagram-media \
  -e ENABLE_R2_STORAGE=true \
  -e REDIS_HOST=127.0.0.1 \
  -e REDIS_PORT=6379 \
  -e REDIS_PASSWORD=<from-.env.api> \
  -e CRON_SECRET=<from-.env.api> \
  b9dashboard-api:latest
```

### Verification
```bash
# Check all critical vars are set
docker exec b9-api env | grep -E 'CUSTOM_DOMAIN|R2_PUBLIC_URL|RAPIDAPI_KEY' | wc -l
# Should return: 3

# Test API
curl https://api.b9-dashboard.com/health
```

---

## Issue 9: Frontend Can't Connect to API

### Symptoms
```javascript
// Browser Console
Failed to fetch
Network error
TypeError: Failed to fetch
```

### Root Cause
- `NEXT_PUBLIC_API_URL` not set correctly
- CORS issue
- API not running

### Diagnosis
```bash
# Check frontend environment
# In Vercel Dashboard → Settings → Environment Variables
# NEXT_PUBLIC_API_URL should be: https://api.b9-dashboard.com

# Test API directly
curl https://api.b9-dashboard.com/health

# Check browser Network tab
# Look for failed requests to API
```

### Solution

**Update Frontend Environment:**

1. In Vercel Dashboard:
   - Go to your project → **Settings** → **Environment Variables**
   - Find `NEXT_PUBLIC_API_URL`
   - Update to: `https://api.b9-dashboard.com`
   - Click **Save**

2. Redeploy:
   - Go to **Deployments**
   - Click **⋯** on latest deployment
   - Click **"Redeploy"**

**Update Local Development:**
```bash
# Edit dashboard/.env.local
NEXT_PUBLIC_API_URL=https://api.b9-dashboard.com
```

### Verification
```bash
# Check in browser console
console.log(process.env.NEXT_PUBLIC_API_URL)
// Should show: https://api.b9-dashboard.com

# Test API call
fetch('https://api.b9-dashboard.com/health')
  .then(r => r.json())
  .then(console.log)
```

---

## Monitoring & Logs

### Backend Logs
```bash
# SSH to Hetzner
ssh -i ~/.ssh/hetzner_b9 root@91.98.91.129

# Real-time logs
docker logs b9-api -f

# Last 100 lines
docker logs b9-api --tail 100

# Filter for errors
docker logs b9-api 2>&1 | grep -i error

# Filter for R2 uploads
docker logs b9-api 2>&1 | grep "Uploaded to R2"
```

### Nginx Logs
```bash
# Access logs (all requests)
tail -f /var/log/nginx/access.log

# Error logs
tail -f /var/log/nginx/error.log

# Filter for API requests
grep "api.b9-dashboard.com" /var/log/nginx/access.log
```

### Frontend Logs (Vercel)
```bash
# View in Vercel Dashboard:
# Project → Deployments → Click deployment → View Function Logs

# Or use Vercel CLI:
vercel logs
```

### DNS Monitoring
```bash
# Check global propagation
https://www.whatsmydns.net/

# Check nameservers
dig NS b9-dashboard.com

# Check specific records
dig api.b9-dashboard.com
dig media.b9-dashboard.com
```

---

## Quick Reference

### Production URLs
```
Frontend:  https://b9-dashboard.com
API:       https://api.b9-dashboard.com
Media CDN: https://media.b9-dashboard.com
API Docs:  https://api.b9-dashboard.com/docs
```

### Server Access
```bash
# Hetzner Server
ssh -i ~/.ssh/hetzner_b9 root@91.98.91.129

# View Docker Containers
docker ps

# View Backend Logs
docker logs b9-api -f
```

### Key Environment Variables
```
CUSTOM_DOMAIN='*.b9-dashboard.com'
R2_PUBLIC_URL=https://media.b9-dashboard.com
CORS_ORIGINS='https://b9-dashboard.com,https://www.b9-dashboard.com'
```

### Critical Files
```
Nginx Config:  /etc/nginx/sites-available/api.b9-dashboard.com
Environment:   .env.api (local repo, gitignored)
Logs:          /var/log/nginx/error.log
```

---

## Getting Help

If you encounter an issue not covered here:

1. **Check logs first:**
   - Backend: `docker logs b9-api --tail 200`
   - Nginx: `tail -f /var/log/nginx/error.log`

2. **Verify DNS:**
   - https://www.whatsmydns.net/

3. **Test health endpoints:**
   - `curl https://b9-dashboard.com/api/health`
   - `curl https://api.b9-dashboard.com/health`

4. **Review recent changes:**
   - Check `docs/development/SESSION_LOG.md`
   - Review git commits

5. **Consult documentation:**
   - [INFRASTRUCTURE.md](../../INFRASTRUCTURE.md)
   - [PRODUCTION_SETUP.md](PRODUCTION_SETUP.md)

---

**Last Updated:** 2025-10-10
**Version:** 1.0
**Maintained By:** B9 Agency Development Team
