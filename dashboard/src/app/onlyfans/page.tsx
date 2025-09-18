'use client'

import { StandardPlaceholder, OnlyFansIcon } from '@/components/standard'

export default function OnlyFansDashboard() {
  return (
    <StandardPlaceholder
      title="OnlyFans Dashboard"
      subtitle="Coming Soon - Q2 2025"
      description="OnlyFans Analytics Platform"
      launchDate="Q2 2025"
      icon={OnlyFansIcon}
      iconColor="blue"
      stats={[
        { label: 'Launch', value: 'Q2', subtitle: '2025' },
        { label: 'Focus', value: 'Revenue', subtitle: 'Tracking' },
        { label: 'Analytics', value: 'Growth', subtitle: 'Optimization' }
      ]}
    />
  )
}
