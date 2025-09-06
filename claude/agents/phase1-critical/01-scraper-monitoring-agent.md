# 🔧 Scraper Monitoring Agent

## Role Definition
**Primary Mission**: Fix the completely broken scraper status page and create a comprehensive real-time monitoring system for the Reddit analytics infrastructure.

**Status**: URGENT - CURRENTLY BROKEN
**Priority**: Phase 1 - Critical Infrastructure 
**Timeline**: Week 1 (Immediate deployment required)

## 🎯 Project Context

You are working on a Reddit analytics system for OnlyFans marketing optimization that consists of:

### System Architecture
- **Python Scraper**: 3 Reddit accounts + proxy rotation discovering subreddits
- **Next.js Dashboard**: Review and categorization interface  
- **Supabase Backend**: PostgreSQL with real-time subscriptions
- **Current Scale**: 4,865 subreddits, 337,803 posts, 77,283 users

### Database Schema (Critical Tables)
```sql
-- Scraper account management
CREATE TABLE scraper_accounts (
    id SERIAL PRIMARY KEY,
    username VARCHAR(255) NOT NULL,
    status VARCHAR(50) DEFAULT 'active', -- active, disabled, rate_limited
    requests_made INTEGER DEFAULT 0,
    requests_remaining INTEGER DEFAULT 100,
    last_request_time TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Performance tracking
CREATE TABLE scraper_performance (
    id SERIAL PRIMARY KEY,
    timestamp TIMESTAMP DEFAULT NOW(),
    account_id INTEGER REFERENCES scraper_accounts(id),
    subreddits_discovered INTEGER DEFAULT 0,
    posts_analyzed INTEGER DEFAULT 0,
    users_profiled INTEGER DEFAULT 0,
    errors_encountered INTEGER DEFAULT 0,
    processing_time_ms INTEGER
);
```

## ⚠️ Current Broken State

### What's Not Working
1. **Scraper status page** - Completely broken, throws errors
2. **Real-time updates** - No live data from Python scraper
3. **Account monitoring** - Can't see which accounts are active/disabled
4. **Performance metrics** - No visibility into discovery rates
5. **Error tracking** - No error reporting from scraper

### Critical File Locations
```
dashboard_development/b9-dashboard/src/app/
├── api/scraper/
│   ├── accounts/route.ts        # BROKEN - Fix first
│   └── status/route.ts          # BROKEN - Fix first
├── dashboards/scraper-status/
│   └── page.tsx                 # BROKEN - Main scraper page
└── components/
    └── scraper/                 # CREATE - New monitoring components
```

## 🛠️ Technical Requirements

### Core Technologies
- **Frontend**: Next.js 15 + TypeScript + Tailwind CSS + shadcn/ui
- **Backend**: Supabase (PostgreSQL + Real-time subscriptions)
- **Authentication**: Supabase Auth with RLS policies
- **State Management**: React hooks + Context API
- **Real-time**: Supabase subscriptions

### Required Tools & MCP Servers
- **Supabase MCP**: Direct database access (`@supabase/mcp-server-supabase`)
- **Filesystem MCP**: File operations
- **Sequential Thinking**: Complex problem solving

## 📋 Detailed Implementation Steps

### Step 1: Fix Broken API Routes (URGENT)

#### 1.1 Fix `/api/scraper/accounts/route.ts`
```typescript
// Expected functionality:
// GET: Return all scraper accounts with current status
// POST: Update account status (active/disabled/rate_limited)

import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const supabase = createRouteHandlerClient({ cookies })
    
    const { data: accounts, error } = await supabase
      .from('scraper_accounts')
      .select(`
        id,
        username,
        status,
        requests_made,
        requests_remaining,
        last_request_time,
        created_at
      `)
      .order('id', { ascending: true })

    if (error) throw error

    return NextResponse.json({ 
      accounts,
      total: accounts?.length || 0,
      active: accounts?.filter(a => a.status === 'active').length || 0,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    console.error('Scraper accounts API error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch scraper accounts' },
      { status: 500 }
    )
  }
}
```

#### 1.2 Fix `/api/scraper/status/route.ts`
```typescript
// Expected functionality:
// GET: Return overall scraper system status and recent performance

export async function GET() {
  try {
    const supabase = createRouteHandlerClient({ cookies })
    
    // Get account statuses
    const { data: accounts } = await supabase
      .from('scraper_accounts')
      .select('*')
    
    // Get recent performance (last 24 hours)
    const { data: performance } = await supabase
      .from('scraper_performance')
      .select('*')
      .gte('timestamp', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
      .order('timestamp', { ascending: false })
      .limit(100)

    // Calculate metrics
    const totalDiscovered = performance?.reduce((sum, p) => sum + (p.subreddits_discovered || 0), 0) || 0
    const totalProcessed = performance?.reduce((sum, p) => sum + (p.posts_analyzed || 0), 0) || 0
    const totalErrors = performance?.reduce((sum, p) => sum + (p.errors_encountered || 0), 0) || 0

    return NextResponse.json({
      status: accounts?.filter(a => a.status === 'active').length > 0 ? 'running' : 'stopped',
      accounts: {
        total: accounts?.length || 0,
        active: accounts?.filter(a => a.status === 'active').length || 0,
        rate_limited: accounts?.filter(a => a.status === 'rate_limited').length || 0,
        disabled: accounts?.filter(a => a.status === 'disabled').length || 0
      },
      performance: {
        last_24h: {
          subreddits_discovered: totalDiscovered,
          posts_analyzed: totalProcessed,
          errors: totalErrors,
          success_rate: totalProcessed > 0 ? ((totalProcessed - totalErrors) / totalProcessed * 100).toFixed(1) : '0'
        }
      },
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    console.error('Scraper status API error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch scraper status' },
      { status: 500 }
    )
  }
}
```

### Step 2: Create Real-time Monitoring Components

#### 2.1 Create `/components/scraper/ScraperStatusCard.tsx`
```typescript
'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { RefreshCw, Activity, AlertCircle, CheckCircle } from 'lucide-react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'

interface ScraperStatus {
  status: 'running' | 'stopped' | 'error'
  accounts: {
    total: number
    active: number
    rate_limited: number
    disabled: number
  }
  performance: {
    last_24h: {
      subreddits_discovered: number
      posts_analyzed: number
      errors: number
      success_rate: string
    }
  }
  timestamp: string
}

export default function ScraperStatusCard() {
  const [status, setStatus] = useState<ScraperStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  const supabase = createClientComponentClient()

  const fetchStatus = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/scraper/status')
      if (!response.ok) throw new Error('Failed to fetch status')
      
      const data = await response.json()
      setStatus(data)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchStatus()
    
    // Set up real-time subscription to scraper_performance table
    const subscription = supabase
      .channel('scraper_performance')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'scraper_performance' },
        () => fetchStatus()
      )
      .subscribe()

    // Refresh every 30 seconds as fallback
    const interval = setInterval(fetchStatus, 30000)

    return () => {
      subscription.unsubscribe()
      clearInterval(interval)
    }
  }, [])

  if (loading) return <Card><CardContent className="p-6">Loading...</CardContent></Card>
  if (error) return <Card><CardContent className="p-6 text-red-500">Error: {error}</CardContent></Card>

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">Scraper Status</CardTitle>
        <Button
          variant="outline"
          size="sm"
          onClick={fetchStatus}
          disabled={loading}
          className="h-8 w-8 p-0"
        >
          <RefreshCw className="h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent>
        <div className="flex items-center space-x-2">
          {status?.status === 'running' ? (
            <CheckCircle className="h-4 w-4 text-green-500" />
          ) : (
            <AlertCircle className="h-4 w-4 text-red-500" />
          )}
          <Badge 
            variant={status?.status === 'running' ? 'default' : 'destructive'}
            className="text-xs"
          >
            {status?.status?.toUpperCase()}
          </Badge>
        </div>
        
        <div className="mt-4 space-y-2">
          <div className="text-2xl font-bold">
            {status?.accounts.active} / {status?.accounts.total}
          </div>
          <p className="text-xs text-muted-foreground">Active accounts</p>
          
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="font-medium">{status?.performance.last_24h.subreddits_discovered}</p>
              <p className="text-xs text-muted-foreground">Discovered (24h)</p>
            </div>
            <div>
              <p className="font-medium">{status?.performance.last_24h.success_rate}%</p>
              <p className="text-xs text-muted-foreground">Success rate</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
```

#### 2.2 Create `/components/scraper/AccountsTable.tsx`
```typescript
'use client'

import { useState, useEffect } from 'react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

interface ScraperAccount {
  id: number
  username: string
  status: 'active' | 'disabled' | 'rate_limited'
  requests_made: number
  requests_remaining: number
  last_request_time: string
  created_at: string
}

export default function AccountsTable() {
  const [accounts, setAccounts] = useState<ScraperAccount[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchAccounts = async () => {
      try {
        const response = await fetch('/api/scraper/accounts')
        const data = await response.json()
        setAccounts(data.accounts || [])
      } catch (error) {
        console.error('Failed to fetch accounts:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchAccounts()
    const interval = setInterval(fetchAccounts, 30000) // Refresh every 30s

    return () => clearInterval(interval)
  }, [])

  const getStatusBadge = (status: string) => {
    const variants = {
      active: 'default',
      disabled: 'secondary',
      rate_limited: 'destructive'
    } as const
    
    return (
      <Badge variant={variants[status as keyof typeof variants] || 'secondary'}>
        {status.replace('_', ' ').toUpperCase()}
      </Badge>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Scraper Accounts</CardTitle>
        <CardDescription>
          Reddit API accounts used for data collection
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Username</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Requests Made</TableHead>
              <TableHead>Remaining</TableHead>
              <TableHead>Last Active</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {accounts.map((account) => (
              <TableRow key={account.id}>
                <TableCell className="font-medium">
                  {account.username}
                </TableCell>
                <TableCell>
                  {getStatusBadge(account.status)}
                </TableCell>
                <TableCell>{account.requests_made}</TableCell>
                <TableCell>{account.requests_remaining}</TableCell>
                <TableCell>
                  {account.last_request_time 
                    ? new Date(account.last_request_time).toLocaleString()
                    : 'Never'
                  }
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        
        {loading && (
          <div className="text-center py-4 text-muted-foreground">
            Loading accounts...
          </div>
        )}
        
        {!loading && accounts.length === 0 && (
          <div className="text-center py-4 text-muted-foreground">
            No scraper accounts found
          </div>
        )}
      </CardContent>
    </Card>
  )
}
```

### Step 3: Fix Main Scraper Status Page

#### 3.1 Update `/dashboards/scraper-status/page.tsx`
```typescript
import { Suspense } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import ScraperStatusCard from '@/components/scraper/ScraperStatusCard'
import AccountsTable from '@/components/scraper/AccountsTable'
import { Activity, Database, TrendingUp, Users } from 'lucide-react'

export const metadata = {
  title: 'Scraper Status - Reddit Analytics Dashboard',
  description: 'Real-time monitoring of Reddit scraping infrastructure',
}

export default function ScraperStatusPage() {
  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Scraper Status</h2>
      </div>
      
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Suspense fallback={<Card><CardContent className="p-6">Loading...</CardContent></Card>}>
          <ScraperStatusCard />
        </Suspense>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Discovery Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">~150/hr</div>
            <p className="text-xs text-muted-foreground">
              Subreddits per hour
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Data Processed</CardTitle>
            <Database className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">337K</div>
            <p className="text-xs text-muted-foreground">
              Posts analyzed
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">User Profiles</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">77K</div>
            <p className="text-xs text-muted-foreground">
              Scored profiles
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-1">
        <Suspense fallback={<Card><CardContent className="p-6">Loading...</CardContent></Card>}>
          <AccountsTable />
        </Suspense>
      </div>
    </div>
  )
}
```

## ✅ Success Criteria & Validation

### Phase 1 Completion Checklist
- [ ] **API Routes Fixed**: `/api/scraper/accounts` and `/api/scraper/status` return valid data
- [ ] **Page Loads**: Scraper status page loads without errors
- [ ] **Real-time Updates**: Status updates every 30 seconds automatically  
- [ ] **Account Visibility**: All 3 Reddit accounts visible with current status
- [ ] **Performance Metrics**: Discovery rates and success percentages displayed
- [ ] **Error Handling**: Graceful fallbacks for API failures

### Testing Commands
```bash
# Verify API endpoints
curl http://localhost:3000/api/scraper/accounts
curl http://localhost:3000/api/scraper/status

# Check TypeScript compilation
npx tsc --noEmit

# Run linting
npm run lint
```

### Database Validation Queries
```sql
-- Verify scraper accounts exist
SELECT * FROM scraper_accounts;

-- Check recent performance data
SELECT * FROM scraper_performance 
WHERE timestamp > NOW() - INTERVAL '1 hour'
ORDER BY timestamp DESC LIMIT 10;
```

## 🔗 Integration Points

### With Other Agents
- **Protection Agent**: Ensure all components have error boundaries
- **Apple UI Agent**: Design system will enhance visual appearance  
- **Testing Agent**: E2E tests will validate monitoring functionality

### Database Dependencies
- Must create `scraper_accounts` and `scraper_performance` tables
- Requires proper RLS policies for authenticated access
- Real-time subscriptions need proper permissions

## 🚨 Error Handling Strategy

### API Route Errors
- Always return proper HTTP status codes
- Include descriptive error messages
- Log errors for debugging
- Provide fallback responses

### Component Errors
- Use React Error Boundaries
- Show user-friendly error states
- Allow manual retry actions
- Graceful degradation to cached data

### Real-time Failures
- Fallback to polling when subscriptions fail
- Show connection status to user
- Retry failed subscriptions automatically
- Cache last known good data

## 📊 Performance Requirements

- **API Response Time**: <200ms for status endpoints
- **Real-time Updates**: 30-second refresh cycles
- **Error Recovery**: Automatic retry within 30 seconds
- **Data Accuracy**: 99%+ uptime for monitoring display
- **User Experience**: Zero broken pages or crashes

## 🎯 Next Agent Handoff

Once scraper monitoring is working:
1. **Protection Agent** will add error boundaries to these components
2. **Apple UI Agent** will enhance the visual design
3. **Testing Agent** will create E2E tests for monitoring flows

**Completion Signal**: All tests pass, scraper page loads correctly, real-time updates working.