import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase'
// Removed zod schema to eliminate dependency

// Types for rows we read from the database
interface ScraperAccountRow {
  account_name: string | null
  status: string
  is_enabled: boolean
  total_requests?: number | null
  successful_requests?: number | null
  failed_requests?: number | null
  success_rate?: string | number | null
  avg_response_time?: string | number | null
  last_success_at?: string | null
  proxy_host?: string | null
  proxy_port?: string | number | null
  last_used_at?: string | null
}

// Calculate rate limit remaining based on account status and recent activity
function calculateRateLimitRemaining(account: Pick<ScraperAccountRow, 'status' | 'is_enabled' | 'last_used_at' | 'total_requests'>): number {
  if (account.status !== 'active' || !account.is_enabled) {
    return 0
  }
  
  // Reddit API allows 100 requests per minute per account
  const maxRequests = 100
  const now = new Date()
  const lastUsed = account.last_used_at ? new Date(account.last_used_at) : null
  
  if (!lastUsed) {
    return maxRequests // Full capacity if never used
  }
  
  const minutesElapsed = Math.floor((now.getTime() - lastUsed.getTime()) / (1000 * 60))
  
  if (minutesElapsed >= 1) {
    return maxRequests // Full reset after 1+ minutes
  }
  
  // Estimate based on account activity level
  const totalRequests = account.total_requests ?? 0
  const activityLevel = totalRequests > 1000 ? 'high' : 
                       totalRequests > 500 ? 'medium' : 'low'
  
  return activityLevel === 'high' ? Math.floor(maxRequests * 0.2) : // 20% remaining for high activity
         activityLevel === 'medium' ? Math.floor(maxRequests * 0.6) : // 60% remaining for medium
         Math.floor(maxRequests * 0.85) // 85% remaining for low activity
}

export async function GET() {
  try {
    const supabase = await createClient()
    if (!supabase) {
      throw new Error('Supabase client not initialized')
    }

    // Fetch scraper accounts from database
    const { data: accountsData, error } = await supabase
      .from('scraper_accounts')
      .select('account_name, status, is_enabled, total_requests, successful_requests, failed_requests, success_rate, avg_response_time, last_success_at, proxy_host, proxy_port')
      .order('account_name')

    if (error) {
      console.error('Error fetching scraper accounts:', error)
      throw error
    }

    const accounts: ScraperAccountRow[] = (accountsData as ScraperAccountRow[] | null) || []
    const total = accounts.length
    const active = accounts.filter((a: ScraperAccountRow) => a.status === 'active' && a.is_enabled).length
    
    // Map database fields to expected interface with enhanced status logic
    const details = accounts.map((account: ScraperAccountRow) => ({
      username: account.account_name || 'unknown',
      status: account.status === 'banned' ? 'banned' : 
              (account.status === 'active' && account.is_enabled) ? 'active' : 'inactive',
      total_requests: account.total_requests || 0,
      successful_requests: account.successful_requests || 0,
      failed_requests: account.failed_requests || 0,
      success_rate: account.success_rate || '0.00',
      avg_response_time: account.avg_response_time || '0.00',
      last_success_at: account.last_success_at,
      rate_limit_remaining: calculateRateLimitRemaining(account)
    }))
    
    // Get proxy information from accounts with proxy data
    interface ProxyDetail { host: string; port: number; status: 'active' | 'disabled' }
    const proxiesFromAccounts = accounts.filter((a: ScraperAccountRow) => !!a.proxy_host && a.proxy_port != null)
    const uniqueProxies = Array.from(
      new Map<string, ProxyDetail>(proxiesFromAccounts.map((a: ScraperAccountRow) => {
        const host = a.proxy_host as string
        const port = typeof a.proxy_port === 'string' ? parseInt(a.proxy_port, 10) : Number(a.proxy_port)
        const status: 'active' | 'disabled' = (a.status === 'active' && a.is_enabled) ? 'active' : 'disabled'
        return [
          `${host}:${port}`,
          { host, port, status }
        ]
      })).values()
    )
    
    const proxyDetails: ProxyDetail[] = uniqueProxies
    
    const activeProxies = proxyDetails.filter((p: ProxyDetail) => p.status === 'active').length
    
    const response = { 
      accounts: { total, active, details },
      proxies: { total: proxyDetails.length, active: activeProxies, details: proxyDetails }
    }
    // Removed zod validation - return response directly
    return NextResponse.json(response)
  } catch (error) {
    console.error('Error fetching scraper accounts:', error)
    return NextResponse.json({ 
      accounts: { total: 0, active: 0, details: [] },
      proxies: { total: 0, active: 0, details: [] }
    })
  }
}


