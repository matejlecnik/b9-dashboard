'use client'

import { useEffect, useRef } from 'react'

export interface KeyboardShortcut {
  key: string
  ctrl?: boolean
  meta?: boolean
  shift?: boolean
  alt?: boolean
  action: () => void
  description: string
  category?: string
  preventDefault?: boolean
}

export function useKeyboardShortcuts(shortcuts: KeyboardShortcut[], enabled: boolean = true) {
  const shortcutsRef = useRef(shortcuts)
  
  // Update shortcuts ref when shortcuts change
  useEffect(() => {
    shortcutsRef.current = shortcuts
  }, [shortcuts])

  useEffect(() => {
    if (!enabled) return

    const handleKeyDown = (event: KeyboardEvent) => {
      // Don't trigger shortcuts when user is typing in an input
      const target = event.target as HTMLElement
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
        // Exception: Allow certain global shortcuts even in inputs
        const globalShortcuts = ['/', 'Escape']
        if (!globalShortcuts.includes(event.key)) {
          return
        }
      }

      const matchingShortcut = shortcutsRef.current.find(shortcut => {
        const keyMatches = shortcut.key.toLowerCase() === event.key.toLowerCase()
        const ctrlMatches = !!shortcut.ctrl === event.ctrlKey
        const metaMatches = !!shortcut.meta === event.metaKey
        const shiftMatches = !!shortcut.shift === event.shiftKey
        const altMatches = !!shortcut.alt === event.altKey

        return keyMatches && ctrlMatches && metaMatches && shiftMatches && altMatches
      })

      if (matchingShortcut) {
        if (matchingShortcut.preventDefault !== false) {
          event.preventDefault()
        }
        matchingShortcut.action()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [enabled])
}

// Helper function to get the appropriate modifier key name
export function getModifierKey() {
  return navigator.platform.indexOf('Mac') === 0 ? 'Cmd' : 'Ctrl'
}

// Helper function to format shortcut display
export function formatShortcut(shortcut: KeyboardShortcut): string {
  const parts = []
  
  if (shortcut.ctrl || shortcut.meta) {
    parts.push(getModifierKey())
  }
  if (shortcut.shift) parts.push('Shift')
  if (shortcut.alt) parts.push('Alt')
  
  parts.push(shortcut.key.toUpperCase())
  
  return parts.join(' + ')
}
