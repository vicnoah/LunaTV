import { useCallback, useRef } from 'react'

export function useTabsDragScroll() {
  const containerRef = useRef<HTMLElement | null>(null)
  const isDragging = useRef(false)
  const startX = useRef(0)
  const scrollLeft = useRef(0)

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    if (!containerRef.current) return
    isDragging.current = true
    startX.current = e.pageX - containerRef.current.offsetLeft
    scrollLeft.current = containerRef.current.scrollLeft
  }, [])

  const onMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging.current || !containerRef.current) return
    e.preventDefault()
    const x = e.pageX - containerRef.current.offsetLeft
    const walk = (x - startX.current) * 2
    containerRef.current.scrollLeft = scrollLeft.current - walk
  }, [])

  const onMouseUp = useCallback(() => { isDragging.current = false }, [])

  return { containerRef, onMouseDown, onMouseMove, onMouseUp, onMouseLeave: onMouseUp }
}
