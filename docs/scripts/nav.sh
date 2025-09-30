#!/bin/bash
# Quick navigation script for documentation
# Usage: ./nav.sh [keyword]

# Colors
BLUE='\033[0;34m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

# Documentation map
declare -A docs=(
    ["claude"]="CLAUDE.md"
    ["index"]="docs/INDEX.md"
    ["metrics"]="docs/DOCUMENTATION_METRICS.md"
    ["api"]="api-render/API_DOCUMENTATION.md"
    ["database"]="docs/database/SUPABASE_SCHEMA.md"
    ["db"]="docs/database/SUPABASE_SCHEMA.md"
    ["functions"]="docs/database/SUPABASE_FUNCTIONS.md"
    ["queries"]="docs/database/SUPABASE_QUERIES.md"
    ["jobs"]="docs/database/BACKGROUND_JOBS.md"
    ["cron"]="docs/database/TODO_CRON_SETUP.md"
    ["deploy"]="docs/deployment/DEPLOYMENT.md"
    ["secrets"]="docs/deployment/DEPLOYMENT_SECRETS.md"
    ["standards"]="docs/development/DOCUMENTATION_STANDARDS.md"
    ["template"]="docs/development/DOCUMENTATION_TEMPLATE.md"
    ["map"]="docs/development/DOCUMENTATION_MAP.md"
    ["session"]="docs/development/SESSION_LOG.md"
    ["testing"]="dashboard/docs/TESTING_GUIDE.md"
    ["components"]="dashboard/docs/COMPONENT_GUIDE.md"
    ["react"]="dashboard/docs/development/REACT_QUERY_GUIDE.md"
    ["reddit"]="api-render/app/scrapers/reddit/README.md"
    ["instagram"]="api-render/app/scrapers/instagram/README.md"
    ["architecture"]="api-render/ARCHITECTURE.md"
)

# Function to display menu
show_menu() {
    echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE}📚 B9 Dashboard Documentation Navigator${NC}"
    echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
    echo -e "${GREEN}Quick Access:${NC}"
    echo "  1) CLAUDE.md          - Control center"
    echo "  2) Index              - Master documentation index"
    echo "  3) Database Schema    - Supabase tables & views"
    echo "  4) API Docs           - Endpoint reference"
    echo "  5) Testing Guide      - Test coverage & examples"
    echo "  6) Component Guide    - UI components"
    echo "  7) Deployment         - Deploy instructions"
    echo "  8) Session Log        - Development history"
    echo ""
    echo -e "${YELLOW}Categories:${NC}"
    echo "  db)    Database docs"
    echo "  api)   API documentation"
    echo "  dev)   Development guides"
    echo "  test)  Testing documentation"
    echo ""
    echo -e "${CYAN}Usage:${NC} nav [keyword/number]"
    echo -e "${CYAN}Search:${NC} nav search <term>"
    echo -e "${CYAN}List all:${NC} nav list"
    echo ""
}

# Function to open documentation
open_doc() {
    local file=$1
    if [ -f "$file" ]; then
        echo -e "${GREEN}Opening:${NC} $file"
        # Try different editors in order of preference
        if command -v code &> /dev/null; then
            code "$file"
        elif command -v vim &> /dev/null; then
            vim "$file"
        elif command -v nano &> /dev/null; then
            nano "$file"
        else
            less "$file"
        fi
    else
        echo -e "${YELLOW}File not found:${NC} $file"
    fi
}

# Function to search documentation
search_docs() {
    local term=$1
    echo -e "${BLUE}Searching for:${NC} $term"
    echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

    # Search in all .md files
    grep -r "$term" --include="*.md" --exclude-dir=node_modules . 2>/dev/null | \
        grep -v ".git" | \
        head -20 | \
        while IFS=: read -r file line; do
            # Clean up the output
            file=${file#./}
            line=${line:0:80}
            echo -e "${GREEN}$file${NC}"
            echo "  $line..."
            echo ""
        done
}

# Function to list all documentation files
list_all() {
    echo -e "${BLUE}All Documentation Files:${NC}"
    echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

    find . -name "*.md" -type f | \
        grep -v node_modules | \
        grep -v ".git" | \
        sort | \
        while read -r file; do
            file=${file#./}
            size=$(wc -l < "$file" 2>/dev/null)
            printf "${GREEN}%-50s${NC} %5d lines\n" "$file" "$size"
        done
}

# Main logic
case "$1" in
    "")
        show_menu
        read -p "Enter choice: " choice
        case "$choice" in
            1) open_doc "CLAUDE.md" ;;
            2) open_doc "docs/INDEX.md" ;;
            3) open_doc "docs/database/SUPABASE_SCHEMA.md" ;;
            4) open_doc "api-render/API_DOCUMENTATION.md" ;;
            5) open_doc "dashboard/docs/TESTING_GUIDE.md" ;;
            6) open_doc "dashboard/docs/COMPONENT_GUIDE.md" ;;
            7) open_doc "docs/deployment/DEPLOYMENT.md" ;;
            8) open_doc "docs/development/SESSION_LOG.md" ;;
            db)
                echo "Opening database documentation..."
                open_doc "docs/database/README.md"
                ;;
            api)
                echo "Opening API documentation..."
                open_doc "api-render/API_DOCUMENTATION.md"
                ;;
            dev)
                echo "Opening development guides..."
                open_doc "docs/development/DOCUMENTATION_MAP.md"
                ;;
            test)
                echo "Opening test documentation..."
                open_doc "dashboard/docs/TESTING_GUIDE.md"
                ;;
            *)
                echo -e "${YELLOW}Invalid choice${NC}"
                ;;
        esac
        ;;

    search)
        if [ -z "$2" ]; then
            echo -e "${YELLOW}Usage:${NC} nav search <term>"
        else
            search_docs "$2"
        fi
        ;;

    list)
        list_all
        ;;

    help|--help|-h)
        show_menu
        ;;

    *)
        # Try to match keyword
        if [ -n "${docs[$1]}" ]; then
            open_doc "${docs[$1]}"
        else
            echo -e "${YELLOW}Unknown keyword:${NC} $1"
            echo "Try: nav help"
        fi
        ;;
esac