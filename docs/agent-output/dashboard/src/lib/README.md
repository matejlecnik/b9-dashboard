# Lib Directory

┌─ MODULE STATUS ─────────────────────────────────────────┐
│ ● PLANNED   │ █████░░░░░░░░░░░░░░░ 25% COMPLETE       │
└─────────────────────────────────────────────────────────┘

## Navigation

```json
{
  "current": "dashboard/src/lib/README.md",
  "parent": "dashboard/src/lib/README.md"
}
```

## Overview

Contains core utilities, database configuration, and helper functions for the Reddit analytics dashboard. Centralizes all shared logic including Supabase client configuration, error handling patterns, and common utility functions used across components.

**Key Modules:**
- **supabase.ts**: Database client, TypeScript types, real-time subscriptions
- **errorUtils.ts**: Centralized error handling with user-friendly feedback and retry logic  
- **utils.ts**: Common helpers (date formatting, number formatting, Tailwind class merging)

## TODO List
- [ ] Add authentication utilities for future user management features
- [ ] Implement performance monitoring hooks for component render tracking
- [ ] Create data validation schemas with Zod for type-safe API interactions
- [ ] Add caching utilities for optimizing expensive operations
- [ ] Build connection pooling optimization for Supabase client
- [ ] Create custom hooks for common data fetching patterns
- [ ] Add logging utilities with different log levels (debug, info, error)

## Current Errors
- Real-time subscription cleanup occasionally fails on component unmount
- Error handling doesn't properly distinguish between network vs. application errors
- Some utility functions lack proper TypeScript generics for better type inference
- Missing environment variable validation at startup

## Potential Improvements  
- Implement circuit breaker pattern for external API failures
- Add comprehensive error tracking and analytics integration
- Create performance profiling utilities for identifying bottlenecks
- Build automated retry mechanisms with exponential backoff strategies
- Add request deduplication for identical concurrent API calls
- Implement optimistic updates pattern for better user experience

## Technical Notes
- **Database**: Supabase client with SSR support (`@supabase/ssr`)
- **Error Pattern**: `useErrorHandler` hook with automatic toast notifications and retry logic
- **Type Safety**: Complete TypeScript interfaces for all database tables and API responses
- **Performance**: Connection pooling, query optimization, real-time subscription management
- **Environment**: Secure credential management with validation

**Key Patterns**: Real-time subscriptions, centralized error handling, consistent utility functions

---

_Version: 1.0.0 | Updated: 2025-10-01_