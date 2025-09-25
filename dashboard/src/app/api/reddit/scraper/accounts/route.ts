import { NextResponse } from 'next/server'
import { logger } from '@/lib/logger'
import { createClient } from '@/lib/supabase'
import { scraperApi } from '@/lib/api-wrapper'

// Removed zod schema to eliminate dependency

// Prevent static generation of API routes
export const dynamic = 'force-dynamic'

interface RedditAccount {
  username?: string
  account_name?: string
  status?: string
  is_active?: boolean
  is_enabled?: boolean
  last_used_at?: string | null
  total_requests?: number
  successful_requests?: number
  failed_requests?: number
  success_rate?: number | string
  avg_response_time?: number | string
  last_success_at?: string | null
  proxy_host?: string | null
  proxy_port?: number | null
}

// Calculate rate limit remaining based on account status and recent activity
function calculateRateLimitRemaining(account: RedditAccount): number {
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
  const activityLevel = (account.total_requests || 0) > 1000 ? 'high' :
                       (account.total_requests || 0) > 500 ? 'medium' : 'low'
  
  return activityLevel === 'high' ? Math.floor(maxRequests * 0.2) : // 20% remaining for high activity
         activityLevel === 'medium' ? Math.floor(maxRequests * 0.6) : // 60% remaining for medium
         Math.floor(maxRequests * 0.85) // 85% remaining for low activity
}

export const GET = scraperApi(async () => {
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
      logger.error('Error fetching scraper accounts:', error)
      throw error
    }

    const accounts = accountsData || []
    const total = accounts.length
    const active = accounts.filter((a: RedditAccount) => a.status === 'active' && a.is_enabled).length
    
    // Map database fields to expected interface with enhanced status logic
    const details = accounts.map((account: RedditAccount) => ({
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
    const proxiesFromAccounts = accounts.filter((a: RedditAccount) => a.proxy_host && a.proxy_port)
    const uniqueProxies = Array.from(
      new Map(proxiesFromAccounts.map((a: RedditAccount) => [
        `${a.proxy_host}:${a.proxy_port}`,
        {
          host: a.proxy_host,
          port: typeof a.proxy_port === 'string' ? parseInt(a.proxy_port, 10) : Number(a.proxy_port),
          status: (a.status === 'active' && a.is_enabled) ? 'active' : 'disabled'
        }
      ])).values()
    )
    
    const proxyDetails = uniqueProxies as Array<{ host: string | null; port: number; status: string }>

    const activeProxies = proxyDetails.filter(p => p.status === 'active').length
    
    const response = { 
      accounts: { total, active, details },
      proxies: { total: proxyDetails.length, active: activeProxies, details: proxyDetails }
    }
    // Removed zod validation - return response directly
    return NextResponse.json(response)
  } catch (error) {
    logger.error('Error fetching scraper accounts:', error)
    return NextResponse.json({ 
      accounts: { total: 0, active: 0, details: [] },
      proxies: { total: 0, active: 0, details: [] }
    })
  }
})


