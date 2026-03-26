import { X } from 'lucide-react'

interface WebSRSettingsPanelProps {
  show: boolean
  onClose: () => void
}

export default function WebSRSettingsPanel({ show, onClose }: WebSRSettingsPanelProps) {
  if (!show) return null
  return (
    <div className="absolute bottom-full right-0 mb-2 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 p-4 w-64 z-20">
      <div className="flex items-center justify-between mb-3">
        <h4 className="font-medium text-gray-900 dark:text-gray-100 text-sm">超分设置</h4>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
          <X className="w-4 h-4" />
        </button>
      </div>
      <p className="text-xs text-gray-500 dark:text-gray-400">WebSR 视频超分功能（实验性）</p>
    </div>
  )
}
