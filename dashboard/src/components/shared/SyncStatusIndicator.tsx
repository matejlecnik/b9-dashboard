
'use client'

import { useState, useEffect } from 'react'

/**
 * Mock sync status hook
 */
function useSyncStatus() {
  const [isOnline, setIsOnline] = useState(true)
  const [pendingMutations] = useState(0)
  const [isSyncing] = useState(false)
  const [lastSyncAt] = useState<Date | null>(null)

  useEffect(() => {
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  return { isOnline, pendingMutations, isSyncing, lastSyncAt }
}

/**
 * Component to display sync status
 */
export function SyncStatusIndicator() {
  const { isOnline, pendingMutations, isSyncing, lastSyncAt } = useSyncStatus()

  if (isOnline && pendingMutations === 0 && !isSyncing) {
    return null // Everything is synced
  }

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <div className={`px-4 py-2 rounded-lg shadow-lg flex items-center gap-2 ${
        isOnline ? 'bg-white' : 'bg-yellow-100'
      }`}>
        {!isOnline && (
          <>
            <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse" />
            <span className="text-sm text-yellow-700">Offline mode</span>
          </>
        )}

        {isSyncing && (
          <>
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
            <span className="text-sm text-blue-700">Syncing...</span>
          </>
        )}

        {pendingMutations > 0 && !isSyncing && (
          <span className="text-sm text-gray-600">
            {pendingMutations} pending changes
          </span>
        )}

        {lastSyncAt && (
          <span className="text-xs text-gray-500">
            Last sync: {lastSyncAt.toLocaleTimeString()}
          </span>
        )}
      </div>
    </div>
  )
}