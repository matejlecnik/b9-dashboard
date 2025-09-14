#!/bin/bash

# Deploy to Production (b9-dashboard.com)
echo "🚀 Deploying to Production (b9-dashboard.com)..."

# Confirmation
read -p "⚠️  Are you sure preview has been tested and approved? (yes/no): " CONFIRM
if [ "$CONFIRM" != "yes" ]; then
    echo "❌ Deployment cancelled"
    exit 1
fi

# Switch to main branch
git checkout main

# Pull latest changes
git pull origin main

# Merge preview branch
git merge preview -m "deploy: merge preview to production"

# Push to production
git push origin main

echo "✅ Production deployment initiated!"
echo "📋 Check deployment status at: https://vercel.com/b9-agencys-projects/b9-dashboard"
echo "🌐 Production will be live at b9-dashboard.com in ~2 minutes"