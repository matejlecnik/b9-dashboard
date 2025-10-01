# Reddit Scraper Architecture Documentation

```
┌─ SYSTEM ARCHITECTURE ───────────────────────────────────┐
│ Version: 3.5.0                                          │
│ Status: PRODUCTION                                      │
│ Last Updated: 2025-10-01                                │
└─────────────────────────────────────────────────────────┘
```

## Navigation

```json
{
  "parent": "../README.md",
  "current": "app/scrapers/reddit/ARCHITECTURE.md",
  "related": [
    {"path": "README.md", "desc": "Reddit scraper overview", "status": "ACTIVE"},
    {"path": "reddit_scraper.py", "desc": "Main implementation", "status": "PRODUCTION"},
    {"path": "reddit_controller.py", "desc": "Process control", "status": "PRODUCTION"}
  ]
}
```

## Table of Contents

1. [System Overview](#system-overview)
2. [Architecture Diagram](#architecture-diagram)
3. [Data Flow](#data-flow)
4. [Processing Rules Matrix](#processing-rules-matrix)
5. [Component Specifications](#component-specifications)
6. [Database Schema](#database-schema)
7. [API Integration](#api-integration)
8. [Error Handling](#error-handling)
9. [Performance Optimization](#performance-optimization)
10. [Maintenance & Monitoring](#maintenance--monitoring)

---

## System Overview

### Purpose

The Reddit Scraper is a high-performance data collection system that:
- Discovers and processes Reddit subreddits based on review status
- Collects subreddit metadata, posts, and user information
- Calculates engagement metrics and requirements
- Handles 6 different review statuses with status-specific processing logic
- Manages 2,100+ Ok subreddits and 2,100+ NULL review subreddits

### Key Features

```json
{
  "capabilities": [
    "Multi-status subreddit processing",
    "Parallel user processing (3-5 threads)",
    "Proxy rotation with health tracking",
    "Automatic subreddit discovery",
    "Status-aware processing (6 review types)",
    "Real-time metrics calculation",
    "Comprehensive error handling"
  ],
  "performance": {
    "target_time_per_subreddit": "2-3 minutes",
    "parallel_threads": 5,
    "proxy_count": 3,
    "retry_strategy": "Immediate (0.1s delay)",
    "max_retries": 3,
    "timeout": "15 seconds"
  },
  "data_volume": {
    "subreddits_tracked": "13,292 total",
    "ok_subreddits": 2206,
    "null_review": 2128,
    "users_per_subreddit": "~40 average",
    "posts_per_subreddit": "~140 average"
  }
}
```

### Technology Stack

| Component | Technology | Purpose |
|-----------|------------|---------|
| Language | Python 3.11+ | Core implementation |
| API Client | Requests + Proxies | Reddit public JSON API |
| Async Runtime | asyncio | Async coordination |
| Concurrency | ThreadPoolExecutor | Parallel user processing |
| Database | Supabase (PostgreSQL) | Data storage |
| Proxy Management | Custom ProxyManager | IP rotation |
| User Agents | fake-useragent | UA rotation |

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                     REDDIT SCRAPER v3.5.0                       │
└─────────────────────────────────────────────────────────────────┘

┌──────────────┐
│  Controller  │  ← Start/Stop/Monitor
│ (Render API) │
└──────┬───────┘
       │
       v
┌──────────────────────────────────────────────────────────────┐
│                   Reddit Scraper Main Loop                   │
│                                                              │
│  Phase 1: Proxy Setup                                        │
│  ├─ Load proxies from Supabase                               │
│  ├─ Test all proxies (parallel)                              │
│  └─ Initialize ThreadPool (5 workers)                        │
│                                                              │
│                                                              │
│  Phase 2: Target Subreddits                                  │
│  ├─ Load skip caches (Non Related, User Feed, Banned, NULL)  │
│  ├─ Query Ok subreddits (2,206)                              │
│  ├─ Query No Seller subreddits (70)                          │
│  └─ Cache metadata (review, category, tags, over18)          │
│                                                              │
│  Phase 3: Process Subreddits                                 │
│  ├─ Loop 1: Ok Subreddits (full processing)                  │
│  │   ├─ Fetch subreddit + posts                              │
│  │   ├─ Process users (parallel)                             │
│  │   ├─ Calculate requirements                               │
│  │   └─ Discover new subreddits                              │
│  │                                                           │
│  └─ Loop 2: Discovered Subreddits (immediate processing)     │
│      ├─ Filter NULL review → No Seller logic                 │
│      ├─ Process posts only (if NULL/No Seller)               │
│      └─ No further discovery (prevent loops)                 │
└──────────────────────────────────────────────────────────────┘
       │                │                    │
       v                v                    v
┌──────────────┐  ┌──────────────┐    ┌──────────────┐
│ Proxy Manager│  │  Reddit API  │    │   Supabase   │
│              │  │              │    │  PostgreSQL  │
│ - 3 proxies  │  │ - Subreddit  │    │ - Subreddits │
│ - Round robin│  │ - Posts      │    │ - Posts      │
│ - Health     │  │ - Users      │    │ - Users      │
│ - UA rotation│  │ - Rules      │    │ - Proxies    │
└──────────────┘  └──────────────┘    └──────────────┘
```

---

## Data Flow

### Phase 1: Proxy Setup

```
1. Load Proxies
   ├─ Query: reddit_proxies WHERE is_active=true
   ├─ Priority: ORDER BY priority DESC
   └─ Result: 3 proxy configs

2. Test Proxies (parallel)
   ├─ Endpoint: https://www.reddit.com/api/v1/me.json
   ├─ Method: GET with rotating UA
   ├─ Success: HTTP 200/401/403
   ├─ Timeout: 15 seconds
   ├─ Retries: 3 attempts
   └─ Update: success_count/error_count in DB

3. Initialize ThreadPool
   ├─ Workers: 5 concurrent threads
   └─ Purpose: Parallel user processing
```

### Phase 2: Target Subreddits

```
1. Load Skip Caches
   ├─ Non Related: 6,778 subreddits
   ├─ User Feed: 2,082 subreddits
   ├─ Banned: 28 subreddits
   ├─ Ok: 2,206 subreddits (processed in Loop 1)
   ├─ No Seller: 70 subreddits (processed in Loop 2)
   └─ NULL review: ~2,100 subreddits (awaiting manual review)

2. Query Target Subreddits
   ├─ Ok: SELECT * WHERE review='Ok' (2,206 subreddits)
   ├─ No Seller: SELECT * WHERE review='No Seller' (70 subreddits)
   └─ Fields: name, review, primary_category, tags, over18

3. Build Metadata Cache
   {
     'subreddit_name': {
       'review': 'Ok',
       'primary_category': 'fashion',
       'tags': ['selfies', 'photos'],
       'over18': true
     }
   }
```

### Phase 3: Process Subreddits

#### Loop 1: Ok Subreddits (Full Processing)

```
For each Ok subreddit:

1. Fetch Subreddit Data
   ├─ GET /r/{name}/about.json
   ├─ GET /r/{name}/about/rules.json
   ├─ GET /r/{name}/hot.json?limit=30
   ├─ GET /r/{name}/top.json?t=week&limit=10
   └─ GET /r/{name}/top.json?t=year&limit=100

2. Save Subreddit
   ├─ Calculate: avg_upvotes, engagement, subreddit_score
   ├─ Detect: verification_required (from rules)
   ├─ Preserve: review, primary_category, tags, over18
   └─ UPSERT: reddit_subreddits (on_conflict='name')

3. Save Posts
   ├─ Deduplicate: 140 unique posts by reddit_id
   ├─ Denormalize: sub_primary_category, sub_tags, sub_over18
   ├─ Calculate: post_length, content_type, comment_to_upvote_ratio
   └─ UPSERT: reddit_posts (on_conflict='reddit_id')

4. Process Users (PARALLEL)
   ├─ Extract: 37 unique authors (exclude [deleted], AutoModerator)
   ├─ Batch: 5 users per parallel batch
   │
   └─ For each user:
      ├─ GET /user/{username}/about.json
      ├─ GET /user/{username}/submitted.json?limit=30
      ├─ Save user: UPSERT reddit_users
      ├─ Save user posts: UPSERT reddit_posts (cross-subreddit)
      └─ Extract: discovered subreddits from user posts

5. Calculate Requirements
   ├─ Metric: 10th percentile of users
   ├─ Fields: min_account_age_days, min_comment_karma, min_post_karma
   └─ UPDATE: reddit_subreddits SET requirements

6. Discover New Subreddits
   ├─ Extract: subreddit names from user posts
   ├─ Filter: Remove Non Related, User Feed, Banned
   ├─ Filter: Remove already-processed
   └─ Result: Set of new subreddits to process
```

#### Loop 2: Discovered Subreddits (Immediate Processing)

```
For each discovered subreddit:

1. Check Review Status
   ├─ Query cache: review status
   ├─ NULL review → process_users = False
   ├─ No Seller → process_users = False
   └─ Others → process_users = True

2. Process Subreddit
   ├─ allow_discovery = False (prevent infinite loops)
   ├─ process_users = based on review status
   └─ Follow same flow as Loop 1 (but conditionally)

3. Status Preservation
   ├─ NULL review stays NULL (not promoted)
   ├─ All other statuses preserved
   └─ No automatic status changes
```

---

## Processing Rules Matrix

### Review Status Behavior

| Status | Count | Process | Save Posts | Process Users | Discovery | Preserve Status |
|--------|-------|---------|------------|---------------|-----------|-----------------|
| `Ok` | 2,206 | ✓ Yes | ✓ Yes | ✓ Yes | ✓ Yes | ✓ Yes |
| `No Seller` | 70 | ✓ Yes | ✓ Yes | ✗ No | ✗ No | ✓ Yes |
| `NULL` | 2,128 | ✓ Yes | ✓ Yes | ✗ No | ✗ No | ✓ Yes (keep NULL) |
| `Non Related` | 6,778 | ✗ Skip | ✗ No | ✗ No | ✗ No | ✓ Yes |
| `User Feed` | 2,082 | ✗ Skip | ✗ No | ✗ No | ✗ No | ✓ Yes |
| `Banned` | 28 | ✗ Skip | ✗ No | ✗ No | ✗ No | ✓ Yes |

### Processing Decision Tree

```
Subreddit Processing Decision:
│
├─ Is review in skip_cache (Non Related, User Feed, Banned, Ok, No Seller, NULL)?
│  ├─ YES → Skip during discovery (already tracked/processed)
│  └─ NO → Continue
│
├─ Is review = 'Ok'?
│  ├─ YES → Full processing (subreddit + posts + users + discovery)
│  └─ NO → Continue
│
├─ Is review = 'No Seller' OR NULL?
│  ├─ YES → Partial processing (subreddit + posts, NO users, NO discovery)
│  └─ NO → Unknown status (treat as 'Ok')
│
└─ Preserve review status in all cases
```

### Status Preservation Logic

**Critical Requirement:** Never overwrite existing review status

```python
# Line 596 in reddit_scraper.py
cached = self.subreddit_metadata_cache.get(name, {})
review = cached.get('review')  # ← Reads from cache (populated from DB)
primary_category = cached.get('primary_category')
tags = cached.get('tags', [])
over18 = cached.get('over18', over18_from_api)

# Line 640
payload = {
    'review': review,  # ← Preserves existing status (or NULL)
    'primary_category': primary_category,
    'tags': tags,
    ...
}
```

**How it works:**
1. Cache populated from DB query (lines 213-234)
2. Cache includes `review` column
3. `save_subreddit()` reads from cache
4. UPSERT preserves cached value
5. Result: Status never changes during scraping

---

## Component Specifications

### 1. RedditScraper (Main Class)

**File:** `reddit_scraper.py`

**Responsibilities:**
- Orchestrate 3-phase scraping process
- Manage subreddit metadata cache
- Handle status-based processing logic
- Coordinate proxy and API clients
- Track skip caches

**Key Methods:**

```python
async def run()
    # Main execution loop (3 phases)

async def get_target_subreddits() -> Dict[str, List[str]]
    # Query Ok and No Seller subreddits
    # Returns: {'ok': [...], 'no_seller': [...]}

async def process_subreddit(name: str, process_users: bool, allow_discovery: bool) -> set
    # Two-pass processing: 1) subreddit+posts, 2) users
    # Returns: Set of discovered subreddit names

async def process_discovered_subreddit(name: str)
    # Process discovered subreddit with status logic
    # NULL review → process_users=False

def process_single_user(username: str, proxy: dict) -> dict
    # SYNCHRONOUS method for ThreadPoolExecutor
    # Fetch user info + posts, save to DB
    # Returns: {'user_info': {...}, 'subreddits': {...}}

def save_subreddit(name: str, info: dict, rules: list, top_weekly: list)
    # Calculate metrics, preserve cached metadata
    # UPSERT to reddit_subreddits

def save_posts(posts: list, subreddit_name: str = None)
    # Create stub subreddits for user posts
    # UPSERT to reddit_posts

def save_user(user_info: dict)
    # UPSERT to reddit_users

def calculate_min_requirements(authors: set, user_data_list: list, posts: list) -> dict
    # Calculate 10th percentile requirements
    # Returns: {min_account_age, min_comment_karma, min_post_karma}
```

### 2. ProxyManager

**File:** `proxy_manager.py`

**Responsibilities:**
- Load proxies from Supabase
- Test proxy connectivity
- Round-robin rotation
- Update success/error counts
- Generate random user agents

**Key Methods:**

```python
def load_proxies() -> int
    # Query reddit_proxies WHERE is_active=true
    # ORDER BY priority DESC
    # Returns: Number of proxies loaded

def test_all_proxies() -> int
    # Parallel testing with ThreadPoolExecutor
    # Test endpoint: /api/v1/me.json
    # Returns: Number of working proxies

def get_next_proxy() -> Dict
    # Round-robin rotation
    # Returns: {'service', 'proxy', 'display_name', 'max_threads', 'priority'}

def generate_user_agent() -> str
    # 75% fake-useragent, 25% static pool
    # Returns: Random UA string

def update_proxy_stats(proxy_config: Dict, success: bool)
    # Increment success_count or error_count in DB
```

### 3. PublicRedditAPI

**File:** `public_reddit_api.py`

**Responsibilities:**
- Make HTTP requests to Reddit public JSON API
- Handle retries with exponential backoff
- Manage timeouts
- Track proxy statistics
- Parse JSON responses

**Key Methods:**

```python
def _request_with_retry(url: str, proxy_config: Dict) -> Optional[Dict]
    # Core request logic with retry
    # Returns: JSON dict or error dict {'error': 'type', 'status': code}

def get_subreddit_info(subreddit_name: str, proxy_config: Dict) -> Optional[Dict]
    # GET /r/{name}/about.json
    # Returns: Subreddit data dict

def get_subreddit_rules(subreddit_name: str, proxy_config: Dict) -> List[Dict]
    # GET /r/{name}/about/rules.json
    # Returns: List of rules

def get_subreddit_hot_posts(subreddit_name: str, limit: int, proxy_config: Dict) -> List[Dict]
    # GET /r/{name}/hot.json?limit={limit}
    # Returns: List of posts

def get_subreddit_top_posts(subreddit_name: str, time_filter: str, limit: int, proxy_config: Dict) -> List[Dict]
    # GET /r/{name}/top.json?t={filter}&limit={limit}
    # Returns: List of posts

def get_user_info(username: str, proxy_config: Dict) -> Optional[Dict]
    # GET /user/{name}/about.json
    # Returns: User data dict or error dict

def get_user_posts(username: str, limit: int, proxy_config: Dict) -> List[Dict]
    # GET /user/{name}/submitted.json?limit={limit}
    # Returns: List of posts
```

---

## Database Schema

### reddit_subreddits

**Primary Table:** Stores subreddit metadata and calculated metrics

```sql
CREATE TABLE reddit_subreddits (
    -- Identity
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT UNIQUE NOT NULL,  -- e.g. "programming"

    -- Metadata from Reddit API
    title TEXT,
    description TEXT,
    public_description TEXT,
    subscribers INTEGER,
    created_utc TIMESTAMP WITH TIME ZONE,
    over18 BOOLEAN DEFAULT false,

    -- Content permissions
    allow_images BOOLEAN DEFAULT false,
    allow_videos BOOLEAN DEFAULT false,
    allow_polls BOOLEAN DEFAULT false,
    spoilers_enabled BOOLEAN DEFAULT false,

    -- Visual/Branding
    icon_img TEXT,
    banner_img TEXT,
    community_icon TEXT,
    header_img TEXT,
    banner_background_color TEXT,
    primary_color TEXT,
    key_color TEXT,

    -- Additional metadata (v3.0.2)
    display_name_prefixed TEXT,  -- e.g. "r/programming"
    is_quarantined BOOLEAN DEFAULT false,
    lang TEXT,  -- e.g. "en"
    link_flair_enabled BOOLEAN DEFAULT false,
    link_flair_position TEXT,
    mobile_banner_image TEXT,
    submission_type TEXT,  -- "any", "link", "self"
    submit_text TEXT,
    submit_text_html TEXT,
    subreddit_type TEXT,  -- "public", "restricted", "private"
    url TEXT,  -- e.g. "/r/programming/"
    user_flair_enabled_in_sr BOOLEAN DEFAULT false,
    user_flair_position TEXT,
    wiki_enabled BOOLEAN DEFAULT false,

    -- Calculated metrics
    avg_upvotes_per_post NUMERIC,  -- From top 10 weekly
    engagement NUMERIC,  -- comments / upvotes
    subreddit_score NUMERIC,  -- sqrt(engagement * avg_upvotes * 1000)
    verification_required BOOLEAN DEFAULT false,  -- From rules/description

    -- Rules data
    rules_data JSONB,  -- Full rules array

    -- Manual classification (PRESERVED)
    review TEXT,  -- 'Ok', 'No Seller', 'Non Related', 'User Feed', 'Banned', NULL
    primary_category TEXT,  -- 'fashion', 'fitness', etc.
    tags TEXT[],  -- ['selfies', 'photos']

    -- Requirements (10th percentile of users)
    min_account_age_days INTEGER,
    min_comment_karma INTEGER,
    min_post_karma INTEGER,

    -- Timestamps
    last_scraped_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_subreddits_review ON reddit_subreddits(review);
CREATE INDEX idx_subreddits_category ON reddit_subreddits(primary_category);
CREATE INDEX idx_subreddits_over18 ON reddit_subreddits(over18);
CREATE INDEX idx_subreddits_scraped ON reddit_subreddits(last_scraped_at);
CREATE INDEX idx_subreddits_subscribers ON reddit_subreddits(subscribers DESC);
CREATE INDEX idx_subreddits_score ON reddit_subreddits(subreddit_score DESC);
```

### reddit_posts

**Purpose:** Store individual Reddit posts with denormalized subreddit metadata

```sql
CREATE TABLE reddit_posts (
    -- Identity
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    reddit_id TEXT UNIQUE NOT NULL,  -- e.g. "abc123"

    -- Relationships
    subreddit_name TEXT NOT NULL REFERENCES reddit_subreddits(name),
    author_username TEXT REFERENCES reddit_users(username),

    -- Content
    title TEXT NOT NULL,
    selftext TEXT,
    url TEXT,
    domain TEXT,

    -- Metadata
    created_utc TIMESTAMP WITH TIME ZONE,
    score INTEGER DEFAULT 0,
    num_comments INTEGER DEFAULT 0,
    upvote_ratio NUMERIC,

    -- Flags
    over_18 BOOLEAN DEFAULT false,
    spoiler BOOLEAN DEFAULT false,
    stickied BOOLEAN DEFAULT false,
    locked BOOLEAN DEFAULT false,
    is_self BOOLEAN DEFAULT false,
    is_video BOOLEAN DEFAULT false,
    archived BOOLEAN DEFAULT false,  -- v3.0.2
    edited BOOLEAN DEFAULT false,  -- v3.0.2 (FIXED: bool conversion)

    -- Flair
    link_flair_text TEXT,
    author_flair_text TEXT,

    -- Media
    thumbnail TEXT,

    -- Awards/Moderation
    distinguished TEXT,  -- "moderator", "admin", null
    gilded INTEGER DEFAULT 0,
    total_awards_received INTEGER DEFAULT 0,

    -- Calculated fields
    content_type TEXT,  -- "image", "video", "link", "text"
    post_length INTEGER,  -- len(selftext)
    posting_day_of_week INTEGER,  -- 0=Monday
    posting_hour INTEGER,  -- 0-23
    has_thumbnail BOOLEAN,
    is_crosspost BOOLEAN,
    comment_to_upvote_ratio NUMERIC,

    -- Denormalized subreddit fields (for performance)
    sub_primary_category TEXT,
    sub_tags TEXT[],
    sub_over18 BOOLEAN,

    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_posts_subreddit ON reddit_posts(subreddit_name);
CREATE INDEX idx_posts_author ON reddit_posts(author_username);
CREATE INDEX idx_posts_created ON reddit_posts(created_utc DESC);
CREATE INDEX idx_posts_score ON reddit_posts(score DESC);
CREATE INDEX idx_posts_content_type ON reddit_posts(content_type);
```

### reddit_users

**Purpose:** Store Reddit user profiles and calculated metrics

```sql
CREATE TABLE reddit_users (
    -- Identity
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    username TEXT UNIQUE NOT NULL,
    reddit_id TEXT,

    -- Profile
    created_utc TIMESTAMP WITH TIME ZONE,
    account_age_days INTEGER,  -- Calculated at scrape time

    -- Karma
    comment_karma INTEGER DEFAULT 0,
    link_karma INTEGER DEFAULT 0,
    total_karma INTEGER DEFAULT 0,
    awardee_karma INTEGER DEFAULT 0,
    awarder_karma INTEGER DEFAULT 0,

    -- Status
    is_employee BOOLEAN DEFAULT false,
    is_mod BOOLEAN DEFAULT false,
    is_gold BOOLEAN DEFAULT false,
    verified BOOLEAN DEFAULT false,
    has_verified_email BOOLEAN DEFAULT false,
    is_suspended BOOLEAN DEFAULT false,

    -- Avatar
    icon_img TEXT,

    -- Additional fields (v3.0.2)
    accept_followers BOOLEAN DEFAULT true,
    hide_from_robots BOOLEAN DEFAULT false,
    pref_show_snoovatar BOOLEAN DEFAULT false,

    -- User subreddit (profile page)
    subreddit_banner_img TEXT,
    subreddit_display_name TEXT,  -- e.g. "u_username"
    subreddit_over_18 BOOLEAN DEFAULT false,
    subreddit_subscribers INTEGER,
    subreddit_title TEXT,

    -- Timestamps
    last_scraped_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_users_karma ON reddit_users(total_karma DESC);
CREATE INDEX idx_users_age ON reddit_users(account_age_days DESC);
CREATE INDEX idx_users_suspended ON reddit_users(is_suspended);
```

### reddit_proxies

**Purpose:** Manage proxy rotation and health tracking

```sql
CREATE TABLE reddit_proxies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    service_name TEXT NOT NULL,  -- "RapidProxy", "NyronProxy", etc.
    display_name TEXT NOT NULL,
    proxy_url TEXT NOT NULL,
    proxy_username TEXT NOT NULL,
    proxy_password TEXT NOT NULL,
    is_active BOOLEAN DEFAULT true,
    priority INTEGER DEFAULT 100,  -- Higher = processed first
    max_threads INTEGER DEFAULT 5,
    success_count INTEGER DEFAULT 0,
    error_count INTEGER DEFAULT 0,
    last_tested_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

---

## API Integration

### Reddit Public JSON API

**Base URL:** `https://www.reddit.com`

**Authentication:** None required (public endpoints)

**Rate Limits:**
- ~60 requests per minute per IP
- Handled via proxy rotation

**Endpoints Used:**

```
GET /r/{subreddit}/about.json
    Returns: Subreddit metadata (100+ fields)
    Use: Populate reddit_subreddits

GET /r/{subreddit}/about/rules.json
    Returns: { "rules": [...] }
    Use: Detect verification, populate rules_data

GET /r/{subreddit}/hot.json?limit={limit}
    Returns: { "data": { "children": [...] } }
    Use: Recent trending posts

GET /r/{subreddit}/top.json?t={time}&limit={limit}
    Params: time = hour|day|week|month|year|all
    Returns: Top posts for time period
    Use: Calculate engagement metrics

GET /user/{username}/about.json
    Returns: User profile (24 fields)
    Use: Populate reddit_users

GET /user/{username}/submitted.json?limit={limit}
    Returns: User's submitted posts
    Use: Discover subreddits, populate reddit_posts
```

### Response Format

**Subreddit about.json:**
```json
{
  "kind": "t5",
  "data": {
    "display_name": "programming",
    "title": "programming",
    "subscribers": 6720000,
    "created_utc": 1201242535,
    "over18": false,
    "description": "...",
    "public_description": "...",
    "icon_img": "...",
    "banner_img": "...",
    ...
  }
}
```

**Posts listing:**
```json
{
  "kind": "Listing",
  "data": {
    "children": [
      {
        "kind": "t3",
        "data": {
          "id": "abc123",
          "title": "Post Title",
          "author": "username",
          "score": 1234,
          "num_comments": 56,
          "created_utc": 1709876543,
          "edited": false,  // OR timestamp
          ...
        }
      }
    ]
  }
}
```

---

## Error Handling

### Error Categories

**1. Network Errors**
```python
# Handled by: public_reddit_api.py _request_with_retry()
try:
    response = requests.get(url, proxies=proxies, timeout=15)
except requests.RequestException as e:
    # Retry with exponential backoff
    # Max 3 retries, 0.1s base delay
```

**2. HTTP Status Errors**
```python
# 404 Not Found (deleted/banned subreddit)
if response.status_code == 404:
    return {'error': 'not_found', 'status': 404}

# 403 Forbidden (suspended user)
if response.status_code == 403:
    return {'error': 'forbidden', 'status': 403}

# 429 Rate Limited
if response.status_code == 429:
    time.sleep(5 + retries * 2)  # Progressive delay
    continue
```

**3. Database Errors**
```python
# Foreign key violations
# Error: Key (author_username)=(user) is not present in table "reddit_users"
# Solution: Graceful skip with warning log

# Connection pool exhaustion
# Error: [Errno 35] Resource temporarily unavailable
# Solution: Retry with backoff or reduce parallelism
```

**4. Data Validation Errors**
```python
# Boolean type mismatch
# Error: invalid input syntax for type boolean: "1756830548.0"
# Fix: edited = bool(post.get('edited', False))

# Null values
# Fix: Default values in UPSERT payload
```

### Error Recovery Strategies

| Error Type | Strategy | Max Retries | Backoff |
|------------|----------|-------------|---------|
| Network timeout | Retry | 3 | 0.1s immediate |
| Rate limit (429) | Wait + retry | 5 | 5s, 10s, 15s, 20s, 25s |
| Not found (404) | Skip + log | 0 | None |
| Forbidden (403) | Skip + log | 0 | None |
| Database error | Try/except + log | 0 | None |
| FK violation | Skip + log | 0 | None |

---

## Performance Optimization

### Current Performance (v3.0.2)

```
Test Case: Gone_Wild_Coffee (1 Ok subreddit, 37 users)
├─ Total time: 25 minutes 9 seconds
├─ Subreddit fetch: 37 seconds
├─ Post saves: <1 second
└─ User processing: 24 minutes 30 seconds
    ├─ Average per user: 39.7 seconds
    └─ Bottleneck: Exponential retry delays
```

### Target Performance (v3.1.0)

```
Same test case target:
├─ Total time: 2.5 minutes (90% improvement)
├─ Subreddit fetch: 30 seconds
├─ Post saves: <1 second
└─ User processing: 2 minutes
    ├─ Average per user: 3.2 seconds
    └─ Optimization: Immediate retries (0.1s delay)
```

### Optimization Techniques

#### 1. Immediate Retries
```python
# Before: Exponential backoff (2s, 4s, 8s, 16s, 32s)
delay = self.base_delay * (2 ** retries)

# After: Immediate retry (0.1s)
delay = self.base_delay  # 0.1s constant
```

**Rationale:**
- Each retry generates fresh user agent
- Proxy stays same but UA changes
- Most failures are transient
- 0.1s sufficient to avoid rate limits

#### 2. Reduced Timeout
```python
# Before: 30 seconds
timeout=30

# After: 15 seconds
timeout=15
```

**Rationale:**
- Faster failure detection
- Less time wasted on dead connections
- Reddit API typically responds <5s

#### 3. Fewer Retries
```python
# Before: 5 max retries
max_retries=5

# After: 3 max retries
max_retries=3
```

**Rationale:**
- Most requests succeed on retry 1 or 2
- Retries 3-5 rarely succeed
- Faster overall completion

#### 4. Parallel User Processing
```python
# 5 concurrent threads via ThreadPoolExecutor
with ThreadPoolExecutor(max_workers=5) as executor:
    futures = {executor.submit(self.process_single_user, username, proxy): username
              for username in batch}
```

**Benefits:**
- 5x parallelism for user processing
- Independent API requests
- No shared state conflicts

#### 5. Batch Processing
```python
# Process users in batches of 5
for i in range(0, len(authors_list), 5):
    batch = authors_list[i:i+5]
    # Process batch in parallel
```

**Benefits:**
- Limits concurrent connections
- Prevents connection pool exhaustion
- Maintains request organization

---

## Maintenance & Monitoring

### Health Checks

**1. Proxy Health**
```bash
# Check proxy success rate
SELECT
  display_name,
  success_count,
  error_count,
  ROUND(success_count::numeric / NULLIF(success_count + error_count, 0) * 100, 2) as success_rate
FROM reddit_proxies
WHERE is_active = true;
```

**2. Scraping Progress**
```bash
# Check when subreddits were last scraped
SELECT
  review,
  COUNT(*) as total,
  COUNT(CASE WHEN last_scraped_at < NOW() - INTERVAL '24 hours' THEN 1 END) as stale,
  COUNT(CASE WHEN last_scraped_at IS NULL THEN 1 END) as never_scraped
FROM reddit_subreddits
GROUP BY review;
```

**3. Error Rate**
```bash
# Monitor for common errors in logs
grep "ERROR" logs/reddit_scraper.log | tail -50
grep "invalid input syntax" logs/reddit_scraper.log | wc -l
grep "\[Errno 35\]" logs/reddit_scraper.log | wc -l
```

### Performance Monitoring

**Log Patterns:**
```bash
# Check processing time per subreddit
grep "✅.*complete" logs | awk '{print $1}' | uniq -c

# Monitor NULL review processing
grep "🆕 Processing r/" logs | wc -l

# Track database saves
grep "💾 DB SAVE" logs | wc -l
```

### Maintenance Tasks

**Daily:**
- [ ] Check scraper is running
- [ ] Verify proxy health
- [ ] Monitor error logs

**Weekly:**
- [ ] Review NULL review processing count
- [ ] Check database size growth
- [ ] Verify requirements are being calculated

**Monthly:**
- [ ] Audit review status distribution
- [ ] Clean up stale data
- [ ] Update proxy credentials if needed

### Troubleshooting Guide

**Issue: Scraper not processing NULL review subreddits**
```bash
# Check stub creation
SELECT name, review, last_scraped_at
FROM reddit_subreddits
WHERE review IS NULL
AND last_scraped_at IS NULL
LIMIT 10;

# Expected: Decreasing count over time
```

**Issue: Boolean type errors**
```bash
# Check logs for specific error
grep "invalid input syntax for type boolean" logs

# Fix: Ensure bool() conversion in reddit_scraper.py:740
```

**Issue: Requirements not saving**
```bash
# Check for column name errors
grep "min_account_age" logs

# Fix: Ensure using 'min_account_age_days' not 'min_account_age'
```

**Issue: Connection pool exhaustion**
```bash
# Count Errno 35 errors
grep "\[Errno 35\]" logs | wc -l

# Solution: Reduce parallel threads from 5 to 3
# Edit reddit_scraper.py line 444: max_workers=3
```

---

## Appendix: File Structure

```
api-render/app/scrapers/reddit/
├── reddit_scraper.py         # Main scraper class
├── proxy_manager.py           # Proxy rotation and testing
├── public_reddit_api.py       # Reddit API client
├── reddit_controller.py       # Start/stop/monitor
├── PLAN_v3.1.0.md            # Implementation plan
├── ARCHITECTURE.md            # This file
└── README.md                  # Quick reference
```

---

*Documentation Version: 3.1.0*
*Last Updated: 2025-09-30*
*Status: COMPLETE*