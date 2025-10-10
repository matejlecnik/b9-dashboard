import { createProxyPostHandler } from '@/lib/proxy-helper'

export const dynamic = 'force-dynamic'

export const POST = createProxyPostHandler(() => '/api/instagram/creator/add')
