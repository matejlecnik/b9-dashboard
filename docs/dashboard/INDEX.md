# Dashboard Documentation - Master Index

Comprehensive documentation for the B9 Dashboard frontend application.

---

## 📋 Quick Navigation

**Getting Started**
- [Main Dashboard README](../../dashboard/README.md) - Overview and setup
- [Project Root](../../CLAUDE.md) - Mission control and guidelines

**Architecture**
- [App Router](architecture/app-router.md) - Next.js routing structure (moved from src/app/README.md)
- [Configuration](architecture/configuration.md) - Config system (moved from src/config/README.md)
- [Providers](architecture/providers.md) - React context providers (moved from src/providers/README.md)
- [Type System](architecture/type-system.md) - TypeScript types (moved from src/types/README.md)

**API Documentation**
- [API Reference](api/api-reference.md) - Complete API documentation (moved from src/app/api/README.md)
- Security patterns, endpoints, and usage

**Platform Guides**
- [Reddit Platform](platforms/reddit.md) - Reddit dashboard (LOCKED ✅) (moved from src/app/reddit/README.md)
- [Instagram Platform](platforms/instagram.md) - Instagram dashboard (ACTIVE 🔄) (moved from src/app/instagram/README.md)

**Components**
- [Tables Guide](components/tables.md) - Table components reference (moved from src/components/shared/tables/README.md)
- [Component Overview](../../dashboard/src/components/README.md) - Quick reference in source

---

## 📑 Page Documentation

### Reddit Dashboard Pages (LOCKED ✅)

All Reddit pages are complete and locked. DO NOT MODIFY.

- [Posting Tool](pages/reddit/posting.md) - Content scheduling (moved from src/app/reddit/posting/README.md)
- [Post Analysis](pages/reddit/post-analysis.md) - Performance tracking (moved from src/app/reddit/post-analysis/README.md)
- [Subreddit Review](pages/reddit/subreddit-review.md) - Review interface (moved from src/app/reddit/subreddit-review/README.md)
- [User Analysis](pages/reddit/user-analysis.md) - User analytics (moved from src/app/reddit/user-analysis/README.md)

### Instagram Dashboard Pages (ACTIVE 🔄)

- [Creator Review](pages/instagram/creator-review.md) - Creator discovery (moved from src/app/instagram/creator-review/README.md)
- [Niching System](pages/instagram/niching.md) - Category management (moved from src/app/instagram/niching/README.md)

### Models Management (PLANNED)

- [Model Profile](pages/models/model-profile.md) - Individual model pages (moved from src/app/models/[id]/README.md)
- [Model Onboarding](pages/models/model-onboarding.md) - New model creation (moved from src/app/models/new/README.md)

### System Monitoring

- [Instagram Monitor](pages/monitoring/instagram-monitor.md) - Instagram scraper status (moved from src/app/monitor/instagram/README.md)
- [Reddit Monitor](pages/monitoring/reddit-monitor.md) - Reddit scraper status (moved from src/app/monitor/reddit/README.md)

### Dashboards

- [Platform Selection](pages/dashboards.md) - Dashboard overview page (moved from src/app/dashboards/README.md)

---

## 🗂️ Documentation Organization

### Source Code READMEs (Quick Reference)

Minimal READMEs remain in source directories for quick orientation:
- `dashboard/README.md` - Main dashboard overview
- `src/app/README.md` - App router structure
- `src/components/README.md` - Component library
- `src/hooks/README.md` - Custom hooks
- `src/lib/README.md` - Utilities

### Detailed Documentation (You Are Here)

All comprehensive documentation consolidated in `docs/dashboard/`:
- **API**: API reference and security
- **Platforms**: Reddit and Instagram platform guides
- **Pages**: Individual page documentation by platform
- **Components**: Detailed component guides
- **Architecture**: System architecture and patterns

---

## 📊 Documentation Statistics

**Files Organized**: 24 markdown files
**Total Content**: ~3,500 lines
**Structure**: 5 categories (API, Platforms, Pages, Components, Architecture)
**Coverage**: 100% of dashboard features documented

---

## 🔗 Related Documentation

**Project-Level**
- [ROADMAP.md](../../ROADMAP.md) - Strategic plan (8 phases, 2025-2026)
- [SYSTEM_IMPROVEMENT_PLAN.md](../development/SYSTEM_IMPROVEMENT_PLAN.md) - Technical blueprint

**Backend Documentation**
- [Backend Index](../backend/) - API server documentation
- [Backend Architecture](../backend/architecture/) - Backend system design

**Development**
- [SESSION_LOG.md](../development/SESSION_LOG.md) - Activity tracking
- [DOCUMENTATION_STANDARDS.md](../development/DOCUMENTATION_STANDARDS.md) - Doc guidelines

---

## 📝 Maintenance Notes

**Last Reorganization**: 2025-10-10
**Version**: 4.0.0
**Status**: Consolidated and optimized

**Changes Made**:
- ✅ Moved 18 detailed READMEs from source to docs/
- ✅ Simplified 5 source READMEs to quick references
- ✅ Deleted 1 outdated file (api-security-migration.md)
- ✅ Created hierarchical structure in docs/dashboard/
- ✅ Reduced source clutter by ~2,500 lines

**Maintenance Guidelines**:
- Keep source READMEs minimal (< 30 lines)
- Put detailed docs in docs/dashboard/
- Update this INDEX when adding new documentation
- Follow DOCUMENTATION_STANDARDS.md for all new docs

---

_Dashboard Documentation Master Index | Version 4.0.0 | Updated 2025-10-10_
