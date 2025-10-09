#!/bin/bash
# Deploy entire Hetzner infrastructure

set -e  # Exit on error

echo "🚀 Deploying entire B9 Dashboard infrastructure to Hetzner..."

# Deploy API server
echo ""
echo "=" * 60
echo "STEP 1: Deploying API Server"
echo "=" * 60
./deployment/deploy-api.sh

# Deploy Worker 1
echo ""
echo "=" * 60
echo "STEP 2: Deploying Worker 1"
echo "=" * 60
WORKER_ID=1 WORKER_IP=188.245.232.203 ./deployment/deploy-worker.sh

# Deploy Worker 2
echo ""
echo "=" * 60
echo "STEP 3: Deploying Worker 2"
echo "=" * 60
WORKER_ID=2 WORKER_IP=91.98.92.192 ./deployment/deploy-worker.sh

echo ""
echo "✅ All services deployed successfully!"
echo ""
echo "📊 Next steps:"
echo "1. Check API health: curl http://91.98.91.129:10000/health"
echo "2. Queue creators: ssh root@91.98.91.129 'docker exec -it b9-api python backend/app/scrapers/instagram/instagram_controller_redis.py'"
echo "3. Monitor workers: ssh root@188.245.232.203 'docker logs -f b9-worker-1'"
echo "4. Check queue status: ssh root@91.98.91.129 'docker exec -it b9-redis redis-cli -a YOUR_PASSWORD llen instagram_scraper_queue'"
