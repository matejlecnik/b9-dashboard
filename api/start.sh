#!/bin/bash

# Start the continuous scraper in the background
echo "Starting continuous scraper..."
python continuous_scraper.py &
SCRAPER_PID=$!
echo "Scraper started with PID: $SCRAPER_PID"

# Start the FastAPI server
echo "Starting FastAPI server..."
uvicorn main:app --host 0.0.0.0 --port ${PORT:-10000}

# If the API server exits, kill the scraper
kill $SCRAPER_PID 2>/dev/null