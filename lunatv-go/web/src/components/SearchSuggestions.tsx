import { Clock, Search, X } from 'lucide-react'

interface SearchSuggestionsProps {
  suggestions: string[]
  history: string[]
  query: string
  onSelect: (q: string) => void
  onDeleteHistory?: (q: string) => void
  onClearHistory?: () => void
}

export default function SearchSuggestions({
  suggestions,
  history,
  query,
  onSelect,
  onDeleteHistory,
  onClearHistory,
}: SearchSuggestionsProps) {
  if (!query && history.length === 0) return null

  return (
    <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-gray-900 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 overflow-hidden z-50 max-h-80 overflow-y-auto">
      {!query && history.length > 0 && (
        <>
          <div className="flex items-center justify-between px-4 py-2 border-b border-gray-100 dark:border-gray-800">
            <span className="text-xs font-medium text-gray-500 dark:text-gray-400">搜索历史</span>
            {onClearHistory && (
              <button
                onClick={onClearHistory}
                className="text-xs text-red-500 hover:text-red-600"
              >
                清空
              </button>
            )}
          </div>
          {history.map((item) => (
            <div
              key={item}
              className="flex items-center gap-2 px-4 py-2 hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer group"
            >
              <Clock className="w-4 h-4 text-gray-400 flex-shrink-0" />
              <span
                className="flex-1 text-sm text-gray-700 dark:text-gray-300"
                onClick={() => onSelect(item)}
              >
                {item}
              </span>
              {onDeleteHistory && (
                <button
                  onClick={(e) => { e.stopPropagation(); onDeleteHistory(item) }}
                  className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-gray-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          ))}
        </>
      )}

      {query && suggestions.length > 0 && suggestions.map((sug) => (
        <div
          key={sug}
          onClick={() => onSelect(sug)}
          className="flex items-center gap-2 px-4 py-2 hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer"
        >
          <Search className="w-4 h-4 text-gray-400 flex-shrink-0" />
          <span className="text-sm text-gray-700 dark:text-gray-300">{sug}</span>
        </div>
      ))}
    </div>
  )
}
