/**
 * Simplified animation variants for optimal performance
 * Only includes essential fade animations
 */

// Basic card animation - just opacity fade
export const cardVariants = {
  initial: { opacity: 0 },
  animate: { 
    opacity: 1,
    transition: {
      duration: 0.15,
      ease: 'easeOut'
    }
  }
}

// No stagger effects for performance
export const staggerContainer = {
  animate: {}
}

// Simple fade in only
export const fadeInUp = {
  initial: { opacity: 0 },
  animate: { opacity: 1 }
}

export const slideInLeft = {
  initial: { opacity: 0 },
  animate: { opacity: 1 }
}

export const scaleIn = {
  initial: { opacity: 0 },
  animate: { 
    opacity: 1,
    transition: {
      duration: 0.15,
      ease: 'easeOut'
    }
  }
}

// Removed shimmer and pulse for performance
export const shimmerVariants = {
  animate: {}
}

export const pulseVariants = {
  animate: {}
}

// Simple sparkline animation
export const sparklineVariants = {
  initial: { opacity: 0 },
  animate: { opacity: 1 }
}

// Minimal button feedback
export const buttonVariants = {
  tap: {
    scale: 0.95,
    transition: {
      duration: 0.05
    }
  }
}

export const badgeVariants = {
  initial: { opacity: 0 },
  animate: { opacity: 1 }
}

// Simple expand/collapse
export const expandVariants = {
  collapsed: { 
    height: 0,
    opacity: 0,
    transition: {
      duration: 0.15,
      ease: 'easeOut'
    }
  },
  expanded: { 
    height: 'auto',
    opacity: 1,
    transition: {
      duration: 0.15,
      ease: 'easeOut'
    }
  }
}

// Remove glass panel effects
export const glassPanelVariants = {
  initial: { opacity: 0 },
  animate: { opacity: 1 }
}

// Removed heatmap animations for performance

// Performance-first animation utilities
export const staticVariants = {
  initial: { opacity: 0 },
  animate: { opacity: 1, transition: { duration: 0.15, ease: 'easeOut' } }
}

export const quickFade = {
  initial: { opacity: 0 },
  animate: { opacity: 1, transition: { duration: 0.1 } }
}

// Only essential feedback animations
export const buttonPress = {
  tap: { scale: 0.95, transition: { duration: 0.05 } }
}