import { Link } from 'react-router-dom'
import type { DoubanItem } from '@/types'

interface TopContentListProps {
  items: DoubanItem[]
  className?: string
}

export default function TopContentList({ items, className }: TopContentListProps) {
  return (
    <div className={`space-y-2 ${className || ''}`}>
      {items.slice(0, 10).map((item, index) => (
        <Link
          key={item.id}
          to={`/play?title=${encodeURIComponent(item.title)}&year=${item.year}`}
          className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors group"
        >
          <span
            className={`w-6 h-6 flex items-center justify-center rounded-full text-xs font-bold flex-shrink-0 ${
              index < 3
                ? 'bg-gradient-to-br from-green-400 to-emerald-500 text-white'
                : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
            }`}
          >
            {index + 1}
          </span>
          <img
            src={item.poster}
            alt={item.title}
            loading="lazy"
            className="w-8 h-10 object-cover rounded flex-shrink-0"
          />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate group-hover:text-green-600 dark:group-hover:text-green-400 transition-colors">
              {item.title}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">{item.year}</p>
          </div>
          {item.rate && (
            <span className="text-xs text-amber-500 font-semibold flex-shrink-0">{item.rate}</span>
          )}
        </Link>
      ))}
    </div>
  )
}
