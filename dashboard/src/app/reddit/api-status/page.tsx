'use client'

import React from 'react'
import { DashboardLayout } from '@/components/DashboardLayout'
import { ApiMonitor } from '@/components/ApiMonitor'
import { Card, CardContent } from '@/components/ui/card'
import {
  Activity,
  Zap,
  Brain,
  Users
} from 'lucide-react'

export default function ApiStatusPage() {
  const stats = [
    {
      label: 'API Calls Today',
      value: '1.2K',
      icon: Activity
    },
    {
      label: 'Active Endpoints',
      value: '11',
      icon: Zap
    },
    {
      label: 'Categorizations',
      value: '45',
      icon: Brain
    },
    {
      label: 'Users Added',
      value: '12',
      icon: Users
    }
  ]

  return (
    <DashboardLayout
      title="API Status"
      subtitle="Monitor and track API endpoint usage"
      showSearch={false}
    >
      <div className="space-y-6">
        {/* Quick Stats */}
        <div className="grid grid-cols-4 gap-4">
          {stats.map((stat, idx) => {
            const Icon = stat.icon
            return (
              <Card key={idx} className="border-gray-100">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Icon className="h-4 w-4 text-gray-400" />
                    <span className="text-xs text-gray-500">{stat.label}</span>
                  </div>
                  <div className="text-xl font-semibold text-gray-900">
                    {stat.value}
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>

        {/* Reddit Dashboard Endpoints */}
        <div>
          <h2 className="text-sm font-medium text-gray-700 mb-3">
            Reddit Dashboard API
          </h2>
          <ApiMonitor
            type="reddit"
            showLogs={true}
            autoRefresh={true}
            compact={false}
          />
        </div>

        {/* Scraper Control Endpoints */}
        <div>
          <h2 className="text-sm font-medium text-gray-700 mb-3">
            Scraper Control API
          </h2>
          <ApiMonitor
            type="scraper"
            showLogs={true}
            autoRefresh={true}
            compact={false}
          />
        </div>
      </div>
    </DashboardLayout>
  )
}