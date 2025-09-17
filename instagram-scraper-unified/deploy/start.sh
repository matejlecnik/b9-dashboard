#!/bin/bash

# Instagram Scraper Unified - Render Start Script

echo "Starting Instagram Scraper Unified..."
echo "Time: $(date)"
echo "Python Version: $(python --version)"

# Check environment variables
if [ -z "$SUPABASE_URL" ]; then
    echo "ERROR: SUPABASE_URL is not set"
    exit 1
fi

if [ -z "$SUPABASE_KEY" ]; then
    echo "ERROR: SUPABASE_KEY is not set"
    exit 1
fi

if [ -z "$RAPIDAPI_KEY" ]; then
    echo "ERROR: RAPIDAPI_KEY is not set"
    exit 1
fi

# Install/update dependencies
echo "Installing dependencies..."
pip install -r requirements.txt

# Run the scraper
echo "Starting scraper..."
python unified_scraper.py

echo "Scraper completed at $(date)"