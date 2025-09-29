# B9 Dashboard - Production Dockerfile for Render
# Combined API + Scrapers managed by Python startup script

FROM python:3.12-slim-bullseye as builder

# Set environment variables for build optimization
ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

# Install system dependencies for building Python packages
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libffi-dev \
    libssl-dev \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# Create app directory and copy requirements
WORKDIR /app
COPY api-render/requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Production stage
FROM python:3.12-slim-bullseye

# Set environment variables
ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PORT=10000 \
    ENVIRONMENT=production

# Install runtime dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    libpq5 \
    curl \
    && rm -rf /var/lib/apt/lists/* \
    && apt-get clean

# Create non-root user for security
RUN useradd --create-home --shell /bin/bash app

# Set working directory
WORKDIR /app

# Copy Python packages from builder stage
COPY --from=builder /usr/local/lib/python3.12/site-packages /usr/local/lib/python3.12/site-packages
COPY --from=builder /usr/local/bin /usr/local/bin

# Force rebuild - cache bust 2024-09-22-23:10-v2
ARG CACHEBUST=2
RUN echo "Cache busted at $(date)" > /tmp/cachebust.txt
# Copy application code - FRESH COPY v2.2.0
COPY --chown=app:app api-render/ ./api-render/

# Create necessary directories
RUN mkdir -p logs && \
    chown -R app:app logs

# Switch to non-root user
USER app

# Health check for API
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:$PORT/health')"

# Expose port for API
EXPOSE $PORT

# Run Python startup script to manage both API and scraper
CMD ["python", "api-render/start.py"]