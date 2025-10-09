'use client'

import { useMemo } from 'react'
import { FileText } from 'lucide-react'
import { StandardModal } from '@/components/shared/modals/StandardModal'
import { logger } from '@/lib/logger'
import { designSystem } from '@/lib/design-system'
import { cn } from '@/lib/utils'

interface SubredditRulesModalProps {
  isOpen: boolean
  onClose: () => void
  subreddit: {
    display_name_prefixed: string
    title: string | null
    rules_data: unknown
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

  // Create icon with first letter
  const icon = (
    <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-br from-primary/20 to-secondary/20">
      <span className="text-sm font-semibold text-primary-pressed">
        {subreddit.display_name_prefixed.replace('r/', '')[0].toUpperCase()}
      </span>
    </div>
  )

  return (
    <StandardModal
      isOpen={isOpen}
      onClose={onClose}
      title={`${subreddit.display_name_prefixed} Rules`}
      subtitle={subreddit.title || undefined}
      icon={icon}
      maxWidth="2xl"
      maxHeight="80vh"
    >
      <div className="space-y-3">
        {rules.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12">
            <FileText className={cn("h-12 w-12 mb-3", designSystem.typography.color.disabled)} />
            <p className={cn("text-sm font-medium", designSystem.typography.color.secondary)}>
              No rules data available
            </p>
            <p className={cn("text-xs mt-1", designSystem.typography.color.tertiary)}>
              This subreddit hasn&apos;t set up rules yet
            </p>
          </div>
        ) : (
          rules.map((rule, index) => (
            <div
              key={index}
              className={cn(
                "p-4 border border-default bg-white/50",
                designSystem.borders.radius.lg
              )}
            >
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center">
                  <span className="text-xs font-semibold text-primary">
                    {index + 1}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className={cn("text-sm font-semibold mb-1", designSystem.typography.color.primary)}>
                    {rule.short_name}
                  </h4>
                  {rule.description && (
                    <p className={cn("text-xs leading-relaxed whitespace-pre-wrap", designSystem.typography.color.secondary)}>
                      {rule.description}
                    </p>
                  )}
                  {rule.violation_reason && (
                    <div className="mt-2 px-2 py-1 bg-amber-50 border border-amber-200 rounded">
                      <p className="text-xs text-amber-800">
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
    </StandardModal>
  )
}
