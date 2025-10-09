#!/bin/bash
# Deploy API server to Hetzner

set -e  # Exit on error

API_SERVER_IP=${API_SERVER_IP:-"91.98.91.129"}
SSH_KEY=${SSH_KEY:-"$HOME/.ssh/hetzner_b9"}

echo "🚀 Deploying API server to $API_SERVER_IP..."

# Copy files to server
echo "📦 Copying files..."
scp -i "$SSH_KEY" docker-compose.hetzner.yml root@$API_SERVER_IP:/app/b9dashboard/docker-compose.yml
scp -i "$SSH_KEY" .env.api root@$API_SERVER_IP:/app/b9dashboard/.env
scp -i "$SSH_KEY" Dockerfile root@$API_SERVER_IP:/app/b9dashboard/
scp -i "$SSH_KEY" -r backend root@$API_SERVER_IP:/app/b9dashboard/

# SSH and deploy
echo "🔧 Building and starting containers..."
ssh -i "$SSH_KEY" root@$API_SERVER_IP << 'REMOTE_EOF'
cd /app/b9dashboard
docker compose down
docker compose up -d --build
docker compose logs --tail=50
REMOTE_EOF

echo "✅ API server deployed successfully!"
echo "🔍 Check status: ssh -i $SSH_KEY root@$API_SERVER_IP 'cd /app/b9dashboard && docker compose ps'"
