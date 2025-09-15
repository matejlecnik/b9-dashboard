# B9 Dashboard - Production Dockerfile for Render
# Combined API + Reddit Scraper with supervisor management

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
COPY requirements-combined.txt .

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements-combined.txt

# Production stage
FROM python:3.12-slim-bullseye

# Set environment variables
ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PORT=10000 \
    ENVIRONMENT=production

# Install runtime dependencies and supervisor
RUN apt-get update && apt-get install -y --no-install-recommends \
    libpq5 \
    curl \
    supervisor \
    && rm -rf /var/lib/apt/lists/* \
    && apt-get clean

# Create non-root user for security
RUN useradd --create-home --shell /bin/bash app

# Set working directory
WORKDIR /app

# Copy Python packages from builder stage
COPY --from=builder /usr/local/lib/python3.12/site-packages /usr/local/lib/python3.12/site-packages
COPY --from=builder /usr/local/bin /usr/local/bin

# Copy application code
COPY --chown=app:app api/ ./api/

# Create necessary directories
RUN mkdir -p logs /var/log/supervisor && \
    chown -R app:app logs /var/log/supervisor

# Copy supervisor configuration
COPY --chown=app:app supervisord.conf /etc/supervisor/conf.d/supervisord.conf

# Copy startup script
COPY --chown=app:app start.sh ./start.sh
RUN chmod +x ./start.sh

# Switch to non-root user
USER app

# Health check for API
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:$PORT/health')"

# Expose port for API
EXPOSE $PORT

# Run Python startup script to manage both API and scraper
CMD ["python", "api/start.py"]