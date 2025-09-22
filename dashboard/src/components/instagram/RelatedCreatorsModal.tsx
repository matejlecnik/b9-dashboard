'use client'

import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { Play, Pause, Users, UserCheck, UserX, AlertCircle, Loader2, X } from 'lucide-react'
import { toast } from 'sonner'

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
          className="relative w-full max-w-2xl max-h-[80vh] overflow-hidden rounded-3xl bg-white"
          style={{
            backdropFilter: 'blur(24px) saturate(180%)',
            WebkitBackdropFilter: 'blur(24px) saturate(180%)',
            border: '1px solid rgba(255, 255, 255, 0.5)',
            boxShadow: '0 25px 70px -10px rgba(0, 0, 0, 0.2), 0 10px 25px -5px rgba(0, 0, 0, 0.08)'
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="relative px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-purple-50/50 to-pink-50/50">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 rounded-lg bg-gradient-to-br from-purple-500/20 to-pink-500/20 shadow-sm">
                  <Users className="h-5 w-5 text-purple-500" />
                </div>
                <h2 className="text-lg font-semibold text-gray-800">
                  Discover Related Creators
                </h2>
              </div>
              <Button
                onClick={onClose}
                variant="ghost"
                size="icon"
                className="h-8 w-8 rounded-full hover:bg-gray-100/50"
                disabled={isProcessing}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Content */}
          <div className="p-6 space-y-6 overflow-y-auto max-h-[calc(80vh-80px)]">
          {/* Status Overview */}
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-purple-50 rounded-lg p-4 text-center">
              <UserCheck className="h-6 w-6 text-purple-500 mx-auto mb-2" />
              <div className="text-2xl font-bold text-purple-700">
                {status.new_creators_found}
              </div>
              <div className="text-sm text-gray-600">New Creators Found</div>
            </div>

            <div className="bg-orange-50 rounded-lg p-4 text-center">
              <UserX className="h-6 w-6 text-orange-500 mx-auto mb-2" />
              <div className="text-2xl font-bold text-orange-700">
                {status.creators_with_no_related}
              </div>
              <div className="text-sm text-gray-600">No Related Found</div>
            </div>

            <div className="bg-blue-50 rounded-lg p-4 text-center">
              <Users className="h-6 w-6 text-blue-500 mx-auto mb-2" />
              <div className="text-2xl font-bold text-blue-700">
                {status.current}/{status.total}
              </div>
              <div className="text-sm text-gray-600">Processed</div>
            </div>
          </div>

          {/* Progress Bar */}
          {status.total > 0 && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm text-gray-600">
                <span>Progress</span>
                <span>{Math.round(progressPercentage)}%</span>
              </div>
              <Progress value={progressPercentage} className="h-2" />
            </div>
          )}

          {/* Current Processing */}
          {status.current_creator && (
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin text-purple-500" />
                <span className="text-sm text-gray-600">Currently processing:</span>
                <Badge variant="secondary" className="font-mono">
                  @{status.current_creator}
                </Badge>
              </div>
            </div>
          )}

          {/* Errors */}
          {status.errors.length > 0 && (
            <div className="bg-red-50 rounded-lg p-4">
              <div className="flex items-start gap-2">
                <AlertCircle className="h-4 w-4 text-red-500 mt-0.5" />
                <div className="flex-1">
                  <div className="text-sm font-medium text-red-700 mb-1">Errors:</div>
                  <div className="text-xs text-red-600 space-y-1">
                    {status.errors.slice(-3).map((error, index) => (
                      <div key={index}>{error}</div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex justify-between">
            <Button
              variant="outline"
              onClick={onClose}
              disabled={isProcessing}
            >
              Close
            </Button>

            <div className="flex gap-2">
              {!isProcessing ? (
                <Button
                  onClick={startProcessing}
                  className="bg-purple-600 hover:bg-purple-700 text-white"
                >
                  <Play className="h-4 w-4 mr-2" />
                  Start Discovery
                </Button>
              ) : (
                <Button
                  onClick={stopProcessing}
                  variant="destructive"
                >
                  <Pause className="h-4 w-4 mr-2" />
                  Stop Processing
                </Button>
              )}
            </div>
          </div>

            {/* Info Text */}
            <div className="text-xs text-gray-500 text-center">
              This process discovers creators related to your approved accounts.
              Each discovery takes 2-5 seconds to avoid rate limits.
            </div>
          </div>
        </div>
      </div>
    </>
  )
}