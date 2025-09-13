import type { Metadata } from 'next'
import Link from 'next/link'
import { Activity, ArrowLeft } from 'lucide-react'

export const metadata: Metadata = {
  title: 'System Monitor - B9 Dashboard',
  description: 'Real-time system monitoring and control'
}

export default function SystemMonitorLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-white">
      {/* Minimalist Navigation */}
      <nav className="border-b border-gray-100">
        <div className="container mx-auto px-6">
          <div className="flex items-center justify-between h-14">
            <div className="flex items-center gap-6">
              <Link
                href="/dashboards"
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <ArrowLeft className="h-4 w-4" />
              </Link>
              <div className="flex items-center gap-2">
                <Activity className="h-4 w-4 text-gray-400" />
                <span className="text-sm font-medium text-gray-900">System Monitor</span>
              </div>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      {children}
    </div>
  )
}