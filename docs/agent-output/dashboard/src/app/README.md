# App Directory - Next.js Application Routes

┌─ MODULE STATUS ─────────────────────────────────────────┐
│ ● LOCKED    │ ████████████████████ 100% COMPLETE       │
└─────────────────────────────────────────────────────────┘

## Navigation

```json
{
  "current": "dashboard/src/app/README.md",
  "parent": "dashboard/src/app/README.md"
}
```

## Overview

This directory contains the main application routes and pages for the B9 Dashboard using Next.js 15 App Router. It serves as the entry point for all platform-specific dashboards (Reddit, Instagram, TikTok, etc.) and handles routing, layouts, and API endpoints for the multi-platform analytics system.

### Directory Structure
- **`/api`** - Next.js API routes for backend functionality
- **`/reddit`** - Reddit analytics dashboard (LOCKED - DO NOT MODIFY)
- **`/instagram`** - Instagram analytics (Coming Q2 2025)
- **`/tiktok`** - TikTok intelligence (Coming Q3 2025)
- **`/twitter`** - X/Twitter monitor (Coming Q3 2025)
- **`/dashboards`** - Dashboard selection and overview page
- **`/login`** - Authentication pages
- **`/actions`** - Server actions for forms
- **`layout.tsx`** - Root layout with providers
- **`page.tsx`** - Landing page

## TODO List

- [ ] Implement platform detection middleware for automatic routing
- [ ] Create shared error boundary component for all routes
- [ ] Add loading states for platform transitions
- [ ] Set up platform-specific metadata generation
- [ ] Implement cross-platform navigation component
- [ ] Add telemetry/analytics tracking setup
- [ ] Create 404 and error pages with proper styling
- [ ] Set up route groups for better organization

## Current Errors

- **Build Warning**: Some dynamic imports may cause hydration mismatches
- **Route Conflict**: Platform routes may conflict with future API routes - needs namespace strategy
- **Missing Middleware**: No platform detection middleware currently implemented
- **Type Safety**: Some routes missing proper TypeScript typing for params/searchParams

## Potential Improvements

**DO NOT IMPLEMENT WITHOUT DISCUSSION:**

1. **Parallel Routes**: Use Next.js parallel routes for multi-dashboard views
2. **Route Intercepting**: Implement modal routes for quick actions without navigation
3. **Route Groups**: Reorganize with `(platform)` groups for better code splitting
4. **Dynamic Imports**: Lazy load platform-specific components to reduce bundle size
5. **API Versioning**: Add `/api/v1` structure for future API changes
6. **Internationalization**: Prepare route structure for i18n support

---

*Note: This is the root application directory. All new features should follow the established patterns and respect the LOCKED status of the Reddit dashboard.*

---

_Version: 1.0.0 | Updated: 2025-10-01_