#!/bin/bash
# B9 Dashboard Startup Script
# Manages both API and Scraper services via supervisor

echo "🚀 Starting B9 Dashboard Services..."

# Export environment variables for supervisor
export PYTHONUNBUFFERED=1
export PATH=/usr/local/bin:$PATH

# Ensure log directories exist
mkdir -p /var/log/supervisor /app/logs

# Start supervisord
echo "📦 Starting supervisor..."
/usr/local/bin/supervisord -c /etc/supervisor/conf.d/supervisord.conf