import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'System Monitor - B9 Dashboard',
  description: 'Real-time system monitoring and control'
}

export default function SystemMonitorLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}