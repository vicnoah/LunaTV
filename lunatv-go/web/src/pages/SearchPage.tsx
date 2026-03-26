/* eslint-disable @typescript-eslint/no-explicit-any, react-hooks/exhaustive-deps */
import { ChevronUp, Grid2x2, List, Play, Search, X } from 'lucide-react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import React, { Suspense, useEffect, useMemo, useRef, useState } from 'react'
import { useQuery } from '@tanstack/react-query'

import { addSearchHistory, clearSearchHistory, getSearchHistory, subscribeToDataUpdates } from '@/lib/db.client'
import { SearchResult } from '@/types'

import ImageViewer from '@/components/ImageViewer'
import SearchResultFilter from '@/components/SearchResultFilter'
import SearchSuggestions from '@/components/SearchSuggestions'
import VideoCard, { VideoCardHandle } from '@/components/VideoCard'
import VirtualGrid from '@/components/VirtualGrid'

// ─── SSE Streaming types ─────────────────────────────────────────────────────

type SSEChunk =
  | { type: 'start'; totalSources: number }
  | { type: 'source_result'; results: SearchResult[] }
  | { type: 'source_progress' }
  | { type: 'source_error' }
  | { type: 'complete'; completedSources: number }

type StreamedState = {
  results: SearchResult[]
  totalSources: number
  completedSources: number
}

const STREAMED_INITIAL: StreamedState = { results: [], totalSources: 0, completedSources: 0 }

function eventSourceIterable(url: string, signal?: AbortSignal): AsyncIterable<SSEChunk> {
  return {
    [Symbol.asyncIterator]() {
      type Item = { value: SSEChunk; done: false } | { value: undefined; done: true }
      const queue: Item[] = []
      let waiting: ((item: Item) => void) | null = null
      let closed = false
      let pending: SearchResult[] = []
      let flushTimer: ReturnType<typeof setTimeout> | null = null

      const enqueue = (chunk: SSEChunk) => {
        if (closed) return
        const item: Item = { value: chunk, done: false }
        if (waiting) { const w = waiting; waiting = null; w(item) }
        else queue.push(item)
      }

      const flushPending = () => {
        flushTimer = null
        if (pending.length === 0) return
        enqueue({ type: 'source_result', results: pending })
        pending = []
      }

      const close = (completedSources?: number) => {
        if (closed) return
        if (flushTimer !== null) { clearTimeout(flushTimer); flushTimer = null }
        if (pending.length > 0) {
          enqueue({ type: 'source_result', results: pending })
          pending = []
        }
        if (completedSources !== undefined) {
          enqueue({ type: 'complete', completedSources })
        }
        closed = true
        const done: Item = { value: undefined, done: true }
        if (waiting) { const w = waiting; waiting = null; w(done) }
        else queue.push(done)
      }

      const es = new EventSource(url)
      es.onmessage = (event) => {
        if (!event.data || closed) return
        try {
          const payload = JSON.parse(event.data)
          switch (payload.type) {
            case 'start':
              enqueue({ type: 'start', totalSources: payload.totalSources || 0 })
              break
            case 'source_result':
              enqueue({ type: 'source_progress' })
              if (Array.isArray(payload.results) && payload.results.length > 0) {
                pending.push(...(payload.results as SearchResult[]))
                if (flushTimer === null) {
                  flushTimer = setTimeout(flushPending, 80)
                }
              }
              break
            case 'source_error':
              enqueue({ type: 'source_error' })
              break
            case 'complete':
              try { es.close() } catch {}
              close(payload.completedSources ?? 0)
              break
          }
        } catch {}
      }
      es.onerror = () => { try { es.close() } catch {}; close() }
      signal?.addEventListener('abort', () => { try { es.close() } catch {}; close() })

      return {
        next(): Promise<IteratorResult<SSEChunk>> {
          if (queue.length > 0) return Promise.resolve(queue.shift()!)
          if (closed) return Promise.resolve({ value: undefined, done: true })
          return new Promise((resolve) => { waiting = resolve })
        },
      }
    },
  }
}

// ─── streamedQuery helper (TanStack Query v5 experimental) ───────────────────

function streamedQuery<TChunk, TState>(opts: {
  streamFn: (ctx: { signal?: AbortSignal }) => AsyncIterable<TChunk>
  reducer: (acc: TState, chunk: TChunk) => TState
  initialValue: TState
  refetchMode?: 'reset' | 'append'
}) {
  return async function* ({ signal }: { signal?: AbortSignal }): AsyncGenerator<TState> {
    let state = opts.initialValue
    for await (const chunk of opts.streamFn({ signal })) {
      state = opts.reducer(state, chunk)
      yield state
    }
  }
}

function SearchPageClient() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()

  const inferTypeFromName = (typeName?: string, episodeCount?: number): string => {
    if (!typeName) return episodeCount && episodeCount > 1 ? 'tv' : 'movie'
    const lowerType = typeName.toLowerCase()
    if (lowerType.includes('综艺') || lowerType.includes('variety')) return 'variety'
    if (lowerType.includes('电影') || lowerType.includes('movie')) return 'movie'
    if (lowerType.includes('电视剧') || lowerType.includes('剧集') || lowerType.includes('tv')) return 'tv'
    if (lowerType.includes('动漫') || lowerType.includes('动画') || lowerType.includes('anime')) return 'anime'
    if (lowerType.includes('纪录片') || lowerType.includes('documentary')) return 'documentary'
    return episodeCount && episodeCount > 1 ? 'tv' : 'movie'
  }

  const getSearchResultUrl = (params: {
    title: string; year?: string; type?: string; source?: string; id?: string;
    query?: string; isAggregate?: boolean; doubanId?: number
  }) => {
    const yearParam = params.year && params.year !== 'unknown' ? `&year=${params.year}` : ''
    const queryParam = params.query ? `&stitle=${encodeURIComponent(params.query.trim())}` : ''
    const typeParam = params.type ? `&stype=${params.type}` : ''
    const preferParam = params.isAggregate ? '&prefer=true' : ''
    const doubanParam = params.doubanId && params.doubanId > 0 ? `&douban_id=${params.doubanId}` : ''
    if (params.isAggregate || !params.source || !params.id) {
      return `/play?title=${encodeURIComponent(params.title.trim())}${yearParam}${typeParam}${preferParam}${queryParam}${doubanParam}`
    }
    return `/play?source=${params.source}&id=${params.id}&title=${encodeURIComponent(params.title.trim())}${yearParam}${preferParam}${queryParam}${typeParam}${doubanParam}`
  }

  const renderTag = (label: string, className: string) => (
    <span className={`inline-flex items-center rounded-full px-2 py-1 text-[11px] font-medium ${className}`}>
      {label}
    </span>
  )

  const renderListItem = (item: {
    key: string; title: string; poster: string; year?: string; type: 'movie' | 'tv';
    episodes?: number; sourceName?: string; sourceNames?: string[]; doubanId?: number;
    desc?: string; vodRemarks?: string; isAggregate?: boolean; source?: string; id?: string; query?: string
  }) => {
    const yearText = item.year && item.year !== 'unknown' ? item.year : ''
    const sourceTags = item.isAggregate
      ? Array.from(new Set(item.sourceNames || []))
      : item.sourceName ? [item.sourceName] : []
    const isExpanded = !!expandedSourceTags[item.key]
    const maxVisibleSourceTags = 3
    const visibleSourceTags = isExpanded ? sourceTags : sourceTags.slice(0, maxVisibleSourceTags)
    const hiddenSourceCount = Math.max(0, sourceTags.length - visibleSourceTags.length)
    const description = (item.desc || '').trim()
    const itemUrl = getSearchResultUrl({
      title: item.title, year: item.year, type: item.type,
      source: item.source, id: item.id, query: item.query,
      isAggregate: item.isAggregate, doubanId: item.doubanId,
    })

    return (
      <button
        key={item.key}
        type="button"
        onClick={() => navigate(itemUrl)}
        className="group w-full rounded-2xl border border-gray-200/80 bg-white/90 p-3 text-left shadow-sm transition-all hover:border-green-300 hover:shadow-md dark:border-gray-700 dark:bg-gray-900/70 dark:hover:border-green-700"
      >
        <div className="flex items-start gap-4">
          <div className="relative h-32 w-24 shrink-0 overflow-hidden rounded-xl bg-gray-100 dark:bg-gray-800">
            <img
              src={item.poster} alt={item.title}
              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.04]"
              loading="lazy"
              onClick={(e) => { e.stopPropagation(); setPreviewImage({ url: item.poster, alt: item.title }) }}
            />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <h3 className="line-clamp-2 text-base font-semibold text-gray-900 dark:text-gray-100">{item.title}</h3>
                <div className="mt-2 flex flex-wrap gap-2">
                  {renderTag(item.type === 'movie' ? '电影' : '剧集', 'bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-300')}
                  {yearText && renderTag(yearText, 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300')}
                  {item.episodes && item.episodes > 0 && renderTag(`${item.episodes}集`, 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300')}
                  {item.vodRemarks && renderTag(item.vodRemarks, 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300')}
                  {item.doubanId && item.doubanId > 0 && renderTag('豆瓣', 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300')}
                </div>
                {description && <p className="mt-3 line-clamp-3 text-sm leading-6 text-gray-600 dark:text-gray-400">{description}</p>}
              </div>
              <div className="shrink-0 self-center">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-500 text-white shadow-md transition-transform group-hover:scale-110 group-hover:bg-green-600">
                  <Play className="h-4 w-4 translate-x-0.5" fill="currentColor" />
                </div>
              </div>
            </div>
          </div>
        </div>
        {sourceTags.length > 0 && (
          <div className={`mt-3 flex gap-2 ${isExpanded ? 'flex-wrap' : 'flex-nowrap overflow-hidden'}`}>
            {visibleSourceTags.map((sourceName) => (
              <span key={`${item.key}-${sourceName}`} className="inline-flex max-w-full shrink-0 items-center truncate rounded-full border border-gray-200 bg-gray-50 px-2.5 py-1 text-xs text-gray-600 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300" title={sourceName}>
                {sourceName}
              </span>
            ))}
            {hiddenSourceCount > 0 && (
              <button type="button" onClick={(e) => { e.stopPropagation(); setExpandedSourceTags((prev) => ({ ...prev, [item.key]: true })) }}
                className="inline-flex shrink-0 items-center rounded-full border border-green-200 bg-green-50 px-2.5 py-1 text-xs font-medium text-green-700 transition-colors hover:bg-green-100 dark:border-green-800 dark:bg-green-900/30 dark:text-green-300">
                +{hiddenSourceCount}
              </button>
            )}
          </div>
        )}
      </button>
    )
  }

  const [searchHistory, setSearchHistory] = useState<string[]>([])
  const [showBackToTop, setShowBackToTop] = useState(false)
  const currentQueryRef = useRef<string>('')
  const [searchQuery, setSearchQuery] = useState('')
  const [showResults, setShowResults] = useState(false)
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [useFluidSearch, setUseFluidSearch] = useState(true)
  const [useVirtualization, setUseVirtualization] = useState(() => {
    const saved = localStorage.getItem('useVirtualization')
    return saved !== null ? JSON.parse(saved) : true
  })
  const [exactSearch, setExactSearch] = useState(true)
  const [searchType, setSearchType] = useState<'video' | 'netdisk' | 'youtube' | 'tmdb-actor'>('video')
  const [netdiskResourceType, setNetdiskResourceType] = useState<'netdisk' | 'acg'>('netdisk')
  const [netdiskResults, setNetdiskResults] = useState<{ [key: string]: any[] } | null>(null)
  const [netdiskLoading, setNetdiskLoading] = useState(false)
  const [netdiskError, setNetdiskError] = useState<string | null>(null)
  const [netdiskTotal, setNetdiskTotal] = useState(0)
  const [youtubeResults, setYoutubeResults] = useState<any[] | null>(null)
  const [youtubeLoading, setYoutubeLoading] = useState(false)
  const [youtubeError, setYoutubeError] = useState<string | null>(null)
  const [youtubeWarning, setYoutubeWarning] = useState<string | null>(null)
  const [youtubeContentType, setYoutubeContentType] = useState<'all' | 'music' | 'movie' | 'educational' | 'gaming' | 'sports' | 'news'>('all')
  const [youtubeSortOrder, setYoutubeSortOrder] = useState<'relevance' | 'date' | 'rating' | 'viewCount' | 'title'>('relevance')
  const [tmdbActorResults, setTmdbActorResults] = useState<any[] | null>(null)
  const [tmdbActorLoading, setTmdbActorLoading] = useState(false)
  const [tmdbActorError, setTmdbActorError] = useState<string | null>(null)
  const [tmdbActorType, setTmdbActorType] = useState<'movie' | 'tv'>('movie')
  const groupRefs = useRef<Map<string, React.RefObject<VideoCardHandle | null>>>(new Map())
  const groupStatsRef = useRef<Map<string, { douban_id?: number; episodes?: number; source_names: string[] }>>(new Map())

  const getGroupRef = (key: string) => {
    let ref = groupRefs.current.get(key)
    if (!ref) {
      ref = React.createRef<VideoCardHandle | null>()
      groupRefs.current.set(key, ref)
    }
    return ref
  }

  const computeGroupStats = (group: SearchResult[]) => {
    const episodes = (() => {
      const countMap = new Map<number, number>()
      group.forEach((g) => {
        const len = g.episodes?.length || 0
        if (len > 0) countMap.set(len, (countMap.get(len) || 0) + 1)
      })
      let max = 0; let res = 0
      countMap.forEach((v, k) => { if (v > max) { max = v; res = k } })
      return res
    })()
    const source_names = Array.from(new Set(group.map((g) => g.source_name).filter(Boolean))) as string[]
    const douban_id = (() => {
      const countMap = new Map<number, number>()
      group.forEach((g) => { if (g.douban_id && g.douban_id > 0) countMap.set(g.douban_id, (countMap.get(g.douban_id) || 0) + 1) })
      let max = 0; let res: number | undefined
      countMap.forEach((v, k) => { if (v > max) { max = v; res = k } })
      return res
    })()
    return { episodes, source_names, douban_id }
  }

  const [filterAll, setFilterAll] = useState<{ source: string; title: string; year: string; yearOrder: 'none' | 'asc' | 'desc' }>({ source: 'all', title: 'all', year: 'all', yearOrder: 'none' })
  const [filterAgg, setFilterAgg] = useState<{ source: string; title: string; year: string; yearOrder: 'none' | 'asc' | 'desc' }>({ source: 'all', title: 'all', year: 'all', yearOrder: 'none' })
  const [viewMode, setViewMode] = useState<'agg' | 'all'>(() => {
    const saved = localStorage.getItem('defaultAggregateSearch')
    return saved !== null ? (JSON.parse(saved) ? 'agg' : 'all') : 'agg'
  })
  const [resultDisplayMode, setResultDisplayMode] = useState<'card' | 'list'>(() => {
    const saved = localStorage.getItem('searchResultDisplayMode')
    return saved === 'card' || saved === 'list' ? saved : 'card'
  })
  const [expandedSourceTags, setExpandedSourceTags] = useState<Record<string, boolean>>({})
  const [previewImage, setPreviewImage] = useState<{ url: string; alt: string } | null>(null)

  const compareYear = (aYear: string, bYear: string, order: 'none' | 'asc' | 'desc') => {
    if (order === 'none') return 0
    const aIsEmpty = !aYear || aYear === 'unknown'
    const bIsEmpty = !bYear || bYear === 'unknown'
    if (aIsEmpty && bIsEmpty) return 0
    if (aIsEmpty) return 1
    if (bIsEmpty) return -1
    const aNum = parseInt(aYear, 10); const bNum = parseInt(bYear, 10)
    return order === 'asc' ? aNum - bNum : bNum - aNum
  }

  const titleContainsQuery = (title: string, query: string): boolean => {
    if (!exactSearch) return true
    if (!query || !title) return true
    const normalizedTitle = title.toLowerCase()
    const normalizedQuery = query.toLowerCase()
    return normalizedTitle.includes(normalizedQuery)
  }

  // ─── TanStack Query Search ────────────────────────────────────────────────
  const trimmedQuery = useMemo(() => (searchParams.get('q') || '').trim(), [searchParams])

  const streamedSearchQuery = useQuery<StreamedState>({
    queryKey: ['search', 'streamed', trimmedQuery],
    queryFn: async function* ({ signal }: { signal?: AbortSignal }) {
      let state = STREAMED_INITIAL
      for await (const chunk of eventSourceIterable(`/api/search/ws?q=${encodeURIComponent(trimmedQuery)}`, signal)) {
        switch ((chunk as SSEChunk).type) {
          case 'start': state = { results: [], totalSources: (chunk as any).totalSources, completedSources: 0 }; break
          case 'source_result': state = { ...state, results: state.results.concat((chunk as any).results) }; break
          case 'source_progress': state = { ...state, completedSources: state.completedSources + 1 }; break
          case 'source_error': state = { ...state, completedSources: state.completedSources + 1 }; break
          case 'complete': state = { ...state, completedSources: (chunk as any).completedSources || state.totalSources }; break
        }
        yield state
      }
    } as any,
    enabled: !!trimmedQuery && useFluidSearch,
    staleTime: 0,
    gcTime: 0,
  })

  const traditionalSearchQuery = useQuery<SearchResult[]>({
    queryKey: ['search', 'traditional', trimmedQuery],
    queryFn: async () => {
      const res = await fetch(`/api/search?q=${encodeURIComponent(trimmedQuery)}`)
      const data = await res.json()
      return Array.isArray(data.results) ? (data.results as SearchResult[]) : []
    },
    enabled: !!trimmedQuery && !useFluidSearch,
    staleTime: 0,
    gcTime: 0,
  })

  const searchResults: SearchResult[] = useFluidSearch
    ? ((streamedSearchQuery.data as any)?.results ?? [])
    : (traditionalSearchQuery.data ?? [])
  const totalSources = useFluidSearch ? ((streamedSearchQuery.data as any)?.totalSources ?? 0) : 1
  const completedSources = useFluidSearch
    ? ((streamedSearchQuery.data as any)?.completedSources ?? 0)
    : (traditionalSearchQuery.isSuccess ? 1 : 0)
  const isLoading = useFluidSearch ? streamedSearchQuery.isFetching : traditionalSearchQuery.isFetching

  const aggregatedResults = useMemo(() => {
    const filteredResults = exactSearch
      ? searchResults.filter(item => titleContainsQuery(item.title, currentQueryRef.current))
      : searchResults
    const map = new Map<string, SearchResult[]>()
    const keyOrder: string[] = []
    filteredResults.forEach((item) => {
      const key = `${item.title.split(' ').join('')}-${item.year || 'unknown'}-${item.episodes.length === 1 ? 'movie' : 'tv'}`
      const arr = map.get(key) || []
      if (arr.length === 0) keyOrder.push(key)
      arr.push(item)
      map.set(key, arr)
    })
    return keyOrder.map(key => [key, map.get(key)!] as [string, SearchResult[]])
  }, [searchResults, exactSearch])

  useEffect(() => {
    aggregatedResults.forEach(([mapKey, group]) => {
      const stats = computeGroupStats(group)
      const prev = groupStatsRef.current.get(mapKey)
      if (!prev) { groupStatsRef.current.set(mapKey, stats); return }
      const ref = groupRefs.current.get(mapKey)
      if (ref && ref.current) {
        if (prev.episodes !== stats.episodes) ref.current.setEpisodes(stats.episodes)
        const prevNames = (prev.source_names || []).join('|')
        const nextNames = (stats.source_names || []).join('|')
        if (prevNames !== nextNames) ref.current.setSourceNames(stats.source_names)
        if (prev.douban_id !== stats.douban_id) ref.current.setDoubanId(stats.douban_id)
        groupStatsRef.current.set(mapKey, stats)
      }
    })
  }, [aggregatedResults])

  const filterOptions = useMemo(() => {
    const sourcesSet = new Map<string, string>()
    const titlesSet = new Set<string>()
    const yearsSet = new Set<string>()
    searchResults.forEach((item) => {
      if (item.source && item.source_name) sourcesSet.set(item.source, item.source_name)
      if (item.title) titlesSet.add(item.title)
      if (item.year) yearsSet.add(item.year)
    })
    const sourceOptions = [{ label: '全部来源', value: 'all' }, ...Array.from(sourcesSet.entries()).sort((a, b) => a[1].localeCompare(b[1])).map(([value, label]) => ({ label, value }))]
    const titleOptions = [{ label: '全部标题', value: 'all' }, ...Array.from(titlesSet.values()).sort().map(t => ({ label: t, value: t }))]
    const years = Array.from(yearsSet.values())
    const knownYears = years.filter(y => y !== 'unknown').sort((a, b) => parseInt(b) - parseInt(a))
    const hasUnknown = years.includes('unknown')
    const yearOptions = [{ label: '全部年份', value: 'all' }, ...knownYears.map(y => ({ label: y, value: y })), ...(hasUnknown ? [{ label: '未知', value: 'unknown' }] : [])]
    const cats: Array<{ key: string; label: string; options: { label: string; value: string }[] }> = [
      { key: 'source', label: '来源', options: sourceOptions },
      { key: 'title', label: '标题', options: titleOptions },
      { key: 'year', label: '年份', options: yearOptions },
    ]
    return cats
  }, [searchResults])

  const filteredAllResults = useMemo(() => {
    const { source, title, year, yearOrder } = filterAll
    const exactFiltered = exactSearch ? searchResults.filter(item => titleContainsQuery(item.title, currentQueryRef.current)) : searchResults
    const filtered = exactFiltered.filter(item => {
      if (source !== 'all' && item.source !== source) return false
      if (title !== 'all' && item.title !== title) return false
      if (year !== 'all' && item.year !== year) return false
      return true
    })
    if (yearOrder === 'none') {
      const q = currentQueryRef.current.trim()
      return filtered.slice().sort((a, b) => {
        const aExact = (a.title || '').trim() === q; const bExact = (b.title || '').trim() === q
        if (aExact && !bExact) return -1; if (!aExact && bExact) return 1
        const aNum = Number.parseInt(a.year as any, 10); const bNum = Number.parseInt(b.year as any, 10)
        const aValid = !Number.isNaN(aNum); const bValid = !Number.isNaN(bNum)
        if (aValid && !bValid) return -1; if (!aValid && bValid) return 1
        if (aValid && bValid) return bNum - aNum
        return 0
      })
    }
    return filtered.sort((a, b) => {
      const yearComp = compareYear(a.year, b.year, yearOrder)
      if (yearComp !== 0) return yearComp
      const aExact = a.title === searchQuery.trim(); const bExact = b.title === searchQuery.trim()
      if (aExact && !bExact) return -1; if (!aExact && bExact) return 1
      return yearOrder === 'asc' ? a.title.localeCompare(b.title) : b.title.localeCompare(a.title)
    })
  }, [searchResults, filterAll, searchQuery, exactSearch])

  const filteredAggResults = useMemo(() => {
    const { source, title, year, yearOrder } = filterAgg as any
    const filtered = aggregatedResults.filter(([_, group]) => {
      const gTitle = group[0]?.title ?? ''; const gYear = group[0]?.year ?? 'unknown'
      const hasSource = source === 'all' ? true : group.some(item => item.source === source)
      if (!hasSource) return false
      if (title !== 'all' && gTitle !== title) return false
      if (year !== 'all' && gYear !== year) return false
      return true
    })
    if (yearOrder === 'none') {
      const q = currentQueryRef.current.trim()
      return filtered.slice().sort((a, b) => {
        const aTitle = (a[1][0]?.title || '').trim(); const bTitle = (b[1][0]?.title || '').trim()
        const aExact = aTitle === q; const bExact = bTitle === q
        if (aExact && !bExact) return -1; if (!aExact && bExact) return 1
        const aNum = Number.parseInt(a[1][0]?.year as any, 10); const bNum = Number.parseInt(b[1][0]?.year as any, 10)
        const aValid = !Number.isNaN(aNum); const bValid = !Number.isNaN(bNum)
        if (aValid && !bValid) return -1; if (!aValid && bValid) return 1
        if (aValid && bValid) return bNum - aNum
        return 0
      })
    }
    return filtered.sort((a, b) => {
      const aYear = a[1][0].year; const bYear = b[1][0].year
      const yearComp = compareYear(aYear, bYear, yearOrder)
      if (yearComp !== 0) return yearComp
      const aExact = a[1][0].title === searchQuery.trim(); const bExact = b[1][0].title === searchQuery.trim()
      if (aExact && !bExact) return -1; if (!aExact && bExact) return 1
      return yearOrder === 'asc' ? a[1][0].title.localeCompare(b[1][0].title) : b[1][0].title.localeCompare(a[1][0].title)
    })
  }, [aggregatedResults, filterAgg, searchQuery])

  useEffect(() => {
    if (!searchParams.get('q')) document.getElementById('searchInput')?.focus()
    getSearchHistory().then(setSearchHistory)
    const initialQuery = searchParams.get('q')
    if (initialQuery) {
      setSearchQuery(initialQuery)
      setShowResults(true)
    }
    const savedFluidSearch = localStorage.getItem('fluidSearch')
    if (savedFluidSearch !== null) setUseFluidSearch(JSON.parse(savedFluidSearch))
    const savedExactSearch = localStorage.getItem('exactSearch')
    if (savedExactSearch !== null) setExactSearch(savedExactSearch === 'true')

    const unsubscribe = subscribeToDataUpdates('searchHistoryUpdated', (newHistory: string[]) => {
      setSearchHistory(newHistory)
    })

    const handleScroll = () => setShowBackToTop(document.body.scrollTop > 300)
    document.body.addEventListener('scroll', handleScroll, { passive: true })
    return () => {
      unsubscribe()
      document.body.removeEventListener('scroll', handleScroll)
    }
  }, [])

  useEffect(() => {
    const query = searchParams.get('q') || ''
    currentQueryRef.current = query.trim()
    if (query) {
      setSearchQuery(query)
      setShowResults(true)
      setShowSuggestions(false)
      addSearchHistory(query)
    } else {
      setShowResults(false)
      setShowSuggestions(false)
    }
  }, [searchParams])

  const handleYouTubeSearch = async (query: string, contentType = youtubeContentType, sortOrder = youtubeSortOrder) => {
    if (!query.trim()) return
    setYoutubeLoading(true); setYoutubeError(null); setYoutubeWarning(null); setYoutubeResults(null)
    try {
      let url = `/api/youtube/search?q=${encodeURIComponent(query.trim())}`
      if (contentType && contentType !== 'all') url += `&contentType=${contentType}`
      if (sortOrder && sortOrder !== 'relevance') url += `&order=${sortOrder}`
      const response = await fetch(url)
      const data = await response.json()
      if (response.ok && data.success) {
        setYoutubeResults(data.videos || [])
        if (data.warning) setYoutubeWarning(data.warning)
      } else {
        setYoutubeError(data.error || 'YouTube搜索失败')
      }
    } catch (error: any) {
      setYoutubeError(error.message || 'YouTube搜索请求失败')
    } finally {
      setYoutubeLoading(false)
    }
  }

  const handleNetDiskSearch = async (query: string) => {
    if (!query.trim()) return
    setNetdiskLoading(true); setNetdiskError(null); setNetdiskResults(null); setNetdiskTotal(0)
    try {
      const response = await fetch(`/api/netdisk/search?q=${encodeURIComponent(query.trim())}`)
      const data = await response.json()
      if (response.ok && data.success) {
        setNetdiskResults(data.data.merged_by_type || {})
        setNetdiskTotal(data.data.total || 0)
      } else {
        setNetdiskError(data.error || '网盘搜索失败')
      }
    } catch {
      setNetdiskError('网盘搜索请求失败，请稍后重试')
    } finally {
      setNetdiskLoading(false)
    }
  }

  const handleTmdbActorSearch = async (query: string, type = tmdbActorType) => {
    if (!query.trim()) return
    setTmdbActorLoading(true); setTmdbActorError(null); setTmdbActorResults(null)
    try {
      const params = new URLSearchParams({ actor: query.trim(), type })
      const response = await fetch(`/api/tmdb/actor?${params}`)
      const data = await response.json()
      if (response.ok && data.code === 200) {
        setTmdbActorResults(data.list || [])
      } else {
        setTmdbActorError(data.error || data.message || '搜索演员失败')
      }
    } catch {
      setTmdbActorError('搜索演员失败，请稍后重试')
    } finally {
      setTmdbActorLoading(false)
    }
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = searchQuery.trim().replace(/\s+/g, ' ')
    if (!trimmed) return
    setSearchQuery(trimmed); setShowSuggestions(false); setShowResults(true)
    setSearchParams({ q: trimmed })
    if (searchType === 'netdisk' && netdiskResourceType === 'netdisk') handleNetDiskSearch(trimmed)
    else if (searchType === 'youtube') handleYouTubeSearch(trimmed)
    else if (searchType === 'tmdb-actor') handleTmdbActorSearch(trimmed, tmdbActorType)
  }

  const handleSuggestionSelect = (suggestion: string) => {
    setSearchQuery(suggestion); setShowSuggestions(false); setShowResults(true)
    setSearchParams({ q: suggestion })
  }

  const scrollToTop = () => {
    try { document.body.scrollTo({ top: 0, behavior: 'smooth' }) }
    catch { document.body.scrollTop = 0 }
  }

  // ─── Render card for video search ────────────────────────────────────────────

  const renderAggCard = ([mapKey, group]: [string, SearchResult[]]) => {
    const first = group[0]
    const stats = computeGroupStats(group)
    return (
      <div key={mapKey} className="w-full">
        <VideoCard
          ref={getGroupRef(mapKey)}
          title={first.title}
          poster={first.poster}
          year={first.year}
          rate={first.rate}
          episodes={stats.episodes}
          source_names={stats.source_names}
          douban_id={stats.douban_id}
          type={inferTypeFromName(first.type_name, first.episodes?.length)}
          from="search"
          isAggregate={true}
          query={first.title}
        />
      </div>
    )
  }

  const renderSingleCard = (item: SearchResult, index: number) => {
    return (
      <div key={`${item.source}-${item.id}-${index}`} className="w-full">
        <VideoCard
          id={item.id}
          source={item.source}
          title={item.title}
          poster={item.poster}
          year={item.year}
          rate={item.rate}
          episodes={item.episodes?.length}
          source_name={item.source_name}
          type={inferTypeFromName(item.type_name, item.episodes?.length)}
          from="search"
          query={item.title}
        />
      </div>
    )
  }

  return (
    <div>
      <div className="overflow-visible mb-10 -mt-6 md:mt-0">
        {/* Search Type Tabs */}
        <div className="mb-8">
          <div className="max-w-3xl mx-auto mb-6 px-3 sm:px-0">
            <div className="overflow-x-auto -mx-3 px-3 sm:mx-0 sm:px-0">
              <div className="inline-flex sm:flex items-center justify-start sm:justify-center min-w-full sm:min-w-0 bg-gradient-to-r from-gray-100 via-white to-gray-100 dark:from-gray-800/95 dark:via-gray-800/95 dark:to-gray-800/95 rounded-2xl p-2 gap-2 shadow-xl border-2 border-gray-200/70 dark:border-gray-600/70">
                {[
                  { key: 'video', label: '🎬 影视资源', activeClass: 'bg-gradient-to-br from-green-400 via-green-500 to-emerald-600 text-white shadow-lg shadow-green-500/50 ring-2 ring-green-400/60' },
                  { key: 'netdisk', label: '💾 网盘资源', activeClass: 'bg-gradient-to-br from-blue-400 via-blue-500 to-indigo-600 text-white shadow-lg shadow-blue-500/50 ring-2 ring-blue-400/60' },
                  { key: 'youtube', label: '📺 YouTube', activeClass: 'bg-gradient-to-br from-red-400 via-red-500 to-rose-600 text-white shadow-lg shadow-red-500/50 ring-2 ring-red-400/60' },
                  { key: 'tmdb-actor', label: '🎬 TMDB演员', activeClass: 'bg-gradient-to-br from-purple-400 via-purple-500 to-violet-600 text-white shadow-lg shadow-purple-500/50 ring-2 ring-purple-400/60' },
                ].map(({ key, label, activeClass }) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => {
                      setSearchType(key as any)
                      setNetdiskResults(null); setNetdiskError(null); setNetdiskTotal(0)
                      setYoutubeResults(null); setYoutubeError(null); setYoutubeWarning(null)
                      setTmdbActorResults(null); setTmdbActorError(null)
                      const currentQuery = searchQuery.trim() || searchParams.get('q') || ''
                      if (currentQuery && showResults) {
                        if (key === 'netdisk') handleNetDiskSearch(currentQuery)
                        else if (key === 'youtube') setTimeout(() => handleYouTubeSearch(currentQuery), 0)
                        else if (key === 'tmdb-actor') handleTmdbActorSearch(currentQuery, tmdbActorType)
                        else setSearchParams({ q: currentQuery })
                      }
                    }}
                    className={`flex-shrink-0 px-4 sm:px-6 py-3 text-sm sm:text-base font-bold rounded-xl transition-all duration-300 whitespace-nowrap min-w-[110px] sm:min-w-0 scale-105 ${
                      searchType === key
                        ? activeClass
                        : 'bg-gray-200/60 dark:bg-gray-700/80 text-gray-800 dark:text-gray-100 border-2 border-gray-300/50 dark:border-gray-600/50 shadow-md hover:bg-gray-300/80 hover:scale-105'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Search Input */}
          <form onSubmit={handleSearch} className="max-w-2xl mx-auto">
            <div className="relative group">
              <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400 transition-all duration-300 group-focus-within:text-green-500 group-focus-within:scale-110" />
              <input
                id="searchInput"
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value)
                  if (!e.target.value.trim()) setShowResults(false)
                  setShowSuggestions(true)
                }}
                onFocus={() => setShowSuggestions(true)}
                placeholder={
                  searchType === 'video' ? '🎬 搜索电影、电视剧...'
                    : searchType === 'netdisk' ? '💾 搜索网盘资源...'
                    : searchType === 'youtube' ? '📺 搜索YouTube视频...'
                    : '🎭 搜索演员姓名...'
                }
                autoComplete="off"
                className="w-full h-14 rounded-xl bg-white/90 py-4 pl-12 pr-14 text-sm text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-400 focus:bg-white border-2 border-gray-200/80 shadow-lg hover:shadow-xl focus:shadow-2xl focus:border-green-400 transition-all duration-300 dark:bg-gray-800/90 dark:text-gray-300 dark:placeholder-gray-500 dark:border-gray-700 dark:focus:border-green-500"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => { setSearchQuery(''); setShowResults(false); setShowSuggestions(true); document.getElementById('searchInput')?.focus() }}
                  className="absolute right-4 top-1/2 -translate-y-1/2 w-7 h-7 flex items-center justify-center rounded-full bg-gray-200/80 hover:bg-red-500 text-gray-500 hover:text-white transition-all duration-300 hover:scale-110"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
              {showSuggestions && (
                <SearchSuggestions
                  query={searchQuery}
                  suggestions={[]}
                  history={searchHistory}
                  onSelect={(q) => { handleSuggestionSelect(q); setShowSuggestions(false) }}
                  onClearHistory={() => { clearSearchHistory(); setSearchHistory([]) }}
                />
              )}
            </div>
          </form>
        </div>

        {/* Results area */}
        <div className="max-w-[95%] mx-auto mt-12 overflow-visible">
          {showResults ? (
            <section className="mb-12">
              {searchType === 'netdisk' ? (
                <div>
                  <h2 className="text-xl font-bold text-gray-800 dark:text-gray-200 mb-4">
                    资源搜索 {netdiskLoading && netdiskResourceType === 'netdisk' && <span className="ml-2 inline-block h-3 w-3 border-2 border-gray-300 border-t-green-500 rounded-full animate-spin align-middle"></span>}
                  </h2>
                  <div className="mb-3 flex items-center gap-2">
                    <span className="text-sm text-gray-600 dark:text-gray-400">资源类型：</span>
                    <div className="flex gap-2">
                      <button
                        onClick={() => { setNetdiskResourceType('netdisk'); const q = searchQuery.trim() || searchParams.get('q') || ''; if (q) handleNetDiskSearch(q) }}
                        className={`px-3 py-1.5 text-sm font-medium rounded-lg border transition-all ${netdiskResourceType === 'netdisk' ? 'bg-blue-500 text-white border-blue-500' : 'bg-white text-gray-700 border-gray-300 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-600'}`}
                      >💾 网盘资源</button>
                      <button
                        onClick={() => { setNetdiskResourceType('acg'); setNetdiskResults(null); setNetdiskError(null) }}
                        className={`px-3 py-1.5 text-sm font-medium rounded-lg border transition-all ${netdiskResourceType === 'acg' ? 'bg-purple-500 text-white border-purple-500' : 'bg-white text-gray-700 border-gray-300 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-600'}`}
                      >🎌 动漫磁力</button>
                    </div>
                  </div>
                  {netdiskResourceType === 'netdisk' && (
                    netdiskError ? <p className="text-red-500 text-sm">{netdiskError}</p>
                    : netdiskLoading ? <div className="text-center py-8 text-gray-500">搜索中...</div>
                    : netdiskResults ? (
                      <div>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">共找到 {netdiskTotal} 个资源</p>
                        {Object.entries(netdiskResults).map(([type, items]) => (
                          <div key={type} className="mb-6">
                            <h3 className="text-base font-semibold mb-3 text-gray-800 dark:text-gray-200">{type}</h3>
                            <div className="space-y-2">
                              {(items as any[]).map((item, i) => (
                                <a key={i} href={item.url || item.link} target="_blank" rel="noopener noreferrer"
                                  className="block p-3 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-blue-400 transition-colors">
                                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{item.title || item.name}</p>
                                  {item.size && <p className="text-xs text-gray-500 mt-1">{item.size}</p>}
                                </a>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : <div className="text-center py-8 text-gray-500 dark:text-gray-400">请搜索网盘资源</div>
                  )}
                  {netdiskResourceType === 'acg' && (
                    <div className="text-center py-8 text-gray-500 dark:text-gray-400">动漫磁力搜索功能</div>
                  )}
                </div>
              ) : searchType === 'youtube' ? (
                <div>
                  <h2 className="text-xl font-bold text-gray-800 dark:text-gray-200 mb-4">
                    YouTube搜索结果 {youtubeLoading && <span className="ml-2 inline-block h-3 w-3 border-2 border-gray-300 border-t-red-500 rounded-full animate-spin align-middle"></span>}
                  </h2>
                  {youtubeWarning && <p className="text-amber-600 dark:text-amber-400 text-sm mb-3">{youtubeWarning}</p>}
                  {youtubeError ? (
                    <div className="text-center py-8">
                      <p className="text-red-500 mb-2">{youtubeError}</p>
                      <button onClick={() => handleYouTubeSearch(searchQuery || searchParams.get('q') || '')} className="px-4 py-2 bg-red-100 hover:bg-red-200 text-red-700 rounded-lg">重试</button>
                    </div>
                  ) : youtubeResults && youtubeResults.length > 0 ? (
                    <div className="space-y-4">
                      {youtubeResults.map((video, i) => (
                        <a key={video.id || i} href={`https://www.youtube.com/watch?v=${video.id}`} target="_blank" rel="noopener noreferrer"
                          className="flex gap-3 p-3 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-red-400 transition-colors">
                          {video.thumbnail && <img src={video.thumbnail} alt={video.title} className="w-32 h-20 object-cover rounded-lg flex-shrink-0" />}
                          <div className="min-w-0 flex-1">
                            <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100 line-clamp-2">{video.title}</h3>
                            {video.channelTitle && <p className="text-xs text-gray-500 mt-1">{video.channelTitle}</p>}
                          </div>
                        </a>
                      ))}
                    </div>
                  ) : !youtubeLoading ? <div className="text-center text-gray-500 py-8 dark:text-gray-400">未找到YouTube视频</div> : null}
                </div>
              ) : searchType === 'tmdb-actor' ? (
                <div>
                  <h2 className="text-xl font-bold text-gray-800 dark:text-gray-200 mb-4">
                    TMDB演员搜索结果 {tmdbActorLoading && <span className="ml-2 inline-block h-3 w-3 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin align-middle"></span>}
                  </h2>
                  <div className="mb-3 flex items-center gap-2">
                    <span className="text-sm text-gray-600 dark:text-gray-400">类型：</span>
                    {[{ key: 'movie', label: '电影' }, { key: 'tv', label: '电视剧' }].map((type) => (
                      <button key={type.key} onClick={() => { setTmdbActorType(type.key as 'movie' | 'tv'); const q = searchQuery.trim() || searchParams.get('q') || ''; if (q) handleTmdbActorSearch(q, type.key as 'movie' | 'tv') }}
                        disabled={tmdbActorLoading}
                        className={`px-3 py-1 text-sm rounded-full border transition-colors ${tmdbActorType === type.key ? 'bg-blue-500 text-white border-blue-500' : 'bg-white text-gray-700 border-gray-300 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-600'}`}>
                        {type.label}
                      </button>
                    ))}
                  </div>
                  {tmdbActorError ? (
                    <div className="text-center py-8">
                      <p className="text-red-500 mb-2">{tmdbActorError}</p>
                      <button onClick={() => handleTmdbActorSearch(searchQuery || searchParams.get('q') || '', tmdbActorType)} className="px-4 py-2 bg-red-100 hover:bg-red-200 text-red-700 rounded-lg">重试</button>
                    </div>
                  ) : tmdbActorResults && tmdbActorResults.length > 0 ? (
                    <div className="grid grid-cols-3 gap-x-2 gap-y-14 sm:gap-y-20 px-0 sm:px-2 sm:grid-cols-[repeat(auto-fill,_minmax(11rem,_1fr))] sm:gap-x-8">
                      {tmdbActorResults.map((item, index) => (
                        <div key={item.id || index} className="w-full">
                          <VideoCard title={item.title} poster={item.poster} year={item.year} rate={item.rate} from="douban" type={tmdbActorType} />
                        </div>
                      ))}
                    </div>
                  ) : !tmdbActorLoading ? <div className="text-center text-gray-500 py-8 dark:text-gray-400">未找到相关演员作品</div> : null}
                </div>
              ) : (
                /* Video search results */
                <>
                  {/* Progress indicator */}
                  {isLoading && (
                    <div className="mb-4 flex items-center gap-3">
                      <div className="flex-1 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-green-500 rounded-full transition-all duration-300"
                          style={{ width: totalSources > 0 ? `${(completedSources / totalSources) * 100}%` : '0%' }}
                        />
                      </div>
                      <span className="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">
                        {completedSources}/{totalSources}
                      </span>
                    </div>
                  )}

                  {/* Result count and controls */}
                  <div className="mb-4 flex items-center justify-between flex-wrap gap-3">
                    <div className="flex items-center gap-3">
                      <h2 className="text-xl font-bold text-gray-800 dark:text-gray-200">
                        搜索结果
                        {(viewMode === 'agg' ? filteredAggResults.length : filteredAllResults.length) > 0 && (
                          <span className="ml-2 text-base font-normal text-gray-500 dark:text-gray-400">
                            ({viewMode === 'agg' ? filteredAggResults.length : filteredAllResults.length})
                          </span>
                        )}
                      </h2>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      {/* View mode toggle */}
                      <div className="flex rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700">
                        {[{ key: 'agg', label: '聚合' }, { key: 'all', label: '全部' }].map(({ key, label }) => (
                          <button key={key} onClick={() => setViewMode(key as 'agg' | 'all')}
                            className={`px-3 py-1.5 text-sm transition-colors ${viewMode === key ? 'bg-green-500 text-white' : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'}`}>
                            {label}
                          </button>
                        ))}
                      </div>
                      {/* Display mode toggle */}
                      <div className="flex rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700">
                        <button onClick={() => { setResultDisplayMode('card'); localStorage.setItem('searchResultDisplayMode', 'card') }}
                          className={`p-1.5 ${resultDisplayMode === 'card' ? 'bg-green-500 text-white' : 'text-gray-700 dark:text-gray-300'}`}>
                          <Grid2x2 className="w-4 h-4" />
                        </button>
                        <button onClick={() => { setResultDisplayMode('list'); localStorage.setItem('searchResultDisplayMode', 'list') }}
                          className={`p-1.5 ${resultDisplayMode === 'list' ? 'bg-green-500 text-white' : 'text-gray-700 dark:text-gray-300'}`}>
                          <List className="w-4 h-4" />
                        </button>
                      </div>
                      {/* Exact search toggle */}
                      <button
                        onClick={() => { const next = !exactSearch; setExactSearch(next); localStorage.setItem('exactSearch', String(next)) }}
                        className={`px-3 py-1.5 text-sm rounded-lg border transition-colors ${exactSearch ? 'bg-blue-500 text-white border-blue-500' : 'border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300'}`}
                      >
                        精确匹配
                      </button>
                    </div>
                  </div>

                  {/* Filters */}
                  {searchResults.length > 0 && (
                    <div className="mb-4">
                      <SearchResultFilter
                        category="all"
                        onCategoryChange={() => {}}
                        sourceFilter={(viewMode === 'agg' ? filterAgg : filterAll).source}
                        onSourceChange={(src) => {
                          if (viewMode === 'agg') setFilterAgg(prev => ({ ...prev, source: src }))
                          else setFilterAll(prev => ({ ...prev, source: src }))
                        }}
                        sources={filterOptions.find(c => c.key === 'source')?.options.map(o => o.value).filter(v => v !== 'all') || []}
                        yearOrder={(viewMode === 'agg' ? filterAgg : filterAll).yearOrder}
                        onYearOrderChange={(order) => {
                          if (viewMode === 'agg') setFilterAgg(prev => ({ ...prev, yearOrder: order }))
                          else setFilterAll(prev => ({ ...prev, yearOrder: order }))
                        }}
                      />
                    </div>
                  )}

                  {/* Results grid */}
                  {resultDisplayMode === 'card' ? (
                    viewMode === 'agg' ? (
                      useVirtualization ? (
                        <VirtualGrid
                          items={filteredAggResults}
                          renderItem={renderAggCard}
                        />
                      ) : (
                        <div className="grid grid-cols-3 gap-x-2 gap-y-14 sm:gap-y-20 px-0 sm:px-2 sm:grid-cols-[repeat(auto-fill,_minmax(11rem,_1fr))] sm:gap-x-8">
                          {filteredAggResults.map(renderAggCard)}
                        </div>
                      )
                    ) : (
                      useVirtualization ? (
                        <VirtualGrid
                          items={filteredAllResults}
                          renderItem={(item: any, index: number) => renderSingleCard(item, index)}
                        />
                      ) : (
                        <div className="grid grid-cols-3 gap-x-2 gap-y-14 sm:gap-y-20 px-0 sm:px-2 sm:grid-cols-[repeat(auto-fill,_minmax(11rem,_1fr))] sm:gap-x-8">
                          {filteredAllResults.map((item, index) => renderSingleCard(item, index))}
                        </div>
                      )
                    )
                  ) : (
                    /* List mode */
                    <div className="space-y-3">
                      {viewMode === 'agg'
                        ? filteredAggResults.map(([mapKey, group]) => {
                            const first = group[0]
                            const stats = computeGroupStats(group)
                            return renderListItem({
                              key: mapKey,
                              title: first.title,
                              poster: first.poster,
                              year: first.year,
                              type: inferTypeFromName(first.type_name, first.episodes?.length) as any,
                              episodes: stats.episodes,
                              sourceNames: stats.source_names,
                              doubanId: stats.douban_id,
                              desc: first.desc,
                              vodRemarks: first.vod_remarks,
                              isAggregate: true,
                            })
                          })
                        : filteredAllResults.map((item, index) =>
                            renderListItem({
                              key: `${item.source}-${item.id}-${index}`,
                              title: item.title,
                              poster: item.poster,
                              year: item.year,
                              type: inferTypeFromName(item.type_name, item.episodes?.length) as any,
                              episodes: item.episodes?.length,
                              sourceName: item.source_name,
                              doubanId: item.douban_id,
                              desc: item.desc,
                              vodRemarks: item.vod_remarks,
                              source: item.source,
                              id: item.id,
                              query: item.title,
                            })
                          )
                      }
                    </div>
                  )}

                  {!isLoading && searchResults.length === 0 && (
                    <div className="text-center text-gray-500 py-12 dark:text-gray-400">
                      <p className="text-lg font-medium mb-2">未找到相关结果</p>
                      <p className="text-sm">请尝试其他关键词</p>
                    </div>
                  )}
                </>
              )}
            </section>
          ) : (
            /* Search history */
            <div className="mb-12">
              {searchHistory.length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-base font-semibold text-gray-700 dark:text-gray-300">搜索历史</h3>
                    <button onClick={() => { clearSearchHistory(); setSearchHistory([]) }}
                      className="text-xs text-gray-500 hover:text-red-500 transition-colors">
                      清空
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {searchHistory.slice(0, 20).map((item, i) => (
                      <button key={i} onClick={() => handleSuggestionSelect(item)}
                        className="px-3 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-full transition-colors">
                        {item}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Back to top */}
      {showBackToTop && (
        <button
          onClick={scrollToTop}
          className="fixed bottom-24 right-6 z-50 w-10 h-10 flex items-center justify-center rounded-full bg-white dark:bg-gray-800 shadow-lg border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-all"
        >
          <ChevronUp className="w-5 h-5" />
        </button>
      )}

      {previewImage && (
        <ImageViewer
          url={previewImage.url}
          alt={previewImage.alt}
          onClose={() => setPreviewImage(null)}
        />
      )}
    </div>
  )
}

export default function SearchPage() {
  return (
    <Suspense>
      <SearchPageClient />
    </Suspense>
  )
}
