import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import type { DoubanItem, ShortDramaItem } from '@/types/index'

interface BangumiCalendarData {
  date: string
  items: DoubanItem[]
}

interface HomePageData {
  hotMovies: DoubanItem[]
  hotTvShows: DoubanItem[]
  hotVarietyShows: DoubanItem[]
  hotAnime: DoubanItem[]
  hotShortDramas: ShortDramaItem[]
  bangumiCalendar: BangumiCalendarData[]
}

interface CacheState {
  homeData: HomePageData | null
  homeLoading: boolean
  homeError: string | null
  homeLastFetch: number
}

interface GlobalCacheContextValue extends CacheState {
  fetchHomeData: (forceRefresh?: boolean) => Promise<void>
  updateHomeDataPartial: (updates: Partial<HomePageData>) => void
  clearAllCache: () => void
}

const STALE_TIME = 5 * 60 * 1000

const GlobalCacheContext = createContext<GlobalCacheContextValue | null>(null)

export function GlobalCacheProvider({ children }: { children: ReactNode }) {
  const [homeData, setHomeData] = useState<HomePageData | null>(null)
  const [homeLoading, setHomeLoading] = useState(false)
  const [homeError, setHomeError] = useState<string | null>(null)
  const [homeLastFetch, setHomeLastFetch] = useState(0)
  const fetchingRef = useRef<Set<string>>(new Set())

  const fetchHomeData = useCallback(async (forceRefresh = false) => {
    const cacheKey = 'home-page-data'
    if (fetchingRef.current.has(cacheKey)) return

    const now = Date.now()
    const isStale = now - homeLastFetch > STALE_TIME
    if (!forceRefresh && homeData && !isStale) return

    fetchingRef.current.add(cacheKey)
    setHomeLoading(true)
    setHomeError(null)

    try {
      const [moviesRes, tvRes, varietyRes, animeRes] = await Promise.allSettled([
        fetch('/api/douban/list?type=movie&tag=热门&limit=20').then(r => r.json()),
        fetch('/api/douban/list?type=tv&tag=热门&limit=20').then(r => r.json()),
        fetch('/api/douban/list?type=show&tag=热门&limit=20').then(r => r.json()),
        fetch('/api/douban/list?type=anime&tag=热门&limit=20').then(r => r.json()),
      ])

      const data: HomePageData = {
        hotMovies: moviesRes.status === 'fulfilled' ? (moviesRes.value?.list ?? []) : [],
        hotTvShows: tvRes.status === 'fulfilled' ? (tvRes.value?.list ?? []) : [],
        hotVarietyShows: varietyRes.status === 'fulfilled' ? (varietyRes.value?.list ?? []) : [],
        hotAnime: animeRes.status === 'fulfilled' ? (animeRes.value?.list ?? []) : [],
        hotShortDramas: [],
        bangumiCalendar: [],
      }

      setHomeData(data)
      setHomeLastFetch(Date.now())
    } catch (err) {
      setHomeError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setHomeLoading(false)
      fetchingRef.current.delete(cacheKey)
    }
  }, [homeData, homeLastFetch])

  const updateHomeDataPartial = useCallback((updates: Partial<HomePageData>) => {
    setHomeData(prev => prev ? { ...prev, ...updates } : null)
  }, [])

  const clearAllCache = useCallback(() => {
    setHomeData(null)
    setHomeLastFetch(0)
    setHomeError(null)
  }, [])

  useEffect(() => {
    fetchHomeData()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const value = useMemo(() => ({
    homeData,
    homeLoading,
    homeError,
    homeLastFetch,
    fetchHomeData,
    updateHomeDataPartial,
    clearAllCache,
  }), [homeData, homeLoading, homeError, homeLastFetch, fetchHomeData, updateHomeDataPartial, clearAllCache])

  return (
    <GlobalCacheContext.Provider value={value}>
      {children}
    </GlobalCacheContext.Provider>
  )
}

export function useGlobalCache() {
  const ctx = useContext(GlobalCacheContext)
  if (!ctx) throw new Error('useGlobalCache must be used within GlobalCacheProvider')
  return ctx
}
