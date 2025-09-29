# Providers Directory

## Overview
React Context providers for global state management, authentication, and application-wide functionality in the B9 Dashboard.

## Current Providers

### Data Management
- **`QueryProvider.tsx`** - React Query provider for API data fetching, caching, and synchronization

## Missing Critical Providers (TODO)
Based on application needs:

### Authentication & User State
- **`AuthProvider.tsx`** - User authentication state and Supabase auth integration
- **`UserProvider.tsx`** - Current user profile and preferences

### Application State  
- **`FilterProvider.tsx`** - Global filter state for subreddit/user tables
- **`ThemeProvider.tsx`** - Dark/light mode and color theming (if needed)

## TODO List
- [ ] Add authentication provider for Supabase auth
- [ ] Create filter state provider to avoid prop drilling
- [ ] Add error boundary provider for global error handling  
- [ ] Consider toast/notification provider
- [ ] Add analytics provider for user activity tracking

## Current Errors
None

## Potential Improvements
- Combine small providers into a single AppProvider
- Add provider for real-time subreddit updates
- Create provider for user preferences persistence
- Add provider for background task status (scraping, categorization)