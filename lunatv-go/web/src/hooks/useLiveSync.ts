import { useCallback, useEffect, useRef, useState } from 'react'

export interface LiveSyncState {
  isConnected: boolean
  currentUrl: string | null
  currentTitle: string | null
}

export function useLiveSync() {
  const [state, setState] = useState<LiveSyncState>({
    isConnected: false,
    currentUrl: null,
    currentTitle: null,
  })

  const sync = useCallback((url: string, title: string) => {
    setState((prev) => ({ ...prev, currentUrl: url, currentTitle: title }))
  }, [])

  return { ...state, sync }
}
