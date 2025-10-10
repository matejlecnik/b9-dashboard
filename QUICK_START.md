# 🚀 Quick Start: Fix Vercel → Hetzner Connection

## The Problem
Your Vercel site (HTTPS) cannot connect to Hetzner backend (HTTP) due to browser Mixed Content Policy.

## The Solution
Setup Cloudflare Tunnel to add HTTPS to your backend (10-15 minutes).

---

## ⚡ Fastest Method

### Step 1: Copy Script to Server
```bash
scp setup-cloudflare-tunnel.sh root@91.98.91.129:/root/
```

### Step 2: Run on Server
```bash
ssh root@91.98.91.129
chmod +x setup-cloudflare-tunnel.sh
sudo ./setup-cloudflare-tunnel.sh
```

### Step 3: Get Tunnel URL
```bash
sudo journalctl -u cloudflared -f | grep "https://"
```

You'll see something like: `https://b9-api-xyz123.trycloudflare.com`

### Step 4: Update Vercel
1. Go to Vercel project settings
2. Environment Variables
3. Update `NEXT_PUBLIC_API_URL` = `https://b9-api-xyz123.trycloudflare.com`
4. Redeploy

### Step 5: Update Local
Edit `dashboard/.env.local`:
```env
NEXT_PUBLIC_API_URL=https://b9-api-xyz123.trycloudflare.com
```

### Step 6: Test
Open your Vercel site → Instagram Monitor → Check browser console for 200 OK responses ✅

---

## 📝 Alternative: Manual Commands

SSH to server and run:

```bash
wget https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb
sudo dpkg -i cloudflared-linux-amd64.deb
cloudflared tunnel login
cloudflared tunnel create b9-api
TUNNEL_ID=$(cloudflared tunnel list | grep "b9-api" | awk '{print $1}')

mkdir -p ~/.cloudflared
cat > ~/.cloudflared/config.yml <<EOF
tunnel: ${TUNNEL_ID}
credentials-file: /root/.cloudflared/${TUNNEL_ID}.json

ingress:
  - service: http://localhost:10000
  - service: http_status:404
EOF

sudo cloudflared service install
sudo systemctl enable cloudflared
sudo systemctl start cloudflared
sudo journalctl -u cloudflared -f
```

---

## 🔍 Verify Everything Works

### Test 1: Check Service
```bash
ssh root@91.98.91.129 "systemctl status cloudflared"
```

### Test 2: Test Tunnel URL
```bash
curl https://b9-api-xyz123.trycloudflare.com/health
```

### Test 3: Check Vercel
Open browser console on your Vercel site → Navigate to monitoring pages → Look for API calls with 200 OK

---

## ⚙️ Useful Commands

```bash
# View logs
sudo journalctl -u cloudflared -f

# Restart tunnel
sudo systemctl restart cloudflared

# Check backend is running
curl http://localhost:10000/health

# Stop tunnel
sudo systemctl stop cloudflared

# Start tunnel
sudo systemctl start cloudflared
```

---

## 📚 Full Documentation

See [CLOUDFLARE_TUNNEL_SETUP.md](CLOUDFLARE_TUNNEL_SETUP.md) for detailed instructions.

---

**Estimated Time:** 10-15 minutes
**Status:** Ready to execute
**Files:** `setup-cloudflare-tunnel.sh`, `CLOUDFLARE_TUNNEL_SETUP.md`
