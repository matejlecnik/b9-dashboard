# 🛡️ Protection Agent

## Role Definition
**Primary Mission**: Implement comprehensive error prevention system to eliminate page crashes and protect critical files from accidental breaking changes.

**Status**: HIGH PRIORITY - Essential for system stability
**Priority**: Phase 1 - Critical Infrastructure
**Timeline**: Week 1 (Run in parallel with Scraper Monitoring Agent)

## 🎯 Project Context

You are securing a Reddit analytics system for OnlyFans marketing optimization. The system currently lacks proper error handling, leading to crashes that break user workflows.

### Current Risk Factors
- **No Error Boundaries**: Component failures crash entire pages
- **Unprotected Critical Files**: Easy to accidentally break core functionality  
- **Missing Input Validation**: API crashes from malformed requests
- **No TypeScript Strict Mode**: Type errors make it to production
- **Insufficient Testing**: Changes deployed without validation

### System Architecture You're Protecting
```
dashboard_development/b9-dashboard/
├── src/app/                    # Main application routes  
├── src/components/             # Reusable UI components
├── src/lib/                    # Core utilities and database
├── src/app/api/               # API endpoints
└── src/types/                 # TypeScript definitions
```

## ⚠️ Critical Files to Protect

### Tier 1 - Core Infrastructure (NEVER BREAK)
```
src/lib/supabase/client.ts      # Database connection
src/lib/supabase/auth.ts        # Authentication system
src/app/layout.tsx              # Root layout
src/app/globals.css             # Global styles
middleware.ts                   # Route protection
next.config.js                  # Build configuration
```

### Tier 2 - Essential Components (CAREFUL EDITING)
```
src/components/ui/              # shadcn/ui base components
src/lib/utils.ts                # Core utilities
src/app/(dashboard)/layout.tsx  # Dashboard layout
src/app/api/                    # All API routes
```

### Tier 3 - Feature Components (EDIT WITH CAUTION)
```
src/components/                 # Custom components
src/app/(dashboard)/*/page.tsx  # Individual pages
src/hooks/                      # Custom React hooks
```

## 🛠️ Technical Requirements

### Core Technologies
- **TypeScript**: Strict mode configuration
- **React**: Error Boundaries and Suspense
- **Zod**: Runtime type validation
- **ESLint**: Code quality enforcement
- **Husky**: Pre-commit hooks
- **Next.js**: Built-in error handling

### Error Handling Strategy
1. **Prevent**: Type safety and validation
2. **Catch**: Error boundaries and try-catch
3. **Recover**: Fallback UI and retry mechanisms  
4. **Monitor**: Error logging and reporting

## 📋 Detailed Implementation Steps

### Step 1: TypeScript Strict Mode Configuration

#### 1.1 Update `tsconfig.json`
```json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "strictFunctionTypes": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,
    "noUncheckedIndexedAccess": true
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx"],
  "exclude": ["node_modules", ".next"]
}
```

#### 1.2 Create `/src/types/database.ts`
```typescript
// Auto-generated from Supabase, but with strict typing
export interface Database {
  public: {
    Tables: {
      subreddits: {
        Row: {
          id: number
          name: string
          display_name: string | null
          subscribers: number | null
          description: string | null
          over_18: boolean | null
          review: 'Ok' | 'No Seller' | 'Non Related' | 'User Feed' | null
          category_text: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          name: string
          display_name?: string | null
          subscribers?: number | null
          description?: string | null
          over_18?: boolean | null
          review?: 'Ok' | 'No Seller' | 'Non Related' | 'User Feed' | null
          category_text?: string | null
        }
        Update: Partial<Database['public']['Tables']['subreddits']['Insert']>
      }
      // ... other tables
    }
  }
}
```

### Step 2: Universal Error Boundary System

#### 2.1 Create `/src/components/error/ErrorBoundary.tsx`
```typescript
'use client'

import React from 'react'
import { AlertTriangle, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

interface Props {
  children: React.ReactNode
  fallback?: React.ComponentType<ErrorFallbackProps>
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void
}

interface State {
  hasError: boolean
  error: Error | null
}

export interface ErrorFallbackProps {
  error: Error | null
  resetError: () => void
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Error Boundary caught an error:', error, errorInfo)
    this.props.onError?.(error, errorInfo)
    
    // Log to external service in production
    if (process.env.NODE_ENV === 'production') {
      // TODO: Send to error monitoring service
    }
  }

  resetError = () => {
    this.setState({ hasError: false, error: null })
  }

  render() {
    if (this.state.hasError) {
      const FallbackComponent = this.props.fallback || DefaultErrorFallback
      return <FallbackComponent error={this.state.error} resetError={this.resetError} />
    }

    return this.props.children
  }
}

function DefaultErrorFallback({ error, resetError }: ErrorFallbackProps) {
  return (
    <Card className="mx-auto max-w-md">
      <CardHeader>
        <div className="flex items-center space-x-2">
          <AlertTriangle className="h-5 w-5 text-red-500" />
          <CardTitle className="text-red-500">Something went wrong</CardTitle>
        </div>
        <CardDescription>
          An unexpected error occurred. Please try again.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {process.env.NODE_ENV === 'development' && error && (
          <details className="text-sm bg-gray-50 p-2 rounded">
            <summary className="cursor-pointer font-medium">Error details</summary>
            <pre className="mt-2 text-xs overflow-auto">{error.message}</pre>
          </details>
        )}
        <Button onClick={resetError} className="w-full">
          <RefreshCw className="mr-2 h-4 w-4" />
          Try again
        </Button>
      </CardContent>
    </Card>
  )
}

// Hook for functional components
export function useErrorBoundary() {
  const [error, setError] = React.useState<Error | null>(null)
  
  if (error) {
    throw error
  }
  
  return setError
}
```

#### 2.2 Create `/src/components/error/AsyncErrorBoundary.tsx`
```typescript
'use client'

import React from 'react'
import { ErrorBoundary, ErrorFallbackProps } from './ErrorBoundary'

interface Props {
  children: React.ReactNode
  fallback?: React.ComponentType<ErrorFallbackProps>
}

export function AsyncErrorBoundary({ children, fallback }: Props) {
  return (
    <ErrorBoundary
      fallback={fallback}
      onError={(error, errorInfo) => {
        // Log async errors with additional context
        console.error('Async Error:', {
          error,
          errorInfo,
          timestamp: new Date().toISOString(),
          url: window.location.href,
          userAgent: navigator.userAgent
        })
      }}
    >
      <React.Suspense fallback={<div>Loading...</div>}>
        {children}
      </React.Suspense>
    </ErrorBoundary>
  )
}
```

### Step 3: Input Validation System

#### 3.1 Create `/src/lib/validation/schemas.ts`
```typescript
import { z } from 'zod'

// Subreddit validation
export const subredditSchema = z.object({
  name: z.string().min(1, 'Name is required').max(21, 'Reddit subreddit names cannot exceed 21 characters'),
  display_name: z.string().nullable(),
  subscribers: z.number().int().min(0).nullable(),
  description: z.string().nullable(),
  over_18: z.boolean().nullable(),
  review: z.enum(['Ok', 'No Seller', 'Non Related', 'User Feed']).nullable(),
  category_text: z.string().nullable()
})

export const subredditUpdateSchema = z.object({
  id: z.number().int().positive('ID must be positive'),
  review: z.enum(['Ok', 'No Seller', 'Non Related', 'User Feed']).optional(),
  category_text: z.string().optional()
})

// Batch operations
export const batchReviewSchema = z.object({
  subreddit_ids: z.array(z.number().int().positive()).min(1, 'At least one subreddit ID required').max(100, 'Cannot process more than 100 subreddits at once'),
  review: z.enum(['Ok', 'No Seller', 'Non Related', 'User Feed']),
  category_text: z.string().optional()
})

// Search and filtering
export const searchFiltersSchema = z.object({
  query: z.string().optional(),
  review: z.enum(['Ok', 'No Seller', 'Non Related', 'User Feed']).optional(),
  category: z.string().optional(),
  min_subscribers: z.number().int().min(0).optional(),
  max_subscribers: z.number().int().min(0).optional(),
  over_18: z.boolean().optional(),
  limit: z.number().int().min(1).max(1000).default(50),
  offset: z.number().int().min(0).default(0)
})

// API response wrappers
export const apiResponseSchema = <T>(dataSchema: z.ZodSchema<T>) => z.object({
  data: dataSchema,
  error: z.string().nullable(),
  timestamp: z.string().datetime()
})

export const paginatedResponseSchema = <T>(itemSchema: z.ZodSchema<T>) => z.object({
  data: z.array(itemSchema),
  total: z.number().int().min(0),
  limit: z.number().int().min(1),
  offset: z.number().int().min(0),
  error: z.string().nullable(),
  timestamp: z.string().datetime()
})
```

#### 3.2 Create `/src/lib/validation/api.ts`
```typescript
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

export function validateRequest<T>(schema: z.ZodSchema<T>) {
  return async (request: NextRequest): Promise<{ data: T; error?: never } | { data?: never; error: NextResponse }> => {
    try {
      const body = await request.json()
      const data = schema.parse(body)
      return { data }
    } catch (error) {
      console.error('Request validation failed:', error)
      
      if (error instanceof z.ZodError) {
        return {
          error: NextResponse.json(
            {
              error: 'Validation failed',
              details: error.errors,
              timestamp: new Date().toISOString()
            },
            { status: 400 }
          )
        }
      }
      
      return {
        error: NextResponse.json(
          {
            error: 'Invalid request format',
            timestamp: new Date().toISOString()
          },
          { status: 400 }
        )
      }
    }
  }
}

export function validateQueryParams<T>(schema: z.ZodSchema<T>) {
  return (searchParams: URLSearchParams): { data: T; error?: never } | { data?: never; error: NextResponse } => {
    try {
      const params = Object.fromEntries(searchParams.entries())
      
      // Convert numeric strings to numbers
      const processedParams = Object.entries(params).reduce((acc, [key, value]) => {
        if (value === 'true') acc[key] = true
        else if (value === 'false') acc[key] = false
        else if (!isNaN(Number(value)) && value !== '') acc[key] = Number(value)
        else acc[key] = value
        return acc
      }, {} as any)
      
      const data = schema.parse(processedParams)
      return { data }
    } catch (error) {
      console.error('Query parameter validation failed:', error)
      
      if (error instanceof z.ZodError) {
        return {
          error: NextResponse.json(
            {
              error: 'Invalid query parameters',
              details: error.errors,
              timestamp: new Date().toISOString()
            },
            { status: 400 }
          )
        }
      }
      
      return {
        error: NextResponse.json(
          {
            error: 'Invalid query format',
            timestamp: new Date().toISOString()
          },
          { status: 400 }
        )
      }
    }
  }
}
```

### Step 4: API Error Handling Wrapper

#### 4.1 Create `/src/lib/api/error-handler.ts`
```typescript
import { NextRequest, NextResponse } from 'next/server'

export interface ApiError {
  code: string
  message: string
  statusCode: number
  details?: any
}

export class APIError extends Error {
  constructor(
    public code: string,
    message: string,
    public statusCode: number = 500,
    public details?: any
  ) {
    super(message)
    this.name = 'APIError'
  }
}

export function withErrorHandling(handler: (request: NextRequest) => Promise<NextResponse>) {
  return async (request: NextRequest): Promise<NextResponse> => {
    try {
      return await handler(request)
    } catch (error) {
      console.error('API Error:', {
        error,
        url: request.url,
        method: request.method,
        timestamp: new Date().toISOString()
      })

      if (error instanceof APIError) {
        return NextResponse.json(
          {
            error: error.message,
            code: error.code,
            details: error.details,
            timestamp: new Date().toISOString()
          },
          { status: error.statusCode }
        )
      }

      // Supabase errors
      if (error && typeof error === 'object' && 'code' in error) {
        const supabaseError = error as { code: string; message: string; details?: string }
        return NextResponse.json(
          {
            error: supabaseError.message || 'Database operation failed',
            code: supabaseError.code,
            details: supabaseError.details,
            timestamp: new Date().toISOString()
          },
          { status: 500 }
        )
      }

      // Generic server error
      return NextResponse.json(
        {
          error: process.env.NODE_ENV === 'production' 
            ? 'Internal server error' 
            : (error instanceof Error ? error.message : 'Unknown error'),
          code: 'INTERNAL_ERROR',
          timestamp: new Date().toISOString()
        },
        { status: 500 }
      )
    }
  }
}

// Common API error types
export const API_ERRORS = {
  VALIDATION_FAILED: (details?: any) => new APIError('VALIDATION_FAILED', 'Request validation failed', 400, details),
  NOT_FOUND: (resource: string) => new APIError('NOT_FOUND', `${resource} not found`, 404),
  UNAUTHORIZED: () => new APIError('UNAUTHORIZED', 'Authentication required', 401),
  FORBIDDEN: () => new APIError('FORBIDDEN', 'Insufficient permissions', 403),
  RATE_LIMITED: () => new APIError('RATE_LIMITED', 'Too many requests', 429),
  DATABASE_ERROR: (message?: string) => new APIError('DATABASE_ERROR', message || 'Database operation failed', 500),
  EXTERNAL_SERVICE_ERROR: (service: string) => new APIError('EXTERNAL_SERVICE_ERROR', `${service} service unavailable`, 503)
} as const
```

### Step 5: File Protection System

#### 5.1 Create `.vscode/settings.json` (File Protection Configuration)
```json
{
  "files.associations": {
    "*.protected.ts": "typescript",
    "*.protected.tsx": "typescriptreact"
  },
  "workbench.colorCustomizations": {
    "[Default Dark+]": {
      "tab.activeBorder": "#ff6b6b",
      "tab.activeBorderTop": "#ff6b6b"
    }
  },
  "files.exclude": {
    "**/.git": true,
    "**/.svn": true,
    "**/.hg": true,
    "**/CVS": true,
    "**/.DS_Store": true,
    "**/node_modules": true,
    "**/.next": true
  },
  "typescript.preferences.includePackageJsonAutoImports": "on",
  "eslint.format.enable": true,
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode"
}
```

#### 5.2 Create `/scripts/check-protected-files.js`
```javascript
#!/usr/bin/env node

const fs = require('fs')
const path = require('path')

const PROTECTED_FILES = [
  'src/lib/supabase/client.ts',
  'src/lib/supabase/auth.ts',
  'src/app/layout.tsx',
  'src/app/globals.css',
  'middleware.ts',
  'next.config.js'
]

const PROTECTED_DIRECTORIES = [
  'src/components/ui/',
  'src/lib/utils.ts'
]

function checkProtectedFiles() {
  console.log('🛡️  Checking protected files...\n')
  
  let hasWarnings = false
  
  // Check if critical files exist
  PROTECTED_FILES.forEach(file => {
    const fullPath = path.join(process.cwd(), file)
    if (!fs.existsSync(fullPath)) {
      console.log(`❌ CRITICAL: Protected file missing: ${file}`)
      hasWarnings = true
    } else {
      console.log(`✅ ${file}`)
    }
  })
  
  console.log('\n📁 Protected directories:')
  PROTECTED_DIRECTORIES.forEach(dir => {
    const fullPath = path.join(process.cwd(), dir)
    if (fs.existsSync(fullPath)) {
      console.log(`✅ ${dir}`)
    } else {
      console.log(`⚠️  Protected directory not found: ${dir}`)
    }
  })
  
  if (hasWarnings) {
    console.log('\n🚨 WARNINGS DETECTED - Please review changes carefully!')
    process.exit(1)
  } else {
    console.log('\n✅ All protected files are safe')
    process.exit(0)
  }
}

checkProtectedFiles()
```

### Step 6: Pre-commit Hooks Setup

#### 6.1 Update `package.json`
```json
{
  "scripts": {
    "type-check": "npx tsc --noEmit",
    "lint": "next lint",
    "lint:fix": "next lint --fix",
    "check-protected": "node scripts/check-protected-files.js",
    "pre-commit": "npm run type-check && npm run lint && npm run check-protected"
  },
  "husky": {
    "hooks": {
      "pre-commit": "npm run pre-commit"
    }
  }
}
```

#### 6.2 Create `.eslintrc.json` (Enhanced Rules)
```json
{
  "extends": [
    "next/core-web-vitals",
    "@typescript-eslint/recommended"
  ],
  "rules": {
    "@typescript-eslint/no-unused-vars": "error",
    "@typescript-eslint/no-explicit-any": "warn",
    "@typescript-eslint/prefer-const": "error",
    "prefer-const": "error",
    "no-var": "error",
    "no-console": "warn",
    "react-hooks/exhaustive-deps": "error",
    "react-hooks/rules-of-hooks": "error"
  },
  "parser": "@typescript-eslint/parser",
  "parserOptions": {
    "ecmaVersion": 2020,
    "sourceType": "module"
  }
}
```

## ✅ Success Criteria & Validation

### Protection System Checklist
- [ ] **TypeScript Strict Mode**: All files compile without type errors
- [ ] **Error Boundaries**: No component crashes break entire pages
- [ ] **API Validation**: All endpoints validate inputs with Zod schemas
- [ ] **File Protection**: Critical files flagged and monitored
- [ ] **Pre-commit Hooks**: Type checking and linting run before commits
- [ ] **Error Recovery**: Users can retry failed operations
- [ ] **Development Warnings**: Clear alerts for risky changes

### Testing Commands
```bash
# Type checking
npx tsc --noEmit

# Linting
npm run lint

# Check protected files
npm run check-protected

# Run all pre-commit checks
npm run pre-commit
```

### Validation Scenarios
1. **Component Crash Test**: Intentionally throw error in component
2. **API Validation Test**: Send malformed data to API endpoints
3. **Type Safety Test**: Try to assign wrong types in TypeScript
4. **File Protection Test**: Modify protected file and check warnings

## 🔗 Integration Points

### With Other Agents
- **Scraper Monitoring Agent**: Wrap monitoring components with error boundaries
- **Apple UI Agent**: Ensure design components have proper error states
- **All Future Agents**: Every component must use error boundaries

### Database Protection
```sql
-- Row Level Security policies
CREATE POLICY "Users can only read their own data" ON profiles
  FOR SELECT USING (auth.uid() = id);

-- Rate limiting (if needed)
CREATE OR REPLACE FUNCTION check_rate_limit(user_id UUID, max_requests INTEGER DEFAULT 100)
RETURNS BOOLEAN AS $$
BEGIN
  -- Rate limiting logic
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql;
```

## 🚨 Error Monitoring Strategy

### Development Environment
- Console errors with full stack traces
- Component error boundaries with retry buttons
- API validation errors with detailed messages
- File protection warnings in IDE

### Production Environment
- Simplified user-facing error messages
- Background error logging (prepare for external service)
- Performance monitoring
- User feedback collection

## 📊 Protection Metrics

### Key Indicators
- **Zero Crash Rate**: No full-page crashes from component errors
- **API Error Rate**: <5% of requests fail validation
- **Recovery Success**: >90% of users successfully retry after errors
- **Type Safety**: 100% TypeScript compilation success
- **File Integrity**: Zero protected file breaking changes

### Monitoring Dashboard (Future)
```typescript
interface ProtectionMetrics {
  crashes_prevented: number
  api_validations_passed: number
  error_recoveries: number
  type_errors_caught: number
  protected_files_safe: boolean
}
```

## 🎯 Next Agent Handoff

Once protection system is implemented:
1. **All future agents** must use error boundaries in their components
2. **Apple UI Agent** will enhance error states with beautiful design
3. **Testing Agent** will create automated tests for error scenarios

**Completion Signal**: All components wrapped in error boundaries, TypeScript strict mode enabled, pre-commit hooks working, zero crashes in manual testing.