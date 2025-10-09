"""
Dynamic Router Discovery and Loading
Automatically loads and registers FastAPI routers with graceful error handling
"""

import importlib
import logging
from typing import Any, List, Optional, Tuple

from fastapi import APIRouter


logger = logging.getLogger(__name__)


# Router Registry - Single source of truth for all application routers
# Format: (module_path, router_attr_name, description)
ROUTER_REGISTRY = [
    ("app.api.root", "router", "Root endpoint"),
    ("app.api.health", "router", "Health checks"),
    ("app.api.stats", "router", "Statistics & analytics"),
    ("app.api.cron", "router", "Cron jobs"),
    ("app.api.instagram.scraper", "router", "Instagram scraper API"),
    ("app.api.instagram.creators", "router", "Instagram creator management"),
    ("app.api.instagram.related_creators", "router", "Instagram related creators"),
    ("app.api.reddit.scraper", "router", "Reddit scraper API"),
    ("app.api.reddit.subreddits", "router", "Reddit subreddit fetcher"),
    ("app.api.reddit.users", "router", "Reddit user management"),
    ("app.api.ai.categorization", "router", "AI categorization"),
    ("app.jobs.background", "router", "Background jobs"),
]


def load_routers() -> List[Tuple[APIRouter, str]]:
    """
    Dynamically load all routers from the registry

    Returns:
        List of tuples containing (router, description)

    Example:
        >>> routers = load_routers()
        >>> for router, description in routers:
        ...     app.include_router(router)
    """
    loaded_routers = []

    for module_path, router_attr, description in ROUTER_REGISTRY:
        try:
            # Dynamically import the module
            module = importlib.import_module(module_path)

            # Get the router attribute (usually named 'router')
            router = getattr(module, router_attr, None)

            if router and isinstance(router, APIRouter):
                loaded_routers.append((router, description))
                logger.info(f"✅ {description} registered")
            else:
                logger.warning(f"⚠️ No valid router found in {module_path}")

        except ImportError as e:
            # Module doesn't exist or has import errors - log and continue
            logger.warning(f"⚠️ {description} not available: {e}")
        except AttributeError as e:
            # Router attribute doesn't exist in module
            logger.error(f"❌ Router attribute '{router_attr}' not found in {module_path}: {e}")
        except Exception as e:
            # Catch-all for unexpected errors
            logger.error(f"❌ Failed to load {module_path}: {e}", exc_info=True)

    logger.info(f"📊 Successfully loaded {len(loaded_routers)}/{len(ROUTER_REGISTRY)} routers")
    return loaded_routers


def load_router_with_stats_injection(
    module_path: str, router_attr: str, description: str, stats_module: Optional[Any] = None
) -> Optional[Tuple[APIRouter, str]]:
    """
    Load a single router with optional stats module injection

    This is useful for routers that need special initialization,
    like the stats router which needs the categorization service

    Args:
        module_path: Python module path
        router_attr: Router attribute name in the module
        description: Human-readable description
        stats_module: Optional stats module for service injection

    Returns:
        Tuple of (router, description) or None if loading fails
    """
    try:
        module = importlib.import_module(module_path)
        router = getattr(module, router_attr, None)

        # Inject stats module if provided and module supports it
        if stats_module and hasattr(module, "set_stats_module"):
            module.set_stats_module(stats_module)

        if router and isinstance(router, APIRouter):
            logger.info(f"✅ {description} registered (with stats injection)")
            return (router, description)
        else:
            logger.warning(f"⚠️ No valid router found in {module_path}")
            return None

    except Exception as e:
        logger.error(f"❌ Failed to load {module_path}: {e}", exc_info=True)
        return None
