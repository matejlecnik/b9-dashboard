'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { useJob, useJobQueue, type Job, type JobStatus, type JobPriority } from '@/lib/job-queue'
/**
 * Job Queue Dashboard
 * Real-time monitoring and management of background jobs
 */

import {
  Briefcase,
  X,
  CheckCircle,
  XCircle,
  Clock,
  RefreshCw,
  Trash2,
  Zap,
} from 'lucide-react'

interface JobCardProps {
  jobId: string
}

function JobCard({ jobId }: JobCardProps) {
  const { job, cancel } = useJob(jobId)
  
  if (!job) return null

  const statusIcon = {
    pending: <Clock className="h-4 w-4 text-yellow-500" />,
    running: <RefreshCw className="h-4 w-4 text-blue-500 animate-spin" />,
    completed: <CheckCircle className="h-4 w-4 text-green-500" />,
    failed: <XCircle className="h-4 w-4 text-red-500" />,
    cancelled: <X className="h-4 w-4 text-gray-500" />
  }[job.status as JobStatus]

  const statusColor = {
    pending: 'bg-yellow-100 text-yellow-800',
    running: 'bg-blue-100 text-blue-800',
    completed: 'bg-green-100 text-green-800',
    failed: 'bg-red-100 text-red-800',
    cancelled: 'bg-gray-100 text-gray-800'
  }[job.status as JobStatus]

  const priorityColor = {
    low: 'bg-gray-100 text-gray-600',
    normal: 'bg-blue-100 text-blue-600',
    high: 'bg-orange-100 text-orange-600',
    critical: 'bg-red-100 text-red-600'
  }[job.priority as JobPriority]

  return (
    <div className="border rounded-lg p-4 space-y-3 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2">
          {statusIcon}
          <div>
            <h4 className="font-medium text-sm">{job.type}</h4>
            <p className="text-xs text-gray-500">ID: {job.id.substring(0, 12)}...</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge className={cn("text-xs", priorityColor)}>
            {job.priority}
          </Badge>
          {(job.status === 'pending' || job.status === 'running') && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0"
              onClick={cancel}
              title="Cancel Job"
            >
              <X className="h-3 w-3" />
            </Button>
          )}
        </div>
      </div>

      {job.status === 'running' && (
        <div className="space-y-2">
          <Progress value={job.progress} className="h-2" />
          <p className="text-xs text-gray-600">
            {job.message || `Processing... ${job.progress}%`}
          </p>
        </div>
      )}

      <div className="flex items-center justify-between text-xs text-gray-500">
        <span>Created: {new Date(job.createdAt).toLocaleTimeString()}</span>
        <Badge className={cn("text-xs", statusColor)}>
          {job.status}
        </Badge>
      </div>

      {job.status === 'failed' && job.attempts < job.maxAttempts && (
        <div className="flex items-center gap-2 text-xs text-orange-600">
          <RefreshCw className="h-3 w-3" />
          <span>Retry {job.attempts}/{job.maxAttempts}</span>
          {job.nextRetryAt && (
            <span className="text-gray-500">
              at {new Date(job.nextRetryAt).toLocaleTimeString()}
            </span>
          )}
        </div>
      )}

      {job.error && (
        <div className="bg-red-50 p-2 rounded text-xs text-red-600">
          {job.error.message || 'Unknown error'}
        </div>
      )}
    </div>
  )
}

export function JobQueueDashboard() {
  const { jobs, metrics, clearCompleted, addJob } = useJobQueue()
  const [filter, setFilter] = useState<string>('all')
  const [showDemo, setShowDemo] = useState(false)

  const filteredJobs = jobs.filter((job: Job) => {
    if (filter === 'all') return true
    return job.status === filter
  })

  const handleAddDemoJob = (type: string) => {
    const demoData = {
      'data-export': { count: 1000 },
      'bulk-update': { items: Array(50).fill({}) },
      'report-generation': { type: 'monthly' }
    }[type] || {}

    addJob(type, demoData, {
      priority: 'normal',
      maxAttempts: 3
    })
  }

  return (
    <div className="space-y-4 p-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Briefcase className="h-5 w-5" />
          <h2 className="text-lg font-semibold">Job Queue</h2>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowDemo(!showDemo)}
          >
            Demo Jobs
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={clearCompleted}
            disabled={metrics.completedJobs === 0}
          >
            <Trash2 className="h-3 w-3 mr-1" />
            Clear Completed
          </Button>
        </div>
      </div>

      {/* Demo Jobs Panel */}
      {showDemo && (
        <Card className="bg-blue-50">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Demo Jobs</CardTitle>
          </CardHeader>
          <CardContent className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleAddDemoJob('data-export')}
            >
              Data Export
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleAddDemoJob('bulk-update')}
            >
              Bulk Update
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleAddDemoJob('report-generation')}
            >
              Generate Report
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Metrics */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500">Active</p>
                <p className="text-2xl font-bold">{metrics.activeJobs}</p>
              </div>
              <RefreshCw className="h-8 w-8 text-blue-500 animate-spin" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500">Queued</p>
                <p className="text-2xl font-bold">{metrics.queueLength}</p>
              </div>
              <Clock className="h-8 w-8 text-yellow-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500">Success Rate</p>
                <p className="text-2xl font-bold">{metrics.successRate}%</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500">Avg Time</p>
                <p className="text-2xl font-bold">
                  {Math.round(metrics.averageProcessingTime / 1000)}s
                </p>
              </div>
              <Zap className="h-8 w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 border-b">
        {['all', 'pending', 'running', 'completed', 'failed', 'cancelled'].map(status => (
          <button
            key={status}
            onClick={() => setFilter(status)}
            className={cn(
              "px-3 py-2 text-sm font-medium transition-colors",
              "border-b-2 -mb-[2px]",
              filter === status
                ? "border-blue-500 text-blue-600"
                : "border-transparent text-gray-600 hover:text-gray-900"
            )}
          >
            {status.charAt(0).toUpperCase() + status.slice(1)}
            {status !== 'all' && (
              <span className="ml-2 text-xs text-gray-400">
                ({jobs.filter((j: Job) => j.status === status).length})
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Jobs List */}
      <div className="space-y-3 max-h-[600px] overflow-y-auto">
        {filteredJobs.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <Briefcase className="h-12 w-12 mx-auto mb-3 text-gray-300" />
            <p>No jobs in queue</p>
            {showDemo && (
              <p className="text-sm mt-2">Add demo jobs to test the system</p>
            )}
          </div>
        ) : (
          filteredJobs
            .sort((a: Job, b: Job) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
            .map((job: Job) => <JobCard key={job.id} jobId={job.id} />)
        )}
      </div>

      {/* Summary Stats */}
      <Card className="bg-gray-50">
        <CardContent className="pt-4">
          <div className="grid grid-cols-5 gap-4 text-center text-xs">
            <div>
              <p className="text-gray-500">Total</p>
              <p className="font-semibold">{metrics.totalJobs}</p>
            </div>
            <div>
              <p className="text-gray-500">Completed</p>
              <p className="font-semibold text-green-600">{metrics.completedJobs}</p>
            </div>
            <div>
              <p className="text-gray-500">Failed</p>
              <p className="font-semibold text-red-600">{metrics.failedJobs}</p>
            </div>
            <div>
              <p className="text-gray-500">Cancelled</p>
              <p className="font-semibold text-gray-600">{metrics.cancelledJobs}</p>
            </div>
            <div>
              <p className="text-gray-500">Active</p>
              <p className="font-semibold text-blue-600">{metrics.activeJobs}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

/**
 * Compact job queue indicator for toolbar
 */
export function JobQueueIndicator() {
  const { metrics } = useJobQueue()
  
  if (metrics.activeJobs === 0 && metrics.queueLength === 0) {
    return null
  }

  return (
    <div className="flex items-center gap-2 px-3 py-1 bg-blue-50 rounded-full">
      <Briefcase className="h-3 w-3 text-blue-600" />
      {metrics.activeJobs > 0 && (
        <>
          <RefreshCw className="h-3 w-3 text-blue-600 animate-spin" />
          <span className="text-xs font-medium text-blue-600">
            {metrics.activeJobs}
          </span>
        </>
      )}
      {metrics.queueLength > 0 && (
        <>
          <span className="text-gray-400">•</span>
          <span className="text-xs text-gray-600">
            {metrics.queueLength} queued
          </span>
        </>
      )}
    </div>
  )
}