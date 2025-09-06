# 🎨 Apple UI Agent

## Role Definition
**Primary Mission**: Transform the Reddit analytics dashboard into a polished Apple-style interface with frosted glass effects, smooth animations, and the signature pink (#FF8395) brand color integration.

**Status**: READY FOR ACTIVATION after Phase 1 completion
**Priority**: Phase 2 - User Experience Enhancement
**Timeline**: Week 2-3 (Activate after Scraper Monitoring and Protection Agents)

## 🎯 Project Context

You are redesigning the visual interface for a Reddit analytics system used by OnlyFans marketing agencies. The current interface is functional but lacks the premium aesthetic that matches the high-value nature of the service.

### Current Design Problems
- **Generic Styling**: Basic shadcn/ui components without customization
- **No Brand Identity**: Missing consistent color palette and visual hierarchy  
- **Static Interface**: No smooth animations or micro-interactions
- **Poor Visual Hierarchy**: Information lacks proper emphasis and flow
- **No Premium Feel**: Doesn't convey the value of a $25+/month service

### Target Aesthetic: Apple-Inspired Premium Design
- **Frosted Glass**: Backdrop-filter effects with subtle transparency
- **Smooth Animations**: 60fps transitions and micro-interactions
- **Pink Brand Color**: #FF8395 as accent color, not overwhelming
- **Spacious Layouts**: Apple-style white space and breathing room
- **Premium Typography**: Refined font weights and spacing

## 🎨 Design System Specifications

### Color Palette
```css
:root {
  /* Primary Brand */
  --brand-pink: #FF8395;
  --brand-pink-light: #FFB3BF;
  --brand-pink-dark: #E5667A;
  
  /* Apple-inspired Grays */
  --gray-50: #F9FAFB;
  --gray-100: #F3F4F6;
  --gray-200: #E5E7EB;
  --gray-300: #D1D5DB;
  --gray-400: #9CA3AF;
  --gray-500: #6B7280;
  --gray-600: #4B5563;
  --gray-700: #374151;
  --gray-800: #1F2937;
  --gray-900: #111827;
  
  /* Frosted Glass */
  --glass-bg: rgba(255, 255, 255, 0.1);
  --glass-border: rgba(255, 255, 255, 0.2);
  --glass-shadow: 0 8px 32px 0 rgba(31, 38, 135, 0.37);
  
  /* Dark mode variants */
  --glass-bg-dark: rgba(17, 24, 39, 0.8);
  --glass-border-dark: rgba(75, 85, 99, 0.3);
}
```

### Typography System
```css
/* Font weights (Apple-inspired) */
.text-thin { font-weight: 100; }
.text-light { font-weight: 300; }
.text-normal { font-weight: 400; }
.text-medium { font-weight: 500; }
.text-semibold { font-weight: 600; }
.text-bold { font-weight: 700; }

/* Spacing system (Apple-inspired) */
.space-xs { margin: 0.25rem; }  /* 4px */
.space-sm { margin: 0.5rem; }   /* 8px */
.space-md { margin: 1rem; }     /* 16px */
.space-lg { margin: 1.5rem; }   /* 24px */
.space-xl { margin: 2rem; }     /* 32px */
.space-2xl { margin: 3rem; }    /* 48px */
```

### Animation Specifications
```css
/* Smooth transitions */
.transition-smooth {
  transition: all 0.3s cubic-bezier(0.4, 0.0, 0.2, 1);
}

.transition-bounce {
  transition: all 0.5s cubic-bezier(0.68, -0.55, 0.265, 1.55);
}

/* Hover effects */
.hover-lift:hover {
  transform: translateY(-2px);
  box-shadow: var(--glass-shadow);
}

.hover-scale:hover {
  transform: scale(1.02);
}
```

## 🛠️ Technical Requirements

### Core Technologies
- **Tailwind CSS**: Custom configuration with Apple-inspired design tokens
- **Framer Motion**: Smooth animations and page transitions
- **CSS Backdrop-Filter**: Frosted glass effects with fallbacks
- **shadcn/ui**: Customized components with Apple aesthetic
- **Next.js**: App Router with loading states and suspense

### Browser Compatibility
- **Modern Browsers**: Full frosted glass support (Chrome 76+, Safari 14+)
- **Fallback Support**: Solid backgrounds for older browsers
- **Mobile Responsive**: Touch-friendly interactions and spacing

## 📋 Detailed Implementation Steps

### Step 1: Tailwind Configuration Overhaul

#### 1.1 Update `tailwind.config.js`
```javascript
/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  content: [
    './pages/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './app/**/*.{ts,tsx}',
    './src/**/*.{ts,tsx}',
  ],
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      colors: {
        // Brand colors
        brand: {
          pink: '#FF8395',
          'pink-light': '#FFB3BF',
          'pink-dark': '#E5667A',
        },
        // Apple-inspired grays
        gray: {
          50: '#F9FAFB',
          100: '#F3F4F6',
          200: '#E5E7EB',
          300: '#D1D5DB',
          400: '#9CA3AF',
          500: '#6B7280',
          600: '#4B5563',
          700: '#374151',
          800: '#1F2937',
          900: '#111827',
        },
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: '#FF8395',
          foreground: '#FFFFFF',
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
      },
      fontFamily: {
        sans: ['-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'sans-serif'],
      },
      fontSize: {
        'xs': ['0.75rem', { lineHeight: '1rem' }],
        'sm': ['0.875rem', { lineHeight: '1.25rem' }],
        'base': ['1rem', { lineHeight: '1.5rem' }],
        'lg': ['1.125rem', { lineHeight: '1.75rem' }],
        'xl': ['1.25rem', { lineHeight: '1.75rem' }],
        '2xl': ['1.5rem', { lineHeight: '2rem' }],
        '3xl': ['1.875rem', { lineHeight: '2.25rem' }],
        '4xl': ['2.25rem', { lineHeight: '2.5rem' }],
      },
      backdropBlur: {
        xs: '2px',
        sm: '4px',
        md: '8px',
        lg: '16px',
        xl: '24px',
      },
      animation: {
        "fade-in": "fadeIn 0.5s ease-in-out",
        "slide-up": "slideUp 0.3s ease-out",
        "scale-in": "scaleIn 0.2s ease-out",
        "bounce-gentle": "bounceGentle 0.6s ease-out",
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        slideUp: {
          "0%": { transform: "translateY(20px)", opacity: "0" },
          "100%": { transform: "translateY(0)", opacity: "1" },
        },
        scaleIn: {
          "0%": { transform: "scale(0.9)", opacity: "0" },
          "100%": { transform: "scale(1)", opacity: "1" },
        },
        bounceGentle: {
          "0%": { transform: "scale(0.9)" },
          "50%": { transform: "scale(1.02)" },
          "100%": { transform: "scale(1)" },
        },
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
}
```

#### 1.2 Update `src/app/globals.css`
```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    /* Apple-inspired color system */
    --brand-pink: #FF8395;
    --brand-pink-light: #FFB3BF;
    --brand-pink-dark: #E5667A;
    
    /* Frosted glass variables */
    --glass-bg: rgba(255, 255, 255, 0.1);
    --glass-border: rgba(255, 255, 255, 0.2);
    --glass-shadow: 0 8px 32px 0 rgba(31, 38, 135, 0.37);
    
    --background: 0 0% 100%;
    --foreground: 222.2 84% 4.9%;
    --card: 0 0% 100%;
    --card-foreground: 222.2 84% 4.9%;
    --popover: 0 0% 100%;
    --popover-foreground: 222.2 84% 4.9%;
    --primary: 345 100% 76%;  /* Brand pink */
    --primary-foreground: 0 0% 100%;
    --secondary: 210 40% 98%;
    --secondary-foreground: 222.2 84% 4.9%;
    --muted: 210 40% 96%;
    --muted-foreground: 215.4 16.3% 46.9%;
    --accent: 210 40% 96%;
    --accent-foreground: 222.2 84% 4.9%;
    --destructive: 0 84.2% 60.2%;
    --destructive-foreground: 210 40% 98%;
    --border: 214.3 31.8% 91.4%;
    --input: 214.3 31.8% 91.4%;
    --ring: 345 100% 76%;  /* Brand pink */
    --radius: 0.75rem;
  }

  .dark {
    --glass-bg: rgba(17, 24, 39, 0.8);
    --glass-border: rgba(75, 85, 99, 0.3);
    --glass-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.5);
    
    --background: 222.2 84% 4.9%;
    --foreground: 210 40% 98%;
    --card: 222.2 84% 4.9%;
    --card-foreground: 210 40% 98%;
    --popover: 222.2 84% 4.9%;
    --popover-foreground: 210 40% 98%;
    --primary: 345 100% 76%;
    --primary-foreground: 0 0% 100%;
    --secondary: 217.2 32.6% 17.5%;
    --secondary-foreground: 210 40% 98%;
    --muted: 217.2 32.6% 17.5%;
    --muted-foreground: 215 20.2% 65.1%;
    --accent: 217.2 32.6% 17.5%;
    --accent-foreground: 210 40% 98%;
    --destructive: 0 62.8% 30.6%;
    --destructive-foreground: 210 40% 98%;
    --border: 217.2 32.6% 17.5%;
    --input: 217.2 32.6% 17.5%;
    --ring: 345 100% 76%;
  }

  * {
    @apply border-border;
  }

  body {
    @apply bg-background text-foreground;
    font-feature-settings: "rlig" 1, "calt" 1;
  }

  /* Smooth scrolling */
  html {
    scroll-behavior: smooth;
  }
}

@layer components {
  /* Frosted glass card */
  .glass-card {
    @apply backdrop-blur-md border border-white/20 bg-white/10 shadow-lg;
    background: var(--glass-bg);
    border: 1px solid var(--glass-border);
    box-shadow: var(--glass-shadow);
  }
  
  .dark .glass-card {
    @apply border-gray-600/30 bg-gray-800/80;
    background: var(--glass-bg);
    border: 1px solid var(--glass-border);
  }
  
  /* Apple-style buttons */
  .btn-apple {
    @apply relative overflow-hidden rounded-xl px-6 py-3 font-medium transition-all duration-300 ease-out;
    @apply bg-gradient-to-r from-brand-pink to-brand-pink-light;
    @apply text-white shadow-lg hover:shadow-xl;
    @apply transform hover:scale-105 active:scale-95;
  }
  
  .btn-apple-secondary {
    @apply relative overflow-hidden rounded-xl px-6 py-3 font-medium transition-all duration-300 ease-out;
    @apply bg-white/10 backdrop-blur-sm border border-white/20;
    @apply text-gray-700 dark:text-gray-200 hover:bg-white/20;
    @apply transform hover:scale-105 active:scale-95;
  }
  
  /* Smooth transitions */
  .transition-smooth {
    @apply transition-all duration-300 ease-out;
  }
  
  .transition-bounce {
    transition: all 0.5s cubic-bezier(0.68, -0.55, 0.265, 1.55);
  }
  
  /* Hover effects */
  .hover-lift {
    @apply transition-smooth hover:transform hover:-translate-y-1 hover:shadow-lg;
  }
  
  .hover-scale {
    @apply transition-smooth hover:transform hover:scale-102;
  }
  
  /* Apple-style focus rings */
  .focus-ring {
    @apply focus:outline-none focus:ring-2 focus:ring-brand-pink focus:ring-offset-2;
  }
}

@layer utilities {
  /* Text gradients */
  .text-gradient {
    @apply bg-gradient-to-r from-brand-pink to-brand-pink-light bg-clip-text text-transparent;
  }
  
  /* Backdrop filters */
  .backdrop-blur-xs { backdrop-filter: blur(2px); }
  .backdrop-blur-sm { backdrop-filter: blur(4px); }
  .backdrop-blur-md { backdrop-filter: blur(8px); }
  .backdrop-blur-lg { backdrop-filter: blur(16px); }
  .backdrop-blur-xl { backdrop-filter: blur(24px); }
}

/* Loading animations */
.loading-shimmer {
  background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
  background-size: 200% 100%;
  animation: shimmer 2s infinite;
}

@keyframes shimmer {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}

.dark .loading-shimmer {
  background: linear-gradient(90deg, #374151 25%, #4B5563 50%, #374151 75%);
  background-size: 200% 100%;
}
```

### Step 2: Enhanced Component Library

#### 2.1 Create `/src/components/ui/glass-card.tsx`
```typescript
import * as React from "react"
import { cn } from "@/lib/utils"

export interface GlassCardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode
  intensity?: 'light' | 'medium' | 'heavy'
  hover?: boolean
}

const GlassCard = React.forwardRef<HTMLDivElement, GlassCardProps>(
  ({ className, children, intensity = 'medium', hover = true, ...props }, ref) => {
    const intensityClasses = {
      light: 'backdrop-blur-sm bg-white/5 border-white/10',
      medium: 'backdrop-blur-md bg-white/10 border-white/20', 
      heavy: 'backdrop-blur-lg bg-white/20 border-white/30'
    }
    
    return (
      <div
        ref={ref}
        className={cn(
          // Base glass styles
          "rounded-xl border shadow-lg transition-smooth",
          intensityClasses[intensity],
          // Dark mode variants
          "dark:bg-gray-800/80 dark:border-gray-600/30",
          // Hover effects
          hover && "hover-lift hover:shadow-xl",
          // Animation
          "animate-fade-in",
          className
        )}
        {...props}
      >
        {children}
      </div>
    )
  }
)
GlassCard.displayName = "GlassCard"

export { GlassCard }
```

#### 2.2 Create `/src/components/ui/apple-button.tsx`
```typescript
import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const appleButtonVariants = cva(
  "inline-flex items-center justify-center rounded-xl text-sm font-medium transition-smooth focus-ring disabled:pointer-events-none disabled:opacity-50 transform active:scale-95",
  {
    variants: {
      variant: {
        primary: "btn-apple",
        secondary: "btn-apple-secondary", 
        ghost: "hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-200",
        outline: "border-2 border-gray-200 dark:border-gray-700 bg-transparent hover:bg-gray-50 dark:hover:bg-gray-800",
        destructive: "bg-red-500 text-white hover:bg-red-600 shadow-lg hover:shadow-xl",
      },
      size: {
        sm: "h-9 px-3",
        default: "h-11 px-6",
        lg: "h-13 px-8",
        icon: "h-10 w-10",
      },
      rounded: {
        default: "rounded-xl",
        full: "rounded-full",
        none: "rounded-none",
      }
    },
    defaultVariants: {
      variant: "primary",
      size: "default",
      rounded: "default",
    },
  }
)

export interface AppleButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof appleButtonVariants> {
  asChild?: boolean
}

const AppleButton = React.forwardRef<HTMLButtonElement, AppleButtonProps>(
  ({ className, variant, size, rounded, asChild = false, children, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(appleButtonVariants({ variant, size, rounded, className }))}
        ref={ref}
        {...props}
      >
        {children}
      </Comp>
    )
  }
)
AppleButton.displayName = "AppleButton"

export { AppleButton, appleButtonVariants }
```

#### 2.3 Create `/src/components/ui/animated-counter.tsx`
```typescript
'use client'

import { useEffect, useState } from 'react'
import { cn } from '@/lib/utils'

interface AnimatedCounterProps {
  end: number
  start?: number
  duration?: number
  className?: string
  prefix?: string
  suffix?: string
}

export function AnimatedCounter({ 
  end, 
  start = 0, 
  duration = 2000, 
  className,
  prefix = '',
  suffix = '' 
}: AnimatedCounterProps) {
  const [count, setCount] = useState(start)
  
  useEffect(() => {
    if (start === end) return
    
    const increment = (end - start) / (duration / 16) // 60fps
    let current = start
    
    const timer = setInterval(() => {
      current += increment
      if ((increment > 0 && current >= end) || (increment < 0 && current <= end)) {
        setCount(end)
        clearInterval(timer)
      } else {
        setCount(Math.floor(current))
      }
    }, 16)
    
    return () => clearInterval(timer)
  }, [end, start, duration])
  
  return (
    <span className={cn("tabular-nums", className)}>
      {prefix}{count.toLocaleString()}{suffix}
    </span>
  )
}
```

### Step 3: Page Layout Transformations

#### 3.1 Update Main Dashboard Layout `/src/app/(dashboard)/layout.tsx`
```typescript
import { Suspense } from 'react'
import { GlassCard } from '@/components/ui/glass-card'
import { Sidebar } from '@/components/navigation/sidebar'
import { TopBar } from '@/components/navigation/top-bar'
import { ErrorBoundary } from '@/components/error/ErrorBoundary'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <div className="flex h-screen overflow-hidden">
        {/* Sidebar */}
        <div className="hidden lg:flex lg:flex-shrink-0">
          <div className="flex w-64 flex-col">
            <ErrorBoundary>
              <GlassCard className="flex-1 m-4">
                <Sidebar />
              </GlassCard>
            </ErrorBoundary>
          </div>
        </div>

        {/* Main content */}
        <div className="flex flex-1 flex-col overflow-hidden">
          {/* Top bar */}
          <ErrorBoundary>
            <div className="p-4 pb-0">
              <GlassCard className="h-16">
                <TopBar />
              </GlassCard>
            </div>
          </ErrorBoundary>

          {/* Page content */}
          <main className="flex-1 overflow-hidden p-4">
            <ErrorBoundary>
              <div className="h-full rounded-xl overflow-auto">
                <Suspense fallback={
                  <div className="flex items-center justify-center h-64">
                    <div className="loading-shimmer h-8 w-32 rounded-lg"></div>
                  </div>
                }>
                  {children}
                </Suspense>
              </div>
            </ErrorBoundary>
          </main>
        </div>
      </div>
    </div>
  )
}
```

#### 3.2 Create Enhanced Subreddit Review Page
```typescript
// This would replace the existing subreddit review page with Apple-style design
'use client'

import { useState, useEffect } from 'react'
import { GlassCard } from '@/components/ui/glass-card'
import { AppleButton } from '@/components/ui/apple-button'
import { AnimatedCounter } from '@/components/ui/animated-counter'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Search, Filter, Download, RefreshCw } from 'lucide-react'

export default function SubredditReviewPage() {
  const [subreddits, setSubreddits] = useState([])
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({
    total: 4865,
    reviewed: 425,
    pending: 4440
  })

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header Section */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold text-gradient mb-2">
            Subreddit Review
          </h1>
          <p className="text-gray-600 dark:text-gray-400 text-lg">
            Discover and categorize subreddits for OnlyFans marketing
          </p>
        </div>
        <div className="flex space-x-3">
          <AppleButton variant="secondary" size="lg">
            <Download className="mr-2 h-5 w-5" />
            Export Data
          </AppleButton>
          <AppleButton size="lg">
            <RefreshCw className="mr-2 h-5 w-5" />
            Refresh
          </AppleButton>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <GlassCard className="p-6 hover-scale">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Total Subreddits
              </p>
              <p className="text-3xl font-bold text-gradient">
                <AnimatedCounter end={stats.total} />
              </p>
            </div>
            <div className="h-12 w-12 rounded-xl bg-brand-pink/20 flex items-center justify-center">
              <div className="h-6 w-6 bg-brand-pink rounded-lg"></div>
            </div>
          </div>
        </GlassCard>

        <GlassCard className="p-6 hover-scale">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Reviewed
              </p>
              <p className="text-3xl font-bold text-green-600">
                <AnimatedCounter end={stats.reviewed} />
              </p>
            </div>
            <div className="h-12 w-12 rounded-xl bg-green-100 flex items-center justify-center">
              <div className="h-6 w-6 bg-green-500 rounded-lg"></div>
            </div>
          </div>
        </GlassCard>

        <GlassCard className="p-6 hover-scale">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Pending Review
              </p>
              <p className="text-3xl font-bold text-amber-600">
                <AnimatedCounter end={stats.pending} />
              </p>
            </div>
            <div className="h-12 w-12 rounded-xl bg-amber-100 flex items-center justify-center">
              <div className="h-6 w-6 bg-amber-500 rounded-lg"></div>
            </div>
          </div>
        </GlassCard>
      </div>

      {/* Filters Section */}
      <GlassCard className="p-6">
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
              <Input
                placeholder="Search subreddits..."
                className="pl-10 h-12 text-lg bg-white/50 border-white/20 focus:bg-white/70"
              />
            </div>
          </div>
          <div className="flex gap-3">
            <AppleButton variant="secondary">
              <Filter className="mr-2 h-5 w-5" />
              Filters
            </AppleButton>
            <AppleButton variant="ghost">
              Clear All
            </AppleButton>
          </div>
        </div>
      </GlassCard>

      {/* Subreddit Table */}
      <GlassCard className="overflow-hidden">
        {/* Table implementation with Apple-style design */}
        <div className="p-6">
          <div className="text-center py-20">
            <div className="loading-shimmer h-64 w-full rounded-lg"></div>
          </div>
        </div>
      </GlassCard>
    </div>
  )
}
```

### Step 4: Animation System Implementation

#### 4.1 Install Framer Motion
```bash
npm install framer-motion
```

#### 4.2 Create `/src/components/animation/page-transition.tsx`
```typescript
'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { usePathname } from 'next/navigation'

interface PageTransitionProps {
  children: React.ReactNode
}

const pageVariants = {
  initial: {
    opacity: 0,
    y: 20,
    scale: 0.98
  },
  enter: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      duration: 0.4,
      ease: [0.4, 0.0, 0.2, 1]
    }
  },
  exit: {
    opacity: 0,
    y: -20,
    scale: 0.98,
    transition: {
      duration: 0.3,
      ease: [0.4, 0.0, 1, 1]
    }
  }
}

export function PageTransition({ children }: PageTransitionProps) {
  const pathname = usePathname()

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={pathname}
        variants={pageVariants}
        initial="initial"
        animate="enter"
        exit="exit"
        className="h-full"
      >
        {children}
      </motion.div>
    </AnimatePresence>
  )
}
```

#### 4.3 Create `/src/components/animation/stagger-container.tsx`
```typescript
'use client'

import { motion } from 'framer-motion'

interface StaggerContainerProps {
  children: React.ReactNode
  className?: string
  delay?: number
}

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.2
    }
  }
}

export const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  show: { 
    opacity: 1, 
    y: 0,
    transition: {
      duration: 0.4,
      ease: [0.4, 0.0, 0.2, 1]
    }
  }
}

export function StaggerContainer({ children, className, delay = 0 }: StaggerContainerProps) {
  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className={className}
      style={{ animationDelay: `${delay}ms` }}
    >
      {children}
    </motion.div>
  )
}

export function StaggerItem({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <motion.div variants={itemVariants} className={className}>
      {children}
    </motion.div>
  )
}
```

## ✅ Success Criteria & Validation

### Apple UI Transformation Checklist
- [ ] **Frosted Glass Cards**: All major components use glass-card styling
- [ ] **Pink Brand Integration**: #FF8395 accent color used tastefully throughout
- [ ] **Smooth Animations**: 60fps transitions on all interactions
- [ ] **Apple Typography**: Proper font weights and spacing implemented
- [ ] **Responsive Design**: Works perfectly on all device sizes
- [ ] **Loading States**: Beautiful shimmer effects during data loading
- [ ] **Hover Effects**: Subtle lift and scale animations on interactive elements
- [ ] **Page Transitions**: Smooth navigation between routes

### Visual Quality Standards
```typescript
// Example component that meets Apple UI standards
const AppleQualityComponent = () => (
  <GlassCard className="p-6 hover-scale">
    <div className="flex items-center justify-between mb-4">
      <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200">
        Component Title
      </h3>
      <Badge className="bg-brand-pink/20 text-brand-pink border-brand-pink/30">
        Status
      </Badge>
    </div>
    <AnimatedCounter end={1234} className="text-2xl font-bold text-gradient" />
    <AppleButton className="mt-4 w-full">
      Take Action
    </AppleButton>
  </GlassCard>
)
```

### Performance Requirements
- **Animation Performance**: 60fps on all transitions
- **Load Time**: Design system CSS under 50KB gzipped
- **Accessibility**: All animations respect `prefers-reduced-motion`
- **Browser Support**: Graceful degradation for backdrop-filter

### Testing Commands
```bash
# Check bundle size
npm run build && npx bundlesize

# Lighthouse audit
npx lighthouse http://localhost:3000 --view

# Accessibility testing  
npm install -g @axe-core/cli
axe http://localhost:3000
```

## 🔗 Integration Points

### With Other Agents
- **Protection Agent**: All new components must have error boundaries
- **Website Filter Agent**: Enhanced filtering UI will use Apple design system
- **Testing Agent**: Visual regression tests for design consistency

### Component Integration
Every existing component should be gradually updated to use:
- `GlassCard` instead of plain `Card`
- `AppleButton` for all button interactions
- `AnimatedCounter` for numeric displays
- Proper Apple color palette and spacing

### Dark Mode Support
All components must support both light and dark themes with proper contrast ratios and frosted glass effects.

## 📊 Design System Metrics

### Key Indicators
- **Brand Consistency**: 100% use of defined color palette
- **Animation Performance**: All transitions under 16ms per frame
- **Component Reuse**: 80%+ of UI uses design system components
- **Accessibility Score**: 95+ on Lighthouse accessibility audit
- **User Satisfaction**: Premium feel matching $25+/month service value

## 🎯 Next Agent Handoff

Once Apple UI is implemented:
1. **Website Filter Agent** will enhance filtering with beautiful Apple-style controls
2. **All Future Agents** must use the established design system
3. **Testing Agent** will validate visual consistency across all components

**Completion Signal**: All major pages transformed with Apple aesthetic, frosted glass effects working, smooth animations implemented, brand pink integrated tastefully.