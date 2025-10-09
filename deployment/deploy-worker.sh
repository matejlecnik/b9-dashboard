#!/bin/bash
# Deploy worker to Hetzner

set -e  # Exit on error

WORKER_ID=${WORKER_ID:-"1"}
WORKER_IP=${WORKER_IP:-""}
SSH_KEY=${SSH_KEY:-"$HOME/.ssh/hetzner_b9"}

if [ -z "$WORKER_IP" ]; then
    echo "❌ Error: WORKER_IP environment variable not set"
    echo "Usage: WORKER_ID=1 WORKER_IP=188.245.232.203 ./deployment/deploy-worker.sh"
    exit 1
fi

echo "🚀 Deploying worker $WORKER_ID to $WORKER_IP..."

# Copy files to worker
echo "📦 Copying files..."
scp -i "$SSH_KEY" docker-compose.worker.yml root@$WORKER_IP:/app/b9dashboard/docker-compose.yml
scp -i "$SSH_KEY" Dockerfile.worker root@$WORKER_IP:/app/b9dashboard/
scp -i "$SSH_KEY" .env.worker root@$WORKER_IP:/app/b9dashboard/.env
scp -i "$SSH_KEY" -r backend root@$WORKER_IP:/app/b9dashboard/

# SSH and deploy
echo "🔧 Building and starting worker container..."
ssh -i "$SSH_KEY" root@$WORKER_IP << 'REMOTE_EOF'
cd /app/b9dashboard
docker compose down
docker compose up -d --build
docker compose logs --tail=50
REMOTE_EOF

echo "✅ Worker $WORKER_ID deployed successfully!"
echo "🔍 Check status: ssh -i $SSH_KEY root@$WORKER_IP 'cd /app/b9dashboard && docker compose logs -f'"
