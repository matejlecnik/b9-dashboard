#!/bin/bash
###############################################################################
# Instagram AI Tagging - Deployment Script for Hetzner Server
###############################################################################
#
# This script deploys and runs the Instagram AI tagging system on Hetzner.
#
# Usage:
#   ./deploy_tagging.sh setup      # Install dependencies & run migration
#   ./deploy_tagging.sh run         # Run tagging (production)
#   ./deploy_tagging.sh dry-run     # Test without saving to DB
#   ./deploy_tagging.sh parallel 5  # Run with 5 parallel workers
#
###############################################################################

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Logging functions
log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Get script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

###############################################################################
# Setup Function
###############################################################################
setup() {
    log_info "Setting up Instagram AI Tagging System..."

    cd "$BACKEND_DIR"

    # Check Python version
    log_info "Checking Python version..."
    python3 --version || {
        log_error "Python 3 not found. Please install Python 3.8+"
        exit 1
    }

    # Install/upgrade pip
    log_info "Upgrading pip..."
    python3 -m pip install --upgrade pip

    # Install requirements
    log_info "Installing dependencies..."
    pip3 install -r requirements.txt

    log_info "Dependencies installed successfully!"

    # Check environment variables
    log_info "Checking environment variables..."
    if [ ! -f "$BACKEND_DIR/.env" ]; then
        log_warn ".env file not found. Copy from .env.example and configure:"
        log_warn "  - SUPABASE_URL"
        log_warn "  - SUPABASE_SERVICE_ROLE_KEY"
        log_warn "  - GOOGLE_API_KEY"
        exit 1
    fi

    # Source .env
    export $(grep -v '^#' "$BACKEND_DIR/.env" | xargs)

    # Verify required environment variables
    if [ -z "$SUPABASE_URL" ] || [ -z "$SUPABASE_SERVICE_ROLE_KEY" ] || [ -z "$GOOGLE_API_KEY" ]; then
        log_error "Missing required environment variables:"
        log_error "  - SUPABASE_URL"
        log_error "  - SUPABASE_SERVICE_ROLE_KEY"
        log_error "  - GOOGLE_API_KEY"
        exit 1
    fi

    log_info "Environment variables configured ✓"

    # Run database migration
    log_info "Running database migration..."
    psql "$SUPABASE_URL" -f "$BACKEND_DIR/migrations/add_instagram_tags_fields.sql" || {
        log_warn "Migration failed or already applied. Continuing..."
    }

    log_info ""
    log_info "=========================================="
    log_info "Setup complete! ✅"
    log_info "=========================================="
    log_info ""
    log_info "Next steps:"
    log_info "  1. Test with dry run:  ./deploy_tagging.sh dry-run"
    log_info "  2. Run production:     ./deploy_tagging.sh run"
    log_info "  3. Use parallel mode:  ./deploy_tagging.sh parallel 5"
    log_info ""
}

###############################################################################
# Run Tagging Function
###############################################################################
run_tagging() {
    local dry_run=$1
    local workers=${2:-1}
    local limit=$3

    cd "$BACKEND_DIR"

    # Source .env
    export $(grep -v '^#' "$BACKEND_DIR/.env" | xargs)

    # Build command
    CMD="python3 scripts/tag_instagram_creators.py"

    if [ "$dry_run" == "true" ]; then
        CMD="$CMD --dry-run"
        log_info "Running in DRY RUN mode (no database changes)"
    else
        log_info "Running in PRODUCTION mode"
    fi

    if [ "$workers" -gt 1 ]; then
        CMD="$CMD --workers $workers"
        log_info "Using $workers parallel workers"
    fi

    if [ -n "$limit" ]; then
        CMD="$CMD --limit $limit"
        log_info "Processing max $limit creators"
    fi

    log_info "Command: $CMD"
    log_info ""

    # Run tagging
    $CMD

    log_info ""
    log_info "Tagging complete! Check tagging_progress.log for details."
}

###############################################################################
# Main Script Logic
###############################################################################

case "$1" in
    setup)
        setup
        ;;

    run)
        run_tagging false 1 "$2"
        ;;

    dry-run)
        run_tagging true 1 "$2"
        ;;

    parallel)
        workers=${2:-5}
        limit=$3
        run_tagging false "$workers" "$limit"
        ;;

    help|--help|-h)
        echo ""
        echo "Instagram AI Tagging - Deployment Script"
        echo ""
        echo "Usage:"
        echo "  ./deploy_tagging.sh setup                  # Install dependencies & run migration"
        echo "  ./deploy_tagging.sh run [limit]            # Run tagging (production)"
        echo "  ./deploy_tagging.sh dry-run [limit]        # Test without saving to DB"
        echo "  ./deploy_tagging.sh parallel N [limit]     # Run with N parallel workers"
        echo ""
        echo "Examples:"
        echo "  ./deploy_tagging.sh setup                  # Initial setup"
        echo "  ./deploy_tagging.sh dry-run 10             # Test with 10 creators"
        echo "  ./deploy_tagging.sh run                    # Process all creators"
        echo "  ./deploy_tagging.sh run 50                 # Process only 50 creators"
        echo "  ./deploy_tagging.sh parallel 5             # Use 5 workers for all creators"
        echo "  ./deploy_tagging.sh parallel 10 100        # Use 10 workers for 100 creators"
        echo ""
        echo "Costs:"
        echo "  ~\$0.0013 per creator (Gemini 2.5 Flash)"
        echo "  89 creators = ~\$0.12 total"
        echo ""
        ;;

    *)
        log_error "Unknown command: $1"
        echo "Run './deploy_tagging.sh help' for usage information"
        exit 1
        ;;
esac
