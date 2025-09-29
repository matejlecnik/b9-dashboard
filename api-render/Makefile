# B9 Dashboard API - Makefile
# Common commands for development and operations

.PHONY: help dev test lint clean install logs health metrics deploy

# Default target
help:
	@echo "B9 Dashboard API - Available Commands"
	@echo "======================================"
	@echo "Development:"
	@echo "  make dev          - Start development server"
	@echo "  make test         - Run test suite"
	@echo "  make lint         - Run code linting"
	@echo "  make format       - Format code"
	@echo "  make clean        - Clean cache and temp files"
	@echo ""
	@echo "Setup:"
	@echo "  make install      - Install dependencies"
	@echo "  make venv         - Create virtual environment"
	@echo "  make migrate      - Run database migrations"
	@echo ""
	@echo "Operations:"
	@echo "  make logs         - View application logs"
	@echo "  make health       - Check system health"
	@echo "  make metrics      - View performance metrics"
	@echo "  make monitor      - Start monitoring dashboard"
	@echo ""
	@echo "Deployment:"
	@echo "  make deploy       - Deploy to production"
	@echo "  make build        - Build for production"
	@echo "  make docker       - Build Docker image"

# Development commands
dev:
	@echo "Starting development server..."
	python main.py

dev-watch:
	@echo "Starting development server with auto-reload..."
	uvicorn main:app --reload --host 0.0.0.0 --port 8000

# Testing
test:
	@echo "Running test suite..."
	pytest tests/ -v --cov=app --cov-report=html

test-unit:
	pytest tests/unit/ -v

test-integration:
	pytest tests/integration/ -v

# Code quality
lint:
	@echo "Running linters..."
	flake8 app/ --max-line-length=120
	pylint app/
	mypy app/ --ignore-missing-imports

format:
	@echo "Formatting code..."
	black app/ --line-length=120
	isort app/ --profile black

# Clean up
clean:
	@echo "Cleaning up..."
	find . -type d -name "__pycache__" -exec rm -rf {} + 2>/dev/null || true
	find . -type f -name "*.pyc" -delete
	find . -type f -name "*.pyo" -delete
	find . -type f -name "*.log" -delete
	rm -rf .pytest_cache/
	rm -rf htmlcov/
	rm -rf .coverage
	@echo "Clean complete!"

# Installation
install:
	@echo "Installing dependencies..."
	pip install -r requirements.txt

install-dev:
	@echo "Installing development dependencies..."
	pip install -r requirements.txt
	pip install pytest pytest-cov black flake8 pylint mypy isort

venv:
	@echo "Creating virtual environment..."
	python -m venv venv
	@echo "Activate with: source venv/bin/activate"

# Database
migrate:
	@echo "Running database migrations..."
	python scripts/migrate.py

db-reset:
	@echo "Resetting database..."
	python scripts/reset_db.py

# Monitoring
logs:
	@echo "Fetching latest logs..."
	tail -f logs/app.log 2>/dev/null || echo "No log file found"

logs-error:
	@echo "Fetching error logs..."
	grep ERROR logs/app.log 2>/dev/null || echo "No errors found"

health:
	@echo "Checking system health..."
	@curl -s http://localhost:8000/health | python -m json.tool || echo "Server not running"

ready:
	@echo "Checking readiness..."
	@curl -s http://localhost:8000/ready | python -m json.tool || echo "Server not running"

metrics:
	@echo "Fetching metrics..."
	@curl -s http://localhost:8000/metrics | python -m json.tool || echo "Server not running"

monitor:
	@echo "Starting monitoring dashboard..."
	python scripts/monitor.py

# Scrapers
scraper-status:
	@echo "Checking scraper status..."
	@curl -s http://localhost:8000/api/scraper/status | python -m json.tool

scraper-start:
	@echo "Starting scrapers..."
	@curl -X POST http://localhost:8000/api/scraper/start

scraper-stop:
	@echo "Stopping scrapers..."
	@curl -X POST http://localhost:8000/api/scraper/stop

# Docker
docker-build:
	@echo "Building Docker image..."
	docker build -t b9-dashboard-api .

docker-run:
	@echo "Running Docker container..."
	docker run -p 8000:8000 --env-file .env b9-dashboard-api

docker-compose:
	@echo "Starting with docker-compose..."
	docker-compose up

# Deployment
deploy:
	@echo "Deploying to production..."
	git push origin main
	@echo "Deployment triggered on Render"

deploy-check:
	@echo "Checking deployment status..."
	@curl -s https://b9-dashboard.onrender.com/health | python -m json.tool

build:
	@echo "Building for production..."
	pip install -r requirements.txt
	python -m compileall app/

# Utilities
env-check:
	@echo "Checking environment variables..."
	@python -c "import os; required = ['DATABASE_URL', 'OPENAI_API_KEY', 'SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY']; missing = [v for v in required if not os.getenv(v)]; print('✅ All required env vars set' if not missing else f'❌ Missing: {missing}')"

version:
	@echo "B9 Dashboard API Version:"
	@python -c "print(open('BUILD_VERSION').read().strip())" 2>/dev/null || echo "Unknown"

# Performance
profile:
	@echo "Running performance profiler..."
	python -m cProfile -o profile.stats main.py

analyze-profile:
	@echo "Analyzing profile data..."
	python -m pstats profile.stats

# Security
security-check:
	@echo "Running security checks..."
	bandit -r app/
	safety check

# Git hooks
install-hooks:
	@echo "Installing git hooks..."
	pre-commit install

pre-commit:
	@echo "Running pre-commit checks..."
	pre-commit run --all-files