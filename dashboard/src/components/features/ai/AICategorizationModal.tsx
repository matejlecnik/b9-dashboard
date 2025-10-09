'use client'

import { useState, useCallback, useEffect } from 'react'
import { useToast } from '@/components/ui/toast'
import { Label } from '@/components/ui/label'
import { Slider } from '@/components/ui/slider'
import { Sparkles, Info } from 'lucide-react'
import { LogViewerSupabase } from '@/components/features/monitoring/LogViewerSupabase'
import { StandardModal } from '@/components/shared/modals/StandardModal'
import { designSystem } from '@/lib/design-system'
import { cn } from '@/lib/utils'

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
  
  // Update limit when uncategorizedCount changes
  useEffect(() => {
    setSettings(prev => ({
      ...prev,
      limit: Math.min(uncategorizedCount, prev.limit)
    }))
  }, [uncategorizedCount])
  
  
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
  
  
  return (
    <StandardModal
      isOpen={isOpen}
      onClose={onClose}
      title="AI Categorization"
      subtitle="Automated categorization"
      icon={<Sparkles className="h-4 w-4" />}
      loading={isProcessing}
      maxWidth="md"
      maxHeight="70vh"
      footer={
        <div className="flex items-center justify-end gap-2">
          <button
            onClick={onClose}
            disabled={isProcessing}
            className={cn(
              "text-xs h-8 px-4 font-mac-text rounded-lg",
              "bg-white/60 backdrop-blur-sm",
              "border border-gray-200/60",
              "hover:bg-white/80 hover:border-gray-300/60",
              "shadow-sm hover:shadow",
              "transition-all duration-200"
            )}
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={isProcessing || uncategorizedCount === 0}
            className={cn(
              "inline-flex items-center text-xs h-8 px-4 font-mac-text font-medium rounded-lg whitespace-nowrap",
              "transition-all duration-200",
              "disabled:opacity-40 disabled:cursor-not-allowed"
            )}
            style={{
              background: 'linear-gradient(135deg, var(--pink-alpha-50) 0%, var(--pink-alpha-40) 100%)',
              backdropFilter: 'blur(20px) saturate(180%)',
              WebkitBackdropFilter: 'blur(20px) saturate(180%)',
              border: '1px solid var(--pink-600)',
              boxShadow: '0 8px 32px var(--pink-alpha-40)',
              color: 'var(--pink-600)'
            }}
            onMouseEnter={(e) => {
              if (!isProcessing && uncategorizedCount > 0) {
                e.currentTarget.style.background = 'linear-gradient(135deg, rgba(255, 131, 149, 0.7) 0%, var(--pink-alpha-50) 100%)'
                e.currentTarget.style.boxShadow = '0 12px 40px var(--pink-alpha-50)'
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'linear-gradient(135deg, var(--pink-alpha-50) 0%, var(--pink-alpha-40) 100%)'
              e.currentTarget.style.boxShadow = '0 8px 32px var(--pink-alpha-40)'
            }}
          >
            {isProcessing ? (
              <>
                <div className="animate-spin rounded-full h-2.5 w-2.5 border-b-2 mr-1.5" style={{ borderColor: 'var(--pink-600)' }} />
                Processing...
              </>
            ) : (
              <>
                <Sparkles className="h-3 w-3 mr-1.5" />
                Start Categorization
              </>
            )}
          </button>
        </div>
      }
    >
      <div className="space-y-4">
        {/* Simple Settings */}
        <div className="space-y-3">
                
                {/* Max Items - Only setting user can change */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className={cn("text-xs font-medium", designSystem.typography.color.secondary)}>
                      Items to Process
                    </Label>
                    <div className="flex items-center gap-2">
                      <span className={cn("text-sm font-bold", designSystem.typography.color.primary)}>
                        {settings.limit}
                      </span>
                      <span className={cn("text-[10px]", designSystem.typography.color.subtle)}>
                        / {uncategorizedCount} available
                      </span>
                    </div>
                  </div>

                  <div className="relative">
                    <Slider
                      value={[settings.limit]}
                      onValueChange={(value: number[]) => setSettings(prev => ({ ...prev, limit: value[0] }))}
                      min={1}
                      max={Math.min(1000, uncategorizedCount)}
                      step={10}
                      className={cn("w-full [&_[role=slider]]:bg-gradient-to-r [&_[role=slider]]:from-primary [&_[role=slider]]:to-secondary [&_[role=slider]]:border-0 [&_[role=slider]]:shadow-lg [&_[role=slider]]:shadow-primary/20 [&_[role=slider]]:h-5 [&_[role=slider]]:w-5 [&_[data-orientation]_span]:bg-gradient-to-r [&_[data-orientation]_span]:from-primary [&_[data-orientation]_span]:to-secondary", `[&_[data-orientation]]:${designSystem.background.surface.neutral}`)}
                    />
                  </div>

                  {/* Quick select buttons */}
                  <div className="flex gap-1.5">
                    <button
                      type="button"
                      onClick={() => setSettings(prev => ({ ...prev, limit: Math.min(50, uncategorizedCount) }))}
                      className={cn("flex-1 px-2 py-1 text-[10px] font-medium rounded-lg transition-colors", "hover:bg-gray-200/60 hover:text-primary", designSystem.background.surface.light, designSystem.typography.color.tertiary)}
                    >
                      50
                    </button>
                    <button
                      type="button"
                      onClick={() => setSettings(prev => ({ ...prev, limit: Math.min(100, uncategorizedCount) }))}
                      className={cn("flex-1 px-2 py-1 text-[10px] font-medium rounded-lg transition-colors", "hover:bg-gray-200/60 hover:text-primary", designSystem.background.surface.light, designSystem.typography.color.tertiary)}
                    >
                      100
                    </button>
                    <button
                      type="button"
                      onClick={() => setSettings(prev => ({ ...prev, limit: Math.min(250, uncategorizedCount) }))}
                      className={cn("flex-1 px-2 py-1 text-[10px] font-medium rounded-lg transition-colors", "hover:bg-gray-200/60 hover:text-primary", designSystem.background.surface.light, designSystem.typography.color.tertiary)}
                    >
                      250
                    </button>
                    <button
                      type="button"
                      onClick={() => setSettings(prev => ({ ...prev, limit: Math.min(500, uncategorizedCount) }))}
                      className={cn("flex-1 px-2 py-1 text-[10px] font-medium rounded-lg transition-colors", "hover:bg-gray-200/60 hover:text-primary", designSystem.background.surface.light, designSystem.typography.color.tertiary)}
                    >
                      500
                    </button>
                    <button
                      type="button"
                      onClick={() => setSettings(prev => ({ ...prev, limit: uncategorizedCount }))}
                      className={cn("flex-1 px-2 py-1 text-[10px] font-medium rounded-lg transition-colors", "hover:bg-gray-200/60 hover:text-primary", designSystem.background.surface.light, designSystem.typography.color.tertiary)}
                    >
                      All
                    </button>
                  </div>
                </div>
              </div>
              
              {/* Cost Estimation */}
              <div className={cn(
                "p-3 border border-default",
                designSystem.borders.radius.lg,
                designSystem.background.surface.light
              )}>
                <div className="flex items-start gap-2">
                  <Info className={cn("h-3.5 w-3.5 mt-0.5", designSystem.typography.color.secondary)} />
                  <div className="flex-1">
                    <p className={cn("text-xs font-medium", designSystem.typography.color.primary)}>
                      Estimated Cost
                    </p>
                    <p className={cn("text-[10px]", designSystem.typography.color.tertiary)}>
                      {Math.min(settings.limit, uncategorizedCount)} items
                    </p>
                    <p className={cn("text-sm font-bold", designSystem.typography.color.primary)}>
                      ${estimatedCost.toFixed(2)}
                    </p>
                  </div>
                </div>
              </div>
              
              {/* Live Logs Section - Show when processing or has logs */}
              {(isProcessing || logs.length > 0) && (
                <div className="space-y-2">
                  <LogViewerSupabase
                    title="Processing Logs"
                    height="200px"
                    autoScroll={true}
                    refreshInterval={2000}
                    maxLogs={50}
                    useSystemLogs={true}
                    sourceFilter="reddit_tagger"
                  />

                  {/* Show local logs as fallback if any exist */}
                  {logs.length > 0 && (
                    <div className={cn("text-[10px] px-2", designSystem.typography.color.subtle)}>
                      <details>
                        <summary className={cn("cursor-pointer", `hover:${designSystem.typography.color.secondary}`)}>Local logs ({logs.length})</summary>
                        <div className="mt-1 space-y-0.5 max-h-20 overflow-y-auto">
                          {logs.map((log, index) => (
                            <div key={index} className={cn("font-mono", designSystem.typography.color.tertiary)}>
                              {log}
                            </div>
                          ))}
                        </div>
                      </details>
                    </div>
                  )}
                </div>
              )}
          </div>
      </StandardModal>
    )
  }