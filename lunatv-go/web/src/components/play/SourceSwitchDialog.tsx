import { X } from 'lucide-react'

interface Source {
  source: string
  source_name: string
  id: string
}

interface SourceSwitchDialogProps {
  show: boolean
  sources: Source[]
  currentSource: string
  onSelect: (source: Source) => void
  onClose: () => void
}

export default function SourceSwitchDialog({ show, sources, currentSource, onSelect, onClose }: SourceSwitchDialogProps) {
  if (!show) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 max-w-sm w-full mx-4 shadow-2xl">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">切换播放源</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="space-y-2">
          {sources.map((src) => (
            <button
              key={`${src.source}-${src.id}`}
              onClick={() => { onSelect(src); onClose() }}
              className={`w-full px-4 py-3 rounded-xl text-left text-sm font-medium transition-colors ${
                src.source === currentSource
                  ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              {src.source_name}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
