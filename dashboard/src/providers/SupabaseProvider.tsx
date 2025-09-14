'use client'

import { createContext, useContext, useMemo, ReactNode } from 'react'
import { supabase } from '@/lib/supabase'
import type { SupabaseClient } from '@supabase/supabase-js'

interface SupabaseContextType {
  supabase: SupabaseClient | null
  platform: string
}

const SupabaseContext = createContext<SupabaseContextType | undefined>(undefined)

interface SupabaseProviderProps {
  children: ReactNode
  platform: string
}

export function SupabaseProvider({ children, platform }: SupabaseProviderProps) {
  const value = useMemo(
    () => ({
      supabase: supabase,
      platform
    }),
    [platform]
  )

  return (
    <SupabaseContext.Provider value={value}>
      {children}
    </SupabaseContext.Provider>
  )
}

// Hook to use platform-specific Supabase client
export function usePlatformSupabase() {
  const context = useContext(SupabaseContext)

  if (context === undefined) {
    throw new Error('usePlatformSupabase must be used within a SupabaseProvider')
  }

  return context
}

// Hook to get just the Supabase client
export function useSupabase() {
  const { supabase } = usePlatformSupabase()
  return supabase
}

// Hook to get the current platform
export function useCurrentPlatform() {
  const { platform } = usePlatformSupabase()
  return platform
}