import { Heart } from 'lucide-react'

interface FavoriteButtonProps {
  favorited: boolean
  onToggle: () => void
  loading?: boolean
}

export default function FavoriteButton({ favorited, onToggle, loading }: FavoriteButtonProps) {
  return (
    <button
      onClick={onToggle}
      disabled={loading}
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-all duration-200 ${
        favorited
          ? 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 hover:bg-red-200 dark:hover:bg-red-900/50'
          : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
      } disabled:opacity-50`}
    >
      <Heart className={`w-4 h-4 ${favorited ? 'fill-current' : ''}`} />
      {favorited ? '已收藏' : '收藏'}
    </button>
  )
}
