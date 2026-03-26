import React, { createContext, useContext, useState, type ReactNode } from 'react'

export interface DownloadTask {
  id: string
  url: string
  title: string
  status: 'pending' | 'downloading' | 'paused' | 'completed' | 'failed'
  progress: number
  type: 'TS' | 'MP4'
}

interface DownloadContextType {
  tasks: DownloadTask[]
  showDownloadPanel: boolean
  setShowDownloadPanel: (show: boolean) => void
}

const DownloadContext = createContext<DownloadContextType | undefined>(undefined)

export function DownloadProvider({ children }: { children: ReactNode }) {
  const [tasks] = useState<DownloadTask[]>([])
  const [showDownloadPanel, setShowDownloadPanel] = useState(false)

  return (
    <DownloadContext.Provider value={{ tasks, showDownloadPanel, setShowDownloadPanel }}>
      {children}
    </DownloadContext.Provider>
  )
}

export function useDownload() {
  const ctx = useContext(DownloadContext)
  if (!ctx) throw new Error('useDownload must be used within DownloadProvider')
  return ctx
}
