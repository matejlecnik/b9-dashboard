# 🔄 Migration Guide: Single Supabase Project with Namespaced Tables

## 📋 Overview

This guide documents the migration from multiple Supabase projects (one per platform) to a single Supabase project with namespaced tables. This migration will simplify authentication, reduce costs, and make cross-platform analytics easier.

## 🎯 Migration Goals

1. **Consolidate** all platforms into one Supabase project
2. **Namespace** tables with platform prefixes (reddit_, instagram_, etc.)
3. **Simplify** authentication to single login system
4. **Enable** easy cross-platform queries for Tracking Dashboard
5. **Reduce** infrastructure costs and complexity

## 📊 Current vs. New Architecture

### Current Architecture (Multiple Projects)
```
Reddit Supabase Project:
  - subreddits
  - posts
  - users
  - categories

Instagram Supabase Project:
  - accounts
  - posts
  - stories

(Each with separate auth)
```

### New Architecture (Single Project)
```
Single Supabase Project:
  Reddit Tables:
    - reddit_subreddits
    - reddit_posts
    - reddit_users
    - reddit_categories

  Instagram Tables:
    - instagram_accounts
    - instagram_posts
    - instagram_stories

  Shared Tables:
    - auth.users (Supabase Auth)
    - team_members
    - platform_metrics
```

## 🚀 Migration Steps

### Step 1: Database Preparation

#### 1.1 Backup Current Data
```bash
# Export all data from current Reddit Supabase
pg_dump YOUR_REDDIT_SUPABASE_URL > reddit_backup.sql
```

#### 1.2 Create New Table Structure
```sql
-- Rename existing Reddit tables
ALTER TABLE subreddits RENAME TO reddit_subreddits;
ALTER TABLE posts RENAME TO reddit_posts;
ALTER TABLE users RENAME TO reddit_users;
ALTER TABLE categories RENAME TO reddit_categories;
ALTER TABLE filters RENAME TO reddit_filters;
ALTER TABLE scraper_logs RENAME TO reddit_scraper_logs;

-- Create Instagram tables
CREATE TABLE instagram_accounts (
  id SERIAL PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  full_name TEXT,
  bio TEXT,
  followers_count INTEGER,
  following_count INTEGER,
  posts_count INTEGER,
  engagement_rate DECIMAL,
  is_verified BOOLEAN DEFAULT false,
  is_business BOOLEAN DEFAULT false,
  category TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE instagram_posts (
  id SERIAL PRIMARY KEY,
  instagram_id TEXT UNIQUE NOT NULL,
  account_id INTEGER REFERENCES instagram_accounts(id),
  caption TEXT,
  likes_count INTEGER,
  comments_count INTEGER,
  post_type TEXT, -- 'photo', 'video', 'reel', 'carousel'
  posted_at TIMESTAMP,
  hashtags TEXT[],
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE instagram_stories (
  id SERIAL PRIMARY KEY,
  account_id INTEGER REFERENCES instagram_accounts(id),
  story_id TEXT UNIQUE NOT NULL,
  views_count INTEGER,
  replies_count INTEGER,
  posted_at TIMESTAMP,
  expired_at TIMESTAMP
);

-- Create shared tables
CREATE TABLE team_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  role TEXT CHECK (role IN ('admin', 'editor', 'viewer')),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE platform_metrics (
  id SERIAL PRIMARY KEY,
  platform TEXT NOT NULL,
  metric_name TEXT NOT NULL,
  metric_value DECIMAL,
  recorded_at TIMESTAMP DEFAULT NOW()
);
```

### Step 2: Code Updates

#### 2.1 Update Environment Variables

**.env.local** - Simplify to single Supabase configuration:
```env
# Before (Multiple Projects)
NEXT_PUBLIC_REDDIT_SUPABASE_URL=...
NEXT_PUBLIC_INSTAGRAM_SUPABASE_URL=...
NEXT_PUBLIC_REDDIT_SUPABASE_ANON_KEY=...
NEXT_PUBLIC_INSTAGRAM_SUPABASE_ANON_KEY=...

# After (Single Project)
NEXT_PUBLIC_SUPABASE_URL=https://your-single-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-key
```

#### 2.2 Update Supabase Client

**src/lib/supabase/index.ts** - Revert to single client:
```typescript
import { createBrowserClient } from '@supabase/ssr'

// Single Supabase client for all platforms
export const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

// Remove all platform-specific clients (redditClient, instagramClient, etc.)
```

#### 2.3 Update All Table References

**Find and Replace in all files:**

| Find | Replace With |
|------|-------------|
| `from('subreddits')` | `from('reddit_subreddits')` |
| `from('posts')` | `from('reddit_posts')` |
| `from('users')` | `from('reddit_users')` |
| `from('categories')` | `from('reddit_categories')` |
| `from('filters')` | `from('reddit_filters')` |
| `from('scraper_logs')` | `from('reddit_scraper_logs')` |
| `table: 'subreddits'` | `table: 'reddit_subreddits'` |
| `table: 'posts'` | `table: 'reddit_posts'` |
| `table: 'users'` | `table: 'reddit_users'` |

**Files that need updating:**

##### Reddit Dashboard Pages
- `app/reddit/subreddit-review/page.tsx`
- `app/reddit/categorization/page.tsx`
- `app/reddit/posting/page.tsx`
- `app/reddit/user-analysis/page.tsx`
- `app/reddit/post-analysis/page.tsx`
- `app/reddit/users/page.tsx`
- `app/reddit/api-status/page.tsx`

##### Hooks
- `hooks/usePostAnalysis.ts`
- `hooks/useUserAnalytics.ts`
- `hooks/usePostingAnalysis.ts`

##### Components
- `components/DiscoveryTable.tsx`
- `components/UniversalTable.tsx`
- Any other components accessing Supabase

##### API Routes
- All files in `app/api/`
- Update table names in all API routes

#### 2.4 Update Import Statements

Change all imports from platform-specific clients back to single supabase:

```typescript
// Before
import { redditClient } from '@/lib/supabase'
await redditClient.from('subreddits').select('*')

// After
import { supabase } from '@/lib/supabase'
await supabase.from('reddit_subreddits').select('*')
```

### Step 3: Python Backend Updates

#### 3.1 Update FastAPI Routes

**api/main.py** and all Python files:
```python
# Before
supabase.table('subreddits').select('*')

# After
supabase.table('reddit_subreddits').select('*')
```

#### 3.2 Update Scraper

**scraper/** folder - Update all table references:
```python
# Before
supabase.table('posts').insert(post_data)

# After
supabase.table('reddit_posts').insert(post_data)
```

### Step 4: Testing Checklist

#### 4.1 Reddit Dashboard Testing
- [ ] Subreddit Review page loads and displays data
- [ ] Categorization works with new table names
- [ ] Posting recommendations load correctly
- [ ] User Analysis shows reddit_users data
- [ ] Post Analysis shows reddit_posts data
- [ ] API Status page works

#### 4.2 API Testing
```bash
# Test endpoints with new table names
curl http://localhost:3000/api/subreddits
curl http://localhost:3000/api/categories
curl http://localhost:3000/api/users
```

#### 4.3 Authentication Testing
- [ ] Login works with single Supabase auth
- [ ] Logout works correctly
- [ ] Session persistence works

### Step 5: Instagram Dashboard Implementation

With the new structure, implementing Instagram is straightforward:

```typescript
// Instagram account discovery page
const { data: accounts } = await supabase
  .from('instagram_accounts')
  .select('*')
  .order('followers_count', { ascending: false })

// Instagram posts analysis
const { data: posts } = await supabase
  .from('instagram_posts')
  .select(`
    *,
    instagram_accounts(username, followers_count)
  `)
  .order('likes_count', { ascending: false })
```

### Step 6: Tracking Dashboard Implementation

The Tracking Dashboard can now easily aggregate cross-platform data:

```typescript
// Get metrics from all platforms in single database
const [redditPosts, instagramPosts] = await Promise.all([
  supabase.from('reddit_posts').select('count'),
  supabase.from('instagram_posts').select('count')
])

// Store aggregated metrics
await supabase.from('platform_metrics').insert({
  platform: 'all',
  metric_name: 'total_posts',
  metric_value: redditPosts.count + instagramPosts.count
})
```

## 🔧 Utility Scripts

### Script to Update All Files
```bash
#!/bin/bash
# update_table_names.sh

# Function to update table names in a file
update_file() {
  file=$1
  # Reddit table updates
  sed -i '' "s/from('subreddits')/from('reddit_subreddits')/g" "$file"
  sed -i '' "s/from('posts')/from('reddit_posts')/g" "$file"
  sed -i '' "s/from('users')/from('reddit_users')/g" "$file"
  sed -i '' "s/from('categories')/from('reddit_categories')/g" "$file"
  sed -i '' "s/from('filters')/from('reddit_filters')/g" "$file"
  sed -i '' "s/table: 'subreddits'/table: 'reddit_subreddits'/g" "$file"
  sed -i '' "s/table: 'posts'/table: 'reddit_posts'/g" "$file"
  sed -i '' "s/table: 'users'/table: 'reddit_users'/g" "$file"

  # Update imports
  sed -i '' "s/import { redditClient/import { supabase/g" "$file"
  sed -i '' "s/redditClient\./supabase\./g" "$file"
  sed -i '' "s/await redditClient/await supabase/g" "$file"
}

# Find and update all TypeScript/JavaScript files
find ./src -type f \( -name "*.ts" -o -name "*.tsx" \) | while read file; do
  echo "Updating $file"
  update_file "$file"
done

echo "✅ Table name updates complete"
```

## 📈 Benefits After Migration

1. **Single Authentication**: One login for all dashboards
2. **Cost Reduction**: One Supabase project instead of multiple
3. **Simpler Configuration**: Single set of environment variables
4. **Easy Cross-Platform Queries**: All data in one database
5. **Better Performance**: Connection pooling across all platforms
6. **Easier Backup/Restore**: Single database to manage

## ⚠️ Important Considerations

### RLS (Row Level Security) Policies
Make sure to update RLS policies with new table names:
```sql
-- Example: Update RLS policy for reddit_subreddits
CREATE POLICY "Enable read access for all users" ON reddit_subreddits
  FOR SELECT USING (true);
```

### Indexes
Recreate indexes with new table names:
```sql
CREATE INDEX idx_reddit_posts_author ON reddit_posts(author_username);
CREATE INDEX idx_reddit_posts_subreddit ON reddit_posts(subreddit_name);
CREATE INDEX idx_instagram_posts_account ON instagram_posts(account_id);
```

### Foreign Keys
Update foreign key constraints:
```sql
-- Example for reddit tables
ALTER TABLE reddit_posts
  ADD CONSTRAINT fk_reddit_posts_subreddit
  FOREIGN KEY (subreddit_id)
  REFERENCES reddit_subreddits(id);
```

## 🔄 Rollback Plan

If issues arise, you can rollback:

1. **Restore from backup**: `pg_restore reddit_backup.sql`
2. **Revert code changes**: `git checkout -- .`
3. **Restore .env.local**: Use backed up environment variables
4. **Switch back to multiple clients**: Revert lib/supabase/index.ts

## 📝 Post-Migration Checklist

- [ ] All Reddit dashboard pages working
- [ ] API endpoints returning correct data
- [ ] Authentication working properly
- [ ] No TypeScript errors
- [ ] Build succeeds (`npm run build`)
- [ ] Python backend working
- [ ] Scraper functioning correctly
- [ ] Performance acceptable
- [ ] Backup of old structure saved
- [ ] Documentation updated

## 🚀 Next Steps After Migration

1. **Implement Instagram Dashboard** using instagram_* tables
2. **Build Tracking Dashboard** with cross-platform queries
3. **Add TikTok tables** when ready (tiktok_*)
4. **Create unified analytics** across all platforms

---

**Migration Estimated Time**: 2-3 hours
**Risk Level**: Medium (mostly find/replace operations)
**Rollback Time**: 30 minutes

*Last Updated: January 2025*