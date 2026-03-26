import { useCallback, useRef } from 'react'

export interface UseSwipeGestureOptions {
  onSwipeLeft?: () => void
  onSwipeRight?: () => void
  threshold?: number
}

export function useSwipeGesture({ onSwipeLeft, onSwipeRight, threshold = 50 }: UseSwipeGestureOptions) {
  const startXRef = useRef<number | null>(null)

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    startXRef.current = e.touches[0].clientX
  }, [])

  const onTouchEnd = useCallback((e: React.TouchEvent) => {
    if (startXRef.current === null) return
    const diff = startXRef.current - e.changedTouches[0].clientX
    if (Math.abs(diff) >= threshold) {
      if (diff > 0) onSwipeLeft?.()
      else onSwipeRight?.()
    }
    startXRef.current = null
  }, [onSwipeLeft, onSwipeRight, threshold])

  return { onTouchStart, onTouchEnd }
}
