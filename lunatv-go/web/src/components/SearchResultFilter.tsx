import { useState } from 'react'

export type SearchFilterCategory = 'all' | 'movie' | 'tv' | 'anime' | 'variety'

interface SearchResultFilterProps {
  category: SearchFilterCategory
  onCategoryChange: (cat: SearchFilterCategory) => void
  sourceFilter: string
  onSourceChange: (src: string) => void
  sources: string[]
  yearOrder?: 'none' | 'asc' | 'desc'
  onYearOrderChange?: (order: 'none' | 'asc' | 'desc') => void
}

const categories: { value: SearchFilterCategory; label: string }[] = [
  { value: 'all', label: '全部' },
  { value: 'movie', label: '电影' },
  { value: 'tv', label: '剧集' },
  { value: 'anime', label: '动漫' },
  { value: 'variety', label: '综艺' },
]

export default function SearchResultFilter({
  category,
  onCategoryChange,
  sourceFilter,
  onSourceChange,
  sources,
  yearOrder,
  onYearOrderChange,
}: SearchResultFilterProps) {
  return (
    <div className="flex flex-wrap items-center gap-2 py-2">
      <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-800 rounded-full p-1">
        {categories.map((cat) => (
          <button
            key={cat.value}
            onClick={() => onCategoryChange(cat.value)}
            className={`px-3 py-1 rounded-full text-sm transition-colors ${
              category === cat.value
                ? 'bg-white dark:bg-gray-700 text-green-600 dark:text-green-400 shadow-sm font-medium'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {sources.length > 1 && (
        <select
          value={sourceFilter}
          onChange={(e) => onSourceChange(e.target.value)}
          className="text-sm px-3 py-1.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-none outline-none"
        >
          <option value="all">全部来源</option>
          {sources.map((src) => (
            <option key={src} value={src}>{src}</option>
          ))}
        </select>
      )}

      {onYearOrderChange && (
        <button
          onClick={() => {
            const orders: Array<'none' | 'asc' | 'desc'> = ['none', 'desc', 'asc']
            const curr = yearOrder || 'none'
            const next = orders[(orders.indexOf(curr) + 1) % orders.length]
            onYearOrderChange(next)
          }}
          className="text-sm px-3 py-1.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
        >
          年份{yearOrder === 'desc' ? '↓' : yearOrder === 'asc' ? '↑' : '—'}
        </button>
      )}
    </div>
  )
}
