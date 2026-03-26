import { ChevronRight } from 'lucide-react'
import { Link } from 'react-router-dom'

interface SectionTitleProps {
  title: string
  icon?: React.ReactNode
  href?: string
  action?: React.ReactNode
}

export default function SectionTitle({ title, icon, href, action }: SectionTitleProps) {
  return (
    <div className="flex items-center justify-between mb-3">
      <div className="flex items-center gap-2">
        {icon && <span className="text-green-500">{icon}</span>}
        <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">{title}</h2>
      </div>
      {action || (href && (
        <Link
          to={href}
          className="flex items-center gap-1 text-sm text-green-600 dark:text-green-400 hover:text-green-700 dark:hover:text-green-300 transition-colors"
        >
          更多 <ChevronRight className="w-4 h-4" />
        </Link>
      ))}
    </div>
  )
}
