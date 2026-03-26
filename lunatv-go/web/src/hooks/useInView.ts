import { useEffect, useRef, useState } from 'react'

export function useInView(options?: IntersectionObserverInit) {
  const ref = useRef<HTMLElement | null>(null)
  const [inView, setInView] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const observer = new IntersectionObserver(([entry]) => {
      setInView(entry.isIntersecting)
    }, options)
    observer.observe(el)
    return () => observer.disconnect()
  }, [options])

  return { ref, inView }
}
