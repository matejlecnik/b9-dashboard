# Hetzner Deployment - Quick Reference Guide

**Last Updated**: 2025-10-08
**Status**: ✅ All systems operational

---

## 🖥️ Server Quick Access

### SSH Commands (Copy-Paste Ready)

```bash
# API Server
ssh -i ~/.ssh/hetzner_b9 root@91.98.91.129

# Worker 1
ssh -i ~/.ssh/hetzner_b9 root@188.245.232.203

# Worker 2
ssh -i ~/.ssh/hetzner_b9 root@91.98.92.192
```

### Multi-Terminal Setup (Recommended)

**Terminal 1:** API Server (for logs and monitoring)
**Terminal 2:** Worker 1 (for troubleshooting)
**Terminal 3:** Worker 2 (for troubleshooting)

---

## 🐳 Common Docker Commands

### View Status

```bash
# On any server
cd /app/b9dashboard
docker compose ps

# Quick status check
docker compose ps --format "table {{.Name}}\t{{.Status}}"
```

### View Logs

```bash
# Live logs (follow mode)
docker compose logs -f

# Last 50 lines
docker compose logs --tail=50

# Last 100 lines with timestamps
docker compose logs --tail=100 --timestamps
```

### Restart Services

```bash
# Restart without rebuilding
docker compose restart

# Restart with rebuild (after code changes)
docker compose down && docker compose up -d --build

# Force recreate containers
docker compose up -d --force-recreate
```

### Health Checks

```bash
# On API server
curl http://localhost:10000/health

# From your Mac (to test external access - will show "Invalid host header" until we fix CORS)
curl http://91.98.91.129:10000/health
```

---

## 📊 Monitoring Commands

### System Resources

```bash
# CPU and memory usage
docker stats --no-stream

# Disk usage
df -h

# Docker disk usage
docker system df
```

### Redis Queue Status

```bash
# On API server only
redis-cli -a B9Dashboard2025SecureRedis! INFO

# Check queue length
redis-cli -a B9Dashboard2025SecureRedis! LLEN instagram_scraper_queue

# View jobs in queue (first 10)
redis-cli -a B9Dashboard2025SecureRedis! LRANGE instagram_scraper_queue 0 9
```

### Check Active Connections

```bash
# On API server - see who's connected to Redis
redis-cli -a B9Dashboard2025SecureRedis! CLIENT LIST
```

---

## 🔄 Deployment Updates

### Update Code on All Servers

**1. On your Mac, create tarball:**

```bash
cd /Users/matejlecnik/Desktop/b9_agency/b9dashboard
tar czf backend.tar.gz --exclude='__pycache__' --exclude='*.pyc' backend/
```

**2. Upload to API server:**

```bash
scp -i ~/.ssh/hetzner_b9 backend.tar.gz root@91.98.91.129:/tmp/
ssh -i ~/.ssh/hetzner_b9 root@91.98.91.129 "cd /app/b9dashboard && rm -rf backend && tar xzf /tmp/backend.tar.gz && docker compose down && docker compose up -d --build"
```

**3. Upload to Worker 1:**

```bash
scp -i ~/.ssh/hetzner_b9 backend.tar.gz root@188.245.232.203:/tmp/
ssh -i ~/.ssh/hetzner_b9 root@188.245.232.203 "cd /app/b9dashboard && rm -rf backend && tar xzf /tmp/backend.tar.gz && docker compose down && docker compose up -d --build"
```

**4. Upload to Worker 2:**

```bash
scp -i ~/.ssh/hetzner_b9 backend.tar.gz root@91.98.92.192:/tmp/
ssh -i ~/.ssh/hetzner_b9 root@91.98.92.192 "cd /app/b9dashboard && rm -rf backend && tar xzf /tmp/backend.tar.gz && docker compose down && docker compose up -d --build"
```

---

## 🚨 Troubleshooting

### Container Keeps Restarting

```bash
# Check logs for errors
docker compose logs --tail=100

# Check if out of memory
docker stats

# Check disk space
df -h
```

### Worker Can't Connect to Redis

```bash
# On worker, test Redis connection
redis-cli -h 91.98.91.129 -a B9Dashboard2025SecureRedis! ping

# Should output: PONG
# If not, check firewall on API server
```

### API Server Not Responding

```bash
# On API server
docker compose ps  # Check if running

curl http://localhost:10000/health  # Test locally

# Check logs
docker compose logs --tail=50
```

### Permission Denied Errors

```bash
# Fix log directory permissions
chmod 777 /app/b9dashboard/logs

# Restart container
docker compose restart
```

### Out of Disk Space

```bash
# Clean up Docker images
docker system prune -a

# Remove unused volumes
docker volume prune

# Check what's using space
du -sh /app/b9dashboard/*
```

---

## 📈 Scaling Guide

### Add Worker 3 (When Needed)

**1. In Hetzner Console:**
- Create CPX31 server
- Name: `b9-worker-3`
- Location: Falkenstein
- SSH Key: b9-dashboard-key

**2. Get IP and SSH in:**

```bash
ssh -i ~/.ssh/hetzner_b9 root@<WORKER_3_IP>
```

**3. Setup:**

```bash
# Install Docker (same as before)
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | tee /etc/apt/sources.list.d/docker.list
apt-get update && apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

# Create directories
mkdir -p /app/b9dashboard/logs && chmod 777 /app/b9dashboard/logs
```

**4. Deploy (from your Mac):**

```bash
scp -i ~/.ssh/hetzner_b9 backend.tar.gz root@<WORKER_3_IP>:/tmp/
scp -i ~/.ssh/hetzner_b9 docker-compose.worker.yml root@<WORKER_3_IP>:/tmp/
scp -i ~/.ssh/hetzner_b9 Dockerfile.worker root@<WORKER_3_IP>:/tmp/
scp -i ~/.ssh/hetzner_b9 .env.hetzner.worker root@<WORKER_3_IP>:/tmp/
```

**5. On Worker 3:**

```bash
cd /app/b9dashboard
tar xzf /tmp/backend.tar.gz
cp /tmp/docker-compose.worker.yml docker-compose.yml
cp /tmp/Dockerfile.worker .
cp /tmp/.env.hetzner.worker .env
sed -i 's/WORKER_ID=1/WORKER_ID=3/' .env
docker compose up -d --build
```

**6. Add firewall rule on API server:**

```bash
# On API server
ufw allow from <WORKER_3_IP> to any port 6379
```

---

## 🔐 Security Checklist

- [x] SSH key-based authentication only
- [x] Redis password protected
- [x] Firewall configured (Redis only from worker IPs)
- [ ] SSL/HTTPS setup (pending)
- [ ] Regular security updates schedule
- [ ] Backup strategy for .env files

---

## 💰 Cost Tracking

**Current Monthly Cost**: €30.05 (~$33)

| Server | Type | Monthly Cost |
|--------|------|--------------|
| b9-api-server | CPX11 | €3.85 |
| b9-worker-1 | CPX31 | €13.10 |
| b9-worker-2 | CPX31 | €13.10 |
| **Total** | | **€30.05** |

**Annual Cost**: €360.60 (~$394)
**Render Cost (old)**: $7,500/year
**Annual Savings**: $7,106

---

## 📞 Support

**Hetzner Console**: https://console.hetzner.cloud/
**Documentation**: `/docs/deployment/HETZNER_MIGRATION_GUIDE.md`
**Deployment Info**: `/docs/deployment/HETZNER_DEPLOYMENT_INFO.md`

---

_This is a living document. Update as needed when configuration changes._
