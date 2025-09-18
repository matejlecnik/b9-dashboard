'use client'

import { StandardPlaceholder, YouTubeIcon } from '@/components/standard'

export default function YouTubeDashboard() {
  return (
    <StandardPlaceholder
      title="YouTube Dashboard"
      subtitle="Coming Soon - Q4 2025"
      description="YouTube Analytics Platform"
      launchDate="Q4 2025"
      icon={YouTubeIcon}
      iconColor="pink"
      gradientFrom="red-50"
      gradientTo="pink-50"
      stats={[
        { label: 'Launch', value: 'Q4', subtitle: '2025' },
        { label: 'Focus', value: 'Video', subtitle: 'Analytics' },
        { label: 'Growth', value: 'Channel', subtitle: 'Optimization' }
      ]}
    />
  )
}
