'use client'

import { memo } from 'react'
import { ExternalLink } from 'lucide-react'
import { cn } from '@/lib/utils'
import { designSystem } from '@/lib/design-system'

interface LinkFieldProps {
  url: string | null | undefined
  label?: string
  className?: string
  showIcon?: boolean
  showHostname?: boolean
  openInNewTab?: boolean
}

export const LinkField = memo(function LinkField({
  url,
  label,
  className,
  showIcon = true,
  showHostname = true,
  openInNewTab = true
}: LinkFieldProps) {
  if (!url) {
    return <span className={cn("text-sm", designSystem.typography.color.disabled)}>—</span>
  }

  const displayText = label || (showHostname ? (() => {
    try {
      const urlObj = new URL(url)
      return urlObj.hostname.replace('www.', '')
    } catch {
      return url
    }
  })() : url)

  return (
    <a
      href={url}
      target={openInNewTab ? "_blank" : undefined}
      rel={openInNewTab ? "noopener noreferrer" : undefined}
      className={cn(
        "flex items-center gap-1 text-primary hover:text-primary-hover transition-colors",
        className
      )}
      onClick={(e) => e.stopPropagation()}
    >
      {showIcon && <ExternalLink className="h-3 w-3 flex-shrink-0" />}
      <span className="truncate text-sm font-medium">
        {displayText}
      </span>
    </a>
  )
})
