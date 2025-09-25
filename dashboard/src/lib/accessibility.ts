/**
 * Accessibility Utilities for B9 Dashboard
 * Provides standardized ARIA patterns, keyboard navigation, and accessibility helpers
 */

import { useCallback, useEffect } from 'react'
// ============================================================================
// ARIA PATTERNS AND CONSTANTS
// ============================================================================

export const ARIA_PATTERNS = {
  // Table patterns
  table: {
    table: 'table',
    row: 'row',
    columnheader: 'columnheader',
    cell: 'cell',
    gridcell: 'gridcell'
  },
  
  // Navigation patterns
  navigation: {
    navigation: 'navigation',
    menu: 'menu',
    menuitem: 'menuitem',
    menubar: 'menubar'
  },
  
  // Form patterns
  form: {
    group: 'group',
    search: 'search',
    combobox: 'combobox',
    listbox: 'listbox',
    option: 'option'
  },
  
  // Interactive patterns
  interactive: {
    button: 'button',
    link: 'link',
    tab: 'tab',
    tablist: 'tablist',
    tabpanel: 'tabpanel'
  },
  
  // Status patterns
  status: {
    alert: 'alert',
    status: 'status',
    progressbar: 'progressbar',
    region: 'region'
  }
} as const

export const ARIA_STATES = {
  // Boolean states
  pressed: 'aria-pressed',
  selected: 'aria-selected',
  checked: 'aria-checked',
  expanded: 'aria-expanded',
  hidden: 'aria-hidden',
  disabled: 'aria-disabled',
  
  // String states
  current: 'aria-current',
  sort: 'aria-sort',
  label: 'aria-label',
  labelledby: 'aria-labelledby',
  describedby: 'aria-describedby',
  
  // Numeric states
  level: 'aria-level',
  setsize: 'aria-setsize',
  posinset: 'aria-posinset',
  
  // Relationship states
  controls: 'aria-controls',
  owns: 'aria-owns',
  flowto: 'aria-flowto'
} as const

// ============================================================================
// KEYBOARD NAVIGATION CONSTANTS
// ============================================================================

export const KEYBOARD_SHORTCUTS = {
  // Global shortcuts
  SEARCH_FOCUS: '/',
  ESCAPE: 'Escape',
  ENTER: 'Enter',
  SPACE: ' ',
  
  // Navigation shortcuts
  ARROW_UP: 'ArrowUp',
  ARROW_DOWN: 'ArrowDown',
  ARROW_LEFT: 'ArrowLeft',
  ARROW_RIGHT: 'ArrowRight',
  HOME: 'Home',
  END: 'End',
  PAGE_UP: 'PageUp',
  PAGE_DOWN: 'PageDown',
  
  // Review shortcuts (B9 specific)
  REVIEW_OK: '1',
  REVIEW_NO_SELLER: '2',
  REVIEW_NON_RELATED: '3',
  REVIEW_USER_FEED: '4',
  
  // Modifier keys
  CTRL: 'Control',
  META: 'Meta',
  SHIFT: 'Shift',
  ALT: 'Alt'
} as const

// ============================================================================
// ACCESSIBILITY HELPERS
// ============================================================================

/**
 * Generate standardized ARIA attributes for tables
 */
export function getTableAria(options: {
  isTable?: boolean
  isHeader?: boolean
  isCell?: boolean
  sortDirection?: 'asc' | 'desc' | 'none'
  rowSelected?: boolean
  columnIndex?: number
  rowIndex?: number
}) {
  const attrs: Record<string, string | boolean | number> = {}
  
  if (options.isTable) {
    attrs.role = ARIA_PATTERNS.table.table
    attrs['aria-busy'] = false
  }
  
  if (options.isHeader) {
    attrs.role = ARIA_PATTERNS.table.columnheader
    if (options.sortDirection && options.sortDirection !== 'none') {
      attrs[ARIA_STATES.sort] = options.sortDirection === 'asc' ? 'ascending' : 'descending'
    }
  }
  
  if (options.isCell) {
    attrs.role = ARIA_PATTERNS.table.cell
  }
  
  if (options.rowSelected !== undefined) {
    attrs[ARIA_STATES.selected] = options.rowSelected
  }
  
  return attrs
}

/**
 * Generate standardized ARIA attributes for navigation
 */
export function getNavigationAria(options: {
  isNavigation?: boolean
  isMenu?: boolean
  isMenuItem?: boolean
  isCurrent?: boolean
  hasSubmenu?: boolean
  expanded?: boolean
}) {
  const attrs: Record<string, string | boolean> = {}
  
  if (options.isNavigation) {
    attrs.role = ARIA_PATTERNS.navigation.navigation
  }
  
  if (options.isMenu) {
    attrs.role = ARIA_PATTERNS.navigation.menu
  }
  
  if (options.isMenuItem) {
    attrs.role = ARIA_PATTERNS.navigation.menuitem
    if (options.isCurrent) {
      attrs[ARIA_STATES.current] = 'page'
    }
  }
  
  if (options.hasSubmenu && options.expanded !== undefined) {
    attrs[ARIA_STATES.expanded] = options.expanded
  }
  
  return attrs
}

/**
 * Generate standardized ARIA attributes for forms and inputs
 */
export function getFormAria(options: {
  isSearch?: boolean
  isCombobox?: boolean
  isListbox?: boolean
  isOption?: boolean
  isGroup?: boolean
  expanded?: boolean
  hasPopup?: boolean
  controls?: string
  describedby?: string
  labelledby?: string
  label?: string
}) {
  const attrs: Record<string, string | boolean> = {}
  
  if (options.isSearch) {
    attrs.role = ARIA_PATTERNS.form.search
  }
  
  if (options.isCombobox) {
    attrs.role = ARIA_PATTERNS.form.combobox
    if (options.expanded !== undefined) {
      attrs[ARIA_STATES.expanded] = options.expanded
    }
    if (options.hasPopup) {
      attrs['aria-haspopup'] = 'listbox'
    }
  }
  
  if (options.isListbox) {
    attrs.role = ARIA_PATTERNS.form.listbox
  }
  
  if (options.isOption) {
    attrs.role = ARIA_PATTERNS.form.option
  }
  
  if (options.isGroup) {
    attrs.role = ARIA_PATTERNS.form.group
  }
  
  if (options.controls) {
    attrs[ARIA_STATES.controls] = options.controls
  }
  
  if (options.describedby) {
    attrs[ARIA_STATES.describedby] = options.describedby
  }
  
  if (options.labelledby) {
    attrs[ARIA_STATES.labelledby] = options.labelledby
  }
  
  if (options.label) {
    attrs[ARIA_STATES.label] = options.label
  }
  
  return attrs
}

/**
 * Generate standardized ARIA attributes for interactive elements
 */
export function getInteractiveAria(options: {
  isButton?: boolean
  isPressed?: boolean
  isToggle?: boolean
  disabled?: boolean
  label?: string
  describedby?: string
  controls?: string
}) {
  const attrs: Record<string, string | boolean> = {}
  
  if (options.isButton) {
    attrs.role = ARIA_PATTERNS.interactive.button
  }
  
  if (options.isToggle && options.isPressed !== undefined) {
    attrs[ARIA_STATES.pressed] = options.isPressed
  }
  
  if (options.disabled !== undefined) {
    attrs[ARIA_STATES.disabled] = options.disabled
  }
  
  if (options.label) {
    attrs[ARIA_STATES.label] = options.label
  }
  
  if (options.describedby) {
    attrs[ARIA_STATES.describedby] = options.describedby
  }
  
  if (options.controls) {
    attrs[ARIA_STATES.controls] = options.controls
  }
  
  return attrs
}

// ============================================================================
// KEYBOARD NAVIGATION HOOKS
// ============================================================================

/**
 * Standardized keyboard navigation for search inputs
 */
export function useSearchKeyboard(options: {
  onFocus?: () => void
  onClear?: () => void
  enabled?: boolean
  searchId?: string
}) {
  const { onFocus, onClear, enabled = false, searchId } = options
  
  useEffect(() => {
    if (!enabled) return
    
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't interfere with input fields
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        // Handle Escape to clear search
        if (e.key === KEYBOARD_SHORTCUTS.ESCAPE && onClear) {
          onClear()
          ;(e.target as HTMLInputElement).blur()
        }
        return
      }
      
      // Global search focus shortcut
      if (e.key === KEYBOARD_SHORTCUTS.SEARCH_FOCUS && onFocus) {
        e.preventDefault()
        if (searchId) {
          document.getElementById(searchId)?.focus()
        }
        onFocus()
      }
    }
    
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [enabled, onFocus, onClear, searchId])
}

/**
 * Standardized keyboard navigation for review workflows
 */
export function useReviewKeyboard(options: {
  onOk?: () => void
  onNoSeller?: () => void
  onNonRelated?: () => void
  onUserFeed?: () => void
  onClearSelection?: () => void
  enabled?: boolean
}) {
  const { onOk, onNoSeller, onNonRelated, onUserFeed, onClearSelection, enabled = false } = options
  
  useEffect(() => {
    if (!enabled) return
    
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't interfere with input fields
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return
      }
      
      switch (e.key) {
        case KEYBOARD_SHORTCUTS.REVIEW_OK:
          e.preventDefault()
          onOk?.()
          break
        case KEYBOARD_SHORTCUTS.REVIEW_NO_SELLER:
          e.preventDefault()
          onNoSeller?.()
          break
        case KEYBOARD_SHORTCUTS.REVIEW_NON_RELATED:
          e.preventDefault()
          onNonRelated?.()
          break
        case KEYBOARD_SHORTCUTS.REVIEW_USER_FEED:
          e.preventDefault()
          onUserFeed?.()
          break
        case KEYBOARD_SHORTCUTS.ESCAPE:
          e.preventDefault()
          onClearSelection?.()
          break
      }
    }
    
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [enabled, onOk, onNoSeller, onNonRelated, onUserFeed, onClearSelection])
}

/**
 * Standardized keyboard navigation for lists and tables
 */
export function useListKeyboard(options: {
  itemCount: number
  selectedIndex?: number
  onSelectionChange?: (index: number) => void
  onActivate?: (index: number) => void
  enabled?: boolean
  circular?: boolean
}) {
  const { itemCount, selectedIndex, onSelectionChange, onActivate, enabled = false, circular = false } = options
  
  useEffect(() => {
    if (!enabled || typeof selectedIndex !== 'number') return
    
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't interfere with input fields
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return
      }
      
      let newIndex = selectedIndex
      
      switch (e.key) {
        case KEYBOARD_SHORTCUTS.ARROW_UP:
          e.preventDefault()
          newIndex = selectedIndex > 0 ? selectedIndex - 1 : (circular ? itemCount - 1 : 0)
          break
        case KEYBOARD_SHORTCUTS.ARROW_DOWN:
          e.preventDefault()
          newIndex = selectedIndex < itemCount - 1 ? selectedIndex + 1 : (circular ? 0 : itemCount - 1)
          break
        case KEYBOARD_SHORTCUTS.HOME:
          e.preventDefault()
          newIndex = 0
          break
        case KEYBOARD_SHORTCUTS.END:
          e.preventDefault()
          newIndex = itemCount - 1
          break
        case KEYBOARD_SHORTCUTS.ENTER:
        case KEYBOARD_SHORTCUTS.SPACE:
          e.preventDefault()
          onActivate?.(selectedIndex)
          return
      }
      
      if (newIndex !== selectedIndex && newIndex >= 0 && newIndex < itemCount) {
        onSelectionChange?.(newIndex)
      }
    }
    
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [enabled, selectedIndex, itemCount, onSelectionChange, onActivate, circular])
}

// ============================================================================
// FOCUS MANAGEMENT
// ============================================================================

/**
 * Focus management utilities
 */
export const focusUtils = {
  /**
   * Focus the first focusable element in a container
   */
  focusFirst: (container: HTMLElement | null) => {
    if (!container) return false
    
    const focusable = container.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    ) as NodeListOf<HTMLElement>
    
    const firstElement = focusable[0]
    if (firstElement) {
      firstElement.focus()
      return true
    }
    
    return false
  },
  
  /**
   * Focus the last focusable element in a container
   */
  focusLast: (container: HTMLElement | null) => {
    if (!container) return false
    
    const focusable = container.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    ) as NodeListOf<HTMLElement>
    
    const lastElement = focusable[focusable.length - 1]
    if (lastElement) {
      lastElement.focus()
      return true
    }
    
    return false
  },
  
  /**
   * Trap focus within a container
   */
  trapFocus: (container: HTMLElement | null, event: KeyboardEvent) => {
    if (!container || event.key !== 'Tab') return
    
    const focusable = container.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    ) as NodeListOf<HTMLElement>
    
    if (focusable.length === 0) return
    
    const firstElement = focusable[0]
    const lastElement = focusable[focusable.length - 1]
    
    if (event.shiftKey) {
      // Shift + Tab
      if (document.activeElement === firstElement) {
        event.preventDefault()
        lastElement.focus()
      }
    } else {
      // Tab
      if (document.activeElement === lastElement) {
        event.preventDefault()
        firstElement.focus()
      }
    }
  }
}

// ============================================================================
// COLOR CONTRAST UTILITIES
// ============================================================================

/**
 * Color contrast utilities for accessibility compliance
 */
export const colorContrastUtils = {
  /**
   * Check if color combination meets WCAG AA standards
   */
  meetsWCAGAA: (foreground: string, background: string): boolean => {
    // This is a simplified check - in production you'd use a proper contrast calculation
    // For now, we'll validate against known B9 brand colors
    const safeCombinations = [
      { fg: '#000000', bg: '#FFFFFF' }, // Black on white
      { fg: '#FFFFFF', bg: '#FF8395' }, // White on B9 pink
      { fg: '#374151', bg: '#F9FAFB' }, // Dark gray on light gray
      { fg: '#1F2937', bg: '#FFFFFF' }, // Very dark gray on white
    ]
    
    return safeCombinations.some(combo => 
      combo.fg.toLowerCase() === foreground.toLowerCase() && 
      combo.bg.toLowerCase() === background.toLowerCase()
    )
  },
  
  /**
   * Get accessible color combinations for B9 brand
   */
  getAccessibleCombination: (intent: 'primary' | 'secondary' | 'success' | 'warning' | 'error') => {
    const combinations = {
      primary: { fg: '#FFFFFF', bg: '#FF8395', border: '#FF6B80' },
      secondary: { fg: '#374151', bg: '#F9FAFB', border: '#E5E7EB' },
      success: { fg: '#FFFFFF', bg: '#10B981', border: '#059669' },
      warning: { fg: '#92400E', bg: '#FEF3C7', border: '#F59E0B' },
      error: { fg: '#FFFFFF', bg: '#EF4444', border: '#DC2626' }
    }
    
    return combinations[intent]
  }
}

// ============================================================================
// SCREEN READER UTILITIES
// ============================================================================

/**
 * Screen reader utilities
 */
export const screenReaderUtils = {
  /**
   * Announce a message to screen readers
   */
  announce: (title: string, priority: 'polite' | 'assertive' = 'polite') => {
    const announcer = document.createElement('div')
    announcer.setAttribute('aria-live', priority)
    announcer.setAttribute('aria-atomic', 'true')
    announcer.className = 'sr-only'
    announcer.textContent = title
    
    document.body.appendChild(announcer)
    
    // Remove after announcement
    setTimeout(() => {
      document.body.removeChild(announcer)
    }, 1000)
  },
  
  /**
   * Create screen reader only text
   */
  createSROnlyText: (text: string) => ({
    className: 'sr-only',
    children: text
  }),
  
  /**
   * Generate descriptive text for complex UI elements
   */
  describeTableRow: (rowData: Record<string, unknown>, rowIndex: number) => {
    const keys = Object.keys(rowData)
    const description = keys
      .map(key => `${key}: ${(rowData as Record<string, unknown>)[key]}`)
      .join(', ')
    
    return `Row ${rowIndex + 1} of table. ${description}`
  }
}

// ============================================================================
// ACCESSIBILITY VALIDATION
// ============================================================================

/**
 * Validate accessibility attributes
 */
export function validateAccessibility(element: HTMLElement): {
  isValid: boolean
  issues: string[]
  suggestions: string[]
} {
  const issues: string[] = []
  const suggestions: string[] = []
  
  // Check for required attributes
  if (element.getAttribute('role') === 'button' && !element.getAttribute('aria-label') && !element.textContent?.trim()) {
    issues.push('Button element missing accessible name')
    suggestions.push('Add aria-label or visible text content')
  }
  
  if (element.getAttribute('role') === 'table' && !element.getAttribute('aria-label') && !element.getAttribute('aria-labelledby')) {
    issues.push('Table missing accessible name')
    suggestions.push('Add aria-label or aria-labelledby')
  }
  
  // Check for interactive elements without proper roles
  if (element.tagName === 'DIV' && element.onclick && !element.getAttribute('role')) {
    issues.push('Interactive div missing role attribute')
    suggestions.push('Add role="button" or use proper button element')
  }
  
  // Check for images without alt text
  if (element.tagName === 'IMG' && !element.getAttribute('alt')) {
    issues.push('Image missing alt text')
    suggestions.push('Add descriptive alt attribute')
  }
  
  return {
    isValid: issues.length === 0,
    issues,
    suggestions
  }
}

// ============================================================================
// ACCESSIBILITY HOOK
// ============================================================================

/**
 * Comprehensive accessibility hook for components
 */
export function useAccessibility(options: {
  componentName?: string
  // Flags reserved for future enhancements; currently unused
  enableKeyboard?: boolean
  enableFocusManagement?: boolean
  announceChanges?: boolean
}) {
  const { componentName, announceChanges = false } = options
  
  const announce = useCallback((title: string, priority: 'polite' | 'assertive' = 'polite') => {
    if (announceChanges) {
      screenReaderUtils.announce(`${componentName ? `${componentName}: ` : ''}${title}`, priority)
    }
  }, [componentName, announceChanges])
  
  const getTableAriaCallback = useCallback(getTableAria, [])
  const getNavigationAriaCallback = useCallback(getNavigationAria, [])
  const getFormAriaCallback = useCallback(getFormAria, [])
  const getInteractiveAriaCallback = useCallback(getInteractiveAria, [])
  
  return {
    announce,
    getTableAria: getTableAriaCallback,
    getNavigationAria: getNavigationAriaCallback,
    getFormAria: getFormAriaCallback,
    getInteractiveAria: getInteractiveAriaCallback,
    focusUtils,
    colorContrastUtils,
    screenReaderUtils,
    ARIA_PATTERNS,
    ARIA_STATES,
    KEYBOARD_SHORTCUTS
  }
}
