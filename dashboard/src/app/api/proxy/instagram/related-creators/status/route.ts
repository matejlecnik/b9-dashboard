import { createProxyGetHandler } from '@/lib/proxy-helper'

export const dynamic = 'force-dynamic'

export const GET = createProxyGetHandler(() => '/api/instagram/related-creators/status')
