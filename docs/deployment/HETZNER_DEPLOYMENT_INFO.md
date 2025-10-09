# Hetzner Deployment Information

**Project**: B9 Dashboard Production
**Created**: 2025-10-08
**Status**: ✅ OPERATIONAL
**Deployment Completed**: 2025-10-08 15:01 UTC

---

## Server Details

### API Server
- **Name**: `b9-api-server`
- **IP Address**: `91.98.91.129`
- **Type**: CPX11 (Shared vCPU)
- **Specs**: 2 vCPU AMD, 2 GB RAM, 40 GB SSD
- **Location**: Falkenstein, Germany (eu-central)
- **Cost**: €3.85/month
- **Purpose**: FastAPI application + Redis server

**SSH Access**:
```bash
ssh -i ~/.ssh/hetzner_b9 root@91.98.91.129
```

---

### Worker Server 1
- **Name**: `b9-worker-1`
- **IP Address**: `188.245.232.203`
- **Type**: CPX31 (Shared vCPU)
- **Specs**: 4 vCPU AMD, 8 GB RAM, 160 GB SSD
- **Location**: Falkenstein, Germany (eu-central)
- **Cost**: €13.10/month
- **Purpose**: Instagram scraper worker (pulls from Redis queue)

**SSH Access**:
```bash
ssh -i ~/.ssh/hetzner_b9 root@188.245.232.203
```

---

### Worker Server 2
- **Name**: `b9-worker-2`
- **IP Address**: `91.98.92.192`
- **Type**: CPX31 (Shared vCPU)
- **Specs**: 4 vCPU AMD, 8 GB RAM, 160 GB SSD
- **Location**: Falkenstein, Germany (eu-central)
- **Cost**: €13.10/month
- **Purpose**: Instagram scraper worker (pulls from Redis queue)

**SSH Access**:
```bash
ssh -i ~/.ssh/hetzner_b9 root@91.98.92.192
```

---

## Total Cost Breakdown

| Component | Quantity | Unit Cost | Total |
|-----------|----------|-----------|-------|
| API Server (CPX11) | 1× | €3.85/mo | €3.85/mo |
| Workers (CPX31) | 2× | €13.10/mo | €26.20/mo |
| **TOTAL** | **3 servers** | | **€30.05/mo** |

**Annual Cost**: €360.60 (~$394/year)

**Compared to Render**:
- Render: $625/month = $7,500/year
- Hetzner: €30/month = $394/year
- **Savings**: $7,106/year (94.7% cost reduction!)

---

## SSH Configuration

**SSH Key Location**: `~/.ssh/hetzner_b9` (private key)
**Public Key**: `~/.ssh/hetzner_b9.pub`
**Email**: b9agencija@gmail.com
**Key Type**: ED25519

**Hetzner SSH Key Name**: `b9-dashboard-key`

---

## Network Configuration

### Public IPs
- All servers have public IPv4 addresses
- All servers have public IPv6 addresses (free)

### Internal Communication
- Workers connect to API server Redis: `91.98.91.129:6379`
- Redis password protected (set in environment variables)

### Ports Required
- **API Server**:
  - 22 (SSH)
  - 80 (HTTP)
  - 443 (HTTPS)
  - 10000 (FastAPI)
  - 6379 (Redis - only from worker IPs)

- **Workers**:
  - 22 (SSH)
  - Outbound to API server Redis
  - Outbound to Supabase, R2, Instagram

---

## Environment Variables

### API Server (.env)
```bash
# Supabase
SUPABASE_URL=your_value_here
SUPABASE_SERVICE_ROLE_KEY=your_value_here

# OpenAI
OPENAI_API_KEY=your_value_here

# RapidAPI
RAPIDAPI_KEY=your_value_here

# Cloudflare R2
R2_ACCOUNT_ID=your_value_here
R2_ACCESS_KEY_ID=your_value_here
R2_SECRET_ACCESS_KEY=your_value_here
R2_BUCKET_NAME=your_value_here
R2_PUBLIC_URL=your_value_here
ENABLE_R2_STORAGE=true

# Redis (local on API server)
REDIS_HOST=127.0.0.1
REDIS_PORT=6379
REDIS_PASSWORD=YOUR_SECURE_PASSWORD_HERE

# Server Config
PORT=10000
ENVIRONMENT=production
LOG_LEVEL=info
```

### Worker Servers (.env)
```bash
# Copy all values from API server .env
# Plus these worker-specific settings:

# Redis (points to API server)
REDIS_HOST=91.98.91.129
REDIS_PORT=6379
REDIS_PASSWORD=YOUR_SECURE_PASSWORD_HERE

# Worker ID (1 or 2)
WORKER_ID=1  # Change to 2 for worker-2
```

---

## Scaling Plan

### Current Capacity (300 creators)
- 2 workers can process: ~1,000 creators comfortably
- Processing time: ~3 hours/day for 300 creators
- Plenty of headroom for growth

### Scale to 1,500 creators
- Add `b9-worker-3` (CPX31)
- Total cost: €43.15/month

### Scale to 3,000 creators
- Add `b9-worker-3` and `b9-worker-4` (CPX31)
- Total cost: €56.25/month

### Scale to 10,000 creators
- Upgrade to 4× CPX41 workers (8 vCPU, 16 GB RAM)
- Total cost: €102.65/month
- Still 6× cheaper than Render!

---

## Monitoring & Alerts

**Uptime Monitoring**: (To be configured)
- Use Uptime Robot or similar
- Monitor: https://91.98.91.129:10000/health

**Log Locations**:
- API Server: `/app/b9dashboard/logs/`
- Workers: `/app/b9dashboard/logs/`

**Docker Commands**:
```bash
# View logs
docker compose logs -f

# Restart services
docker compose restart

# Check status
docker compose ps
```

---

## Backup Strategy

- **Database**: Already backed up by Supabase
- **Media**: Already stored in R2 (Cloudflare)
- **Code**: Version controlled in GitHub
- **Configuration**: This file + .env files (keep secure backup)

**Server snapshots**: Consider Hetzner snapshots before major updates

---

## Security Notes

- SSH key-based authentication only (no password login)
- Redis password protected
- Firewall configured to allow Redis only from worker IPs
- All secrets in .env files (never commit to git)
- HTTPS/SSL to be configured with Let's Encrypt

---

## Quick Reference Commands

### SSH to all servers (parallel)
```bash
# Terminal 1: API Server
ssh -i ~/.ssh/hetzner_b9 root@91.98.91.129

# Terminal 2: Worker 1
ssh -i ~/.ssh/hetzner_b9 root@188.245.232.203

# Terminal 3: Worker 2
ssh -i ~/.ssh/hetzner_b9 root@91.98.92.192
```

### Check all server status
```bash
# On each server
docker compose ps
docker compose logs --tail=50
```

### Restart all workers
```bash
# On worker-1
docker compose restart

# On worker-2
docker compose restart
```

---

## Deployment History

- **2025-10-08 13:30 UTC**: Hetzner account created, SSH keys generated
- **2025-10-08 13:45 UTC**: 3 servers provisioned (1 API + 2 Workers)
- **2025-10-08 14:00 UTC**: Docker installed on all 3 servers
- **2025-10-08 14:15 UTC**: Redis server configured on API server
- **2025-10-08 14:20 UTC**: Firewall rules configured
- **2025-10-08 14:34 UTC**: ✅ API server deployed and healthy
- **2025-10-08 14:53 UTC**: ✅ Worker 1 deployed and connected to Redis
- **2025-10-08 15:01 UTC**: ✅ Worker 2 deployed and connected to Redis
- **2025-10-08 15:01 UTC**: 🎉 **DEPLOYMENT COMPLETE** - All systems operational

---

## Support Contacts

**Hetzner Support**: https://console.hetzner.cloud/
**Documentation**: `/docs/deployment/HETZNER_MIGRATION_GUIDE.md`
**Project Email**: b9agencija@gmail.com

---

---

## Current Status Summary

| Component | Status | Uptime | Notes |
|-----------|--------|--------|-------|
| API Server | 🟢 RUNNING | Since 14:34 UTC | FastAPI + Redis operational |
| Worker 1 | 🟢 RUNNING | Since 14:53 UTC | Connected to Redis queue |
| Worker 2 | 🟢 RUNNING | Since 15:01 UTC | Connected to Redis queue |
| Redis Queue | 🟢 RUNNING | Since 14:23 UTC | Password protected |
| Supabase | 🟢 CONNECTED | N/A | External service |
| Cloudflare R2 | 🟢 CONNECTED | N/A | External service |

---

## Post-Deployment Tasks (Pending)

- [ ] DNS configuration (point domain to 91.98.91.129)
- [ ] SSL/HTTPS setup with Let's Encrypt
- [ ] Test end-to-end scraping workflow
- [ ] Setup monitoring alerts (Uptime Robot)
- [ ] Configure log rotation/cleanup cron jobs
- [ ] Update frontend dashboard to use new API URL

---

_Last Updated: 2025-10-08 15:01 UTC_
_Deployment Status: ✅ COMPLETE & OPERATIONAL_
_Next Review: DNS/SSL configuration_
