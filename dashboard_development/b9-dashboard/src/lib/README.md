# Lib Directory

This directory contains core utilities, database configuration, and helper functions that power the Reddit analytics dashboard. All shared logic and integrations are centralized here for maintainability and consistency.

## 🗂️ Directory Structure

```
lib/
├── supabase.ts         # Database client configuration and TypeScript types
├── errorUtils.ts       # Centralized error handling and user feedback
└── utils.ts           # General utility functions and helpers
```

## 🎯 Core Modules

### Supabase Configuration (`supabase.ts`)
**Purpose**: Database connection, real-time subscriptions, and TypeScript type definitions
**Business Value**: Enables real-time data synchronization for 4,865+ subreddits

**Key Features**:
- **SSR-compatible client**: Uses `@supabase/ssr` for Next.js optimization
- **Environment configuration**: Secure credential management
- **TypeScript interfaces**: Complete type safety for database operations
- **Real-time subscriptions**: Live data updates across all dashboard pages

**Supabase Client Setup**:
```typescript
import { createBrowserClient } from '@supabase/ssr'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createBrowserClient(supabaseUrl, supabaseAnonKey)
```

**Core Type Definitions**:
```typescript
// Primary data model for subreddit management
export interface Subreddit {
  id: number
  name: string
  display_name_prefixed: string
  title: string
  subscribers: number
  review: 'Ok' | 'No Seller' | 'Non Related' | 'User Feed' | null
  category_text: string | null
  subscriber_engagement_ratio: number
  avg_upvotes_per_post: number
  best_posting_day: string
  best_posting_hour: number
  top_content_type: string
  last_scraped_at: string | null
  created_at: string
  icon_img?: string | null
  community_icon?: string | null
  over18: boolean | null
  rules_data?: string | null
  // ... additional metrics fields
}
```

**Real-time Subscription Pattern**:
```typescript
// Example usage in components
useEffect(() => {
  const channel = supabase.channel('subreddits-changes')
    .on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'subreddits'
    }, (payload) => {
      // Handle real-time updates
      handleRealtimeUpdate(payload)
    })
    .subscribe()
    
  return () => supabase.removeChannel(channel)
}, [])
```

### Error Handling (`errorUtils.ts`)
**Purpose**: Centralized error management with user-friendly feedback
**Business Value**: Prevents user frustration and maintains productivity during API failures

**Key Features**:
- **Unified error handling**: Consistent error processing across all components
- **User-friendly messages**: Technical errors converted to actionable feedback
- **Automatic retries**: Built-in retry logic for transient failures
- **Toast integration**: Automatic success/error notifications
- **Error boundaries**: Component-level error isolation

**useErrorHandler Hook**:
```typescript
interface ErrorHandlerOptions {
  showToast?: boolean
  retryCount?: number
  onError?: (error: Error) => void
}

export const useErrorHandler = () => {
  const { addToast } = useToast()
  
  const handleAsyncOperation = async <T>(
    operation: () => Promise<T>,
    errorMessage: string = 'Operation failed',
    options: ErrorHandlerOptions = {}
  ): Promise<T | null> => {
    // Centralized error handling logic
  }
  
  return { handleAsyncOperation }
}
```

**Usage Pattern**:
```typescript
const MyComponent = () => {
  const { handleAsyncOperation } = useErrorHandler()
  
  const handleUpdate = async (id: number, value: string) => {
    await handleAsyncOperation(
      async () => {
        const { error } = await supabase
          .from('subreddits')
          .update({ review: value })
          .eq('id', id)
        
        if (error) throw error
      },
      'Failed to update subreddit review'
    )
  }
  
  return <Button onClick={() => handleUpdate(1, 'Ok')}>Update</Button>
}
```

**Error Types Handled**:
- **Network errors**: Connection timeouts, offline status
- **Authentication errors**: Token expiry, permission issues
- **Validation errors**: Invalid data, constraint violations
- **Rate limiting**: API quota exceeded
- **Database errors**: Connection failures, query errors

### Utility Functions (`utils.ts`)
**Purpose**: Shared helper functions for common operations
**Business Value**: Reduces code duplication and ensures consistent behavior

**Core Utilities**:
```typescript
// Tailwind class name merging
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs))
}

// Date formatting for consistent display
export function formatDate(date: string | Date): string {
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  }).format(new Date(date))
}

// Number formatting for metrics
export function formatNumber(num: number): string {
  return new Intl.NumberFormat('en-US').format(num)
}

// Debounced function execution
export function debounce<T extends (...args: any[]) => void>(
  func: T,
  delay: number
): T {
  // Debounce implementation
}
```

## 🔧 Configuration Management

### Environment Variables
```typescript
// Required environment variables
NEXT_PUBLIC_SUPABASE_URL=https://cetrhongdrjztsrsffuh.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

// Optional configuration
NEXT_PUBLIC_APP_ENV=production
NEXT_PUBLIC_API_BASE_URL=/api
```

### Database Connection Settings
- **Connection pooling**: Automatic connection management
- **SSL enforcement**: Secure data transmission
- **Row Level Security**: User-based data access control
- **Real-time subscriptions**: WebSocket connections for live updates

## ⚡ Performance Optimizations

### Database Query Optimization
```typescript
// Efficient query patterns
const getSubredditsWithPagination = async (page: number, limit: number = 50) => {
  const { data, error } = await supabase
    .from('subreddits')
    .select('id, name, display_name_prefixed, title, subscribers, review, category_text')
    .order('created_at', { ascending: false })
    .range(page * limit, (page + 1) * limit - 1)
  
  return { data, error }
}

// Optimized real-time subscriptions
const subscribeToSubredditChanges = (callback: (payload: any) => void) => {
  return supabase
    .channel('subreddits', { config: { broadcast: { self: true } } })
    .on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'subreddits'
    }, callback)
    .subscribe()
}
```

### Error Recovery Strategies
- **Exponential backoff**: Retry delays increase progressively
- **Circuit breaker**: Prevent cascade failures during outages  
- **Graceful degradation**: Fallback to cached data when possible
- **User feedback**: Clear indication of system status

### Memory Management
- **Connection cleanup**: Automatic subscription cleanup on unmount
- **Cache invalidation**: Stale data prevention strategies
- **Resource pooling**: Efficient database connection usage

## 📊 Integration Points

### Supabase Features Used
- **Database**: PostgreSQL with 5 core tables
- **Real-time**: WebSocket subscriptions for live updates
- **Auth**: JWT-based authentication (future implementation)
- **Storage**: File uploads for user avatars (future implementation)
- **Edge Functions**: Server-side logic execution (future implementation)

### Next.js Integration
- **SSR Support**: Server-side rendering compatibility
- **API Routes**: Backend logic execution
- **Environment Variables**: Secure configuration management
- **Static Generation**: Build-time optimization where possible

### Third-party Services
- **Toast Notifications**: User feedback system
- **Loading States**: Skeleton components during data fetching
- **Error Boundaries**: React error handling integration

## 🔒 Security Considerations

### Data Protection
- **Environment variables**: Sensitive data stored securely
- **API key rotation**: Regular credential updates
- **SQL injection prevention**: Parameterized queries via Supabase
- **XSS protection**: Input sanitization and validation

### Authentication & Authorization
- **Anonymous access**: Read-only public data access
- **Service role**: Server-side operations with elevated permissions
- **Row Level Security**: Future user-based data access control
- **JWT validation**: Token-based authentication flow

## 📈 Monitoring & Debugging

### Error Tracking
```typescript
// Error logging with context
const logError = (error: Error, context: Record<string, any>) => {
  console.error('Application Error:', {
    message: error.message,
    stack: error.stack,
    context,
    timestamp: new Date().toISOString(),
    url: window.location.href
  })
}
```

### Performance Metrics
- **Query execution time**: Database operation monitoring
- **Real-time connection status**: WebSocket health tracking
- **Error rates**: Failed operation percentage tracking
- **User interaction success**: Form submission success rates

## 🔗 Usage Examples

### Basic Data Fetching
```typescript
import { supabase } from '@/lib/supabase'
import { useErrorHandler } from '@/lib/errorUtils'

const useSubreddits = () => {
  const [subreddits, setSubreddits] = useState<Subreddit[]>([])
  const { handleAsyncOperation } = useErrorHandler()
  
  useEffect(() => {
    handleAsyncOperation(async () => {
      const { data, error } = await supabase
        .from('subreddits')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50)
      
      if (error) throw error
      setSubreddits(data)
    }, 'Failed to fetch subreddits')
  }, [])
  
  return subreddits
}
```

### Real-time Data Subscription
```typescript
import { supabase } from '@/lib/supabase'

const useRealtimeSubreddits = () => {
  const [subreddits, setSubreddits] = useState<Subreddit[]>([])
  
  useEffect(() => {
    // Initial data fetch
    const fetchInitialData = async () => {
      const { data } = await supabase.from('subreddits').select('*')
      setSubreddits(data || [])
    }
    
    fetchInitialData()
    
    // Real-time subscription
    const channel = supabase.channel('subreddits')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'subreddits'
      }, (payload) => {
        if (payload.eventType === 'INSERT') {
          setSubreddits(prev => [payload.new as Subreddit, ...prev])
        } else if (payload.eventType === 'UPDATE') {
          setSubreddits(prev => prev.map(item => 
            item.id === payload.new.id ? payload.new as Subreddit : item
          ))
        } else if (payload.eventType === 'DELETE') {
          setSubreddits(prev => prev.filter(item => item.id !== payload.old.id))
        }
      })
      .subscribe()
      
    return () => supabase.removeChannel(channel)
  }, [])
  
  return subreddits
}
```

This lib directory provides the foundation for reliable, performant, and maintainable data operations across the entire Reddit analytics dashboard.