"""
B9 Dashboard API Version Management
Single source of truth for all version numbers
"""

# Main API version (follows SemVer)
API_VERSION = "3.7.0"

# Component versions
REDDIT_SCRAPER_VERSION = "3.6.3"
INSTAGRAM_SCRAPER_VERSION = "2.1.0"

# Build info
BUILD_DATE = "2025-10-03"
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
