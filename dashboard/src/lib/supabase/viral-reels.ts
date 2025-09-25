
export interface ViralReel {
  id: number
  media_pk: string
  shortcode: string
  creator_id: string
  creator_username: string
  caption_text: string
  play_count: number
  like_count: number
  comment_count: number
  save_count: number
  share_count: number
  video_url: string | null
  cover_url: string | null
  thumbnail_url: string | null
  taken_at: string
  video_duration: number | null
  engagement_count: number
  engagement_rate: number | null
  creator?: {
    ig_user_id: string
    username: string
    profile_pic_url: string | null
    followers: number
    full_name: string | null
  }
}

export interface ViralReelsFilters {
  minViews?: number
  maxViews?: number
  creatorId?: string
  dateFrom?: string
  dateTo?: string
  sortBy?: 'views' | 'likes' | 'engagement' | 'recent'
  sortOrder?: 'asc' | 'desc'
}

import { supabase } from '@/lib/supabase'
import { logger } from '@/lib/logger'

export async function getViralReels(
  filters: ViralReelsFilters = {},
  page = 1,
  limit = 20
): Promise<{ reels: ViralReel[]; totalCount: number; page: number; totalPages: number }> {
  if (!supabase) {
    logger.error('Supabase client not initialized')
    return {
      reels: [],
      totalCount: 0,
      page,
      totalPages: 0
    }
  }

  let query = supabase
    .from('instagram_reels')
    .select(`
      *,
      creator:instagram_creators(
        ig_user_id,
        username,
        profile_pic_url,
        followers,
        full_name
      )
    `, { count: 'exact' })

  // Apply view count filters
  const minViews = filters.minViews || 50000
  query = query.gte('play_count', minViews)

  if (filters.maxViews) {
    query = query.lte('play_count', filters.maxViews)
  }

  // Apply creator filter
  if (filters.creatorId) {
    query = query.eq('creator_id', filters.creatorId)
  }

  // Apply date filters
  if (filters.dateFrom) {
    query = query.gte('taken_at', filters.dateFrom)
  }

  if (filters.dateTo) {
    query = query.lte('taken_at', filters.dateTo)
  }

  // Apply sorting
  const sortBy = filters.sortBy || 'views'
  const sortOrder = filters.sortOrder || 'desc'
  const ascending = sortOrder === 'asc'

  switch (sortBy) {
    case 'views':
      query = query.order('play_count', { ascending })
      break
    case 'likes':
      query = query.order('like_count', { ascending })
      break
    case 'engagement':
      query = query.order('engagement_count', { ascending })
      break
    case 'recent':
      query = query.order('taken_at', { ascending })
      break
  }

  // Apply pagination
  const from = (page - 1) * limit
  const to = from + limit - 1

  const { data, error, count } = await query
    .range(from, to)

  if (error) {
    logger.error('Error fetching viral reels:', error)
    throw error
  }

  return {
    reels: (data || []) as unknown as ViralReel[],
    totalCount: count || 0,
    page,
    totalPages: Math.ceil((count || 0) / limit)
  }
}

export async function getViralReelsStats(filters: ViralReelsFilters = {}): Promise<
  | {
      total_reels: number
      total_viral: number
      ultra_viral: number
      avg_views: number
      avg_likes: number
      max_views: number
    }
  | null
> {
  if (!supabase) {
    logger.error('Supabase client not initialized')
    return null
  }

  const minViews = filters.minViews || 50000

  // Try to use RPC function first
  const { data: stats, error } = await supabase
    .rpc('get_viral_reels_stats', {
      min_views: minViews
    })

  if (error) {
    // If the function doesn't exist, calculate stats manually
    let viralQuery = supabase
      .from('instagram_reels')
      .select('play_count, like_count, comment_count')
      .gte('play_count', minViews)

    let totalQuery = supabase
      .from('instagram_reels')
      .select('*', { count: 'exact', head: true })

    let maxQuery = supabase
      .from('instagram_reels')
      .select('play_count')

    // Apply date filters if present
    if (filters.dateFrom) {
      viralQuery = viralQuery.gte('taken_at', filters.dateFrom)
      maxQuery = maxQuery.gte('taken_at', filters.dateFrom)
    }
    if (filters.dateTo) {
      viralQuery = viralQuery.lte('taken_at', filters.dateTo)
      maxQuery = maxQuery.lte('taken_at', filters.dateTo)
    }

    // Apply creator filter if present
    if (filters.creatorId) {
      viralQuery = viralQuery.eq('creator_id', filters.creatorId)
      totalQuery = totalQuery.eq('creator_id', filters.creatorId)
      maxQuery = maxQuery.eq('creator_id', filters.creatorId)
    }

    maxQuery = maxQuery.order('play_count', { ascending: false }).limit(1)

    const [viralData, totalCount, maxData] = await Promise.all([
      viralQuery,
      totalQuery,
      maxQuery
    ])

    if (viralData.error) {
      logger.error('Error fetching viral stats:', viralData.error)
      return null
    }

    type ViralRow = { play_count: number; like_count: number }
    const data = (viralData.data || []) as ViralRow[]
    const totalReels = (totalCount as { count: number | null }).count || 0
    const maxViews = (maxData as { data?: Array<{ play_count: number }> }).data?.[0]?.play_count || 0

    if (data.length === 0) {
      return {
        total_reels: totalReels,
        total_viral: 0,
        ultra_viral: 0,
        avg_views: 0,
        avg_likes: 0,
        max_views: maxViews
      }
    }

    const ultraViral = data.filter((r) => r.play_count >= 50_000_000).length
    const avgViews = Math.round(data.reduce((sum, r) => sum + r.play_count, 0) / data.length)
    const avgLikes = Math.round(data.reduce((sum, r) => sum + r.like_count, 0) / data.length)

    return {
      total_reels: totalReels,
      total_viral: data.length,
      ultra_viral: ultraViral,
      avg_views: avgViews,
      avg_likes: avgLikes,
      max_views: maxViews
    }
  }

  // Add total_reels if not present in RPC response
  if (stats && !stats.total_reels) {
    let countQuery = supabase
      .from('instagram_reels')
      .select('*', { count: 'exact', head: true })

    if (filters.creatorId) {
      countQuery = countQuery.eq('creator_id', filters.creatorId)
    }

    const { count } = await countQuery
    ;(stats as { total_reels?: number }).total_reels = count || 0
  }

  return stats
}

export async function getTopCreators(filters: ViralReelsFilters = {}, limit = 5): Promise<
  Array<{
    username: string
    creator_id: string
    profile_pic_url: string | null
    followers: number
    viral_count: number
  }>
> {
  if (!supabase) {
    logger.error('Supabase client not initialized')
    return []
  }

  const minViews = filters.minViews || 50000

  let query = supabase
    .from('instagram_reels')
    .select(`
      creator_id,
      creator_username,
      creator:instagram_creators(
        ig_user_id,
        username,
        profile_pic_url,
        followers
      )
    `)
    .gte('play_count', minViews)

  // Apply date filters if present
  if (filters.dateFrom) {
    query = query.gte('taken_at', filters.dateFrom)
  }
  if (filters.dateTo) {
    query = query.lte('taken_at', filters.dateTo)
  }

  // Apply creator filter if present
  if (filters.creatorId) {
    query = query.eq('creator_id', filters.creatorId)
  }

  const { data, error } = await query
    .order('play_count', { ascending: false })
    .limit(500) // Increase limit to get more data for accurate top creators

  if (error) {
    logger.error('Error fetching top creators:', error)
    return []
  }

  // Group by creator and count viral reels
  const creatorMap = new Map<
    string,
    {
      username: string
      creator_id: string
      profile_pic_url: string | null
      followers: number
      viral_count: number
    }
  >()

  type CreatorRow = {
    creator_id: string
    creator_username: string
    creator?:
      | { profile_pic_url: string | null; followers?: number | null }
      | Array<{ profile_pic_url: string | null; followers?: number | null }>
  }

  const rows: CreatorRow[] = ((data as unknown) ?? []) as CreatorRow[]

  rows.forEach((reel) => {
    if (!reel.creator_username) return

    if (!creatorMap.has(reel.creator_username)) {
      const creatorDetails = Array.isArray(reel.creator) ? reel.creator[0] : reel.creator
      creatorMap.set(reel.creator_username, {
        username: reel.creator_username,
        creator_id: reel.creator_id,
        profile_pic_url: creatorDetails?.profile_pic_url ?? null,
        followers: creatorDetails?.followers || 0,
        viral_count: 0
      })
    }

    const creator = creatorMap.get(reel.creator_username)
    if (creator) creator.viral_count++
  })

  // Sort by viral count and return top creators
  return Array.from(creatorMap.values())
    .sort((a, b) => b.viral_count - a.viral_count)
    .slice(0, limit)
}