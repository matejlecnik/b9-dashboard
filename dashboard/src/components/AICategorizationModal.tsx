'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { X, Sparkles, Info, Terminal } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Slider } from '@/components/ui/slider'
import { useToast } from '@/components/ui/toast'

interface AICategorizationModalProps {
  isOpen: boolean
  onClose: () => void
  onStart: (settings: AICategorizationSettings) => void
  uncategorizedCount: number
  availableCategories: string[]
  isProcessing: boolean
  logs?: string[]
}

export interface AICategorizationSettings {
  batchSize: number
  limit: number
  model: string
  temperature: number
  categories: string[]
  autoRefreshDelay: number
  apiKeyOverride?: string
}

export function AICategorizationModal({
  isOpen,
  onClose,
  onStart,
  uncategorizedCount,
  availableCategories,
  isProcessing,
  logs = []
}: AICategorizationModalProps) {
  const { addToast } = useToast()
  
  // Settings state - simplified with hardcoded values
  const [settings, setSettings] = useState<AICategorizationSettings>({
    batchSize: 50, // Fixed at max 50
    limit: Math.min(uncategorizedCount, 500),
    model: 'gpt-4', // Fixed to GPT-4
    temperature: 0.1, // Fixed temperature
    categories: availableCategories, // Fixed to all categories
    autoRefreshDelay: 30000, // Fixed 30 second refresh
    apiKeyOverride: undefined
  })
  
  const [estimatedCost, setEstimatedCost] = useState(0)
  const [showLogs, setShowLogs] = useState(false)
  
  // Update limit when uncategorizedCount changes
  useEffect(() => {
    setSettings(prev => ({
      ...prev,
      limit: Math.min(uncategorizedCount, prev.limit)
    }))
  }, [uncategorizedCount])
  
  // Auto-show logs when processing starts or logs are added
  useEffect(() => {
    if (isProcessing || logs.length > 0) {
      setShowLogs(true)
    }
  }, [isProcessing, logs.length])
  
  // Calculate estimated cost (GPT-4 actual pricing based on real usage)
  useEffect(() => {
    // Based on actual costs: $0.0064 for 2 items = ~$0.0032 per item
    // Adding a small buffer for variation in prompt/response sizes
    const costPerItem = 0.0035 // Actual GPT-4 pricing with small buffer
    const itemsToProcess = Math.min(settings.limit, uncategorizedCount)
    setEstimatedCost(itemsToProcess * costPerItem)
  }, [settings.limit, uncategorizedCount])
  
  const handleSubmit = useCallback(() => {
    if (settings.batchSize < 1 || settings.batchSize > 100) {
      addToast({
        type: 'error',
        title: 'Invalid Batch Size',
        description: 'Batch size must be between 1 and 100',
        duration: 3000
      })
      return
    }

    if (settings.limit < 1 || settings.limit > 1000) {
      addToast({
        type: 'error',
        title: 'Invalid Limit',
        description: 'Limit must be between 1 and 1000',
        duration: 3000
      })
      return
    }

    if (settings.limit > uncategorizedCount) {
      addToast({
        type: 'error',
        title: 'Invalid Item Count',
        description: `Cannot process ${settings.limit} items. Only ${uncategorizedCount} uncategorized records available.`,
        duration: 5000
      })
      return
    }

    onStart(settings)
  }, [settings, onStart, addToast, uncategorizedCount])
  
  
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
                  <Sparkles className="h-4 w-4 text-pink-500" />
                </div>
                <div>
                  <h2 className="text-sm font-semibold bg-gradient-to-r from-pink-600 to-purple-600 bg-clip-text text-transparent">
                    AI Categorization
                  </h2>
                  <p className="text-[10px] text-gray-500">Automated categorization</p>
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
              {/* Simple Settings */}
              <div className="space-y-3">
                
                {/* Max Items - Only setting user can change */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-medium text-gray-700">
                      Items to Process
                    </Label>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold bg-gradient-to-r from-pink-500 to-purple-500 bg-clip-text text-transparent">
                        {settings.limit}
                      </span>
                      <span className="text-[10px] text-gray-500">
                        / {uncategorizedCount} available
                      </span>
                    </div>
                  </div>

                  <div className="relative">
                    <Slider
                      value={[settings.limit]}
                      onValueChange={(value) => setSettings(prev => ({ ...prev, limit: value[0] }))}
                      min={1}
                      max={Math.min(1000, uncategorizedCount)}
                      step={10}
                      className="w-full [&_[role=slider]]:bg-gradient-to-r [&_[role=slider]]:from-pink-500 [&_[role=slider]]:to-purple-500 [&_[role=slider]]:border-0 [&_[role=slider]]:shadow-lg [&_[role=slider]]:shadow-pink-500/20 [&_[role=slider]]:h-5 [&_[role=slider]]:w-5 [&_[data-orientation]]:bg-gray-200 [&_[data-orientation]_span]:bg-gradient-to-r [&_[data-orientation]_span]:from-pink-500 [&_[data-orientation]_span]:to-purple-500"
                    />

                    {/* Tick marks for quarters */}
                    <div className="flex justify-between mt-1 px-2">
                      <span className="text-[9px] text-gray-400">1</span>
                      <span className="text-[9px] text-gray-400">{Math.round(uncategorizedCount * 0.25)}</span>
                      <span className="text-[9px] text-gray-400">{Math.round(uncategorizedCount * 0.5)}</span>
                      <span className="text-[9px] text-gray-400">{Math.round(uncategorizedCount * 0.75)}</span>
                      <span className="text-[9px] text-gray-400">{uncategorizedCount}</span>
                    </div>
                  </div>

                  {/* Quick select buttons */}
                  <div className="flex gap-1.5">
                    <button
                      type="button"
                      onClick={() => setSettings(prev => ({ ...prev, limit: Math.min(50, uncategorizedCount) }))}
                      className="flex-1 px-2 py-1 text-[10px] font-medium text-gray-600 bg-gray-100 hover:bg-pink-50 hover:text-pink-600 rounded-md transition-colors"
                    >
                      50
                    </button>
                    <button
                      type="button"
                      onClick={() => setSettings(prev => ({ ...prev, limit: Math.min(100, uncategorizedCount) }))}
                      className="flex-1 px-2 py-1 text-[10px] font-medium text-gray-600 bg-gray-100 hover:bg-pink-50 hover:text-pink-600 rounded-md transition-colors"
                    >
                      100
                    </button>
                    <button
                      type="button"
                      onClick={() => setSettings(prev => ({ ...prev, limit: Math.min(250, uncategorizedCount) }))}
                      className="flex-1 px-2 py-1 text-[10px] font-medium text-gray-600 bg-gray-100 hover:bg-pink-50 hover:text-pink-600 rounded-md transition-colors"
                    >
                      250
                    </button>
                    <button
                      type="button"
                      onClick={() => setSettings(prev => ({ ...prev, limit: Math.min(500, uncategorizedCount) }))}
                      className="flex-1 px-2 py-1 text-[10px] font-medium text-gray-600 bg-gray-100 hover:bg-pink-50 hover:text-pink-600 rounded-md transition-colors"
                    >
                      500
                    </button>
                    <button
                      type="button"
                      onClick={() => setSettings(prev => ({ ...prev, limit: uncategorizedCount }))}
                      className="flex-1 px-2 py-1 text-[10px] font-medium text-gray-600 bg-gray-100 hover:bg-pink-50 hover:text-pink-600 rounded-md transition-colors"
                    >
                      All
                    </button>
                  </div>
                </div>
              </div>
              
              {/* Cost Estimation with brand colors */}
              <div className="p-3 rounded-lg bg-gradient-to-br from-pink-50 via-purple-50 to-blue-50 border border-pink-200/50">
                <div className="flex items-start gap-2">
                  <Info className="h-3.5 w-3.5 text-pink-500 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-xs font-medium bg-gradient-to-r from-pink-600 to-purple-600 bg-clip-text text-transparent">
                      Estimated Cost
                    </p>
                    <p className="text-[10px] text-gray-600">
                      {Math.min(settings.limit, uncategorizedCount)} items
                    </p>
                    <p className="text-sm font-bold bg-gradient-to-r from-pink-500 to-purple-500 bg-clip-text text-transparent">
                      ${estimatedCost.toFixed(2)}
                    </p>
                  </div>
                </div>
              </div>
              
              {/* Logs Section - Show when processing or has logs */}
              {(isProcessing || logs.length > 0) && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-medium text-gray-700 flex items-center gap-1.5">
                      <Terminal className="h-3 w-3 text-pink-500" />
                      Processing Logs
                    </h3>
                    <button
                      onClick={() => setShowLogs(!showLogs)}
                      className="text-[10px] text-gray-500 hover:text-gray-700 transition-colors"
                    >
                      {showLogs ? 'Hide' : 'Show'}
                    </button>
                  </div>
                  {showLogs && (
                    <div 
                      className="rounded-lg p-3 font-mono text-[11px] space-y-1 max-h-48 overflow-y-auto"
                      style={{
                        background: 'linear-gradient(135deg, rgba(17, 24, 39, 0.98), rgba(31, 41, 55, 0.95))',
                        backdropFilter: 'blur(10px)',
                        border: '1px solid rgba(75, 85, 99, 0.3)',
                        boxShadow: 'inset 0 1px 3px rgba(0, 0, 0, 0.3)'
                      }}
                    >
                      {logs.length > 0 ? (
                        logs.map((log, index) => {
                          // Style different log types
                          let logClass = "text-gray-300"
                          if (log.includes('✅') || log.includes('✓')) logClass = "text-green-400"
                          else if (log.includes('❌') || log.includes('✗') || log.includes('Error')) logClass = "text-red-400"
                          else if (log.includes('📊') || log.includes('💰')) logClass = "text-blue-400"
                          else if (log.includes('API Response')) logClass = "text-yellow-400"
                          else if (log.includes('→')) logClass = "text-purple-400"
                          
                          return (
                            <div key={index} className={logClass}>
                              {!log.startsWith(' ') && (
                                <span className="text-pink-400 mr-1">[{new Date().toLocaleTimeString()}]</span>
                              )}
                              {log}
                            </div>
                          )
                        })
                      ) : (
                        <div className="text-gray-400 flex items-center gap-2">
                          <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-pink-400" />
                          Waiting for response...
                        </div>
                      )}
                    </div>
                  )}
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
                Cancel
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={isProcessing || uncategorizedCount === 0}
                className="text-xs h-7 px-3 bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600 text-white shadow-lg hover:shadow-xl transition-all"
              >
                {isProcessing ? (
                  <>
                    <div className="animate-spin rounded-full h-2.5 w-2.5 border-b-2 border-white mr-1.5" />
                    Processing...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-3 w-3 mr-1.5" />
                    Start Categorization
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}