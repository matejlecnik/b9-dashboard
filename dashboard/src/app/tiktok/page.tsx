'use client'

import { StandardPlaceholder, TikTokIcon } from '@/components/standard'

export default function TikTokDashboard() {
  return (
    <StandardPlaceholder
      title="TikTok Dashboard"
      subtitle="Coming Soon - Q3 2025"
      description="TikTok Intelligence Platform"
      launchDate="Q3 2025"
      icon={TikTokIcon}
      iconColor="black"
      variant="dark"
      stats={[
        { label: 'Launch', value: 'Q3', subtitle: '2025' },
        { label: 'Focus', value: 'Video', subtitle: 'Analytics' },
        { label: 'Tracking', value: 'Viral', subtitle: 'Content' }
      ]}
    />
  )
}
