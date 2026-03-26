import CommentItem from './CommentItem'
import type { DoubanComment } from '@/types'

interface CommentSectionProps {
  comments: DoubanComment[]
  loading?: boolean
  doubanId?: number
}

export default function CommentSection({ comments, loading, doubanId }: CommentSectionProps) {
  if (loading) {
    return (
      <div className="space-y-4 animate-pulse">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="space-y-2">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 bg-gray-200 dark:bg-gray-700 rounded-full" />
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-24" />
            </div>
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-full" />
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4" />
          </div>
        ))}
      </div>
    )
  }

  if (!comments || comments.length === 0) {
    return (
      <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
        暂无评论
      </p>
    )
  }

  return (
    <div className="space-y-4">
      {comments.map((comment, i) => (
        <CommentItem key={i} comment={comment} />
      ))}
      {doubanId && (
        <a
          href={`https://movie.douban.com/subject/${doubanId}/reviews`}
          target="_blank"
          rel="noopener noreferrer"
          className="block text-center text-sm text-green-600 dark:text-green-400 hover:underline py-2"
        >
          查看更多豆瓣评论 →
        </a>
      )}
    </div>
  )
}
