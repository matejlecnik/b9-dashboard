#!/usr/bin/env python3
"""
Reddit Account Manager
Intelligent account rotation, health tracking, and rate limit management
"""

import asyncio
import random
import time
from datetime import datetime, timedelta, timezone
from typing import Dict, List, Optional, Tuple, Any
from dataclasses import dataclass, field
import logging
import json

from supabase import Client
import asyncpraw
import asyncprawcore

logger = logging.getLogger(__name__)

@dataclass
class RedditAccount:
    """Reddit account with health tracking"""
    id: str
    username: str
    client_id: str
    client_secret: str
    user_agent: str
    status: str = 'active'  # active, rate_limited, suspended, error

    # Health metrics
    health_score: float = 100.0
    total_requests: int = 0
    failed_requests: int = 0
    rate_limit_hits: int = 0
    consecutive_failures: int = 0

    # Timing
    last_used: Optional[datetime] = None
    rate_limited_until: Optional[datetime] = None
    cooldown_until: Optional[datetime] = None

    # Performance
    avg_response_time_ms: float = 0.0
    success_rate: float = 100.0

    def is_available(self) -> bool:
        """Check if account is available for use"""
        now = datetime.now(timezone.utc)

        if self.status != 'active':
            return False

        if self.rate_limited_until and now < self.rate_limited_until:
            return False

        if self.cooldown_until and now < self.cooldown_until:
            return False

        if self.health_score < 10:  # Minimum health threshold
            return False

        return True

    def update_health(self, success: bool, response_time_ms: float = 0):
        """Update health metrics after a request"""
        self.total_requests += 1
        self.last_used = datetime.now(timezone.utc)

        if success:
            self.consecutive_failures = 0
            # Gradually improve health score on success
            self.health_score = min(100, self.health_score + 0.5)
        else:
            self.failed_requests += 1
            self.consecutive_failures += 1
            # Decrease health score on failure
            self.health_score = max(0, self.health_score - 5)

        # Update success rate
        self.success_rate = ((self.total_requests - self.failed_requests) / max(1, self.total_requests)) * 100

        # Update average response time (moving average)
        if response_time_ms > 0:
            alpha = 0.1  # Smoothing factor
            self.avg_response_time_ms = (alpha * response_time_ms +
                                         (1 - alpha) * self.avg_response_time_ms)

    def mark_rate_limited(self, duration_minutes: int = 60):
        """Mark account as rate limited"""
        self.status = 'rate_limited'
        self.rate_limit_hits += 1
        self.rate_limited_until = datetime.now(timezone.utc) + timedelta(minutes=duration_minutes)
        self.health_score = max(0, self.health_score - 20)
        logger.warning(f"Account {self.username} rate limited until {self.rate_limited_until}")

    def reset_rate_limit(self):
        """Reset rate limit status if cooldown expired"""
        if self.rate_limited_until and datetime.now(timezone.utc) > self.rate_limited_until:
            self.status = 'active'
            self.rate_limited_until = None
            logger.info(f"Account {self.username} rate limit reset")

    def to_dict(self) -> dict:
        """Convert to dictionary for storage"""
        return {
            'id': self.id,
            'username': self.username,
            'status': self.status,
            'health_score': self.health_score,
            'total_requests': self.total_requests,
            'failed_requests': self.failed_requests,
            'rate_limit_hits': self.rate_limit_hits,
            'last_used': self.last_used.isoformat() if self.last_used else None,
            'rate_limited_until': self.rate_limited_until.isoformat() if self.rate_limited_until else None,
            'success_rate': round(self.success_rate, 2),
            'avg_response_time_ms': round(self.avg_response_time_ms, 2)
        }

class AccountManager:
    """Manages multiple Reddit accounts with intelligent rotation"""

    def __init__(self, supabase_client: Client, config: Any):
        self.supabase = supabase_client
        self.config = config
        self.accounts: Dict[str, RedditAccount] = {}
        self.reddit_clients: Dict[str, asyncpraw.Reddit] = {}
        self.rotation_index = 0
        self.proxy_config = config.proxy.get_proxy_dict() if config.proxy.enabled else None

    async def initialize(self):
        """Load accounts from Supabase and create Reddit clients"""
        try:
            # Load accounts from Supabase
            response = self.supabase.table(self.config.supabase.accounts_table).select("*").execute()

            if not response.data:
                logger.error("No Reddit accounts found in Supabase")
                return False

            logger.info(f"Loading {len(response.data)} Reddit accounts")

            for account_data in response.data:
                account = RedditAccount(
                    id=account_data['id'],
                    username=account_data['username'],
                    client_id=account_data['client_id'],
                    client_secret=account_data['client_secret'],
                    user_agent=self._generate_user_agent(account_data['username']),
                    status=account_data.get('status', 'active')
                )

                # Restore health metrics if available
                if 'health_score' in account_data:
                    account.health_score = account_data['health_score']
                if 'last_used' in account_data and account_data['last_used']:
                    account.last_used = datetime.fromisoformat(account_data['last_used'])

                self.accounts[account.username] = account

                # Create Reddit client
                await self._create_reddit_client(account)

            logger.info(f"Successfully initialized {len(self.accounts)} accounts")
            return True

        except Exception as e:
            logger.error(f"Failed to initialize accounts: {e}")
            return False

    async def _create_reddit_client(self, account: RedditAccount):
        """Create an AsyncPRAW Reddit client for an account"""
        try:
            # Create custom requestor if proxy is enabled
            if self.proxy_config:
                requestor = ProxyRequestor(
                    user_agent=account.user_agent,
                    proxy_url=self.config.proxy.url,
                    proxy_auth=(self.config.proxy.username, self.config.proxy.password)
                )
            else:
                requestor = None

            # Create Reddit client
            reddit = asyncpraw.Reddit(
                client_id=account.client_id,
                client_secret=account.client_secret,
                user_agent=account.user_agent,
                requestor=requestor
            )

            self.reddit_clients[account.username] = reddit
            logger.debug(f"Created Reddit client for {account.username}")

        except Exception as e:
            logger.error(f"Failed to create Reddit client for {account.username}: {e}")
            account.status = 'error'

    def _generate_user_agent(self, username: str) -> str:
        """Generate a unique user agent for an account"""
        browsers = [
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/{v}.0.0.0 Safari/537.36",
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/{v}.0.0.0 Safari/537.36",
            "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/{v}.0.0.0 Safari/537.36",
        ]

        # Use username hash for consistent but unique user agent
        random.seed(hash(username) % 1000000)
        template = random.choice(browsers)
        version = random.randint(119, 122)
        user_agent = template.format(v=version)
        random.seed()  # Reset to truly random

        return user_agent

    async def get_next_account(self) -> Optional[Tuple[RedditAccount, asyncpraw.Reddit]]:
        """Get the next available account using intelligent rotation"""
        # Reset rate limits for accounts whose cooldown has expired
        for account in self.accounts.values():
            account.reset_rate_limit()

        # Get list of available accounts
        available = [acc for acc in self.accounts.values() if acc.is_available()]

        if not available:
            logger.error("No available Reddit accounts")
            return None

        # Strategy 1: Use healthiest account if significant difference
        healthiest = max(available, key=lambda x: x.health_score)
        avg_health = sum(acc.health_score for acc in available) / len(available)

        if healthiest.health_score > avg_health + 20:  # Significantly healthier
            account = healthiest
            logger.debug(f"Selected healthiest account: {account.username} (score: {account.health_score:.1f})")
        else:
            # Strategy 2: Round-robin with least recently used
            available.sort(key=lambda x: x.last_used or datetime.min.replace(tzinfo=timezone.utc))
            account = available[0]
            logger.debug(f"Selected least recently used: {account.username}")

        # Get corresponding Reddit client
        reddit_client = self.reddit_clients.get(account.username)
        if not reddit_client:
            logger.error(f"No Reddit client for account {account.username}")
            return None

        return account, reddit_client

    async def report_request_result(self, account: RedditAccount, success: bool,
                                   response_time_ms: float = 0, error: Optional[str] = None):
        """Report the result of a request for an account"""
        account.update_health(success, response_time_ms)

        # Check for rate limiting
        if error and 'rate limit' in error.lower():
            cooldown_minutes = self.config.rate_limit.account_cooldown_minutes
            account.mark_rate_limited(cooldown_minutes)

        # Check for suspension or other critical errors
        elif error and any(term in error.lower() for term in ['suspended', 'banned', 'forbidden']):
            account.status = 'suspended'
            logger.error(f"Account {account.username} appears to be suspended")

        # Apply cooldown if too many consecutive failures
        elif account.consecutive_failures >= 5:
            account.cooldown_until = datetime.now(timezone.utc) + timedelta(minutes=30)
            logger.warning(f"Account {account.username} cooled down due to failures")

        # Persist health metrics to Supabase periodically
        if account.total_requests % 100 == 0:  # Every 100 requests
            await self._persist_account_health(account)

    async def _persist_account_health(self, account: RedditAccount):
        """Save account health metrics to Supabase"""
        try:
            update_data = {
                'status': account.status,
                'health_score': account.health_score,
                'total_requests': account.total_requests,
                'failed_requests': account.failed_requests,
                'rate_limit_hits': account.rate_limit_hits,
                'last_used': account.last_used.isoformat() if account.last_used else None,
                'success_rate': account.success_rate,
                'updated_at': datetime.now(timezone.utc).isoformat()
            }

            self.supabase.table(self.config.supabase.accounts_table)\
                .update(update_data)\
                .eq('id', account.id)\
                .execute()

        except Exception as e:
            logger.error(f"Failed to persist account health for {account.username}: {e}")

    def get_account_summary(self) -> Dict[str, Any]:
        """Get summary of all accounts"""
        total = len(self.accounts)
        available = sum(1 for acc in self.accounts.values() if acc.is_available())
        rate_limited = sum(1 for acc in self.accounts.values() if acc.status == 'rate_limited')
        suspended = sum(1 for acc in self.accounts.values() if acc.status == 'suspended')

        avg_health = sum(acc.health_score for acc in self.accounts.values()) / max(1, total)
        avg_success_rate = sum(acc.success_rate for acc in self.accounts.values()) / max(1, total)

        return {
            'total_accounts': total,
            'available': available,
            'rate_limited': rate_limited,
            'suspended': suspended,
            'average_health': round(avg_health, 2),
            'average_success_rate': round(avg_success_rate, 2),
            'accounts': [acc.to_dict() for acc in self.accounts.values()]
        }

    async def force_rotate(self):
        """Force rotation to next account"""
        self.rotation_index = (self.rotation_index + 1) % len(self.accounts)
        logger.info("Forced account rotation")

    async def reset_account(self, username: str):
        """Reset an account's health metrics"""
        if username in self.accounts:
            account = self.accounts[username]
            account.status = 'active'
            account.health_score = 100.0
            account.consecutive_failures = 0
            account.rate_limited_until = None
            account.cooldown_until = None
            logger.info(f"Reset account {username}")
            await self._persist_account_health(account)

    async def disable_account(self, username: str, reason: str = "manual"):
        """Disable an account"""
        if username in self.accounts:
            account = self.accounts[username]
            account.status = 'disabled'
            logger.warning(f"Disabled account {username}: {reason}")
            await self._persist_account_health(account)

    async def cleanup(self):
        """Cleanup Reddit clients"""
        for reddit_client in self.reddit_clients.values():
            try:
                await reddit_client.close()
            except Exception as e:
                logger.error(f"Error closing Reddit client: {e}")

class ProxyRequestor(asyncprawcore.Requestor):
    """Custom requestor for AsyncPRAW with proxy support"""

    def __init__(self, user_agent: str, proxy_url: str, proxy_auth: Optional[Tuple[str, str]] = None):
        super().__init__(user_agent)
        self.proxy_url = proxy_url
        self.proxy_auth = proxy_auth

    async def request(self, *args, **kwargs):
        """Make request through proxy"""
        # Add proxy to kwargs
        if self.proxy_url:
            kwargs['proxy'] = self.proxy_url
            if self.proxy_auth:
                kwargs['proxy_auth'] = self.proxy_auth

        return await super().request(*args, **kwargs)