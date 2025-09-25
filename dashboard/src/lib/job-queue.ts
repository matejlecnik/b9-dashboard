import { useCallback, useEffect, useState } from 'react'
import { logger } from '@/lib/logger'
/**

 * Background Job Queue System
 * Manages asynchronous job processing with retry logic and progress tracking
 */


export type JobStatus = 'pending' | 'running' | 'completed' | 'failed' | 'cancelled'
export type JobPriority = 'low' | 'normal' | 'high' | 'critical'

export interface Job<T = unknown, R = unknown> {
  id: string
  type: string
  status: JobStatus
  priority: JobPriority
  data: T
  result?: R
  error?: Error
  progress: number
  message?: string
  createdAt: Date
  startedAt?: Date
  completedAt?: Date
  attempts: number
  maxAttempts: number
  nextRetryAt?: Date
  timeout: number
  metadata?: Record<string, unknown>
}

export interface JobOptions {
  priority?: JobPriority
  maxAttempts?: number
  retryDelay?: number
  timeout?: number
  metadata?: Record<string, unknown>
}

export interface JobProcessor<T = unknown, R = unknown> {
  type: string
  process: (job: Job<T, R>, updateProgress: (progress: number, message?: string) => void) => Promise<R>
  validate?: (data: T) => boolean
  onComplete?: (job: Job<T, R>) => void
  onError?: (job: Job<T, R>, error: Error) => void
}

/**
 * Job Queue Manager
 * Handles job scheduling, processing, and lifecycle management
 */
export class JobQueue {
  private jobs = new Map<string, Job>()
  private processors = new Map<string, JobProcessor<unknown, unknown>>()
  private queue: string[] = []
  private activeJobs = new Set<string>()
  private maxConcurrentJobs: number
  private processingInterval: NodeJS.Timeout | null = null
  private isProcessing = false
  private listeners = new Map<string, Set<(job: Job) => void>>()
  
  // Metrics
  private metrics = {
    totalJobs: 0,
    completedJobs: 0,
    failedJobs: 0,
    cancelledJobs: 0,
    averageProcessingTime: 0,
    queueLength: 0
  }

  constructor(maxConcurrentJobs = 3) {
    this.maxConcurrentJobs = maxConcurrentJobs
  }

  /**
   * Register a job processor
   */
  registerProcessor(processor: JobProcessor<unknown, unknown>) {
    this.processors.set(processor.type, processor)
  }

  /**
   * Add a job to the queue
   */
  async addJob<T = unknown, R = unknown>(
    type: string,
    data: T,
    options: JobOptions = {}
  ): Promise<string> {
    const processor = this.processors.get(type)
    if (!processor) {
      throw new Error(`No processor registered for job type: ${type}`)
    }

    // Validate data if validator provided
    if (processor.validate && !processor.validate(data)) {
      throw new Error(`Invalid data for job type: ${type}`)
    }

    const job: Job<T, R> = {
      id: this.generateJobId(),
      type,
      status: 'pending',
      priority: options.priority || 'normal',
      data,
      progress: 0,
      createdAt: new Date(),
      attempts: 0,
      maxAttempts: options.maxAttempts || 3,
      timeout: options.timeout ?? 30000,
      metadata: options.metadata
    }

    this.jobs.set(job.id, job)
    this.insertIntoQueue(job.id, job.priority)
    this.metrics.totalJobs++
    this.metrics.queueLength = this.queue.length

    // Notify listeners
    this.notifyListeners(job.id, job)

    // Start processing if not already running
    this.startProcessing()

    // Performance mark (best-effort)
    try {
      if (typeof performance !== 'undefined' && 'mark' in performance) {
        performance.mark(`job-${type}-queued`)
      }
    } catch {}

    return job.id
  }

  /**
   * Insert job into queue based on priority
   */
  private insertIntoQueue(jobId: string, priority: JobPriority) {
    const priorityOrder: Record<JobPriority, number> = {
      critical: 4,
      high: 3,
      normal: 2,
      low: 1
    }

    const insertIndex = this.queue.findIndex(id => {
      const job = this.jobs.get(id)
      if (!job) return false
      return priorityOrder[job.priority] < priorityOrder[priority]
    })

    if (insertIndex === -1) {
      this.queue.push(jobId)
    } else {
      this.queue.splice(insertIndex, 0, jobId)
    }
  }

  /**
   * Start processing jobs
   */
  private startProcessing() {
    if (this.isProcessing) return

    this.isProcessing = true
    this.processingInterval = setInterval(() => this.processNextJob(), 100)
  }

  /**
   * Stop processing jobs
   */
  stopProcessing() {
    this.isProcessing = false
    if (this.processingInterval) {
      clearInterval(this.processingInterval)
      this.processingInterval = null
    }
  }

  /**
   * Process next job in queue
   */
  private async processNextJob() {
    // Check if we can process more jobs
    if (this.activeJobs.size >= this.maxConcurrentJobs) {
      return
    }

    // Check for jobs that need retry
    const now = new Date()
    for (const [jobId, job] of this.jobs.entries()) {
      if (job.status === 'failed' && job.nextRetryAt && job.nextRetryAt <= now) {
        job.status = 'pending'
        this.insertIntoQueue(jobId, job.priority)
      }
    }

    // Get next job from queue
    const jobId = this.queue.shift()
    if (!jobId) {
      // No more jobs, stop processing
      if (this.activeJobs.size === 0) {
        this.stopProcessing()
      }
      return
    }

    const job = this.jobs.get(jobId)
    if (!job || job.status !== 'pending') {
      return
    }

    // Process the job
    this.activeJobs.add(jobId)
    this.metrics.queueLength = this.queue.length
    await this.executeJob(job)
    this.activeJobs.delete(jobId)
  }

  /**
   * Execute a single job
   */
  private async executeJob(job: Job) {
    const processor = this.processors.get(job.type)
    if (!processor) {
      job.status = 'failed'
      job.error = new Error(`No processor for job type: ${job.type}`)
      this.notifyListeners(job.id, job)
      return
    }

    const startTime = performance.now()
    job.status = 'running'
    job.startedAt = new Date()
    job.attempts++
    this.notifyListeners(job.id, job)

    // Performance mark (best-effort)
    try {
      if (typeof performance !== 'undefined' && 'mark' in performance) {
        performance.mark(`job-${job.type}-start`)
      }
    } catch {}

    try {
      // Create progress updater
      const updateProgress = (progress: number, message?: string) => {
        job.progress = Math.min(100, Math.max(0, progress))
        job.message = message
        this.notifyListeners(job.id, job)
      }

      // Execute job with timeout
      const timeout = job.timeout
      const result = await this.withTimeout(
        processor.process(job, updateProgress),
        timeout
      )

      // Job completed successfully
      job.status = 'completed'
      job.result = result
      job.progress = 100
      job.completedAt = new Date()
      job.message = 'Completed successfully'
      
      this.metrics.completedJobs++
      const duration = performance.now() - startTime
      this.updateAverageProcessingTime(duration)

      // Performance measure (best-effort)
      try {
        if (typeof performance !== 'undefined' && 'measure' in performance) {
          performance.measure(`job-${job.type}`, {
            start: `job-${job.type}-start`
          } as PerformanceMeasureOptions)
        }
      } catch {}

      // Call completion handler
      if (processor.onComplete) {
        processor.onComplete(job)
      }

      this.notifyListeners(job.id, job)

    } catch (error) {
      // Job failed
      job.status = 'failed'
      job.error = error as Error
      job.message = error instanceof Error ? error.message : 'Unknown error'
      
      // Check if we should retry
      if (job.attempts < job.maxAttempts) {
        const retryDelay = Math.pow(2, job.attempts) * 1000 // Exponential backoff
        job.nextRetryAt = new Date(Date.now() + retryDelay)
        job.message = `Failed, will retry in ${retryDelay / 1000}s (attempt ${job.attempts}/${job.maxAttempts})`
      } else {
        job.completedAt = new Date()
        this.metrics.failedJobs++
      }

      // Call error handler
      if (processor.onError) {
        processor.onError(job, error as Error)
      }

      this.notifyListeners(job.id, job)

      // Log error
      logger.error(`Job ${job.id} failed:`, error)
    }
  }

  /**
   * Execute with timeout
   */
  private withTimeout<T>(promise: Promise<T>, timeout: number): Promise<T> {
    return Promise.race([
      promise,
      new Promise<T>((_, reject) =>
        setTimeout(() => reject(new Error('Job timeout')), timeout)
      )
    ])
  }

  /**
   * Cancel a job
   */
  cancelJob(jobId: string): boolean {
    const job = this.jobs.get(jobId)
    if (!job) return false

    if (job.status === 'pending') {
      // Remove from queue
      const index = this.queue.indexOf(jobId)
      if (index !== -1) {
        this.queue.splice(index, 1)
      }
    }

    if (job.status !== 'completed' && job.status !== 'cancelled') {
      job.status = 'cancelled'
      job.completedAt = new Date()
      job.message = 'Job cancelled by user'
      this.metrics.cancelledJobs++
      this.notifyListeners(jobId, job)
      return true
    }

    return false
  }

  /**
   * Get job by ID
   */
  getJob(jobId: string): Job | undefined {
    return this.jobs.get(jobId)
  }

  /**
   * Get all jobs
   */
  getAllJobs(): Job[] {
    return Array.from(this.jobs.values())
  }

  /**
   * Get jobs by status
   */
  getJobsByStatus(status: JobStatus): Job[] {
    return Array.from(this.jobs.values()).filter(job => job.status === status)
  }

  /**
   * Clear completed jobs
   */
  clearCompleted() {
    const completed = this.getJobsByStatus('completed')
    completed.forEach(job => {
      this.jobs.delete(job.id)
    })
  }

  /**
   * Subscribe to job updates
   */
  subscribe(jobId: string, callback: (job: Job) => void): () => void {
    if (!this.listeners.has(jobId)) {
      this.listeners.set(jobId, new Set())
    }
    this.listeners.get(jobId)!.add(callback)

    // Return unsubscribe function
    return () => {
      const listeners = this.listeners.get(jobId)
      if (listeners) {
        listeners.delete(callback)
        if (listeners.size === 0) {
          this.listeners.delete(jobId)
        }
      }
    }
  }

  /**
   * Notify listeners of job updates
   */
  private notifyListeners(jobId: string, job: Job) {
    const listeners = this.listeners.get(jobId)
    if (listeners) {
      listeners.forEach(callback => callback(job))
    }
  }

  /**
   * Get queue metrics
   */
  getMetrics() {
    return {
      ...this.metrics,
      activeJobs: this.activeJobs.size,
      queueLength: this.queue.length,
      successRate: this.metrics.totalJobs > 0
        ? Math.round((this.metrics.completedJobs / this.metrics.totalJobs) * 100)
        : 0
    }
  }

  /**
   * Update average processing time
   */
  private updateAverageProcessingTime(duration: number) {
    const total = this.metrics.completedJobs + this.metrics.failedJobs
    this.metrics.averageProcessingTime = 
      (this.metrics.averageProcessingTime * (total - 1) + duration) / total
  }

  /**
   * Generate unique job ID
   */
  private generateJobId(): string {
    return `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }
}

/**
 * Global job queue instance
 */
export const jobQueue = new JobQueue()

/**
 * React hook for job management
 */

export function useJob<T = unknown, R = unknown>(jobId?: string) {
  const [job, setJob] = useState<Job<T, R> | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!jobId) return

    // Get initial job state
    const currentJob = jobQueue.getJob(jobId) as Job<T, R> | undefined
    if (currentJob) {
      setJob(currentJob)
      setLoading(currentJob.status === 'running' || currentJob.status === 'pending')
    }

    // Subscribe to updates
    const unsubscribe = jobQueue.subscribe(jobId, (updatedJob) => {
      setJob(updatedJob as Job<T, R>)
      setLoading(updatedJob.status === 'running' || updatedJob.status === 'pending')
    })

    return unsubscribe
  }, [jobId])

  const cancel = useCallback(() => {
    if (jobId) {
      return jobQueue.cancelJob(jobId)
    }
    return false
  }, [jobId])

  return { job, loading, cancel }
}

/**
 * Hook for managing multiple jobs
 */
export function useJobQueue() {
  const [jobs, setJobs] = useState<Job[]>([])
  const [metrics, setMetrics] = useState(jobQueue.getMetrics())

  useEffect(() => {
    const updateState = () => {
      setJobs(jobQueue.getAllJobs())
      setMetrics(jobQueue.getMetrics())
    }

    updateState()
    const interval = setInterval(updateState, 1000)

    return () => clearInterval(interval)
  }, [])

  const addJob = useCallback(async <T = unknown>(
    type: string,
    data: T,
    options?: JobOptions
  ) => {
    return jobQueue.addJob(type, data, options)
  }, [])

  const cancelJob = useCallback((jobId: string) => {
    return jobQueue.cancelJob(jobId)
  }, [])

  const clearCompleted = useCallback(() => {
    jobQueue.clearCompleted()
  }, [])

  return {
    jobs,
    metrics,
    addJob,
    cancelJob,
    clearCompleted
  }
}

/**
 * Common job processors
 */
export const commonProcessors: JobProcessor[] = [
  {
    type: 'data-export',
    process: async (job, updateProgress) => {
      updateProgress(0, 'Starting export...')
      
      // Simulate export process
      for (let i = 0; i <= 100; i += 10) {
        await new Promise(resolve => setTimeout(resolve, 200))
        updateProgress(i, `Exporting data... ${i}%`)
      }
      
      const data = job.data as { count: number }
      return { exported: true, records: data.count }
    }
  },
  {
    type: 'bulk-update',
    process: async (job, updateProgress) => {
      const data = job.data as { items?: unknown[] }
      const items = data.items || []
      const total = items.length
      
      for (let i = 0; i < total; i++) {
        await new Promise(resolve => setTimeout(resolve, 100))
        updateProgress(
          Math.round(((i + 1) / total) * 100),
          `Updating item ${i + 1} of ${total}`
        )
      }
      
      return { updated: total }
    }
  },
  {
    type: 'report-generation',
    process: async (job, updateProgress) => {
      updateProgress(10, 'Gathering data...')
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      updateProgress(40, 'Processing data...')
      await new Promise(resolve => setTimeout(resolve, 1500))
      
      updateProgress(70, 'Generating report...')
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      updateProgress(90, 'Finalizing...')
      await new Promise(resolve => setTimeout(resolve, 500))
      
      return { reportUrl: '/reports/sample.pdf' }
    }
  }
]

// Register common processors
commonProcessors.forEach(processor => jobQueue.registerProcessor(processor))