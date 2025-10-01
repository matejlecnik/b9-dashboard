# API Security Migration Guide

┌─ MODULE STATUS ─────────────────────────────────────────┐
│ ● ACTIVE    │ ██████████░░░░░░░░░░ 50% COMPLETE       │
└─────────────────────────────────────────────────────────┘

## Navigation

```json
{
  "current": "dashboard/src/lib/api-security-migration.md",
  "parent": "dashboard/src/lib/README.md"
}
```

## Overview

## Quick Migration Steps

### 1. Import the security wrapper in your API route:

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { protectedApi, publicApi, aiApi, scraperApi } from '@/lib/api-wrapper'
import type { User } from '@supabase/supabase-js'
```

### 2. Choose the appropriate wrapper:

- **`publicApi`** - No authentication required, but still rate-limited and CORS-enabled
- **`protectedApi`** - Authentication required (most routes)
- **`aiApi`** - Authentication + stricter AI rate limits
- **`scraperApi`** - Authentication + scraper-specific rate limits

### 3. Convert your route handlers:

#### Before (unprotected):
```typescript
export async function GET(request: Request) {
  // handler logic
}
```

#### After (protected):
```typescript
export const GET = protectedApi(async (request: NextRequest, user: User) => {
  // handler logic - user is guaranteed to be authenticated
})
```

#### After (public):
```typescript
export const GET = publicApi(async (request: NextRequest) => {
  // handler logic - no user object
})
```

### 4. Update function signatures:

- Change `Request` to `NextRequest`
- Add `user: User` parameter for protected routes
- Close with `)` instead of `}` at the end

## List of API Routes to Migrate

### ✅ Completed
- [x] `/api/health` - Public endpoint (done)
- [x] `/api/categories` - Protected endpoint (done)

### 🔄 To Be Updated (34 remaining)

#### AI Routes (use `aiApi`)
- [ ] `/api/ai/accuracy-metrics`
- [ ] `/api/ai/bulk-categorize`
- [ ] `/api/ai/categorize`

#### Category Routes (use `protectedApi`)
- [ ] `/api/categories/[id]`
- [ ] `/api/categories/migrate`

#### Filter Routes (use `protectedApi`)
- [ ] `/api/filters/[id]`

#### Instagram Routes (use `protectedApi`)
- [ ] `/api/instagram/ai-categorize`
- [ ] `/api/instagram/categories`
- [ ] `/api/instagram/categories/[id]`
- [ ] `/api/instagram/creators`
- [ ] `/api/instagram/creators/[id]`
- [ ] `/api/instagram/creators/bulk-categorize`
- [ ] `/api/instagram/creators/related`
- [ ] `/api/instagram/filters`
- [ ] `/api/instagram/settings`

#### Reddit Routes (use `protectedApi`)
- [ ] `/api/reddit/user`

#### Scraper Routes (use `scraperApi`)
- [ ] `/api/scraper/accounts`
- [ ] `/api/scraper/status`

#### Subreddit Routes (use `protectedApi`)
- [ ] `/api/subreddits`
- [ ] `/api/subreddits/[id]`
- [ ] `/api/subreddits/batch-update-parents`
- [ ] `/api/subreddits/batch-update-scores`
- [ ] `/api/subreddits/bulk-delete`
- [ ] `/api/subreddits/migrate-categories`
- [ ] `/api/subreddits/recalculate-scores`
- [ ] `/api/subreddits/review`
- [ ] `/api/subreddits/stats`

#### User Routes (use `protectedApi`)
- [ ] `/api/users`
- [ ] `/api/users/bulk-update`
- [ ] `/api/users/toggle-creator`

## Environment Variables Required

Add these to your `.env.local`:

```env
## Upstash Redis (for rate limiting)
UPSTASH_REDIS_REST_URL=your-upstash-url
UPSTASH_REDIS_REST_TOKEN=your-upstash-token

## Rate Limiting (optional, defaults shown)
RATE_LIMIT_PER_MINUTE=100
AI_RATE_LIMIT_PER_MINUTE=10

## CORS (optional)
ALLOWED_ORIGINS=http://localhost:3000,https://b9-dashboard.vercel.app
```

## Testing

After migration, test each endpoint:

```bash
## Test public endpoint (should work without auth)
curl http://localhost:3000/api/health

## Test protected endpoint (should fail without auth)
curl http://localhost:3000/api/categories
## Expected: 401 Unauthorized

## Test with auth token (should work)
curl http://localhost:3000/api/categories \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

## Test rate limiting (make many requests quickly)
for i in {1..150}; do curl http://localhost:3000/api/health; done
## Should see 429 Too Many Requests after 100 requests
```

## Rollback Plan

If issues occur, the original route handlers can be restored by:
1. Remove the wrapper function
2. Change back to `export async function GET/POST`
3. Remove the user parameter
4. Change closing `)` back to `}`

## Notes

- The security wrapper handles all errors gracefully
- CORS headers are automatically added
- Rate limit info is included in response headers
- Authentication is checked before rate limiting to prevent auth bypass attacks
- Public routes skip auth but still get rate limiting and CORS

---

_Version: 1.0.0 | Updated: 2025-10-01_