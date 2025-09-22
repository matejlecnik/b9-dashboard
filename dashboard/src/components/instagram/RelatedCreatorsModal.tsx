'use client'

import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Play, Pause, Users, X, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { LogViewerSupabase } from '@/components/LogViewerSupabase'

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
  creators_with_no_related: number
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
    creators_with_no_related: 0,
    errors: []
  })
  const [pollingInterval, setPollingInterval] = useState<NodeJS.Timeout | null>(null)
  const [showLogs, setShowLogs] = useState(false)

  useEffect(() => {
    if (isOpen) {
      checkStatus()
    }
    return () => {
      if (pollingInterval) {
        clearInterval(pollingInterval)
      }
    }
  }, [isOpen])

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
  }, [isProcessing])

  const checkStatus = async () => {
    try {
      const response = await fetch('https://b9-dashboard.onrender.com/api/instagram/related-creators/status')
      if (response.ok) {
        const data = await response.json()
        setStatus(data)
        setIsProcessing(data.is_running)

        if (!data.is_running && data.current > 0 && data.current === data.total) {
          toast.success(`Discovery complete! Found ${data.new_creators_found} new creators`)
        }
      }
    } catch (error) {
      console.error('Error checking status:', error)
    }
  }

  const startProcessing = async () => {
    try {
      const response = await fetch('https://b9-dashboard.onrender.com/api/instagram/related-creators/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ batch_size: 10, delay_seconds: 2 })
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
      console.error('Error starting processing:', error)
      toast.error('Failed to start processing')
    }
  }

  const stopProcessing = async () => {
    try {
      const response = await fetch('https://b9-dashboard.onrender.com/api/instagram/related-creators/stop', {
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
      console.error('Error stopping processing:', error)
      toast.error('Failed to stop processing')
    }
  }

  const progressPercentage = status.total > 0 ? (status.current / status.total) * 100 : 0

  if (!isOpen) return null

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-gray-900/20 backdrop-blur-md z-50 transition-opacity duration-300"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div
          className="relative w-full max-w-md max-h-[70vh] overflow-hidden rounded-3xl"
          style={{
            background: 'linear-gradient(135deg, rgba(243, 244, 246, 0.98), rgba(229, 231, 235, 0.95), rgba(209, 213, 219, 0.92))',
            backdropFilter: 'blur(24px) saturate(180%)',
            WebkitBackdropFilter: 'blur(24px) saturate(180%)',
            border: '1px solid rgba(255, 255, 255, 0.5)',
            boxShadow: '0 25px 70px -10px rgba(0, 0, 0, 0.2), 0 10px 25px -5px rgba(0, 0, 0, 0.08), inset 0 2px 4px 0 rgba(255, 255, 255, 0.8), inset 0 -1px 2px 0 rgba(0, 0, 0, 0.04)'
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="relative px-5 py-3 border-b border-pink-200/30 bg-gradient-to-r from-pink-50/30 to-purple-50/30">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 rounded-lg bg-gradient-to-br from-pink-500/20 to-purple-500/20 shadow-sm">
                  <Users className="h-4 w-4 text-pink-500" />
                </div>
                <div>
                  <h2 className="text-sm font-semibold bg-gradient-to-r from-pink-600 to-purple-600 bg-clip-text text-transparent">
                    Related Creators Discovery
                  </h2>
                  <p className="text-[10px] text-gray-500">Automated discovery</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-1 rounded-lg hover:bg-pink-100/50 transition-colors"
                disabled={isProcessing}
              >
                <X className="h-3.5 w-3.5 text-gray-500 hover:text-gray-700" />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="px-5 py-3 overflow-y-auto max-h-[calc(70vh-140px)]">
            <div className="space-y-4">
              {/* Status Summary */}
              {(status.current > 0 || isProcessing) && (
                <div className="space-y-3">
                  {/* Progress */}
                  {status.total > 0 && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs font-medium text-gray-700">
                          Processing Progress
                        </Label>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold bg-gradient-to-r from-pink-500 to-purple-500 bg-clip-text text-transparent">
                            {status.current}
                          </span>
                          <span className="text-[10px] text-gray-500">
                            / {status.total} creators
                          </span>
                        </div>
                      </div>
                      <div className="relative">
                        <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-pink-500 to-purple-500 transition-all duration-500"
                            style={{ width: `${progressPercentage}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Current Creator */}
                  {status.current_creator && (
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-gray-500">Currently processing:</span>
                      <Badge variant="secondary" className="text-[10px] font-mono">
                        @{status.current_creator}
                      </Badge>
                    </div>
                  )}

                  {/* Stats */}
                  <div className="grid grid-cols-2 gap-2">
                    <div className="px-3 py-2 bg-gradient-to-br from-pink-50 to-purple-50 rounded-lg border border-pink-100">
                      <div className="text-xs text-gray-600">New Creators</div>
                      <div className="text-lg font-bold bg-gradient-to-r from-pink-500 to-purple-500 bg-clip-text text-transparent">
                        {status.new_creators_found}
                      </div>
                    </div>
                    <div className="px-3 py-2 bg-gradient-to-br from-orange-50 to-yellow-50 rounded-lg border border-orange-100">
                      <div className="text-xs text-gray-600">No Related</div>
                      <div className="text-lg font-bold bg-gradient-to-r from-orange-500 to-yellow-500 bg-clip-text text-transparent">
                        {status.creators_with_no_related}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Info Message when not processing */}
              {!isProcessing && status.current === 0 && (
                <div className="py-4 text-center space-y-2">
                  <div className="text-sm text-gray-600">
                    Discover creators related to your approved accounts
                  </div>
                  <div className="text-xs text-gray-500">
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
                <div className="text-[10px] text-red-600 space-y-1 p-2 bg-red-50 rounded-lg">
                  <div className="font-medium">Recent Errors:</div>
                  {status.errors.slice(-3).map((error, index) => (
                    <div key={index} className="text-red-500">{error}</div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="px-5 py-3 border-t border-pink-200/30 bg-gradient-to-r from-pink-50/50 to-purple-50/50">
            <div className="flex items-center justify-end gap-2">
              <Button
                variant="outline"
                onClick={onClose}
                disabled={isProcessing}
                className="text-xs h-7 px-3 border-pink-200 hover:bg-pink-50 hover:border-pink-300"
              >
                Close
              </Button>
              {!isProcessing ? (
                <Button
                  onClick={startProcessing}
                  className="text-xs h-7 px-3 bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600 text-white shadow-lg hover:shadow-xl transition-all"
                >
                  <Play className="h-3 w-3 mr-1.5" />
                  Start Discovery
                </Button>
              ) : (
                <Button
                  onClick={stopProcessing}
                  className="text-xs h-7 px-3 bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600 text-white shadow-lg hover:shadow-xl transition-all"
                >
                  <div className="animate-spin rounded-full h-2.5 w-2.5 border-b-2 border-white mr-1.5" />
                  Stop Processing
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  )
}