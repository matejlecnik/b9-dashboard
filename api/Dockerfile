# B9 Dashboard API - Custom Dockerfile v2.4
# This Dockerfile ensures exact dependency versions and bypasses Nixpacks issues
# CACHE BREAK v2.4: Force rebuild to include Instagram scraper batch processing fix

FROM python:3.12-slim

# Set working directory
WORKDIR /app

# Set environment variables
ENV PYTHONUNBUFFERED=1
ENV PYTHONDONTWRITEBYTECODE=1
ENV PIP_NO_CACHE_DIR=1
ENV PIP_DISABLE_PIP_VERSION_CHECK=1

# Install system dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    g++ \
    && rm -rf /var/lib/apt/lists/* \
    && apt-get clean

# Upgrade pip to latest version
RUN pip install --upgrade pip

# Copy BUILD_VERSION file to force cache invalidation
COPY BUILD_VERSION .

# Copy requirements first for better Docker layer caching
COPY requirements.txt .

# Install Python dependencies with explicit versions in controlled order
# This ensures we get exactly the versions we want and avoid conflicts
RUN pip install --no-cache-dir --no-deps postgrest==0.13.2 && \
    pip install --no-cache-dir --no-deps supabase==2.4.0 && \
    pip install --no-cache-dir -r requirements.txt

# Verify the installed versions
RUN pip show supabase postgrest | grep Version

# Copy application code
COPY . .

# Clear any Python cache to ensure fresh code runs
RUN find . -type d -name __pycache__ -exec rm -rf {} + 2>/dev/null || true
RUN find . -type f -name "*.pyc" -delete 2>/dev/null || true

# Create non-root user for security
RUN useradd --create-home --shell /bin/bash app \
    && chown -R app:app /app
USER app

# Health check - simplified without external dependencies
HEALTHCHECK --interval=30s --timeout=30s --start-period=10s --retries=3 \
    CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:8000/health', timeout=10)" || exit 1

# Expose port
EXPOSE 8000

# Start command - use Python script to run both API and scraper
CMD ["python", "start.py"]