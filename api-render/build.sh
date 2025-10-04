#!/bin/bash
# B9 Dashboard API - Render Build Script
# Optimized build process for Render deployment

set -e  # Exit on any error

echo "🚀 Starting B9 Dashboard API build process..."

# Upgrade pip and install wheel for faster builds
echo "📦 Upgrading pip and installing build tools..."
pip install --upgrade pip setuptools wheel

# Install dependencies in optimized order to avoid conflicts
echo "📋 Installing Python dependencies..."

# First install core dependencies that others depend on
pip install --no-cache-dir httpx>=0.25.0
pip install --no-cache-dir aiohttp>=3.8.0
pip install --no-cache-dir requests>=2.31.0

# Install database dependencies in specific order (critical for compatibility)
echo "🗄️  Installing database dependencies..."
pip install --no-cache-dir postgrest==0.13.2
pip install --no-cache-dir supabase==2.4.0

# Install FastAPI and uvicorn
echo "⚡ Installing FastAPI and server..."
pip install --no-cache-dir "fastapi>=0.104.1,<1.0.0"
pip install --no-cache-dir "uvicorn[standard]>=0.24.0,<1.0.0"

# Install remaining dependencies
echo "📦 Installing remaining dependencies..."
pip install --no-cache-dir -r requirements.txt

# Verify critical packages
echo "✅ Verifying installation..."
python -c "import fastapi, uvicorn, supabase; print('Core packages installed successfully')"
python -c "import redis; print('Redis client installed')" || echo "⚠️  Redis client not available (optional)"

# Create necessary directories
echo "📁 Creating application directories..."
mkdir -p logs
mkdir -p temp
mkdir -p cache

# Set proper permissions
chmod +x main.py
chmod +x start.py
# Note: worker.py and cron_jobs.py do not exist - functionality handled via start.py subprocess architecture

# Verify Python version
echo "🐍 Python version: $(python --version)"

# Display installed package versions for debugging
echo "📋 Key package versions:"
pip show fastapi uvicorn supabase postgrest | grep -E "Name|Version"

# Pre-compile Python files for faster startup
echo "⚡ Pre-compiling Python files..."
python -m compileall . -q

# Clean up build artifacts
echo "🧹 Cleaning up build artifacts..."
find . -type d -name __pycache__ -exec rm -rf {} + 2>/dev/null || true
find . -type f -name "*.pyc" -delete 2>/dev/null || true

echo "✅ Build completed successfully!"
echo "🎯 Ready to deploy on Render"

# Display final stats
echo "📊 Build statistics:"
echo "   - Working directory: $(pwd)"
echo "   - Python files: $(find . -name "*.py" | wc -l)"
echo "   - Service files: $(find services -name "*.py" 2>/dev/null | wc -l || echo 0)"
echo "   - Build time: $(date)"

exit 0