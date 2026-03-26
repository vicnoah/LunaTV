/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useRef, useEffect, useCallback } from 'react'
import { ClientCache } from '@/lib/client-cache'

export interface UseDanmuOptions {
  videoTitle: string
  videoYear: string
  videoDoubanId: number
  currentEpisodeIndex: number
  currentSource: string
  artPlayerRef: React.MutableRefObject<any>
  manualOverride?: DanmuManualOverride | null
}

export interface DanmuManualOverride {
  animeId: number
  episodeId: number
  animeTitle?: string
  episodeTitle?: string
}

export interface DanmuLoadMeta {
  source: 'init' | 'cache' | 'network' | 'network-retry' | 'empty' | 'error'
  loadedAt: number | null
  count: number
}

export interface UseDanmuReturn {
  externalDanmuEnabled: boolean
  setExternalDanmuEnabled: (enabled: boolean) => void
  danmuList: any[]
  loading: boolean
  loadMeta: DanmuLoadMeta
  error: Error | null
  loadExternalDanmu: (options?: { force?: boolean; manualOverride?: DanmuManualOverride | null }) => Promise<{ count: number; data: any[] }>
  handleDanmuOperationOptimized: (nextState: boolean) => void
  externalDanmuEnabledRef: React.MutableRefObject<boolean>
  danmuLoadingRef: React.MutableRefObject<any>
  lastDanmuLoadKeyRef: React.MutableRefObject<string>
  danmuPluginStateRef: React.MutableRefObject<any>
}

const DANMU_CACHE_DURATION = 30 * 60
const DANMU_CACHE_KEY_PREFIX = 'danmu-cache'
const DANMU_LOAD_TIMEOUT = 15000

async function getDanmuCacheItem(key: string): Promise<{ data: any[]; timestamp: number } | null> {
  try {
    const cacheKey = `${DANMU_CACHE_KEY_PREFIX}-${key}`
    const cached = await ClientCache.get(cacheKey)
    if (cached) return cached as { data: any[]; timestamp: number }
    return null
  } catch {
    return null
  }
}

async function setDanmuCacheItem(key: string, data: any[]): Promise<void> {
  try {
    const cacheKey = `${DANMU_CACHE_KEY_PREFIX}-${key}`
    await ClientCache.set(cacheKey, { data, timestamp: Date.now() }, DANMU_CACHE_DURATION)
  } catch {}
}

export function useDanmu(options: UseDanmuOptions): UseDanmuReturn {
  const { videoTitle, videoYear, videoDoubanId, currentEpisodeIndex, currentSource, artPlayerRef, manualOverride } = options

  const [externalDanmuEnabled, setExternalDanmuEnabled] = useState<boolean>(() => {
    try { return localStorage.getItem('enable_external_danmu') === 'true' } catch { return false }
  })
  const [danmuList, setDanmuList] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const [loadMeta, setLoadMeta] = useState<DanmuLoadMeta>({ source: 'init', loadedAt: null, count: 0 })

  const externalDanmuEnabledRef = useRef(externalDanmuEnabled)
  const danmuLoadingRef = useRef<any>(false)
  const lastDanmuLoadKeyRef = useRef<string>('')
  const danmuPluginStateRef = useRef<any>(null)
  const autoRetryDanmuScopeRef = useRef<string>('')

  useEffect(() => { externalDanmuEnabledRef.current = externalDanmuEnabled }, [externalDanmuEnabled])
  useEffect(() => {
    const scopeKey = `${videoTitle}_${videoYear}_${videoDoubanId}_${currentEpisodeIndex + 1}`
    autoRetryDanmuScopeRef.current = `pending:${scopeKey}`
  }, [videoTitle, videoYear, videoDoubanId, currentEpisodeIndex])

  const loadExternalDanmu = useCallback(async (opts?: { force?: boolean; manualOverride?: DanmuManualOverride | null }): Promise<{ count: number; data: any[] }> => {
    const force = opts?.force === true
    const activeManualOverride = opts?.manualOverride !== undefined ? opts.manualOverride : manualOverride
    const emptyResult = { count: 0, data: [] }

    if (!externalDanmuEnabledRef.current) return emptyResult

    const currentEpisodeNum = currentEpisodeIndex + 1
    const requestKey = `${videoTitle}_${videoYear}_${videoDoubanId}_${currentEpisodeNum}`
    const now = Date.now()
    const loadingState = danmuLoadingRef.current as any
    const lastLoadTime = loadingState?.timestamp || 0
    const lastRequestKey = loadingState?.requestKey || ''
    const isStuckLoad = now - lastLoadTime > DANMU_LOAD_TIMEOUT
    const isSameRequest = lastRequestKey === requestKey

    if (!force && loadingState?.loading && isSameRequest && !isStuckLoad) {
      return { count: danmuList.length, data: danmuList }
    }

    danmuLoadingRef.current = { loading: true, timestamp: now, requestKey, source: currentSource, episode: currentEpisodeNum }
    lastDanmuLoadKeyRef.current = requestKey
    setLoading(true)
    setError(null)

    try {
      const params = new URLSearchParams()
      if (videoDoubanId && videoDoubanId > 0) params.append('douban_id', videoDoubanId.toString())
      if (videoTitle) params.append('title', videoTitle)
      if (videoYear) params.append('year', videoYear)
      if (currentEpisodeIndex !== null && currentEpisodeIndex >= 0) params.append('episode', currentEpisodeNum.toString())
      if (activeManualOverride?.episodeId) params.append('episode_id', String(activeManualOverride.episodeId))

      if (!params.toString()) {
        danmuLoadingRef.current = false
        setLoading(false)
        setLoadMeta({ source: 'empty', loadedAt: Date.now(), count: 0 })
        return emptyResult
      }

      const baseCacheKey = `${videoTitle}_${videoYear}_${videoDoubanId}_${currentEpisodeNum}`
      const cacheKey = activeManualOverride
        ? `${baseCacheKey}__manual_${activeManualOverride.animeId}_${activeManualOverride.episodeId}`
        : baseCacheKey

      if (!force) {
        const cached = await getDanmuCacheItem(cacheKey)
        if (cached && (now - cached.timestamp) < (DANMU_CACHE_DURATION * 1000)) {
          const plugin = danmuPluginStateRef.current
          if (plugin?.load) { try { await plugin.load(cached.data) } catch {} }
          setDanmuList(cached.data)
          setLoadMeta({ source: 'cache', loadedAt: Date.now(), count: cached.data.length })
          danmuLoadingRef.current = false
          setLoading(false)
          return { count: cached.data.length, data: cached.data }
        }
      }

      const token = await import('@/lib/auth').then((m) => m.getToken())
      const headers: Record<string, string> = {}
      if (token) headers['Authorization'] = `Bearer ${token}`
      const response = await fetch(`/api/danmu?${params}`, { headers })
      if (!response.ok) throw new Error(`HTTP ${response.status}`)
      const data = await response.json()
      const danmuData = data.data || []

      await setDanmuCacheItem(cacheKey, danmuData)
      const plugin = danmuPluginStateRef.current
      if (plugin?.load) { try { await plugin.load(danmuData) } catch {} }
      setDanmuList(danmuData)
      setLoadMeta({ source: 'network', loadedAt: Date.now(), count: danmuData.length })
      danmuLoadingRef.current = false
      setLoading(false)
      return { count: danmuData.length, data: danmuData }
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err))
      setError(error)
      setLoadMeta({ source: 'error', loadedAt: Date.now(), count: 0 })
      danmuLoadingRef.current = false
      setLoading(false)
      return emptyResult
    }
  }, [videoTitle, videoYear, videoDoubanId, currentEpisodeIndex, currentSource, manualOverride, danmuList])

  const handleDanmuOperationOptimized = useCallback((nextState: boolean) => {
    setExternalDanmuEnabled(nextState)
    externalDanmuEnabledRef.current = nextState
    try { localStorage.setItem('enable_external_danmu', String(nextState)) } catch {}
    if (nextState) {
      loadExternalDanmu()
    } else {
      const plugin = danmuPluginStateRef.current
      if (plugin?.hide) { try { plugin.hide() } catch {} }
    }
  }, [loadExternalDanmu])

  return {
    externalDanmuEnabled,
    setExternalDanmuEnabled,
    danmuList,
    loading,
    loadMeta,
    error,
    loadExternalDanmu,
    handleDanmuOperationOptimized,
    externalDanmuEnabledRef,
    danmuLoadingRef,
    lastDanmuLoadKeyRef,
    danmuPluginStateRef,
  }
}
