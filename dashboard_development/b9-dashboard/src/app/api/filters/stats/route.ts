import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  try {
    const supabase = createClient()
    
    // Get filter status statistics
    const { data: statusStats, error: statusError } = await supabase
      .rpc('get_filter_status_stats')
    
    if (statusError) {
      console.error('Error fetching filter status stats:', statusError)
      return NextResponse.json({ error: statusError.message }, { status: 500 })
    }
    
    // Get whitelist count
    const { count: whitelistCount, error: whitelistError } = await supabase
      .from('subreddit_whitelist')
      .select('*', { count: 'exact', head: true })
    
    if (whitelistError) {
      console.error('Error fetching whitelist count:', whitelistError)
      return NextResponse.json({ error: whitelistError.message }, { status: 500 })
    }
    
    // Get seller bans detected count
    const { count: sellerBansCount, error: sellerBansError } = await supabase
      .from('subreddits')
      .select('*', { count: 'exact', head: true })
      .eq('seller_ban_detected', true)
    
    if (sellerBansError) {
      console.error('Error fetching seller bans count:', sellerBansError)
      return NextResponse.json({ error: sellerBansError.message }, { status: 500 })
    }
    
    // Get verification required count
    const { count: verificationCount, error: verificationError } = await supabase
      .from('subreddits')
      .select('*', { count: 'exact', head: true })
      .eq('verification_required_detected', true)
    
    if (verificationError) {
      console.error('Error fetching verification count:', verificationError)
      return NextResponse.json({ error: verificationError.message }, { status: 500 })
    }
    
    // Calculate totals and percentages
    const totalSubreddits = statusStats?.reduce((sum: number, stat: any) => sum + parseInt(stat.count), 0) || 0
    
    const stats = {
      total_subreddits: totalSubreddits,
      by_status: statusStats?.reduce((acc: any, stat: any) => {
        acc[stat.filter_status || 'unprocessed'] = parseInt(stat.count)
        return acc
      }, {}) || {},
      whitelist_count: whitelistCount || 0,
      seller_bans_detected: sellerBansCount || 0,
      verification_required: verificationCount || 0,
      filter_efficiency: {
        total_processed: totalSubreddits - (statusStats?.find((s: any) => s.filter_status === 'unprocessed')?.count || 0),
        filtered_out: statusStats?.find((s: any) => s.filter_status === 'filtered')?.count || 0,
        passed_for_review: statusStats?.find((s: any) => s.filter_status === 'passed')?.count || 0,
        whitelisted: statusStats?.find((s: any) => s.filter_status === 'whitelist')?.count || 0
      }
    }
    
    // Calculate percentages
    if (stats.filter_efficiency.total_processed > 0) {
      stats.filter_efficiency = {
        ...stats.filter_efficiency,
        filtered_percentage: ((stats.filter_efficiency.filtered_out / stats.filter_efficiency.total_processed) * 100).toFixed(1),
        passed_percentage: ((stats.filter_efficiency.passed_for_review / stats.filter_efficiency.total_processed) * 100).toFixed(1),
        whitelist_percentage: ((stats.filter_efficiency.whitelisted / stats.filter_efficiency.total_processed) * 100).toFixed(1)
      }
    }
    
    return NextResponse.json({ stats })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}