"use client"

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts'
import { 
  Shield,
  TrendingDown,
  CheckCircle,
  XCircle,
  AlertTriangle,
  BarChart3,
  RefreshCw,
  Plus
} from 'lucide-react'

interface FilterStats {
  total_subreddits: number
  by_status: {
    [key: string]: number
  }
  whitelist_count: number
  seller_bans_detected: number
  verification_required: number
  filter_efficiency: {
    total_processed: number
    filtered_out: number
    passed_for_review: number
    whitelisted: number
    filtered_percentage?: string
    passed_percentage?: string
    whitelist_percentage?: string
  }
}

interface FilterSetting {
  id: number
  category: string
  keywords: string[]
  is_active: boolean
  weight: number
  created_at: string
  updated_at: string
}

const COLORS = {
  filtered: '#ef4444',
  passed: '#22c55e', 
  whitelist: '#3b82f6',
  unprocessed: '#6b7280'
}

export default function FiltersPage() {
  const [stats, setStats] = useState<FilterStats | null>(null)
  const [filterSettings, setFilterSettings] = useState<FilterSetting[]>([])
  const [loading, setLoading] = useState(true)
  const [refiltering, setRefiltering] = useState(false)

  useEffect(() => {
    fetchFilterStats()
    fetchFilterSettings()
  }, [])

  const fetchFilterStats = async () => {
    try {
      const response = await fetch('/api/filters/stats')
      if (response.ok) {
        const data = await response.json()
        setStats(data.stats)
      }
    } catch (error) {
      console.error('Error fetching filter stats:', error)
    }
  }

  const fetchFilterSettings = async () => {
    try {
      const response = await fetch('/api/filters')
      if (response.ok) {
        const data = await response.json()
        setFilterSettings(data.filterSettings || [])
      }
    } catch (error) {
      console.error('Error fetching filter settings:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleRefilterAll = async () => {
    setRefiltering(true)
    try {
      const response = await fetch('/api/filters/refilter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ limit: 500 })
      })
      
      if (response.ok) {
        const result = await response.json()
        alert(`Re-filtering complete: ${result.stats.processed} processed, ${result.stats.filtered} filtered`)
        await fetchFilterStats() // Refresh stats
      } else {
        alert('Error during re-filtering')
      }
    } catch (error) {
      console.error('Error re-filtering:', error)
      alert('Error during re-filtering')
    } finally {
      setRefiltering(false)
    }
  }

  const toggleFilterSetting = async (id: number, is_active: boolean) => {
    try {
      const response = await fetch('/api/filters', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, is_active: !is_active })
      })
      
      if (response.ok) {
        await fetchFilterSettings() // Refresh settings
      }
    } catch (error) {
      console.error('Error toggling filter setting:', error)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  const chartData = stats ? [
    { name: 'Filtered', value: stats.by_status.filtered || 0, color: COLORS.filtered },
    { name: 'Passed', value: stats.by_status.passed || 0, color: COLORS.passed },
    { name: 'Whitelist', value: stats.by_status.whitelist || 0, color: COLORS.whitelist },
    { name: 'Unprocessed', value: stats.by_status.unprocessed || 0, color: COLORS.unprocessed }
  ] : []

  const efficiencyData = stats ? [
    { name: 'Filtered Out', value: stats.filter_efficiency.filtered_percentage || '0', count: stats.filter_efficiency.filtered_out },
    { name: 'Passed', value: stats.filter_efficiency.passed_percentage || '0', count: stats.filter_efficiency.passed_for_review },
    { name: 'Whitelisted', value: stats.filter_efficiency.whitelist_percentage || '0', count: stats.filter_efficiency.whitelisted }
  ] : []

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Smart Filter Management</h1>
          <p className="text-muted-foreground">Manage intelligent subreddit filtering and review automation</p>
        </div>
        <Button 
          onClick={handleRefilterAll} 
          disabled={refiltering}
          className="flex items-center gap-2"
        >
          <RefreshCw className={`h-4 w-4 ${refiltering ? 'animate-spin' : ''}`} />
          {refiltering ? 'Re-filtering...' : 'Re-filter All'}
        </Button>
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="settings">Filter Settings</TabsTrigger>
          <TabsTrigger value="whitelist">Whitelist</TabsTrigger>
          <TabsTrigger value="learning">Learning Patterns</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Subreddits</CardTitle>
                <BarChart3 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats?.total_subreddits.toLocaleString() || 0}</div>
                <p className="text-xs text-muted-foreground">In database</p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Filtered Out</CardTitle>
                <XCircle className="h-4 w-4 text-red-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats?.filter_efficiency.filtered_out.toLocaleString() || 0}</div>
                <p className="text-xs text-muted-foreground">
                  {stats?.filter_efficiency.filtered_percentage || 0}% reduction in manual review
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Needs Review</CardTitle>
                <AlertTriangle className="h-4 w-4 text-yellow-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats?.filter_efficiency.passed_for_review.toLocaleString() || 0}</div>
                <p className="text-xs text-muted-foreground">Require manual review</p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Whitelisted</CardTitle>
                <Shield className="h-4 w-4 text-blue-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats?.whitelist_count.toLocaleString() || 0}</div>
                <p className="text-xs text-muted-foreground">Always approved</p>
              </CardContent>
            </Card>
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Filter Status Distribution</CardTitle>
                <CardDescription>How subreddits are categorized by the filter</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={chartData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {chartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex flex-wrap gap-2 mt-4">
                  {chartData.map((entry) => (
                    <div key={entry.name} className="flex items-center gap-1">
                      <div 
                        className="w-3 h-3 rounded-full" 
                        style={{ backgroundColor: entry.color }}
                      />
                      <span className="text-sm">{entry.name}: {entry.value}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Filter Efficiency</CardTitle>
                <CardDescription>Percentage breakdown of filtering results</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={efficiencyData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip formatter={(value, name) => [`${value}%`, name]} />
                    <Bar dataKey="value" fill="#3b82f6" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Special Detections */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <XCircle className="h-5 w-5 text-red-500" />
                  Seller Bans Detected
                </CardTitle>
                <CardDescription>Subreddits with &quot;no sellers&quot; or &quot;no OnlyFans&quot; rules</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{stats?.seller_bans_detected || 0}</div>
                <p className="text-sm text-muted-foreground">Automatically marked as &quot;No Seller&quot;</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-blue-500" />
                  Verification Required
                </CardTitle>
                <CardDescription>Subreddits requiring verification (noted but not filtered)</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{stats?.verification_required || 0}</div>
                <p className="text-sm text-muted-foreground">Flagged for attention</p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="settings" className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-semibold">Filter Keywords & Settings</h2>
            <Button className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Add Category
            </Button>
          </div>
          
          <div className="grid gap-4">
            {filterSettings.map((setting) => (
              <Card key={setting.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="capitalize">{setting.category.replace('_', ' ')}</CardTitle>
                      <CardDescription>
                        Weight: {setting.weight} | {setting.keywords.length} keywords
                      </CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={setting.is_active ? "default" : "secondary"}>
                        {setting.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => toggleFilterSetting(setting.id, setting.is_active)}
                      >
                        {setting.is_active ? 'Disable' : 'Enable'}
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-1">
                    {setting.keywords.map((keyword, index) => (
                      <Badge key={index} variant="outline" className="text-xs">
                        {keyword}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="whitelist">
          <div className="text-center py-12">
            <Shield className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Whitelist Management</h3>
            <p className="text-muted-foreground mb-4">
              Whitelist management interface will be implemented here
            </p>
            <Button variant="outline">Coming Soon</Button>
          </div>
        </TabsContent>

        <TabsContent value="learning">
          <div className="text-center py-12">
            <TrendingDown className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Learning Patterns</h3>
            <p className="text-muted-foreground mb-4">
              Filter accuracy analysis and learning patterns will be shown here
            </p>
            <Button variant="outline">Coming Soon</Button>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}