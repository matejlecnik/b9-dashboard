'use client'

import { useState, useEffect, useCallback } from 'react'
import { Users, Play } from 'lucide-react'
import { Label } from '@/components/ui/label'
import { Slider } from '@/components/ui/slider'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { LogViewerSupabase } from '@/components/features/monitoring/LogViewerSupabase'
import { toast } from 'sonner'
import { logger } from '@/lib/logger'
import { designSystem } from '@/lib/design-system'
import { cn } from '@/lib/utils'
import { StandardModal } from '@/components/shared/modals/StandardModal'

interface RelatedCreatorsModalProps {
  isOpen: boolean
  onClose: () => void
}

interface ProcessingStatus {
  is_running: boolean
  current: number
  total: number
  current_creator: string | null
  new_creators_found: number
  errors: string[]
}

export function RelatedCreatorsModal({ isOpen, onClose }: RelatedCreatorsModalProps) {
  const [isProcessing, setIsProcessing] = useState(false)
  const [status, setStatus] = useState<ProcessingStatus>({
    is_running: false,
    current: 0,
    total: 0,
    current_creator: null,
    new_creators_found: 0,
    errors: []
  })
  const [pollingInterval, setPollingInterval] = useState<NodeJS.Timeout | null>(null)
  const [showLogs, setShowLogs] = useState(false)
  const [batchSize, setBatchSize] = useState(0)
  const [unprocessedCount, setUnprocessedCount] = useState(0)
  const [loadingCount, setLoadingCount] = useState(false)

  const fetchUnprocessedCount = useCallback(async () => {
    setLoadingCount(true)
    try {
      const response = await fetch('/api/proxy/instagram/related-creators/unprocessed-count')
      if (response.ok) {
        const data = await response.json()
        setUnprocessedCount(data.count)
        // Set batch size to available count (or 0 if none available)
        setBatchSize(data.count === 0 ? 0 : Math.min(10, data.count))
      }
    } catch (error) {
      logger.error('Error fetching unprocessed count:', error)
    } finally {
      setLoadingCount(false)
    }
  }, [])

  const checkStatus = useCallback(async () => {
    try {
      const response = await fetch('/api/proxy/instagram/related-creators/status')
      if (response.ok) {
        const data = await response.json()
        setStatus(data)
        setIsProcessing(data.is_running)

        if (!data.is_running && data.current > 0 && data.current === data.total) {
          toast.success(`Discovery complete! Found ${data.new_creators_found} new creators`)
          // Refresh unprocessed count after completion
          fetchUnprocessedCount()
        }
      }
    } catch (error) {
      logger.error('Error checking status:', error)
    }
  }, [fetchUnprocessedCount])

  useEffect(() => {
    if (isOpen) {
      checkStatus()
      fetchUnprocessedCount()
    }
    return () => {
      if (pollingInterval) {
        clearInterval(pollingInterval)
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, checkStatus, fetchUnprocessedCount])

  useEffect(() => {
    if (isProcessing) {
      const interval = setInterval(checkStatus, 2000)
      setPollingInterval(interval)
      setShowLogs(true)
      return () => clearInterval(interval)
    } else {
      if (pollingInterval) {
        clearInterval(pollingInterval)
        setPollingInterval(null)
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isProcessing, checkStatus])

  const startProcessing = async () => {
    try {
      const response = await fetch('/api/proxy/instagram/related-creators/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ batch_size: batchSize, delay_seconds: 2 })
      })

      if (response.ok) {
        const data = await response.json()
        toast.success(data.message || 'Processing started')
        setIsProcessing(true)
        setShowLogs(true)
      } else {
        const error = await response.text()
        toast.error(error || 'Failed to start processing')
      }
    } catch (error) {
      logger.error('Error starting processing:', error)
      toast.error('Failed to start processing')
    }
  }

  const stopProcessing = async () => {
    try {
      const response = await fetch('/api/proxy/instagram/related-creators/stop', {
        method: 'POST'
      })

      if (response.ok) {
        toast.info('Stopping processing...')
        setIsProcessing(false)
      } else {
        const error = await response.text()
        toast.error(error || 'Failed to stop processing')
      }
    } catch (error) {
      logger.error('Error stopping processing:', error)
      toast.error('Failed to stop processing')
    }
  }

  const progressPercentage = status.total > 0 ? (status.current / status.total) * 100 : 0

  return (
    <StandardModal
      isOpen={isOpen}
      onClose={onClose}
      title="Related Creators Discovery"
      subtitle="Automated discovery"
      icon={<Users className="h-4 w-4" />}
      loading={isProcessing}
      maxWidth="md"
      maxHeight="70vh"
      footer={
        <div className="flex items-center justify-end gap-2">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isProcessing}
            className={cn("text-xs h-7 px-3 border-strong hover:border-strong", designSystem.background.hover.subtle)}
          >
            Close
          </Button>
          {!isProcessing ? (
            <Button
              onClick={startProcessing}
              disabled={unprocessedCount === 0}
              className="text-xs h-7 px-3 bg-gradient-to-r from-primary via-primary-hover to-platform-accent text-white shadow-primary-lg hover:shadow-primary-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Play className="h-3 w-3 mr-1.5" />
              Start Discovery
            </Button>
          ) : (
            <Button
              onClick={stopProcessing}
              className="text-xs h-7 px-3 bg-gradient-to-r from-error via-error-hover to-warning text-white shadow-lg hover:shadow-xl transition-all"
            >
              <div className={`animate-spin ${designSystem.borders.radius.full} h-2.5 w-2.5 border-b-2 border-white mr-1.5`} />
              Stop Processing
            </Button>
          )}
        </div>
      }
    >
      <div className="space-y-4">
        {/* Batch Size Selector - Only show when not processing */}
        {!isProcessing && (
          <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className={cn("text-xs font-medium", designSystem.typography.color.secondary)}>
                      Creators to Process
                    </Label>
                    <div className="flex items-center gap-2">
                      <span className={cn("text-sm font-bold", designSystem.typography.color.primary)}>
                        {batchSize}
                      </span>
                      <span className={cn("text-[10px]", designSystem.typography.color.subtle)}>
                        / {loadingCount ? '...' : unprocessedCount} available
                      </span>
                    </div>
                  </div>

                  <div className="relative">
                    <Slider
                      value={[batchSize]}
                      onValueChange={(value: number[]) => setBatchSize(value[0])}
                      min={1}
                      max={Math.min(100, unprocessedCount)}
                      step={1}
                      disabled={unprocessedCount === 0}
                      className={cn("w-full [&_[role=slider]]:bg-gradient-to-r [&_[role=slider]]:from-primary [&_[role=slider]]:to-platform-accent [&_[role=slider]]:border-0 [&_[role=slider]]:shadow-lg [&_[role=slider]]:shadow-primary/20 [&_[role=slider]]:h-5 [&_[role=slider]]:w-5 [&_[data-orientation]_span]:bg-gradient-to-r [&_[data-orientation]_span]:from-primary [&_[data-orientation]_span]:to-platform-accent", `[&_[data-orientation]]:${designSystem.background.surface.neutral}`)}
                    />
                  </div>

                  {/* Quick select buttons */}
                  <div className="flex gap-1.5">
                    <button
                      type="button"
                      onClick={() => setBatchSize(Math.min(10, unprocessedCount))}
                      className={cn(`flex-1 px-2 py-1 text-[10px] font-medium hover:bg-primary/10 hover:text-primary ${designSystem.borders.radius.sm} transition-colors`, designSystem.background.surface.light, designSystem.typography.color.tertiary)}
                    >
                      10
                    </button>
                    <button
                      type="button"
                      onClick={() => setBatchSize(Math.min(25, unprocessedCount))}
                      className={cn(`flex-1 px-2 py-1 text-[10px] font-medium hover:bg-primary/10 hover:text-primary ${designSystem.borders.radius.sm} transition-colors`, designSystem.background.surface.light, designSystem.typography.color.tertiary)}
                    >
                      25
                    </button>
                    <button
                      type="button"
                      onClick={() => setBatchSize(Math.min(50, unprocessedCount))}
                      className={cn(`flex-1 px-2 py-1 text-[10px] font-medium hover:bg-primary/10 hover:text-primary ${designSystem.borders.radius.sm} transition-colors`, designSystem.background.surface.light, designSystem.typography.color.tertiary)}
                    >
                      50
                    </button>
                    <button
                      type="button"
                      onClick={() => setBatchSize(unprocessedCount)}
                      className={cn(`flex-1 px-2 py-1 text-[10px] font-medium hover:bg-primary/10 hover:text-primary ${designSystem.borders.radius.sm} transition-colors`, designSystem.background.surface.light, designSystem.typography.color.tertiary)}
                    >
                      All
                    </button>
                  </div>
                </div>
              )}

              {/* Status Summary */}
              {(status.current > 0 || isProcessing) && (
                <div className="space-y-3">
                  {/* Progress */}
                  {status.total > 0 && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label className={cn("text-xs font-medium", designSystem.typography.color.secondary)}>
                          Processing Progress
                        </Label>
                        <div className="flex items-center gap-2">
                          <span className={cn("text-sm font-bold", designSystem.typography.color.primary)}>
                            {status.current}
                          </span>
                          <span className={cn("text-[10px]", designSystem.typography.color.subtle)}>
                            / {status.total} creators
                          </span>
                        </div>
                      </div>
                      <div className="relative">
                        <div className={cn(`w-full h-2 ${designSystem.borders.radius.full} overflow-hidden`, designSystem.background.surface.neutral)}>
                          <div
                            className="h-full bg-gradient-to-r from-primary to-secondary transition-all duration-500"
                            style={{ width: `${progressPercentage}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Current Creator */}
                  {status.current_creator && (
                    <div className="flex items-center justify-between text-xs">
                      <span className={cn(designSystem.typography.color.subtle)}>Currently processing:</span>
                      <Badge variant="secondary" className="text-[10px] font-mono">
                        @{status.current_creator}
                      </Badge>
                    </div>
                  )}

                  {/* Stats - Only show new creators found */}
                  <div className={`px-3 py-2 bg-gradient-to-br from-primary/10 to-secondary/10 ${designSystem.borders.radius.sm} border border-primary/20`}>
                    <div className={cn("text-xs", designSystem.typography.color.tertiary)}>New Creators Found</div>
                    <div className="text-lg font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                      {status.new_creators_found}
                    </div>
                  </div>
                </div>
              )}

              {/* Info Message when not processing */}
              {!isProcessing && status.current === 0 && (
                <div className="py-4 text-center space-y-2">
                  <div className={cn("text-sm", designSystem.typography.color.tertiary)}>
                    Discover creators related to your approved accounts
                  </div>
                  <div className={cn("text-xs", designSystem.typography.color.subtle)}>
                    Processing takes 2-5 seconds per creator to avoid rate limits
                  </div>
                </div>
              )}

              {/* Live Logs Section */}
              {(showLogs || isProcessing) && (
                <div className="space-y-2">
                  <LogViewerSupabase
                    title="Processing Logs"
                    height="200px"
                    autoScroll={true}
                    refreshInterval={2000}
                    maxLogs={50}
                    useSystemLogs={true}
                    sourceFilter="instagram_related_creators"
                  />
                </div>
              )}

              {/* Errors */}
              {status.errors.length > 0 && (
                <div className={`text-[10px] text-red-600 space-y-1 p-2 bg-red-50 ${designSystem.borders.radius.sm}`}>
                  <div className="font-medium">Recent Errors:</div>
                  {status.errors.slice(-3).map((error, index) => (
                    <div key={index} className="text-red-500">{error}</div>
                  ))}
                </div>
        )}
      </div>
    </StandardModal>
  )
}