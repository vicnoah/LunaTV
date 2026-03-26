import { Search, X } from 'lucide-react'
import { useState } from 'react'
import { api } from '@/api/client'

export interface DanmuManualSelection {
  animeId: number
  episodeId: number
  animeTitle: string
  episodeTitle: string
}

interface DanmuManualMatchModalProps {
  show: boolean
  onClose: () => void
  onSelect: (selection: DanmuManualSelection) => void
  defaultQuery?: string
}

export default function DanmuManualMatchModal({ show, onClose, onSelect, defaultQuery = '' }: DanmuManualMatchModalProps) {
  const [query, setQuery] = useState(defaultQuery)
  const [results, setResults] = useState<unknown[]>([])
  const [loading, setLoading] = useState(false)

  if (!show) return null

  const handleSearch = async () => {
    if (!query.trim()) return
    setLoading(true)
    try {
      const data = await api.get<{ list: unknown[] }>(`/api/danmu/search?q=${encodeURIComponent(query)}`)
      setResults(data.list || [])
    } catch {
      setResults([])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 max-w-sm w-full mx-4 shadow-2xl">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-gray-900 dark:text-gray-100">手动匹配弹幕</h3>
          <button onClick={onClose}><X className="w-5 h-5 text-gray-400" /></button>
        </div>
        <div className="flex gap-2 mb-4">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            placeholder="搜索动漫..."
            className="flex-1 px-3 py-2 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm outline-none"
          />
          <button
            onClick={handleSearch}
            disabled={loading}
            className="px-3 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
          >
            <Search className="w-4 h-4" />
          </button>
        </div>
        <p className="text-sm text-gray-500 dark:text-gray-400 text-center">
          {loading ? '搜索中...' : results.length === 0 ? '输入关键词搜索' : `${results.length} 个结果`}
        </p>
      </div>
    </div>
  )
}
