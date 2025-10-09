'use client'

import { useMemo } from 'react'
import { FileText, X, BookOpen } from 'lucide-react'
import { logger } from '@/lib/logger'
import { designSystem } from '@/lib/design-system'
import { cn } from '@/lib/utils'

interface SubredditRulesModalProps {
  isOpen: boolean
  onClose: () => void
  subreddit: {
    display_name_prefixed: string
    title?: string | null
    rules_data?: unknown
  }
}

interface Rule {
  kind: string
  description: string
  short_name: string
  violation_reason?: string
  created_utc?: number
  priority?: number
}

export function SubredditRulesModal({ isOpen, onClose, subreddit }: SubredditRulesModalProps) {
  // Parse rules data with priority handling
  const rules = useMemo<Rule[]>(() => {
    const rulesData = subreddit.rules_data
    if (!rulesData) return []

    let parsed: Rule[] = []

    // Priority 1: String format (current production format): "[{...}]"
    if (typeof rulesData === 'string') {
      try {
        if (rulesData.trim() === '') {
          parsed = []
        } else {
          const parsedData = JSON.parse(rulesData)
          parsed = Array.isArray(parsedData)
            ? parsedData
            : (parsedData.rules && Array.isArray(parsedData.rules))
              ? parsedData.rules
              : []
        }
      } catch (error) {
        logger.warn('Failed to parse rules data string:', error)
        parsed = []
      }
    }
    // Priority 2: Object with nested 'rules' array (legacy/test format)
    else if (
      typeof rulesData === 'object' &&
      rulesData !== null &&
      'rules' in rulesData &&
      Array.isArray((rulesData as {rules: unknown}).rules)
    ) {
      parsed = (rulesData as {rules: Rule[]}).rules
    }
    // Priority 3: Already an array (direct format)
    else if (Array.isArray(rulesData)) {
      parsed = rulesData
    }
    // Priority 4: Empty object {} - treat as no rules
    else if (typeof rulesData === 'object' && Object.keys(rulesData).length === 0) {
      parsed = []
    }

    return parsed
  }, [subreddit.rules_data])

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
          className={`relative w-full max-w-2xl max-h-[70vh] overflow-hidden ${designSystem.borders.radius.xl}`}
          style={{
            background: 'linear-gradient(180deg, var(--gray-200-alpha-85) 0%, var(--gray-300-alpha-80) 100%)',
            backdropFilter: 'blur(20px) saturate(140%)',
            WebkitBackdropFilter: 'blur(20px) saturate(140%)',
            border: '1px solid var(--slate-400-alpha-60)',
            boxShadow: '0 20px 50px var(--black-alpha-12), 0 1px 0 var(--white-alpha-60) inset, 0 -1px 0 var(--black-alpha-02) inset'
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="relative px-5 py-3 border-b border-default">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div
                  className="p-2 rounded-lg"
                  style={{
                    background: 'linear-gradient(135deg, var(--pink-alpha-50) 0%, var(--pink-alpha-40) 100%)',
                    backdropFilter: 'blur(20px) saturate(180%)',
                    WebkitBackdropFilter: 'blur(20px) saturate(180%)',
                    border: '1px solid var(--pink-600)',
                    boxShadow: '0 8px 32px var(--pink-alpha-40)'
                  }}
                >
                  <BookOpen className="h-4 w-4 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <h2 className={cn(
                    "text-sm font-semibold font-mac-display break-words",
                    designSystem.typography.color.primary
                  )}>
                    {subreddit.display_name_prefixed} Rules
                  </h2>
                  {subreddit.title && (
                    <p className={cn("text-[10px] font-mac-text break-words", designSystem.typography.color.subtle)}>
                      {subreddit.title}
                    </p>
                  )}
                </div>
              </div>
              <button
                onClick={onClose}
                className={cn(
                  `p-1 ${designSystem.borders.radius.sm}`,
                  "hover:bg-gray-200/50 transition-colors"
                )}
              >
                <X className="h-3.5 w-3.5 text-gray-500 hover:text-gray-700" />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="px-5 py-4 overflow-y-auto max-h-[calc(70vh-80px)]">
            <div className="space-y-3">
              {rules.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <FileText className={cn("h-12 w-12 mb-3", designSystem.typography.color.disabled)} />
                  <p className={cn("text-sm font-medium font-mac-text", designSystem.typography.color.secondary)}>
                    No rules data available
                  </p>
                  <p className={cn("text-xs mt-1 font-mac-text", designSystem.typography.color.tertiary)}>
                    This subreddit hasn&apos;t set up rules yet
                  </p>
                </div>
              ) : (
                rules.map((rule, index) => (
                  <div
                    key={index}
                    className="space-y-1.5 p-3 rounded-lg bg-white/20 border border-gray-200/30"
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center">
                        <span className="text-xs font-semibold text-primary font-mac-text">
                          {index + 1}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className={cn("text-sm font-semibold mb-1 font-mac-text break-words", designSystem.typography.color.primary)}>
                          {rule.short_name}
                        </h4>
                        {rule.description && (
                          <p className={cn("text-xs leading-relaxed whitespace-pre-wrap font-mac-text", designSystem.typography.color.secondary)}>
                            {rule.description}
                          </p>
                        )}
                        {rule.violation_reason && (
                          <div className="mt-2 px-2 py-1 bg-white/20 border border-gray-200/30 rounded">
                            <p className="text-xs text-gray-700 font-mac-text">
                              <span className="font-medium">Violation reason:</span> {rule.violation_reason}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
