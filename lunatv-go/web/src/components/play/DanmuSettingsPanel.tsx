import { X } from 'lucide-react'

interface DanmuSettingsPanelProps {
  show: boolean
  onClose: () => void
  enabled: boolean
  onToggle: (v: boolean) => void
  onRefresh?: () => void
  count?: number
}

export default function DanmuSettingsPanel({ show, onClose, enabled, onToggle, onRefresh, count }: DanmuSettingsPanelProps) {
  if (!show) return null
  return (
    <div className="absolute bottom-full right-0 mb-2 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 p-4 w-64 z-20">
      <div className="flex items-center justify-between mb-3">
        <h4 className="font-medium text-gray-900 dark:text-gray-100 text-sm">弹幕设置</h4>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
          <X className="w-4 h-4" />
        </button>
      </div>
      <div className="flex items-center justify-between">
        <span className="text-sm text-gray-600 dark:text-gray-400">
          弹幕 {count !== undefined ? `(${count})` : ''}
        </span>
        <button
          onClick={() => onToggle(!enabled)}
          className={`relative w-10 h-6 rounded-full transition-colors ${enabled ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-600'}`}
        >
          <span className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${enabled ? 'translate-x-5' : 'translate-x-1'}`} />
        </button>
      </div>
      {onRefresh && (
        <button
          onClick={onRefresh}
          className="mt-3 w-full text-sm px-3 py-1.5 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
        >
          重新加载弹幕
        </button>
      )}
    </div>
  )
}
