import { X } from 'lucide-react'

interface OwnerChangeDialogProps {
  show: boolean
  videoTitle?: string
  episode?: number
  onConfirm: () => void
  onDecline: () => void
}

export default function OwnerChangeDialog({ show, videoTitle, episode, onConfirm, onDecline }: OwnerChangeDialogProps) {
  if (!show) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 max-w-sm w-full mx-4 shadow-2xl">
        <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-2">房主切换了视频</h3>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-5">
          房主正在播放{videoTitle ? `《${videoTitle}》` : ''}
          {episode !== undefined ? `第${episode + 1}集` : ''}，是否跟随？
        </p>
        <div className="flex gap-3 justify-end">
          <button
            onClick={onDecline}
            className="px-4 py-2 text-sm rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
          >
            稍后
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 text-sm rounded-lg bg-green-500 text-white hover:bg-green-600 transition-colors"
          >
            跟随
          </button>
        </div>
      </div>
    </div>
  )
}
