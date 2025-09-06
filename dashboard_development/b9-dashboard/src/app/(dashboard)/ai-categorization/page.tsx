'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { DashboardLayout } from '@/components/DashboardLayout'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { useToast } from '@/components/ui/toast'
import { useErrorHandler } from '@/lib/errorUtils'
import { 
  Play, 
  Download, 
  TrendingUp, 
  Brain, 
  Target, 
  DollarSign,
  Clock,
  CheckCircle,
  XCircle
} from 'lucide-react'

interface AIMetrics {
  totalSuggestions: number
  totalWithFeedback: number
  accuracyRate: number
  avgConfidence: number
  totalCost: number
  totalTokens: number
  highConfidenceAccuracy: number
  lowConfidenceAccuracy: number
  categoryBreakdown: Array<{
    category: string
    total: number
    accurate: number
    accuracy: number
  }>
  confidenceDistribution: Array<{
    range: string
    count: number
    withFeedback: number
    accuracy: number
  }>
  dailyMetrics: Array<{
    date: string
    suggestions: number
    withFeedback: number
    accuracy: number
    avgConfidence: number
    cost: number
  }>
  sessions: Array<{
    id: number
    session_name: string
    status: string
    total_subreddits: number
    processed_subreddits: number
    total_cost_usd: number
    avg_confidence: number
    created_at: string
    completed_at?: string
  }>
  feedbackStats: {
    accepted: number
    rejected: number
    modified: number
  }
}

interface BulkSession {
  id: number
  name: string
  status: string
  totalSubreddits: number
  processedSubreddits: number
  totalCost: number
  avgConfidence: number
  createdAt: string
  completedAt?: string
  errorMessage?: string
}

export default function AICategorization() {
  const { addToast } = useToast()
  const { handleAsyncOperation } = useErrorHandler()
  const [metrics, setMetrics] = useState<AIMetrics | null>(null)
  const [currentSession, setCurrentSession] = useState<BulkSession | null>(null)
  const [isStartingBulk, setIsStartingBulk] = useState(false)
  const [bulkLimit, setBulkLimit] = useState(50)
  const [loading, setLoading] = useState(true)
  const pollIntervalRef = useRef<NodeJS.Timeout>()

  const fetchMetrics = useCallback(async () => {
    try {
      const response = await fetch('/api/ai/accuracy-metrics')
      const data = await response.json()
      
      if (data.success) {
        setMetrics(data.metrics)
      } else {
        throw new Error(data.error || 'Failed to fetch metrics')
      }
    } catch (error) {
      console.error('Error fetching metrics:', error)
      addToast({
        type: 'error',
        title: 'Failed to Load Metrics',
        description: 'Could not load AI categorization metrics',
        duration: 5000
      })
    }
  }, [addToast])

  const checkSessionStatus = useCallback(async (sessionId: number) => {
    try {
      const response = await fetch(`/api/ai/bulk-categorize?sessionId=${sessionId}`)
      const data = await response.json()
      
      if (data.success) {
        setCurrentSession(data.session)
        
        if (data.session.status === 'completed' || data.session.status === 'failed') {
          if (pollIntervalRef.current) {
            clearInterval(pollIntervalRef.current)
            pollIntervalRef.current = undefined
          }
          await fetchMetrics() // Refresh metrics after completion
          
          addToast({
            type: data.session.status === 'completed' ? 'success' : 'error',
            title: `Bulk Categorization ${data.session.status === 'completed' ? 'Completed' : 'Failed'}`,
            description: data.session.status === 'completed' 
              ? `Successfully processed ${data.session.processedSubreddits} subreddits`
              : data.session.errorMessage || 'Session failed',
            duration: 8000
          })
        }
      }
    } catch (error) {
      console.error('Error checking session status:', error)
    }
  }, [fetchMetrics, addToast])

  const startBulkCategorization = async () => {
    setIsStartingBulk(true)
    
    await handleAsyncOperation(async () => {
      const response = await fetch('/api/ai/bulk-categorize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          limit: bulkLimit,
          sessionName: `Bulk Session ${new Date().toLocaleString()}`,
          onlyUncategorized: true
        })
      })
      
      const data = await response.json()
      if (!data.success) throw new Error(data.error)
      
      // Start polling for status updates
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current)
      pollIntervalRef.current = setInterval(() => {
        checkSessionStatus(data.sessionId)
      }, 3000)
      
      return data
    }, {
      context: 'bulk_categorization',
      onSuccess: (data) => {
        addToast({
          type: 'success',
          title: 'Bulk Categorization Started',
          description: `Processing ${data.totalSubreddits} subreddits. Estimated cost: $${data.estimatedCost}`,
          duration: 8000
        })
      },
      onError: () => {
        setCurrentSession(null)
      }
    })
    
    setIsStartingBulk(false)
  }

  const exportResults = async () => {
    if (!metrics) return
    
    await handleAsyncOperation(async () => {
      const csvContent = [
        ['Category', 'Total Suggestions', 'Accurate', 'Accuracy Rate'].join(','),
        ...metrics.categoryBreakdown.map(cat => 
          [cat.category, cat.total, cat.accurate, `${cat.accuracy.toFixed(1)}%`].join(',')
        )
      ].join('\n')
      
      const blob = new Blob([csvContent], { type: 'text/csv' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `ai-categorization-results-${new Date().toISOString().split('T')[0]}.csv`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    }, {
      context: 'export_results',
      showToast: true,
      successMessage: 'Results exported successfully'
    })
  }

  useEffect(() => {
    const loadInitialData = async () => {
      setLoading(true)
      await fetchMetrics()
      setLoading(false)
    }
    
    loadInitialData()
    
    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current)
      }
    }
  }, [fetchMetrics])

  if (loading) {
    return (
      <DashboardLayout title="AI Categorization" showSearch={false}>
        <div className="animate-pulse space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[1,2,3,4].map(i => (
              <div key={i} className="h-32 bg-gray-200 rounded-lg"></div>
            ))}
          </div>
          <div className="h-64 bg-gray-200 rounded-lg"></div>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout title="AI Categorization" showSearch={false}>
      {/* Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Suggestions</CardTitle>
            <Brain className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics?.totalSuggestions.toLocaleString() || 0}</div>
            <p className="text-xs text-muted-foreground">
              {metrics?.totalWithFeedback || 0} with feedback
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Accuracy Rate</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {metrics?.accuracyRate.toFixed(1) || 0}%
            </div>
            <p className="text-xs text-muted-foreground">
              Avg confidence: {metrics?.avgConfidence.toFixed(1) || 0}%
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Cost</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${metrics?.totalCost.toFixed(4) || '0.0000'}
            </div>
            <p className="text-xs text-muted-foreground">
              {metrics?.totalTokens.toLocaleString() || 0} tokens used
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">High Confidence</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {metrics?.highConfidenceAccuracy.toFixed(1) || 0}%
            </div>
            <p className="text-xs text-muted-foreground">
              &gt;70% confidence accuracy
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Bulk Categorization Control */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Play className="h-5 w-5" />
            Bulk Categorization
          </CardTitle>
          <CardDescription>
            Automatically categorize uncategorized subreddits using AI
          </CardDescription>
        </CardHeader>
        <CardContent>
          {currentSession && currentSession.status === 'running' ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="font-medium">{currentSession.name}</span>
                <Badge variant="secondary" className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  Running
                </Badge>
              </div>
              <Progress 
                value={(currentSession.processedSubreddits / currentSession.totalSubreddits) * 100} 
                className="w-full"
              />
              <div className="flex justify-between text-sm text-gray-600">
                <span>{currentSession.processedSubreddits} / {currentSession.totalSubreddits} processed</span>
                <span>Cost: ${currentSession.totalCost.toFixed(4)}</span>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <div>
                  <label className="text-sm font-medium">Batch Size:</label>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={bulkLimit}
                    onChange={(e) => setBulkLimit(parseInt(e.target.value))}
                    className="ml-2 w-20 px-2 py-1 border rounded text-sm"
                  />
                </div>
                <div className="text-sm text-gray-600">
                  Est. cost: ${(bulkLimit * 0.002).toFixed(4)}
                </div>
              </div>
              <Button 
                onClick={startBulkCategorization} 
                disabled={isStartingBulk}
                className="w-full sm:w-auto"
              >
                {isStartingBulk ? 'Starting...' : `Start Bulk Categorization (${bulkLimit} subreddits)`}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent Sessions */}
      {metrics?.sessions && metrics.sessions.length > 0 && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Recent Sessions</CardTitle>
            <CardDescription>
              History of bulk categorization sessions
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {metrics.sessions.slice(0, 5).map((session) => (
                <div key={session.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{session.session_name}</span>
                      <Badge 
                        variant={
                          session.status === 'completed' ? 'default' : 
                          session.status === 'failed' ? 'destructive' : 'secondary'
                        }
                        className="flex items-center gap-1"
                      >
                        {session.status === 'completed' && <CheckCircle className="h-3 w-3" />}
                        {session.status === 'failed' && <XCircle className="h-3 w-3" />}
                        {session.status === 'running' && <Clock className="h-3 w-3" />}
                        {session.status}
                      </Badge>
                    </div>
                    <div className="text-sm text-gray-600 mt-1">
                      {session.processed_subreddits} / {session.total_subreddits} processed
                      {session.avg_confidence && (
                        <span className="ml-3">Avg confidence: {session.avg_confidence.toFixed(1)}%</span>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-medium">${session.total_cost_usd.toFixed(4)}</div>
                    <div className="text-xs text-gray-500">
                      {new Date(session.created_at).toLocaleDateString()}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Category Performance */}
      {metrics?.categoryBreakdown && metrics.categoryBreakdown.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <Card>
            <CardHeader>
              <CardTitle>Category Performance</CardTitle>
              <CardDescription>
                Accuracy by category type
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {metrics.categoryBreakdown.slice(0, 8).map((cat) => (
                  <div key={cat.category} className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="font-medium">{cat.category}</span>
                      <span className="text-gray-600">{cat.accuracy.toFixed(1)}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-blue-600 h-2 rounded-full" 
                        style={{ width: `${cat.accuracy}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-xs text-gray-500">
                      <span>{cat.accurate} accurate</span>
                      <span>{cat.total} total</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Confidence Distribution</CardTitle>
              <CardDescription>
                Accuracy by confidence level
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {metrics.confidenceDistribution.filter(dist => dist.count > 0).map((dist) => (
                  <div key={dist.range} className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="font-medium">{dist.range}</span>
                      <span className="text-gray-600">
                        {dist.withFeedback > 0 ? `${dist.accuracy.toFixed(1)}%` : 'No feedback'}
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-green-600 h-2 rounded-full" 
                        style={{ width: `${dist.withFeedback > 0 ? dist.accuracy : 0}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-xs text-gray-500">
                      <span>{dist.count} suggestions</span>
                      <span>{dist.withFeedback} with feedback</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Export Results */}
      <div className="flex justify-end">
        <Button 
          onClick={exportResults} 
          variant="outline" 
          className="flex items-center gap-2"
          disabled={!metrics || metrics.totalSuggestions === 0}
        >
          <Download className="h-4 w-4" />
          Export Results
        </Button>
      </div>
    </DashboardLayout>
  )
}