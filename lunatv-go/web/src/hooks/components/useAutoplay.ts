import { useCallback, useEffect, useRef } from 'react'

export interface UseAutoplayOptions {
  enabled: boolean
  interval: number
  onNext: () => void
  isPaused?: boolean
}

export function useAutoplay({ enabled, interval, onNext, isPaused = false }: UseAutoplayOptions) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const clear = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
  }, [])

  const schedule = useCallback(() => {
    clear()
    if (!enabled || isPaused) return
    timerRef.current = setTimeout(() => {
      onNext()
    }, interval)
  }, [enabled, interval, onNext, isPaused, clear])

  useEffect(() => {
    schedule()
    return clear
  }, [schedule, clear])

  return { reset: schedule, pause: clear }
}
