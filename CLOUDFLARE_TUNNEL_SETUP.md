# Cloudflare Tunnel Setup Guide

## Quick Setup (Recommended)

### Option 1: Download and Run Script on Server

SSH to your Hetzner server and run these commands:

```bash
# SSH to Hetzner
ssh root@91.98.91.129

# Download the setup script
wget https://raw.githubusercontent.com/YOUR_REPO/setup-cloudflare-tunnel.sh

# Make it executable
chmod +x setup-cloudflare-tunnel.sh

# Run it
sudo ./setup-cloudflare-tunnel.sh
```

### Option 2: Copy Script from Local Machine

From your local machine:

```bash
# Copy the script to the server
scp setup-cloudflare-tunnel.sh root@91.98.91.129:/root/

# SSH to the server
ssh root@91.98.91.129

# Make it executable and run
chmod +x setup-cloudflare-tunnel.sh
sudo ./setup-cloudflare-tunnel.sh
```

### Option 3: Manual Step-by-Step

If you prefer to run commands manually, SSH to your server and execute:

```bash
# 1. Install cloudflared
wget https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb
sudo dpkg -i cloudflared-linux-amd64.deb
cloudflared --version

# 2. Authenticate (browser window will open)
cloudflared tunnel login

# 3. Create tunnel
cloudflared tunnel create b9-api

# 4. Get tunnel ID
TUNNEL_ID=$(cloudflared tunnel list | grep "b9-api" | awk '{print $1}')
echo "Tunnel ID: $TUNNEL_ID"

# 5. Create config file
mkdir -p ~/.cloudflared
cat > ~/.cloudflared/config.yml <<EOF
tunnel: ${TUNNEL_ID}
credentials-file: /root/.cloudflared/${TUNNEL_ID}.json

ingress:
  - service: http://localhost:10000
    originRequest:
      noTLSVerify: true
  - service: http_status:404
EOF

# 6. Install and start service
sudo cloudflared service install
sudo systemctl enable cloudflared
sudo systemctl start cloudflared

# 7. Check status
sudo systemctl status cloudflared

# 8. Get tunnel URL from logs
sudo journalctl -u cloudflared -n 50 | grep "https://"
```

## After Setup

### 1. Get Your Tunnel URL

The tunnel URL will appear in the logs. Check with:

```bash
sudo journalctl -u cloudflared -f
```

Look for a line like:
```
https://b9-api-xyz123.trycloudflare.com
```

### 2. Update Environment Variables

#### On Vercel Dashboard:
1. Go to your project settings
2. Navigate to Environment Variables
3. Update `NEXT_PUBLIC_API_URL` to your tunnel URL
4. Redeploy the project

#### Local `.env.local`:
```env
NEXT_PUBLIC_API_URL=https://b9-api-xyz123.trycloudflare.com
```

### 3. Test the Connection

From your local machine:

```bash
# Test the tunnel URL
curl https://b9-api-xyz123.trycloudflare.com/health

# Should return your backend health check response
```

### 4. Verify on Vercel

After redeploying Vercel:
1. Open your Vercel site
2. Open browser console (F12)
3. Navigate to Instagram Monitor or Reddit Monitor
4. Check for API calls - should show 200 OK
5. Verify no Mixed Content errors

## Troubleshooting

### Check Service Status
```bash
sudo systemctl status cloudflared
```

### View Logs
```bash
sudo journalctl -u cloudflared -f
```

### Restart Service
```bash
sudo systemctl restart cloudflared
```

### Check if Port 10000 is Running
```bash
lsof -i :10000
# or
curl http://localhost:10000/health
```

### Test Backend Locally
```bash
curl http://localhost:10000/api/instagram/creators/status
```

## Service Management

### Start Service
```bash
sudo systemctl start cloudflared
```

### Stop Service
```bash
sudo systemctl stop cloudflared
```

### Restart Service
```bash
sudo systemctl restart cloudflared
```

### Enable Auto-Start on Boot
```bash
sudo systemctl enable cloudflared
```

### Disable Auto-Start
```bash
sudo systemctl disable cloudflared
```

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│  Vercel Frontend (HTTPS)                                   │
│  https://your-app.vercel.app                               │
│                                                             │
└────────────────────┬────────────────────────────────────────┘
                     │
                     │ HTTPS Request
                     │ /api/proxy/instagram/*
                     ▼
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│  Cloudflare Tunnel (HTTPS)                                 │
│  https://b9-api-xyz123.trycloudflare.com                   │
│                                                             │
└────────────────────┬────────────────────────────────────────┘
                     │
                     │ HTTP (Internal)
                     │ Encrypted Tunnel
                     ▼
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│  Hetzner Backend (HTTP:10000)                              │
│  91.98.91.129:10000                                        │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

## Benefits

✅ **HTTPS Everywhere** - No Mixed Content errors
✅ **No SSL Certificates** - Cloudflare handles it
✅ **Free Solution** - No cost for basic tunnel
✅ **DDoS Protection** - Cloudflare's network
✅ **Auto-Restart** - Systemd service management
✅ **No Domain Required** - Uses .trycloudflare.com subdomain

## Next Steps After Setup

1. ✅ Get tunnel URL from logs
2. ✅ Update Vercel environment variable `NEXT_PUBLIC_API_URL`
3. ✅ Update local `.env.local` file
4. ✅ Commit and push changes
5. ✅ Redeploy Vercel site
6. ✅ Test all API endpoints on production
7. ✅ Verify no Mixed Content errors

---

**Created:** 2025-10-10
**Status:** Ready for Execution
**Estimated Time:** 10-15 minutes
