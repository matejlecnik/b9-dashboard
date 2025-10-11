import { createProxyPostHandler } from '@/lib/proxy-helper'

export const dynamic = 'force-dynamic'

// 5-minute timeout for creator addition (backend fetches 90 reels + 30 posts + analytics)
export const POST = createProxyPostHandler(() => '/api/instagram/creator/add', 300000)
