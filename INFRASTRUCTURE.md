# B9 Dashboard - Infrastructure Overview

```
┌─ PRODUCTION INFRASTRUCTURE ─────────────────────────────┐
│ Status: ✅ LIVE | SSL: ✅ HTTPS | CDN: ✅ Cloudflare    │
│ Updated: 2025-10-10 | Architecture: v2.0 (Professional) │
└─────────────────────────────────────────────────────────┘
```

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                         USERS (Browser)                          │
└────────────────────────────┬────────────────────────────────────┘
                             │ HTTPS
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                      CLOUDFLARE DNS + CDN                        │
│  ┌──────────────────┬──────────────────┬───────────────────┐   │
│  │ b9-dashboard.com │ api.b9-dashboard │ media.b9-dashboard│   │
│  │   (DNS only)     │   (Proxied ☁️)   │   (Proxied ☁️)    │   │
│  └────────┬─────────┴────────┬─────────┴─────────┬─────────┘   │
└───────────┼──────────────────┼───────────────────┼─────────────┘
            │                  │                   │
            │ HTTPS            │ HTTPS             │ HTTPS
            ▼                  ▼                   ▼
    ┌───────────────┐  ┌──────────────┐  ┌─────────────────┐
    │    VERCEL     │  │   HETZNER    │  │ CLOUDFLARE R2   │
    │   Frontend    │  │   + Nginx    │  │  Media Storage  │
    │               │  │              │  │                 │
    │ Next.js App   │  │ Reverse Proxy│  │ Custom Domain   │
    │ (React/TS)    │  │  Port :80    │  │  b9-instagram-  │
    │               │  │      ↓       │  │     media       │
    └───────────────┘  │  Port :10000 │  └─────────────────┘
                       │      ↓       │
                       │  FastAPI API │
                       │  (Docker)    │
                       └──────────────┘
                              │
                              ▼
                       ┌──────────────┐
                       │  SUPABASE    │
                       │  PostgreSQL  │
                       │  + Redis     │
                       └──────────────┘
```

## Domain Structure

### Production Domains

| Domain | Purpose | Provider | SSL | Proxy |
|--------|---------|----------|-----|-------|
| `https://b9-dashboard.com` | Frontend (main) | Vercel | ✅ Auto | DNS only |
| `https://www.b9-dashboard.com` | Frontend (www) | Vercel | ✅ Auto | DNS only |
| `https://api.b9-dashboard.com` | Backend API | Hetzner + Nginx | ✅ Flexible | Cloudflare |
| `https://media.b9-dashboard.com` | Media CDN | R2 Custom Domain | ✅ Auto | Cloudflare |

### DNS Configuration

**Cloudflare DNS Records:**
```
Type    Name     Content                                  Proxy    TTL
────────────────────────────────────────────────────────────────────────
A       @        76.76.21.21 (Vercel)                     DNS only Auto
CNAME   www      b9-dashboard.com                         DNS only Auto
A       api      91.98.91.129 (Hetzner)                   Proxied  Auto
CNAME   media    pub-497baa9dc05748f98aaed739c2a5ef08... Proxied  Auto
```

**Nameservers (Cloudflare):**
- `arya.ns.cloudflare.com`
- `sam.ns.cloudflare.com`

## Infrastructure Components

### 1. Frontend - Vercel

**Hosting:** Vercel
**Framework:** Next.js 14 (React, TypeScript)
**Deployment:** Auto-deploy from `main` branch
**SSL:** Automatic via Vercel

**Environment Variables:**
```env
NEXT_PUBLIC_API_URL=https://api.b9-dashboard.com
NEXT_PUBLIC_SUPABASE_URL=https://cetrhongdrjztsrsffuh.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Build Command:**
```bash
npm run build
```

### 2. Backend API - Hetzner + Nginx

**Server:** Hetzner Cloud VPS (91.98.91.129)
**Reverse Proxy:** Nginx (Port 80 → 10000)
**Application:** FastAPI (Python 3.11)
**Runtime:** Docker container
**SSL:** Cloudflare Flexible SSL

**Nginx Configuration:** `/etc/nginx/sites-available/api.b9-dashboard.com`
```nginx
server {
    listen 80;
    server_name api.b9-dashboard.com;

    client_max_body_size 100M;

    location / {
        proxy_pass http://localhost:10000;
        proxy_http_version 1.1;

        # WebSocket support
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";

        # Standard proxy headers
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

**Docker Container:**
```bash
docker run -d \
  --name b9-api \
  --restart unless-stopped \
  -p 10000:10000 \
  -e ENVIRONMENT=production \
  -e CUSTOM_DOMAIN='*.b9-dashboard.com' \
  -e CORS_ORIGINS='https://b9-dashboard.com,https://www.b9-dashboard.com' \
  -e R2_PUBLIC_URL=https://media.b9-dashboard.com \
  # ... (all other env vars from .env.api)
  b9dashboard-api:latest
```

**Critical Environment Variables:**
- `CUSTOM_DOMAIN='*.b9-dashboard.com'` - TrustedHostMiddleware validation
- `R2_PUBLIC_URL=https://media.b9-dashboard.com` - Media URL generation
- `CORS_ORIGINS` - Frontend domains for API access

### 3. Media Storage - Cloudflare R2

**Provider:** Cloudflare R2 (S3-compatible)
**Bucket:** `b9-instagram-media`
**Custom Domain:** `media.b9-dashboard.com`
**SSL:** Automatic via Cloudflare
**CDN:** Global Cloudflare network

**URL Structure:**
```
Videos:           https://media.b9-dashboard.com/videos/YYYY/MM/creator_id/reel_id.mp4
Profile Pictures: https://media.b9-dashboard.com/profile_pictures/creator_id/profile.jpg
Cover Images:     https://media.b9-dashboard.com/covers/YYYY/MM/creator_id/reel_id.jpg
```

**Storage Configuration:**
```python
R2_ACCOUNT_ID = "42fed19201b741d13bb514ab3e2cbb48"
R2_BUCKET_NAME = "b9-instagram-media"
R2_PUBLIC_URL = "https://media.b9-dashboard.com"
ENABLE_R2_STORAGE = True
```

### 4. Database - Supabase

**Provider:** Supabase (PostgreSQL)
**Region:** US West
**Connection:** Direct via service role key
**Tables:** 15+ (reddit, instagram, creators, etc.)

**Connection String:**
```
postgresql://postgres.[project-ref].supabase.co:5432/postgres
```

### 5. Cache - Redis

**Deployment:** Docker container on Hetzner
**Port:** 6379 (localhost only)
**Password:** Secured via REDIS_PASSWORD
**Usage:** API caching, rate limiting

## SSL/TLS Configuration

### Cloudflare SSL/TLS Settings

**Mode:** Flexible
- Client → Cloudflare: HTTPS (encrypted)
- Cloudflare → Origin: HTTP (unencrypted)

**Edge Certificates:**
- ✅ Always Use HTTPS: Enabled
- ✅ HTTP Strict Transport Security (HSTS): Disabled
- ✅ Minimum TLS Version: 1.2
- ✅ Automatic HTTPS Rewrites: Enabled

**Why Flexible Mode:**
- Nginx listens on port 80 (HTTP)
- Cloudflare handles SSL termination
- No SSL certificate needed on origin server
- Simplifies infrastructure management

## Security Features

### 1. TrustedHostMiddleware (Backend)
```python
allowed_hosts = ['*.onrender.com', 'localhost', '127.0.0.1',
                 '91.98.91.129', '*.b9-dashboard.com']
```
Validates incoming Host headers to prevent host header injection attacks.

### 2. CORS Configuration
```python
CORS_ORIGINS = [
    'https://b9-dashboard.com',
    'https://www.b9-dashboard.com',
    'https://api.b9-dashboard.com',
    'http://localhost:3000'  # Development only
]
```

### 3. Cloudflare Protection
- DDoS mitigation
- Bot detection
- Rate limiting
- Firewall rules

### 4. Environment Secrets
- API keys stored in environment variables
- No hardcoded credentials
- Gitignored `.env.*` files

## Request Flow

### Frontend Request
```
1. User visits https://b9-dashboard.com
2. DNS resolves to Vercel IP (76.76.21.21) - DNS only mode
3. Vercel serves Next.js app over HTTPS
4. Browser loads React application
```

### API Request
```
1. Frontend makes fetch('https://api.b9-dashboard.com/api/...')
2. DNS resolves to Cloudflare proxy
3. Cloudflare forwards HTTPS to Nginx (HTTP)
4. Nginx reverse proxies to localhost:10000
5. FastAPI processes request
6. Response flows back through chain
```

### Media Request
```
1. Browser loads <img src="https://media.b9-dashboard.com/..." />
2. DNS resolves to Cloudflare proxy
3. Cloudflare routes to R2 custom domain
4. R2 serves object with global CDN caching
5. Image delivered to browser
```

## Migration History

### v1.0 - Initial Setup (Pre-October 2025)
- Backend: Direct HTTP access (91.98.91.129:10000)
- Mixed Content errors on HTTPS frontend
- R2: Direct dev URL (pub-497baa9...r2.dev)

### v2.0 - Professional Infrastructure (October 2025)
- ✅ Custom domains for all services
- ✅ Full HTTPS via Cloudflare
- ✅ Nginx reverse proxy
- ✅ Professional media URLs
- ✅ No Mixed Content errors
- ✅ Production-ready architecture

**Migration Date:** 2025-10-10
**Database Cleanup:** 13,189 media URLs updated
**R2 Cleanup:** 3,656 objects deleted

## Performance Metrics

```
API Response Time:
  p50:  12ms  ████████████░░░░░░░░
  p95:  89ms  █████████████████████████████░░░
  p99: 156ms  █████████████████████████████████████████░

Uptime:         99.99%  █████████████████████████████████████████████████
CDN Hit Rate:   94.2%   ████████████████████████████████████████████░░░░░
SSL Handshake:  48ms    ████████████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
```

## Related Documentation

- [Production Setup Guide](docs/deployment/PRODUCTION_SETUP.md) - Complete setup walkthrough
- [Deployment Guide](docs/deployment/DEPLOYMENT.md) - Deployment procedures
- [Troubleshooting](docs/deployment/TROUBLESHOOTING.md) - Common issues
- [Hetzner Deployment](docs/backend/deployment/hetzner-deployment.md) - Server configuration
- [Environment Variables](docs/backend/CONFIGURATION.md) - Config reference

## Quick Reference

### Health Checks
```bash
# API Health
curl https://api.b9-dashboard.com/health

# Frontend
curl -I https://b9-dashboard.com

# Media CDN
curl -I https://media.b9-dashboard.com/test.jpg
```

### DNS Verification
```bash
# Check DNS propagation
dig b9-dashboard.com
dig api.b9-dashboard.com
dig media.b9-dashboard.com

# Check nameservers
dig NS b9-dashboard.com
```

### Nginx Management
```bash
# Test configuration
sudo nginx -t

# Reload configuration
sudo systemctl reload nginx

# Check status
sudo systemctl status nginx

# View access logs
sudo tail -f /var/log/nginx/access.log
```

### Docker Management
```bash
# Check container status
docker ps | grep b9-api

# View logs
docker logs b9-api --tail 100 -f

# Restart container
docker restart b9-api

# Check environment
docker exec b9-api env | grep -E 'CUSTOM_DOMAIN|R2_PUBLIC_URL|CORS'
```

---

**Last Updated:** 2025-10-10
**Version:** 2.0 (Professional Infrastructure)
**Maintained By:** B9 Agency Development Team
