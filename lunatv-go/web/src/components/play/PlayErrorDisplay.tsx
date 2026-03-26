import { AlertCircle, RefreshCw } from 'lucide-react'

interface PlayErrorDisplayProps {
  error: string
  onRetry?: () => void
}

export default function PlayErrorDisplay({ error, onRetry }: PlayErrorDisplayProps) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4 px-4">
      <div className="w-16 h-16 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center">
        <AlertCircle className="w-8 h-8 text-red-500" />
      </div>
      <div className="text-center max-w-sm">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">播放失败</h3>
        <p className="text-sm text-gray-600 dark:text-gray-400">{error}</p>
      </div>
      {onRetry && (
        <button
          onClick={onRetry}
          className="flex items-center gap-2 px-5 py-2.5 bg-green-500 text-white rounded-full hover:bg-green-600 transition-colors font-medium"
        >
          <RefreshCw className="w-4 h-4" />
          重新加载
        </button>
      )}
    </div>
  )
}
