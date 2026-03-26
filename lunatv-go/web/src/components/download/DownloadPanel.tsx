import { Download, X } from 'lucide-react'
import { useDownload } from '@/contexts/DownloadContext'

export default function DownloadPanel() {
  const { tasks, showDownloadPanel, setShowDownloadPanel } = useDownload()

  if (!showDownloadPanel) return null

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50">
      <div className="bg-white dark:bg-gray-800 rounded-t-2xl sm:rounded-2xl w-full sm:max-w-md max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2">
            <Download className="w-5 h-5 text-green-500" />
            <h3 className="font-semibold text-gray-900 dark:text-gray-100">下载列表</h3>
          </div>
          <button onClick={() => setShowDownloadPanel(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-4">
          {tasks.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-8">暂无下载任务</p>
          ) : (
            <div className="space-y-3">
              {tasks.map((task) => (
                <div key={task.id} className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{task.title}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{task.status}</p>
                  </div>
                  {task.progress !== undefined && (
                    <div className="w-16 h-1 bg-gray-200 dark:bg-gray-600 rounded-full overflow-hidden">
                      <div className="h-full bg-green-500" style={{ width: `${task.progress}%` }} />
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
