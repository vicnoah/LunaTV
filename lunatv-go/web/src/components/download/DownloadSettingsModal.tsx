import { X } from 'lucide-react'

interface DownloadSettingsModalProps {
  show: boolean
  onClose: () => void
}

export default function DownloadSettingsModal({ show, onClose }: DownloadSettingsModalProps) {
  if (!show) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 max-w-sm w-full mx-4 shadow-2xl">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-gray-900 dark:text-gray-100">下载设置</h3>
          <button onClick={onClose}><X className="w-5 h-5 text-gray-400" /></button>
        </div>
        <p className="text-sm text-gray-500 dark:text-gray-400">下载设置功能正在开发中...</p>
      </div>
    </div>
  )
}
