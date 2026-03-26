interface LoadingProgressIndicatorProps {
  current: number
  total: number
  currentSource?: string
}

export default function LoadingProgressIndicator({ current, total, currentSource }: LoadingProgressIndicatorProps) {
  const pct = total > 0 ? (current / total) * 100 : 0
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
        <span>{currentSource || '正在测速...'}</span>
        <span>{current}/{total}</span>
      </div>
      <div className="h-1 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
        <div className="h-full bg-green-500 transition-all duration-300" style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}
