#!/bin/bash

# Deploy to Preview Environment
echo "🚀 Deploying to Preview Environment..."

# Ensure we're on preview branch
git checkout preview

# Add all changes
git add .

# Commit with timestamp
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
read -p "Enter commit message: " MESSAGE
git commit -m "preview: $MESSAGE [$TIMESTAMP]"

# Push to preview
git push origin preview

echo "✅ Preview deployment initiated!"
echo "📋 Check deployment status at: https://vercel.com/b9-agencys-projects/b9-dashboard"
echo "🔗 Preview URL will be available in ~2 minutes"