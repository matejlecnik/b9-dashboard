'use client'

import React from 'react'
import { UniversalToolbar } from '@/components/shared/UniversalToolbar'

interface UnifiedToolbarProps {
  children: React.ReactNode
  className?: string
  animate?: boolean
  testId?: string
}

/**
 * @deprecated Use UniversalToolbar instead for better functionality and consistency
 * This component is kept for backward compatibility and redirects to UniversalToolbar
 */
export function UnifiedToolbar({ 
  children, 
  className = '', 
  animate = false,
  testId 
}: UnifiedToolbarProps) {
  return (
    <UniversalToolbar
      variant="unified"
      customContent={children}
      className={className}
      animate={animate}
      testId={testId}
      intensity="medium"
      shadow="lg"
    />
  )
}