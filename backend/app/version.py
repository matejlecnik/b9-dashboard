"""
B9 Dashboard API Version Management
Single source of truth for all version numbers
"""

# Main API version (follows SemVer)
API_VERSION = "3.12.4"

# Component versions
REDDIT_SCRAPER_VERSION = "3.11.1"  # Fixed Phase 3 indentation bug (infinite loop in Phase 2)
INSTAGRAM_SCRAPER_VERSION = "3.12.3"  # Fixed missing retry_backoff_multiplier config attribute

# Build info
BUILD_DATE = "2025-10-10"
GIT_COMMIT = None  # Auto-populated by CI/CD


def get_version_info():
    """Return complete version information"""
    return {
        "api_version": API_VERSION,
        "reddit_scraper": REDDIT_SCRAPER_VERSION,
        "instagram_scraper": INSTAGRAM_SCRAPER_VERSION,
        "build_date": BUILD_DATE,
        "git_commit": GIT_COMMIT,
    }
