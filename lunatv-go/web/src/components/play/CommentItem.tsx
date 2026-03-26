import type { DoubanComment } from '@/types'

interface CommentItemProps {
  comment: DoubanComment
}

export default function CommentItem({ comment }: CommentItemProps) {
  return (
    <div className="border-b border-gray-100 dark:border-gray-800 pb-4 last:border-0">
      <div className="flex items-center gap-2 mb-1.5">
        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-green-400 to-emerald-500 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
          {comment.username?.[0] || '?'}
        </div>
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{comment.username}</span>
        {comment.rating > 0 && (
          <span className="text-xs text-amber-500">{'★'.repeat(Math.min(comment.rating, 5))}</span>
        )}
        <span className="text-xs text-gray-400 ml-auto">{comment.time}</span>
      </div>
      <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed pl-9">{comment.content}</p>
    </div>
  )
}
