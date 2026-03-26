import { useEffect, useRef } from 'react'

export function useImagePreload(urls: string[]) {
  const preloadedRef = useRef<Set<string>>(new Set())

  useEffect(() => {
    urls.forEach((url) => {
      if (!url || preloadedRef.current.has(url)) return
      preloadedRef.current.add(url)
      const img = new Image()
      img.src = url
    })
  }, [urls])
}
