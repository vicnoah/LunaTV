import { useCallback, useRef } from 'react'

export interface UseLongPressOptions {
  onLongPress: (event: MouseEvent | TouchEvent) => void
  onClick?: (event: MouseEvent | TouchEvent) => void
  threshold?: number
}

export function useLongPress({ onLongPress, onClick, threshold = 500 }: UseLongPressOptions) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const isLongPress = useRef(false)

  const start = useCallback(
    (event: React.MouseEvent | React.TouchEvent) => {
      isLongPress.current = false
      timerRef.current = setTimeout(() => {
        isLongPress.current = true
        onLongPress(event.nativeEvent)
      }, threshold)
    },
    [onLongPress, threshold],
  )

  const stop = useCallback(
    (event: React.MouseEvent | React.TouchEvent) => {
      if (timerRef.current) clearTimeout(timerRef.current)
      if (!isLongPress.current) onClick?.(event.nativeEvent)
    },
    [onClick],
  )

  return {
    onMouseDown: start,
    onMouseUp: stop,
    onTouchStart: start,
    onTouchEnd: stop,
  }
}
