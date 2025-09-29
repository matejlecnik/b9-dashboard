#!/bin/bash
# Setup script for Git hooks

echo "🔧 Setting up Git hooks..."

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Create hooks directory if it doesn't exist
if [ ! -d ".git/hooks" ]; then
    echo -e "${YELLOW}Creating .git/hooks directory...${NC}"
    mkdir -p .git/hooks
fi

# Link pre-commit hook
if [ -f ".githooks/pre-commit" ]; then
    echo "Installing pre-commit hook..."
    ln -sf ../../.githooks/pre-commit .git/hooks/pre-commit
    chmod +x .git/hooks/pre-commit
    echo -e "${GREEN}✓ Pre-commit hook installed${NC}"
else
    echo -e "${YELLOW}⚠ Pre-commit hook not found in .githooks/${NC}"
fi

# Verify installation
if [ -f ".git/hooks/pre-commit" ]; then
    echo -e "\n${GREEN}✅ Git hooks successfully installed!${NC}"
    echo -e "\nThe following checks will run before each commit:"
    echo "  • Documentation format validation"
    echo "  • Navigation JSON structure"
    echo "  • Header hierarchy"
    echo "  • Internal link validation"
    echo "  • File size warnings"
    echo -e "\nTo skip hooks (not recommended): git commit --no-verify"
else
    echo -e "\n${YELLOW}⚠ Installation may have failed${NC}"
    exit 1
fi