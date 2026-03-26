import { Children } from 'react'

interface AnimatedCardGridProps {
  children: React.ReactNode
  className?: string
}

export default function AnimatedCardGrid({ children, className }: AnimatedCardGridProps) {
  return (
    <div className={`grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 ${className || ''}`}>
      {Children.map(children, (child, i) => (
        <div
          key={i}
          className="animate-fade-in"
          style={{ animationDelay: `${i * 30}ms` }}
        >
          {child}
        </div>
      ))}
    </div>
  )
}
