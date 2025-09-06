# API Routes Directory

This directory contains Next.js App Router API endpoints that provide backend functionality for the Reddit analytics dashboard. All routes follow REST conventions and return JSON responses with consistent error handling.

## 🗂️ Directory Structure

```
api/
├── categories/                # Marketing category management
│   ├── route.ts              # GET/POST categories operations
│   └── [id]/route.ts         # Individual category operations
├── health/                   # System health monitoring  
│   └── route.ts              # Database connectivity check
├── reddit/                   # Reddit API integration
│   └── user/route.ts         # User data fetching
├── scraper/                  # Scraper monitoring and control
│   └── accounts/route.ts     # Scraper account status
└── users/                    # User management
    └── toggle-creator/route.ts # Creator status toggle
```

## 📋 API Endpoints Documentation

### Categories API (`/api/categories`)
**Purpose**: Manage marketing categories for subreddit organization
**Business Value**: Enables systematic categorization of 425+ approved subreddits

#### GET `/api/categories`
Retrieves all available categories with usage statistics.

**Response Schema**:
```typescript
interface CategoriesResponse {
  success: boolean
  categories: Array<{
    id: string
    name: string
    description: string | null
    color: string                    // Hex color (e.g., "#EC4899")
    usage_count: number             // Number of subreddits using this category
    created_at: string
    updated_at: string
  }>
}
```

**Implementation Logic**:
1. Attempts to fetch from dedicated `categories` table
2. Falls back to extracting unique values from `subreddits.category_text`
3. Sorts by usage count (most popular first)
4. Returns with success/error status

**Usage Example**:
```javascript
// Frontend usage
const fetchCategories = async () => {
  const response = await fetch('/api/categories')
  const { success, categories } = await response.json()
  
  if (success) {
    return categories.map(cat => ({
      value: cat.name,
      label: cat.name,
      count: cat.usage_count
    }))
  }
  return []
}
```

#### POST `/api/categories`
Creates a new marketing category.

**Request Body**:
```typescript
interface CreateCategoryRequest {
  name: string                      // Required: Category name
  description?: string              // Optional: Category description  
  color?: string                   // Optional: Hex color (defaults to #EC4899)
}
```

**Response Schema**:
```typescript
interface CreateCategoryResponse {
  success: boolean
  category?: {
    id: string
    name: string
    description: string | null
    color: string
    created_at: string
    updated_at: string
  }
  error?: string                   // Present when success: false
}
```

**Validation Rules**:
- `name`: Required string, trimmed
- `color`: Must match hex pattern `/^#[0-9A-Fa-f]{6}$/`
- Unique constraint on category names

**Error Codes**:
- `400`: Invalid request data
- `409`: Category name already exists
- `500`: Database or server error

### Health Check API (`/api/health`)
**Purpose**: Monitor system status and database connectivity
**Business Value**: Ensures continuous service availability for business operations

#### GET `/api/health`
Performs comprehensive system health check.

**Response Schema**:
```typescript
interface HealthResponse {
  status: 'healthy' | 'error'
  message: string
  supabase_connection?: 'connected'
  subreddits_count?: number
  timestamp: string
  env_check?: {                    // Present on configuration errors
    url: boolean
    key: boolean
  }
  error?: string                   // Present when status: 'error'
}
```

**Health Checks Performed**:
1. **Environment Variables**: Verifies Supabase configuration
2. **Database Connection**: Tests query execution
3. **Data Availability**: Confirms subreddits table access
4. **Response Time**: Measures API performance

**Usage Example**:
```javascript
// Monitoring dashboard integration
const checkSystemHealth = async () => {
  try {
    const response = await fetch('/api/health')
    const health = await response.json()
    
    return {
      isHealthy: health.status === 'healthy',
      subredditsCount: health.subreddits_count || 0,
      lastChecked: health.timestamp
    }
  } catch (error) {
    return { isHealthy: false, error: error.message }
  }
}
```

### Scraper Monitoring API (`/api/scraper`)
**Purpose**: Monitor and control Python scraper operations
**Business Value**: Ensures continuous data collection for 17,100 requests/hour capacity

#### GET `/api/scraper/accounts`
Retrieves scraper account status and performance metrics.

**Response Schema**:
```typescript
interface ScraperAccountsResponse {
  success: boolean
  accounts: Array<{
    account_name: string
    status: 'active' | 'inactive' | 'error'
    total_requests: number
    successful_requests: number
    failed_requests: number
    success_rate: number            // Percentage (0-100)
    last_success_at: string | null
    last_failure_at: string | null
    last_error_message: string | null
    avg_response_time: number       // Milliseconds
  }>
  summary: {
    total_accounts: number
    active_accounts: number
    overall_success_rate: number
    total_requests_today: number
  }
}
```

**Integration Points**:
- Reads from `scraper_accounts` table
- Connects with PythonAnywhere scraper metrics
- Provides data for scraper dashboard page

### Reddit Integration API (`/api/reddit`)
**Purpose**: Interface with Reddit API for user and content data
**Business Value**: Enables user quality scoring and content analysis

#### GET `/api/reddit/user`
Fetches Reddit user profile information.

**Query Parameters**:
- `username`: Reddit username (required)
- `include_posts`: Include recent posts (optional, default: false)

**Response Schema**:
```typescript
interface RedditUserResponse {
  success: boolean
  user?: {
    username: string
    account_age_days: number
    total_karma: number
    comment_karma: number
    link_karma: number
    is_verified: boolean
    is_suspended: boolean
    created_utc: string
    recent_posts?: Array<PostData>   // If include_posts=true
  }
  error?: string
}
```

### User Management API (`/api/users`)
**Purpose**: Manage user profiles and creator status
**Business Value**: Track and categorize content creators vs. regular users

#### POST `/api/users/toggle-creator`
Toggles creator status for a user profile.

**Request Body**:
```typescript
interface ToggleCreatorRequest {
  username: string
  is_creator: boolean
}
```

**Response Schema**:
```typescript
interface ToggleCreatorResponse {
  success: boolean
  user?: UserProfile
  error?: string
}
```

## 🔧 API Architecture Patterns

### Consistent Response Format
All API endpoints follow a standardized response pattern:

```typescript
// Success Response
{
  success: true,
  data: any,                       // Endpoint-specific data
  message?: string                 // Optional success message
}

// Error Response  
{
  success: false,
  error: string,                   // User-friendly error message
  details?: any                    // Additional error context (development only)
}
```

### Error Handling Strategy
```typescript
export async function GET(request: Request) {
  try {
    // API logic here
    
    return NextResponse.json({
      success: true,
      data: result
    })
    
  } catch (error) {
    console.error('API Error:', error)
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error'
    }, { 
      status: 500 
    })
  }
}
```

### Database Integration Pattern
```typescript
import { createClient } from '@/utils/supabase/server'

export async function GET() {
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from('table_name')
    .select('columns')
    .order('created_at', { ascending: false })
    
  if (error) {
    throw new Error(`Database error: ${error.message}`)
  }
  
  return NextResponse.json({ success: true, data })
}
```

## ⚡ Performance Optimizations

### Caching Strategy
```typescript
// Next.js built-in caching
export const dynamic = 'auto'         // Enable static generation when possible
export const revalidate = 300         // Revalidate every 5 minutes

// Custom caching for expensive operations
const cachedResults = new Map<string, { data: any, timestamp: number }>()

const getCachedData = (key: string, ttl: number = 300000) => {
  const cached = cachedResults.get(key)
  if (cached && Date.now() - cached.timestamp < ttl) {
    return cached.data
  }
  return null
}
```

### Database Query Optimization
- **Select specific columns**: Avoid `SELECT *` queries
- **Use indexes**: Leverage database indexes for filtering
- **Limit result sets**: Implement pagination for large datasets
- **Connection pooling**: Reuse database connections

### Error Recovery
- **Retry mechanisms**: Automatic retry for transient failures
- **Circuit breakers**: Prevent cascade failures
- **Graceful degradation**: Return cached data when primary source fails
- **Monitoring**: Track error rates and response times

## 🔒 Security Considerations

### Input Validation
```typescript
// Request body validation
const validateCreateCategory = (body: any) => {
  if (!body.name || typeof body.name !== 'string') {
    throw new Error('Category name is required')
  }
  
  if (body.color && !/^#[0-9A-Fa-f]{6}$/.test(body.color)) {
    throw new Error('Invalid color format')
  }
  
  return {
    name: body.name.trim(),
    description: body.description?.trim() || null,
    color: body.color || '#EC4899'
  }
}
```

### Data Protection
- **SQL Injection Prevention**: Parameterized queries via Supabase
- **XSS Protection**: Input sanitization and validation
- **Rate Limiting**: Prevent API abuse (future implementation)
- **CORS Configuration**: Restrict cross-origin requests

### Authentication & Authorization
```typescript
// Future implementation pattern
const verifyAuth = async (request: Request) => {
  const token = request.headers.get('Authorization')?.replace('Bearer ', '')
  
  if (!token) {
    throw new Error('Authentication required')
  }
  
  const { data: user, error } = await supabase.auth.getUser(token)
  
  if (error || !user) {
    throw new Error('Invalid authentication token')
  }
  
  return user
}
```

## 📊 API Metrics & Monitoring

### Performance Targets
- **Response Time**: < 200ms average for data retrieval
- **Availability**: 99.9% uptime target
- **Error Rate**: < 1% of requests should fail
- **Throughput**: Support 1000+ concurrent requests

### Monitoring Integration
```typescript
// Example monitoring middleware
const withMonitoring = (handler: Function) => async (request: Request) => {
  const startTime = Date.now()
  const path = new URL(request.url).pathname
  
  try {
    const response = await handler(request)
    
    // Log successful request
    console.log({
      method: request.method,
      path,
      duration: Date.now() - startTime,
      status: response.status
    })
    
    return response
  } catch (error) {
    // Log failed request
    console.error({
      method: request.method,
      path,
      duration: Date.now() - startTime,
      error: error.message
    })
    
    throw error
  }
}
```

## 🔗 Integration Examples

### Frontend Integration
```typescript
// React hook for API integration
const useCategories = () => {
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const response = await fetch('/api/categories')
        const result = await response.json()
        
        if (result.success) {
          setCategories(result.categories)
        } else {
          setError(result.error)
        }
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }
    
    fetchCategories()
  }, [])
  
  return { categories, loading, error }
}
```

### External Service Integration
```typescript
// Python scraper API consumption
const updateScraperMetrics = async () => {
  const response = await fetch('/api/scraper/accounts')
  const { success, accounts } = await response.json()
  
  if (success) {
    // Update dashboard metrics
    return accounts.reduce((metrics, account) => {
      metrics.totalRequests += account.total_requests
      metrics.successfulRequests += account.successful_requests
      return metrics
    }, { totalRequests: 0, successfulRequests: 0 })
  }
}
```

This API architecture provides reliable, scalable, and maintainable backend services for the Reddit analytics dashboard, supporting real-time data processing and business intelligence operations.