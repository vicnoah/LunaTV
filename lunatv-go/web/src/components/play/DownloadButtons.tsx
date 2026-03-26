import { Download } from 'lucide-react'

interface DownloadButtonsProps {
  onDownload?: () => void
  onShowPanel?: () => void
}

export default function DownloadButtons({ onDownload, onShowPanel }: DownloadButtonsProps) {
  return (
    <button
      onClick={onShowPanel || onDownload}
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
    >
      <Download className="w-4 h-4" />
      下载
    </button>
  )
}
