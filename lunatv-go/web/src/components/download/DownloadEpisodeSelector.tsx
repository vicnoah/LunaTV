import { X } from 'lucide-react'
import { useState } from 'react'

interface DownloadEpisodeSelectorProps {
  show: boolean
  episodes: string[]
  onClose: () => void
  onDownload: (indices: number[]) => void
}

export default function DownloadEpisodeSelector({ show, episodes, onClose, onDownload }: DownloadEpisodeSelectorProps) {
  const [selected, setSelected] = useState<Set<number>>(new Set())

  if (!show) return null

  const toggleAll = () => {
    if (selected.size === episodes.length) setSelected(new Set())
    else setSelected(new Set(episodes.map((_, i) => i)))
  }

  const toggle = (i: number) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(i)) next.delete(i)
      else next.add(i)
      return next
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50">
      <div className="bg-white dark:bg-gray-800 rounded-t-2xl sm:rounded-2xl w-full sm:max-w-md max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="font-semibold text-gray-900 dark:text-gray-100">选择下载集数</h3>
          <button onClick={onClose}><X className="w-5 h-5 text-gray-400" /></button>
        </div>
        <div className="flex-1 overflow-y-auto p-4">
          <button onClick={toggleAll} className="text-sm text-green-600 dark:text-green-400 mb-3">
            {selected.size === episodes.length ? '取消全选' : '全选'}
          </button>
          <div className="grid grid-cols-5 gap-2">
            {episodes.map((_, i) => (
              <button
                key={i}
                onClick={() => toggle(i)}
                className={`py-2 rounded-lg text-sm font-medium transition-colors ${
                  selected.has(i)
                    ? 'bg-green-500 text-white'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                }`}
              >
                {i + 1}
              </button>
            ))}
          </div>
        </div>
        <div className="p-4 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={() => { onDownload(Array.from(selected)); onClose() }}
            disabled={selected.size === 0}
            className="w-full py-2.5 bg-green-500 text-white rounded-xl font-medium hover:bg-green-600 transition-colors disabled:opacity-50"
          >
            下载 {selected.size > 0 ? `(${selected.size}集)` : ''}
          </button>
        </div>
      </div>
    </div>
  )
}
