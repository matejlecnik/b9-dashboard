'use client'

import { StandardPlaceholder, ThreadsIcon } from '@/components/standard'

export default function ThreadsDashboard() {
  return (
    <StandardPlaceholder
      title="Threads Dashboard"
      subtitle="Coming Soon - 2026"
      description="Threads Analytics Platform"
      launchDate="2026"
      icon={ThreadsIcon}
      iconColor="black"
      variant="dark"
      stats={[
        { label: 'Launch', value: '2026', subtitle: 'Target' },
        { label: 'Focus', value: 'Posts', subtitle: 'Tracking' },
        { label: 'Analytics', value: 'Community', subtitle: 'Growth' }
      ]}
    />
  )
}
