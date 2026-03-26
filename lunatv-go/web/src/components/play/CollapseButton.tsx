import { ChevronDown, ChevronUp } from 'lucide-react'

interface CollapseButtonProps {
  collapsed: boolean
  onToggle: () => void
  label?: string
}

export default function CollapseButton({ collapsed, onToggle, label }: CollapseButtonProps) {
  return (
    <button
      onClick={onToggle}
      className="flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
    >
      {label || (collapsed ? '展开' : '收起')}
      {collapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
    </button>
  )
}
