#!/bin/bash
set -e

echo "=========================================="
echo "B9 Dashboard - Cloudflare Tunnel Setup"
echo "=========================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    echo -e "${RED}Please run as root (use sudo)${NC}"
    exit 1
fi

echo -e "${YELLOW}Step 1/6: Installing cloudflared...${NC}"
if ! command -v cloudflared &> /dev/null; then
    wget -q https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb
    dpkg -i cloudflared-linux-amd64.deb
    rm cloudflared-linux-amd64.deb
    echo -e "${GREEN}✓ cloudflared installed successfully${NC}"
else
    echo -e "${GREEN}✓ cloudflared already installed${NC}"
fi

cloudflared --version

echo ""
echo -e "${YELLOW}Step 2/6: Authenticating with Cloudflare...${NC}"
echo "A browser window will open. Please login to your Cloudflare account."
echo "Press Enter to continue..."
read

cloudflared tunnel login

echo ""
echo -e "${YELLOW}Step 3/6: Creating tunnel 'b9-api'...${NC}"
if cloudflared tunnel list | grep -q "b9-api"; then
    echo -e "${GREEN}✓ Tunnel 'b9-api' already exists${NC}"
    TUNNEL_ID=$(cloudflared tunnel list | grep "b9-api" | awk '{print $1}')
else
    cloudflared tunnel create b9-api
    TUNNEL_ID=$(cloudflared tunnel list | grep "b9-api" | awk '{print $1}')
    echo -e "${GREEN}✓ Tunnel created with ID: ${TUNNEL_ID}${NC}"
fi

echo ""
echo -e "${YELLOW}Step 4/6: Configuring tunnel...${NC}"
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

echo -e "${GREEN}✓ Configuration file created${NC}"

echo ""
echo -e "${YELLOW}Step 5/6: Installing as system service...${NC}"
cloudflared service install
systemctl enable cloudflared
systemctl start cloudflared

echo -e "${GREEN}✓ Service installed and started${NC}"

echo ""
echo -e "${YELLOW}Step 6/6: Getting tunnel URL...${NC}"
sleep 3

# Start tunnel route
cloudflared tunnel route dns b9-api api 2>/dev/null || true

# Get the tunnel info
TUNNEL_URL=$(cloudflared tunnel info b9-api 2>/dev/null | grep -oP 'https://[^\s]+' | head -1)

if [ -z "$TUNNEL_URL" ]; then
    echo ""
    echo -e "${YELLOW}Note: Quick URL generation...${NC}"
    # Run tunnel in background to get URL
    cloudflared tunnel --url localhost:10000 > /tmp/tunnel_output.log 2>&1 &
    TUNNEL_PID=$!
    sleep 5
    TUNNEL_URL=$(grep -oP 'https://[^\s]+\.trycloudflare\.com' /tmp/tunnel_output.log | head -1)
    kill $TUNNEL_PID 2>/dev/null || true
fi

echo ""
echo "=========================================="
echo -e "${GREEN}✓ Cloudflare Tunnel Setup Complete!${NC}"
echo "=========================================="
echo ""
echo "Tunnel Name: b9-api"
echo "Tunnel ID: ${TUNNEL_ID}"
echo ""

# Check service status
if systemctl is-active --quiet cloudflared; then
    echo -e "${GREEN}✓ Service Status: RUNNING${NC}"

    echo ""
    echo "=========================================="
    echo "NEXT STEPS:"
    echo "=========================================="
    echo ""
    echo "1. Your tunnel URL will be visible in the logs:"
    echo "   journalctl -u cloudflared -f"
    echo ""
    echo "2. Look for a line like:"
    echo "   https://b9-api-xyz123.trycloudflare.com"
    echo ""
    echo "3. Update your Vercel environment variable:"
    echo "   NEXT_PUBLIC_API_URL=https://[your-tunnel-url]"
    echo ""
    echo "4. Update your local .env.local file"
    echo ""
    echo "5. Redeploy your Vercel site"
    echo ""
    echo "=========================================="
    echo ""
    echo "To view tunnel logs:"
    echo "  journalctl -u cloudflared -f"
    echo ""
    echo "To check tunnel status:"
    echo "  systemctl status cloudflared"
    echo ""
    echo "To restart tunnel:"
    echo "  systemctl restart cloudflared"
    echo ""
else
    echo -e "${RED}✗ Service Status: NOT RUNNING${NC}"
    echo "Check logs with: journalctl -u cloudflared -xe"
fi
