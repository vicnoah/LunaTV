import { createContext, ReactNode, useContext, useState } from 'react'

interface DownloadTask {
  id: string
  title: string
  url: string
  status: 'pending' | 'downloading' | 'done' | 'error'
  progress?: number
}

interface DownloadContextValue {
  tasks: DownloadTask[]
  showDownloadPanel: boolean
  setShowDownloadPanel: (show: boolean) => void
  createTask: (task: Omit<DownloadTask, 'id' | 'status'>) => void
}

const DownloadContext = createContext<DownloadContextValue>({
  tasks: [],
  showDownloadPanel: false,
  setShowDownloadPanel: () => {},
  createTask: () => {},
})

export function useDownload() {
  return useContext(DownloadContext)
}

export function DownloadProvider({ children }: { children: ReactNode }) {
  const [tasks, setTasks] = useState<DownloadTask[]>([])
  const [showDownloadPanel, setShowDownloadPanel] = useState(false)

  const createTask = (task: Omit<DownloadTask, 'id' | 'status'>) => {
    const newTask: DownloadTask = {
      ...task,
      id: `${Date.now()}-${Math.random()}`,
      status: 'pending',
    }
    setTasks((prev) => [...prev, newTask])
  }

  return (
    <DownloadContext.Provider value={{ tasks, showDownloadPanel, setShowDownloadPanel, createTask }}>
      {children}
    </DownloadContext.Provider>
  )
}
