/* eslint-disable @typescript-eslint/no-explicit-any */
import { Sparkles, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '@/api/client'

interface AIRecommendModalProps {
  show: boolean
  onClose: () => void
  title: string
  year?: string
  type?: string
  doubanId?: number
}

export default function AIRecommendModal({ show, onClose, title, year, type, doubanId }: AIRecommendModalProps) {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [recommendations, setRecommendations] = useState<any[]>([])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!show || !title) return
    setLoading(true)
    setError(null)
    setRecommendations([])

    api.post('/api/ai-recommend', { title, year, type, doubanId })
      .then((data: any) => setRecommendations(data.recommendations || []))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [show, title, year, type, doubanId])

  if (!show) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 max-w-sm w-full mx-4 shadow-2xl max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-purple-500" />
            <h3 className="font-semibold text-gray-900 dark:text-gray-100">AI 推荐</h3>
          </div>
          <button onClick={onClose}><X className="w-5 h-5 text-gray-400" /></button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {loading && (
            <div className="flex items-center justify-center py-8">
              <div className="w-8 h-8 border-3 border-purple-500 border-t-transparent rounded-full animate-spin" />
            </div>
          )}
          {error && <p className="text-sm text-red-500">{error}</p>}
          {!loading && recommendations.length === 0 && !error && (
            <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">暂无推荐</p>
          )}
          {recommendations.map((rec: any, i: number) => (
            <button
              key={i}
              onClick={() => {
                navigate(`/play?title=${encodeURIComponent(rec.title)}${rec.year ? `&year=${rec.year}` : ''}`)
                onClose()
              }}
              className="w-full flex items-start gap-3 p-3 hover:bg-gray-50 dark:hover:bg-gray-700/50 rounded-xl text-left transition-colors"
            >
              {rec.poster && (
                <img src={rec.poster} alt={rec.title} className="w-10 h-14 object-cover rounded-lg flex-shrink-0" />
              )}
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{rec.title}</p>
                {rec.year && <p className="text-xs text-gray-500 dark:text-gray-400">{rec.year}</p>}
                {rec.reason && <p className="text-xs text-purple-600 dark:text-purple-400 mt-1">{rec.reason}</p>}
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
