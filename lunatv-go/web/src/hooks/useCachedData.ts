import { useCallback, useRef, useState } from 'react'

export function useCachedData<T>(fetcher: () => Promise<T>, cacheKey?: string) {
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const cacheRef = useRef<T | null>(null)

  const fetch = useCallback(async (force = false) => {
    if (!force && cacheRef.current !== null) {
      setData(cacheRef.current)
      return cacheRef.current
    }
    setLoading(true)
    try {
      const result = await fetcher()
      cacheRef.current = result
      setData(result)
      return result
    } catch (err) {
      const e = err instanceof Error ? err : new Error(String(err))
      setError(e)
      return null
    } finally {
      setLoading(false)
    }
  }, [fetcher])

  return { data, loading, error, fetch }
}
