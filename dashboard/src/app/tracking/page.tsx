'use client'

import Link from 'next/link'
import { ArrowLeft, Target } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { designSystem } from '@/lib/design-system'

export default function TrackingDashboard() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-secondary/10 to-indigo-50">
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center space-x-4">
            <Link href="/dashboards">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <div>
              <h1 className={cn("text-3xl font-bold", designSystem.typography.color.primary)}>Tracking Dashboard</h1>
              <p className={cn("mt-1", designSystem.typography.color.tertiary)}>Coming Soon - Q3 2025</p>
            </div>
          </div>
        </div>

        <Card className="max-w-2xl mx-auto mt-20">
          <CardHeader className="text-center">
            <div className={`mx-auto mb-4 p-4 bg-secondary ${designSystem.borders.radius.md}`}>
              <Target className="h-12 w-12 text-white" />
            </div>
            <CardTitle className="text-2xl">Cross-Platform Tracking</CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <p className={designSystem.typography.color.tertiary}>
              Unified performance tracking and analytics across all social media platforms.
            </p>
            <div className="grid grid-cols-3 gap-4 mt-6">
              <div className={cn(`p-4 ${designSystem.borders.radius.sm}`, designSystem.background.surface.subtle)}>
                <p className="text-2xl font-bold text-secondary-hover">Q3</p>
                <p className={cn("text-sm", designSystem.typography.color.tertiary)}>2025 Launch</p>
              </div>
              <div className={cn(`p-4 ${designSystem.borders.radius.sm}`, designSystem.background.surface.subtle)}>
                <p className="text-2xl font-bold text-secondary-hover">Multi</p>
                <p className={cn("text-sm", designSystem.typography.color.tertiary)}>Platform</p>
              </div>
              <div className={cn(`p-4 ${designSystem.borders.radius.sm}`, designSystem.background.surface.subtle)}>
                <p className="text-2xl font-bold text-secondary-hover">Real-time</p>
                <p className={cn("text-sm", designSystem.typography.color.tertiary)}>Analytics</p>
              </div>
            </div>
            <div className="pt-6">
              <Link href="/dashboards">
                <Button variant="outline">
                  Back to Dashboards
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
