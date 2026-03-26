import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Children, memo, useCallback, useEffect, useMemo, useRef, useState } from 'react'

interface ScrollableRowProps {
  children: React.ReactNode
  scrollDistance?: number
  enableAnimation?: boolean
}

function ScrollableRow({ children, scrollDistance = 1000, enableAnimation = false }: ScrollableRowProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [showLeftScroll, setShowLeftScroll] = useState(false)
  const [showRightScroll, setShowRightScroll] = useState(false)
  const [isHovered, setIsHovered] = useState(false)

  const checkScroll = useCallback(() => {
    if (!containerRef.current) return
    const { scrollWidth, clientWidth, scrollLeft } = containerRef.current
    const threshold = 1
    setShowRightScroll(scrollWidth - (scrollLeft + clientWidth) > threshold)
    setShowLeftScroll(scrollLeft > threshold)
  }, [])

  useEffect(() => {
    checkScroll()
    const el = containerRef.current
    if (!el) return
    el.addEventListener('scroll', checkScroll, { passive: true })
    const ro = new ResizeObserver(checkScroll)
    ro.observe(el)
    return () => {
      el.removeEventListener('scroll', checkScroll)
      ro.disconnect()
    }
  }, [checkScroll, children])

  const scroll = (dir: 'left' | 'right') => {
    if (!containerRef.current) return
    containerRef.current.scrollBy({ left: dir === 'right' ? scrollDistance : -scrollDistance, behavior: 'smooth' })
  }

  return (
    <div
      className="relative"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {showLeftScroll && isHovered && (
        <button
          onClick={() => scroll('left')}
          className="absolute left-0 top-1/2 -translate-y-1/2 z-10 w-10 h-10 bg-white/90 dark:bg-gray-800/90 rounded-full shadow-lg flex items-center justify-center hover:bg-white dark:hover:bg-gray-700 transition-colors -translate-x-3"
        >
          <ChevronLeft className="w-5 h-5 text-gray-700 dark:text-gray-300" />
        </button>
      )}

      <div
        ref={containerRef}
        className="flex gap-3 overflow-x-auto scrollbar-hide scroll-smooth pb-1"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {children}
      </div>

      {showRightScroll && isHovered && (
        <button
          onClick={() => scroll('right')}
          className="absolute right-0 top-1/2 -translate-y-1/2 z-10 w-10 h-10 bg-white/90 dark:bg-gray-800/90 rounded-full shadow-lg flex items-center justify-center hover:bg-white dark:hover:bg-gray-700 transition-colors translate-x-3"
        >
          <ChevronRight className="w-5 h-5 text-gray-700 dark:text-gray-300" />
        </button>
      )}
    </div>
  )
}

export default memo(ScrollableRow)
