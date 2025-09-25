
import { NextResponse } from 'next/server'
import { logger } from '@/lib/logger'
import { createClient } from '@/lib/supabase'
import { protectedApi } from '@/lib/api-wrapper'


// Prevent static generation of API routes
export const dynamic = 'force-dynamic'

export const GET = protectedApi(async () => {
  try {
    const supabase = await createClient()
    if (!supabase) {
      return NextResponse.json(
        { error: 'Database connection not available', success: false },
        { status: 500 }
      )
    }

    // Get all unique tags using a more efficient query
    const { data, error } = await supabase
      .rpc('get_unique_tags')

    if (error) {
      // If RPC doesn't exist, fall back to regular query
      const { data: fallbackData, error: fallbackError } = await supabase
        .from('reddit_subreddits')
        .select('tags')
        .eq('review', 'Ok')
        .not('tags', 'is', null)

      if (fallbackError) {
        return NextResponse.json(
          { error: 'Failed to fetch tags', success: false },
          { status: 500 }
        )
      }

      // Extract unique tags from JSONB arrays
      const uniqueTags = new Set<string>()
      fallbackData?.forEach((item: { tags?: string[] | string }) => {
        if (item.tags && Array.isArray(item.tags)) {
          item.tags.forEach((tag: string) => {
            if (tag && tag.trim()) {
              uniqueTags.add(tag.trim())
            }
          })
        }
      })

      const tagsArray = Array.from(uniqueTags).sort()

      // Add cache headers for 5 minutes
      return NextResponse.json(
        { success: true, tags: tagsArray },
        {
          headers: {
            'Cache-Control': 'public, max-age=300, s-maxage=300, stale-while-revalidate=600'
          }
        }
      )
    }

    // Use RPC result if available
    const tags = data?.map((row: { tag: string }) => row.tag).filter(Boolean).sort() || []

    return NextResponse.json(
      { success: true, tags },
      {
        headers: {
          'Cache-Control': 'public, max-age=300, s-maxage=300, stale-while-revalidate=600'
        }
      }
    )
  } catch (error) {
    logger.error('Error fetching unique tags:', error)
    return NextResponse.json(
      { error: 'Internal server error', success: false },
      { status: 500 }
    )
  }
})
