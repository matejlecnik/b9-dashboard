# Types Directory

## Overview
TypeScript type definitions and interfaces for the B9 Dashboard application. Ensures type safety across components and API interactions.

## Current Type Definitions

### Data Models
- **`post.ts`** - Reddit post data structure, media types, and post analysis interfaces

## Missing Critical Types
Based on codebase analysis, these types should be added:

### Core Business Types (TODO)
- **`subreddit.ts`** - Subreddit data model, scores, categories, review status
- **`user.ts`** - User profiles, analytics, account management
- **`api.ts`** - API response shapes, error types, request/response interfaces
- **`categorization.ts`** - Category types (Ok/No Seller/Non Related/User Feed)

## TODO List
- [ ] Add Subreddit interface with scoring and categorization fields
- [ ] Create User type definitions for analytics tracking
- [ ] Define API response/request type interfaces
- [ ] Add Category enum and related types
- [ ] Create Filter and Search type definitions
- [ ] Add Table/Pagination interface types

## Current Errors
- Missing core business entity types
- API calls lack proper TypeScript interfaces
- Components use `any` types in many places

## Potential Improvements
- Generate types from Supabase database schema
- Add runtime type validation with Zod
- Create shared types with backend API
- Add generic utility types for common patterns