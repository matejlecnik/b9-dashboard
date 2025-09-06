'use client'

import React from 'react'
import { DashboardLayout } from '@/components/DashboardLayout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { 
  Settings, 
  Database, 
  Shield, 
  Bell,
  Palette,
  Zap,
  Clock,
  Cog,
  Key,
  Globe,
  Monitor
} from 'lucide-react'

export default function SettingsPage() {
  return (
    <DashboardLayout
      title="Settings"
      subtitle="Configure your dashboard preferences, integrations, and system settings"
      showSearch={false}
    >
      <div className="space-y-6">
        {/* Coming Soon Banner */}
        <Card className="border-2 border-b9-pink/20 bg-gradient-to-r from-b9-pink/5 to-pink-50">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-b9-pink/10 rounded-lg">
                  <Settings className="h-6 w-6 text-b9-pink" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-black">Advanced Settings Panel</h3>
                  <p className="text-gray-600">Comprehensive configuration and customization options</p>
                </div>
              </div>
              <Badge variant="outline" className="bg-b9-pink text-white border-b9-pink">
                Coming Soon
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Settings Categories */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          
          {/* General Settings */}
          <Card className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-center space-x-2">
                <Cog className="h-5 w-5 text-gray-600" />
                <CardTitle className="text-base">General Settings</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <CardDescription className="text-sm leading-relaxed mb-4">
                Basic dashboard preferences, language settings, and default view configurations.
              </CardDescription>
              <ul className="text-sm text-gray-600 space-y-2">
                <li className="flex items-center space-x-2">
                  <div className="w-1.5 h-1.5 bg-b9-pink rounded-full"></div>
                  <span>Language & localization</span>
                </li>
                <li className="flex items-center space-x-2">
                  <div className="w-1.5 h-1.5 bg-b9-pink rounded-full"></div>
                  <span>Default dashboard view</span>
                </li>
                <li className="flex items-center space-x-2">
                  <div className="w-1.5 h-1.5 bg-b9-pink rounded-full"></div>
                  <span>Time zone settings</span>
                </li>
              </ul>
            </CardContent>
          </Card>

          {/* Appearance */}
          <Card className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-center space-x-2">
                <Palette className="h-5 w-5 text-purple-600" />
                <CardTitle className="text-base">Appearance</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <CardDescription className="text-sm leading-relaxed mb-4">
                Customize the look and feel of your dashboard with themes, layouts, and color schemes.
              </CardDescription>
              <ul className="text-sm text-gray-600 space-y-2">
                <li className="flex items-center space-x-2">
                  <div className="w-1.5 h-1.5 bg-b9-pink rounded-full"></div>
                  <span>B9 Agency theme options</span>
                </li>
                <li className="flex items-center space-x-2">
                  <div className="w-1.5 h-1.5 bg-b9-pink rounded-full"></div>
                  <span>Layout preferences</span>
                </li>
                <li className="flex items-center space-x-2">
                  <div className="w-1.5 h-1.5 bg-b9-pink rounded-full"></div>
                  <span>Custom color schemes</span>
                </li>
              </ul>
            </CardContent>
          </Card>

          {/* Notifications */}
          <Card className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-center space-x-2">
                <Bell className="h-5 w-5 text-blue-600" />
                <CardTitle className="text-base">Notifications</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <CardDescription className="text-sm leading-relaxed mb-4">
                Configure email notifications, alerts, and real-time update preferences.
              </CardDescription>
              <ul className="text-sm text-gray-600 space-y-2">
                <li className="flex items-center space-x-2">
                  <div className="w-1.5 h-1.5 bg-b9-pink rounded-full"></div>
                  <span>Email notification settings</span>
                </li>
                <li className="flex items-center space-x-2">
                  <div className="w-1.5 h-1.5 bg-b9-pink rounded-full"></div>
                  <span>Real-time alerts</span>
                </li>
                <li className="flex items-center space-x-2">
                  <div className="w-1.5 h-1.5 bg-b9-pink rounded-full"></div>
                  <span>System notifications</span>
                </li>
              </ul>
            </CardContent>
          </Card>

          {/* Data & Storage */}
          <Card className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-center space-x-2">
                <Database className="h-5 w-5 text-green-600" />
                <CardTitle className="text-base">Data & Storage</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <CardDescription className="text-sm leading-relaxed mb-4">
                Manage data retention, backup settings, and storage preferences for subreddit data.
              </CardDescription>
              <ul className="text-sm text-gray-600 space-y-2">
                <li className="flex items-center space-x-2">
                  <div className="w-1.5 h-1.5 bg-b9-pink rounded-full"></div>
                  <span>Data retention policies</span>
                </li>
                <li className="flex items-center space-x-2">
                  <div className="w-1.5 h-1.5 bg-b9-pink rounded-full"></div>
                  <span>Automatic backups</span>
                </li>
                <li className="flex items-center space-x-2">
                  <div className="w-1.5 h-1.5 bg-b9-pink rounded-full"></div>
                  <span>Storage optimization</span>
                </li>
              </ul>
            </CardContent>
          </Card>

          {/* Security */}
          <Card className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-center space-x-2">
                <Shield className="h-5 w-5 text-red-600" />
                <CardTitle className="text-base">Security</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <CardDescription className="text-sm leading-relaxed mb-4">
                Security settings, access controls, and audit trail configurations.
              </CardDescription>
              <ul className="text-sm text-gray-600 space-y-2">
                <li className="flex items-center space-x-2">
                  <div className="w-1.5 h-1.5 bg-b9-pink rounded-full"></div>
                  <span>Security policies</span>
                </li>
                <li className="flex items-center space-x-2">
                  <div className="w-1.5 h-1.5 bg-b9-pink rounded-full"></div>
                  <span>Access control settings</span>
                </li>
                <li className="flex items-center space-x-2">
                  <div className="w-1.5 h-1.5 bg-b9-pink rounded-full"></div>
                  <span>Audit trail configuration</span>
                </li>
              </ul>
            </CardContent>
          </Card>

          {/* Performance */}
          <Card className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-center space-x-2">
                <Zap className="h-5 w-5 text-yellow-600" />
                <CardTitle className="text-base">Performance</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <CardDescription className="text-sm leading-relaxed mb-4">
                Optimize dashboard performance, caching settings, and resource usage.
              </CardDescription>
              <ul className="text-sm text-gray-600 space-y-2">
                <li className="flex items-center space-x-2">
                  <div className="w-1.5 h-1.5 bg-b9-pink rounded-full"></div>
                  <span>Caching preferences</span>
                </li>
                <li className="flex items-center space-x-2">
                  <div className="w-1.5 h-1.5 bg-b9-pink rounded-full"></div>
                  <span>Resource optimization</span>
                </li>
                <li className="flex items-center space-x-2">
                  <div className="w-1.5 h-1.5 bg-b9-pink rounded-full"></div>
                  <span>Performance monitoring</span>
                </li>
              </ul>
            </CardContent>
          </Card>

          {/* Automation */}
          <Card className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-center space-x-2">
                <Clock className="h-5 w-5 text-indigo-600" />
                <CardTitle className="text-base">Automation</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <CardDescription className="text-sm leading-relaxed mb-4">
                Configure automated tasks, scheduled reports, and workflow automation.
              </CardDescription>
              <ul className="text-sm text-gray-600 space-y-2">
                <li className="flex items-center space-x-2">
                  <div className="w-1.5 h-1.5 bg-b9-pink rounded-full"></div>
                  <span>Scheduled categorization</span>
                </li>
                <li className="flex items-center space-x-2">
                  <div className="w-1.5 h-1.5 bg-b9-pink rounded-full"></div>
                  <span>Automated reports</span>
                </li>
                <li className="flex items-center space-x-2">
                  <div className="w-1.5 h-1.5 bg-b9-pink rounded-full"></div>
                  <span>Workflow triggers</span>
                </li>
              </ul>
            </CardContent>
          </Card>

          {/* Integrations */}
          <Card className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-center space-x-2">
                <Globe className="h-5 w-5 text-teal-600" />
                <CardTitle className="text-base">Integrations</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <CardDescription className="text-sm leading-relaxed mb-4">
                Connect with external services, APIs, and third-party tools for enhanced functionality.
              </CardDescription>
              <ul className="text-sm text-gray-600 space-y-2">
                <li className="flex items-center space-x-2">
                  <div className="w-1.5 h-1.5 bg-b9-pink rounded-full"></div>
                  <span>Reddit API settings</span>
                </li>
                <li className="flex items-center space-x-2">
                  <div className="w-1.5 h-1.5 bg-b9-pink rounded-full"></div>
                  <span>Webhook configurations</span>
                </li>
                <li className="flex items-center space-x-2">
                  <div className="w-1.5 h-1.5 bg-b9-pink rounded-full"></div>
                  <span>Third-party connections</span>
                </li>
              </ul>
            </CardContent>
          </Card>

          {/* API Settings */}
          <Card className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-center space-x-2">
                <Key className="h-5 w-5 text-orange-600" />
                <CardTitle className="text-base">API Settings</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <CardDescription className="text-sm leading-relaxed mb-4">
                Manage API keys, rate limits, and external service configurations.
              </CardDescription>
              <ul className="text-sm text-gray-600 space-y-2">
                <li className="flex items-center space-x-2">
                  <div className="w-1.5 h-1.5 bg-b9-pink rounded-full"></div>
                  <span>API key management</span>
                </li>
                <li className="flex items-center space-x-2">
                  <div className="w-1.5 h-1.5 bg-b9-pink rounded-full"></div>
                  <span>Rate limiting settings</span>
                </li>
                <li className="flex items-center space-x-2">
                  <div className="w-1.5 h-1.5 bg-b9-pink rounded-full"></div>
                  <span>Service configurations</span>
                </li>
              </ul>
            </CardContent>
          </Card>

        </div>

        {/* Current Configuration Preview */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Monitor className="h-5 w-5" />
              <span>Current Configuration</span>
            </CardTitle>
            <CardDescription>
              Preview of current system settings and configurations
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              
              <div className="p-4 border border-gray-200 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-900">Dashboard Theme</span>
                  <Badge variant="outline">B9 Agency</Badge>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-4 h-4 rounded-full bg-b9-pink"></div>
                  <div className="w-4 h-4 rounded-full bg-black"></div>
                  <div className="w-4 h-4 rounded-full bg-white border border-gray-300"></div>
                  <div className="w-4 h-4 rounded-full bg-gray-400"></div>
                </div>
              </div>

              <div className="p-4 border border-gray-200 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-900">Auto Refresh</span>
                  <Badge className="bg-green-100 text-green-800">Enabled</Badge>
                </div>
                <div className="text-sm text-gray-600">
                  Updates every 60 seconds
                </div>
              </div>

              <div className="p-4 border border-gray-200 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-900">Time Zone</span>
                  <Badge variant="outline">UTC</Badge>
                </div>
                <div className="text-sm text-gray-600">
                  Coordinated Universal Time
                </div>
              </div>

              <div className="p-4 border border-gray-200 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-900">Notifications</span>
                  <Badge className="bg-blue-100 text-blue-800">Active</Badge>
                </div>
                <div className="text-sm text-gray-600">
                  Email + In-app alerts
                </div>
              </div>

              <div className="p-4 border border-gray-200 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-900">Data Retention</span>
                  <Badge variant="outline">90 days</Badge>
                </div>
                <div className="text-sm text-gray-600">
                  Automatic cleanup enabled
                </div>
              </div>

              <div className="p-4 border border-gray-200 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-900">API Status</span>
                  <Badge className="bg-green-100 text-green-800">Connected</Badge>
                </div>
                <div className="text-sm text-gray-600">
                  Reddit API operational
                </div>
              </div>

            </div>
          </CardContent>
        </Card>

        {/* Call to Action */}
        <Card>
          <CardContent className="pt-6">
            <div className="text-center space-y-4">
              <h3 className="text-xl font-semibold text-black">Ready to customize your dashboard?</h3>
              <p className="text-gray-600 max-w-2xl mx-auto">
                The Settings panel will provide comprehensive configuration options to tailor 
                the dashboard to your specific needs and workflow preferences.
              </p>
              <Button disabled className="bg-gray-300 text-gray-500 cursor-not-allowed">
                <Settings className="h-4 w-4 mr-2" />
                Open Settings
                <Badge variant="secondary" className="ml-2 bg-gray-400 text-white text-xs">
                  Coming Soon
                </Badge>
              </Button>
            </div>
          </CardContent>
        </Card>

      </div>
    </DashboardLayout>
  )
}
