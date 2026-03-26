import { HardDrive } from 'lucide-react'

interface NetDiskButtonProps {
  onClick?: () => void
  active?: boolean
}

export default function NetDiskButton({ onClick, active }: NetDiskButtonProps) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
        active
          ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
          : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
      }`}
    >
      <HardDrive className="w-4 h-4" />
      网盘
    </button>
  )
}
