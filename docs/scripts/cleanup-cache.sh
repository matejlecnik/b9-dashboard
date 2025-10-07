#!/bin/bash
# Cleanup Cache Script
# Removes regenerable cache files and temporary files
# Safe to run anytime - all files can be regenerated

set -e

echo "🧹 B9 Dashboard - Cache Cleanup Script"
echo "========================================"
echo ""

# Count before
PYC_COUNT=$(find . -type f -name "*.pyc" 2>/dev/null | wc -l | tr -d ' ')
PYCACHE_COUNT=$(find . -type d -name "__pycache__" 2>/dev/null | wc -l | tr -d ' ')
DS_COUNT=$(find . -name ".DS_Store" 2>/dev/null | wc -l | tr -d ' ')

echo "📊 Found:"
echo "   - $PYC_COUNT .pyc files"
echo "   - $PYCACHE_COUNT __pycache__ directories"
echo "   - $DS_COUNT .DS_Store files"

if [ -d "dashboard/.next/cache" ]; then
    NEXT_CACHE_SIZE=$(du -sh dashboard/.next/cache 2>/dev/null | cut -f1)
    echo "   - Next.js cache: $NEXT_CACHE_SIZE"
else
    NEXT_CACHE_SIZE="0"
fi

echo ""
echo "🧹 Cleaning Python cache..."
find . -type f -name "*.pyc" -delete 2>/dev/null || true
find . -type d -name "__pycache__" -exec rm -rf {} + 2>/dev/null || true

echo "🧹 Cleaning Next.js cache..."
if [ -d "dashboard/.next/cache" ]; then
    rm -rf dashboard/.next/cache/
    echo "   ✅ Deleted dashboard/.next/cache/"
fi

echo "🧹 Cleaning macOS files..."
find . -name ".DS_Store" -delete 2>/dev/null || true

echo "🧹 Cleaning Python validation cache..."
find docs/scripts -name "*.pyc" -delete 2>/dev/null || true
find docs/scripts -type d -name "__pycache__" -exec rm -rf {} + 2>/dev/null || true

echo ""
echo "✅ Cleanup complete!"
echo ""
echo "📊 Removed:"
echo "   - $PYC_COUNT .pyc files"
echo "   - $PYCACHE_COUNT __pycache__ directories"
echo "   - $DS_COUNT .DS_Store files"
if [ "$NEXT_CACHE_SIZE" != "0" ]; then
    echo "   - Next.js cache: $NEXT_CACHE_SIZE"
fi
echo ""
echo "💡 Tip: Run this script monthly to keep your workspace clean"
echo "   Usage: bash scripts/cleanup-cache.sh"
