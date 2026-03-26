/* eslint-disable @typescript-eslint/no-explicit-any */
import { ChevronRight, Film, Tv, Calendar, Sparkles, Play, Trash2 } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Suspense, useEffect, useState, useRef, useMemo, useReducer, useTransition } from 'react'
import { useQuery } from '@tanstack/react-query'

import { BangumiCalendarData } from '@/lib/bangumi.client'
import { cleanExpiredCache, clearRecommendsCache } from '@/lib/shortdrama-cache'
import { getAllFavorites, getAllPlayRecords } from '@/lib/db.client'
import { useClearFavoritesMutation } from '@/hooks/useFavoritesMutations'
import { useHomePageQueries } from '@/hooks/useHomePageQueries'
import { getDoubanDetails } from '@/lib/douban.client'
import { getCurrentUser } from '@/lib/auth'
import { useSiteConfig } from '@/contexts/SiteContext'
import type { DoubanItem } from '@/types'

import CapsuleSwitch from '@/components/CapsuleSwitch'
import ContinueWatching from '@/components/ContinueWatching'
import HeroBanner from '@/components/HeroBanner'
import ScrollableRow from '@/components/ScrollableRow'
import SectionTitle from '@/components/SectionTitle'
import SkeletonCard from '@/components/SkeletonCard'
import { TelegramWelcomeModal } from '@/components/TelegramWelcomeModal'
import VideoCard from '@/components/VideoCard'

interface LocalShortDramaItem {
  id: string
  title: string
  poster?: string
  description?: string
}

interface ReleaseCalendarItem {
  id: string
  title: string
  cover?: string
  releaseDate: string
  type: 'movie' | 'tv'
  episodes?: number
}

interface HomeState {
  activeTab: 'home' | 'favorites'
  hotMovies: DoubanItem[]
  hotTvShows: DoubanItem[]
  hotVarietyShows: DoubanItem[]
  hotAnime: DoubanItem[]
  hotShortDramas: LocalShortDramaItem[]
  bangumiCalendarData: BangumiCalendarData[]
  upcomingReleases: ReleaseCalendarItem[]
  username: string
  showAnnouncement: boolean
}

type HomeAction =
  | { type: 'SET_ACTIVE_TAB'; payload: 'home' | 'favorites' }
  | { type: 'SET_UPCOMING_RELEASES'; payload: ReleaseCalendarItem[] }
  | { type: 'SET_USERNAME'; payload: string }
  | { type: 'SET_SHOW_ANNOUNCEMENT'; payload: boolean }
  | { type: 'UPDATE_HOT_MOVIES'; payload: (prev: DoubanItem[]) => DoubanItem[] }
  | { type: 'UPDATE_HOT_TV_SHOWS'; payload: (prev: DoubanItem[]) => DoubanItem[] }
  | { type: 'UPDATE_HOT_VARIETY_SHOWS'; payload: (prev: DoubanItem[]) => DoubanItem[] }
  | { type: 'UPDATE_HOT_ANIME'; payload: (prev: DoubanItem[]) => DoubanItem[] }
  | { type: 'UPDATE_HOT_SHORT_DRAMAS'; payload: (prev: LocalShortDramaItem[]) => LocalShortDramaItem[] }

const homeReducer = (state: HomeState, action: HomeAction): HomeState => {
  switch (action.type) {
    case 'SET_ACTIVE_TAB': return { ...state, activeTab: action.payload }
    case 'SET_UPCOMING_RELEASES': return { ...state, upcomingReleases: action.payload }
    case 'SET_USERNAME': return { ...state, username: action.payload }
    case 'SET_SHOW_ANNOUNCEMENT': return { ...state, showAnnouncement: action.payload }
    case 'UPDATE_HOT_MOVIES': return { ...state, hotMovies: action.payload(state.hotMovies) }
    case 'UPDATE_HOT_TV_SHOWS': return { ...state, hotTvShows: action.payload(state.hotTvShows) }
    case 'UPDATE_HOT_VARIETY_SHOWS': return { ...state, hotVarietyShows: action.payload(state.hotVarietyShows) }
    case 'UPDATE_HOT_ANIME': return { ...state, hotAnime: action.payload(state.hotAnime) }
    case 'UPDATE_HOT_SHORT_DRAMAS': return { ...state, hotShortDramas: action.payload(state.hotShortDramas) }
    default: return state
  }
}

type FavoriteItem = {
  id: string
  source: string
  title: string
  year?: string
  poster: string
  episodes: number
  source_name: string
  currentEpisode?: number
  search_title?: string
  origin?: 'vod' | 'live'
  type?: string
  releaseDate?: string
  remarks?: string
}

function HomeClient() {
  const {
    data: homeData,
    isLoading: homeLoading,
    refetch: refetchHomeData,
  } = useHomePageQueries()

  const [isPending, startTransition] = useTransition()
  const [state, dispatch] = useReducer(homeReducer, {
    activeTab: 'home',
    hotMovies: [],
    hotTvShows: [],
    hotVarietyShows: [],
    hotAnime: [],
    hotShortDramas: [],
    bangumiCalendarData: [],
    upcomingReleases: [],
    username: '',
    showAnnouncement: false,
  })

  const { announcement } = useSiteConfig()
  const { activeTab, upcomingReleases, username, showAnnouncement } = state

  const hotMovies = useMemo(() => {
    const cached = (homeData?.hotMovies || []) as DoubanItem[]
    if (state.hotMovies.length > 0 && cached.length > 0) {
      return cached.map(m => {
        const local = state.hotMovies.find(lm => lm.id === m.id)
        return local ? { ...m, ...local } : m
      })
    }
    return cached
  }, [homeData?.hotMovies, state.hotMovies])

  const hotTvShows = useMemo(() => {
    const cached = (homeData?.hotTvShows || []) as DoubanItem[]
    if (state.hotTvShows.length > 0 && cached.length > 0) {
      return cached.map(s => {
        const local = state.hotTvShows.find(ls => ls.id === s.id)
        return local ? { ...s, ...local } : s
      })
    }
    return cached
  }, [homeData?.hotTvShows, state.hotTvShows])

  const hotVarietyShows = useMemo(() => {
    const cached = (homeData?.hotVarietyShows || []) as DoubanItem[]
    if (state.hotVarietyShows.length > 0 && cached.length > 0) {
      return cached.map(s => {
        const local = state.hotVarietyShows.find(ls => ls.id === s.id)
        return local ? { ...s, ...local } : s
      })
    }
    return cached
  }, [homeData?.hotVarietyShows, state.hotVarietyShows])

  const hotAnime = useMemo(() => {
    const cached = (homeData?.hotAnime || []) as DoubanItem[]
    if (state.hotAnime.length > 0 && cached.length > 0) {
      return cached.map(a => {
        const local = state.hotAnime.find(la => la.id === a.id)
        return local ? { ...a, ...local } : a
      })
    }
    return cached
  }, [homeData?.hotAnime, state.hotAnime])

  const hotShortDramas = useMemo(() => {
    const cached = (homeData?.hotShortDramas || []) as unknown as LocalShortDramaItem[]
    if (state.hotShortDramas.length > 0 && cached.length > 0) {
      return cached.map(d => {
        const local = state.hotShortDramas.find(ld => ld.id === d.id)
        return local ? { ...d, ...local } : d
      })
    }
    return cached
  }, [homeData?.hotShortDramas, state.hotShortDramas])

  const bangumiCalendarData = (homeData?.bangumiCalendar || []) as BangumiCalendarData[]
  const loading = homeLoading
  const workerRef = useRef<Worker | null>(null)

  const greeting = useMemo(() => {
    const hour = new Date().getHours()
    if (hour < 12) return '早上好'
    if (hour < 18) return '下午好'
    return '晚上好'
  }, [])

  const todayAnimes = useMemo(() => {
    const today = new Date()
    const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
    const currentWeekday = weekdays[today.getDay()]
    return bangumiCalendarData.find(item => item.weekday.en === currentWeekday)?.items || []
  }, [bangumiCalendarData])

  const today = useMemo(() => {
    const date = new Date()
    date.setHours(0, 0, 0, 0)
    return date
  }, [])

  useEffect(() => {
    const user = getCurrentUser()
    if (user?.username) {
      dispatch({ type: 'SET_USERNAME', payload: user.username })
    }

    if (announcement) {
      const hasSeenAnnouncement = localStorage.getItem('hasSeenAnnouncement')
      if (hasSeenAnnouncement !== announcement) {
        dispatch({ type: 'SET_SHOW_ANNOUNCEMENT', payload: true })
      }
    }
  }, [announcement])

  const { data: allFavorites = {} } = useQuery({
    queryKey: ['favorites'],
    queryFn: () => getAllFavorites(),
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  })

  const { data: allPlayRecords = {} } = useQuery({
    queryKey: ['playRecords'],
    queryFn: () => getAllPlayRecords(),
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  })

  const favoriteItems = useMemo((): FavoriteItem[] => {
    return Object.entries(allFavorites as Record<string, any>)
      .sort(([, a], [, b]) => (b as any).save_time - (a as any).save_time)
      .map(([key, fav]) => {
        const plusIndex = key.indexOf('+')
        const source = key.slice(0, plusIndex)
        const id = key.slice(plusIndex + 1)
        const playRecord = (allPlayRecords as Record<string, any>)[key]
        const currentEpisode = playRecord?.index
        return {
          id,
          source,
          title: (fav as any).title,
          year: (fav as any).year,
          poster: (fav as any).cover,
          episodes: (fav as any).total_episodes,
          source_name: (fav as any).source_name,
          currentEpisode,
          search_title: (fav as any).search_title,
          origin: (fav as any).origin,
          type: (fav as any).type,
          releaseDate: (fav as any).releaseDate,
          remarks: (fav as any).remarks,
        }
      })
  }, [allFavorites, allPlayRecords])

  const [favoriteFilter, setFavoriteFilter] = useState<'all' | 'movie' | 'tv' | 'anime' | 'shortdrama' | 'live' | 'variety'>('all')
  const [favoriteSortBy, setFavoriteSortBy] = useState<'recent' | 'title'>('recent')
  const [upcomingFilter, setUpcomingFilter] = useState<'all' | 'movie' | 'tv'>('all')
  const [showClearFavoritesDialog, setShowClearFavoritesDialog] = useState(false)
  const [showTelegramModal, setShowTelegramModal] = useState(false)

  const favoriteStats = useMemo(() => {
    if (favoriteItems.length === 0) return null
    return {
      total: favoriteItems.length,
      movie: favoriteItems.filter(item => {
        if (item.type) return item.type === 'movie'
        if (item.source === 'shortdrama' || item.source_name === '短剧') return false
        if (item.source === 'bangumi') return false
        if (item.origin === 'live') return false
        return item.episodes === 1
      }).length,
      tv: favoriteItems.filter(item => {
        if (item.type) return item.type === 'tv'
        if (item.source === 'shortdrama' || item.source_name === '短剧') return false
        if (item.source === 'bangumi') return false
        if (item.origin === 'live') return false
        return item.episodes > 1
      }).length,
      anime: favoriteItems.filter(item => {
        if (item.type) return item.type === 'anime'
        return item.source === 'bangumi'
      }).length,
      shortdrama: favoriteItems.filter(item => {
        if (item.type) return item.type === 'shortdrama'
        return item.source === 'shortdrama' || item.source_name === '短剧'
      }).length,
      live: favoriteItems.filter(item => item.origin === 'live').length,
      variety: favoriteItems.filter(item => {
        if (item.type) return item.type === 'variety'
        return false
      }).length,
    }
  }, [favoriteItems])

  useEffect(() => {
    cleanExpiredCache().catch(console.error)
    clearRecommendsCache().catch(console.error)
    return () => {
      if (workerRef.current) {
        workerRef.current.terminate()
        workerRef.current = null
      }
    }
  }, [])

  useEffect(() => {
    if (homeData && (homeData as any).hotShortDramas?.length === 0 && !homeLoading) {
      refetchHomeData()
    }
  }, [homeData, homeLoading, refetchHomeData])

  useEffect(() => {
    if (!homeData) return

    // Lazy-load movie details
    if (hotMovies.length > 0) {
      setTimeout(() => {
        Promise.all(
          hotMovies.slice(0, 2).map(async (movie) => {
            try {
              const res = await getDoubanDetails(movie.id)
              if (res.code === 200 && res.data) {
                return { id: movie.id, plot_summary: res.data.plot_summary, backdrop: res.data.backdrop, trailerUrl: res.data.trailerUrl }
              }
            } catch {}
            return null
          })
        ).then((results) => {
          dispatch({
            type: 'UPDATE_HOT_MOVIES',
            payload: (prev) => {
              const base = prev.length > 0 ? prev : hotMovies
              return base.map(m => {
                const detail = results.find(r => r?.id === m.id)
                return detail ? { ...m, ...detail } : m
              })
            }
          })
        })
      }, 2000)
    }

    // Lazy-load TV show details
    if (hotTvShows.length > 0) {
      setTimeout(() => {
        Promise.all(
          hotTvShows.slice(0, 2).map(async (show) => {
            try {
              const res = await getDoubanDetails(show.id)
              if (res.code === 200 && res.data) {
                return { id: show.id, plot_summary: res.data.plot_summary, backdrop: res.data.backdrop, trailerUrl: res.data.trailerUrl }
              }
            } catch {}
            return null
          })
        ).then((results) => {
          dispatch({
            type: 'UPDATE_HOT_TV_SHOWS',
            payload: (prev) => {
              const base = prev.length > 0 ? prev : hotTvShows
              return base.map(s => {
                const detail = results.find(r => r?.id === s.id)
                return detail ? { ...s, ...detail } : s
              })
            }
          })
        })
      }, 2000)
    }

    // Lazy-load anime details
    if (hotAnime.length > 0) {
      setTimeout(() => {
        const anime = hotAnime[0]
        getDoubanDetails(anime.id)
          .then((res) => {
            if (res.code === 200 && res.data) {
              dispatch({
                type: 'UPDATE_HOT_ANIME',
                payload: (prev) => {
                  const base = prev.length > 0 ? prev : hotAnime
                  return base.map(a => a.id === anime.id ? { ...a, ...res.data } : a)
                }
              })
            }
          })
          .catch(() => {})
      }, 3000)
    }

    // Lazy-load variety details
    if (hotVarietyShows.length > 0) {
      setTimeout(() => {
        const show = hotVarietyShows[0]
        getDoubanDetails(show.id)
          .then((res) => {
            if (res.code === 200 && res.data) {
              dispatch({
                type: 'UPDATE_HOT_VARIETY_SHOWS',
                payload: (prev) => {
                  const base = prev.length > 0 ? prev : hotVarietyShows
                  return base.map(s => s.id === show.id ? { ...s, ...res.data } : s)
                }
              })
            }
          })
          .catch(() => {})
      }, 3000)
    }

    // Load short drama details
    if (hotShortDramas.length > 0) {
      setTimeout(() => {
        Promise.all(
          hotShortDramas.slice(0, 2).map(async (drama) => {
            try {
              const response = await fetch(`/api/shortdrama/detail?id=${drama.id}&episode=1`)
              if (response.ok) {
                const detailData = await response.json()
                if (detailData.desc) return { id: drama.id, description: detailData.desc }
              }
            } catch {}
            return null
          })
        ).then((results) => {
          dispatch({
            type: 'UPDATE_HOT_SHORT_DRAMAS',
            payload: (prev) => {
              const base = prev.length > 0 ? prev : hotShortDramas
              return base.map(d => {
                const detail = results.find(r => r?.id === d.id)
                return detail ? { ...d, description: detail.description } : d
              })
            }
          })
        })
      }, 3000)
    }

    // Load upcoming releases
    fetch('/api/release-calendar?limit=100')
      .then(res => res.ok ? res.json() : { items: [] })
      .then(data => {
        if (data?.items) {
          const releases: ReleaseCalendarItem[] = data.items
          if (typeof window !== 'undefined' && window.Worker) {
            try {
              const worker = new Worker(new URL('../workers/releaseCalendar.worker.ts', import.meta.url))
              workerRef.current = worker
              worker.onmessage = (e: MessageEvent) => {
                const { selectedItems, error } = e.data
                if (!error) dispatch({ type: 'SET_UPCOMING_RELEASES', payload: selectedItems })
                else dispatch({ type: 'SET_UPCOMING_RELEASES', payload: [] })
              }
              worker.onerror = () => dispatch({ type: 'SET_UPCOMING_RELEASES', payload: [] })
              const todayStr = new Date().toISOString().split('T')[0]
              worker.postMessage({ releases, today: todayStr })
            } catch {
              dispatch({ type: 'SET_UPCOMING_RELEASES', payload: [] })
            }
          } else {
            dispatch({ type: 'SET_UPCOMING_RELEASES', payload: [] })
          }
        }
      })
      .catch(() => dispatch({ type: 'SET_UPCOMING_RELEASES', payload: [] }))
  }, [homeData]) // eslint-disable-line react-hooks/exhaustive-deps

  const clearFavoritesMutation = useClearFavoritesMutation()

  const handleCloseAnnouncement = (ann: string) => {
    dispatch({ type: 'SET_SHOW_ANNOUNCEMENT', payload: false })
    localStorage.setItem('hasSeenAnnouncement', ann)
  }

  const getFilteredFavorites = () => {
    let filtered = favoriteItems
    if (favoriteFilter === 'movie') {
      filtered = favoriteItems.filter(item => {
        if (item.type) return item.type === 'movie'
        if (item.source === 'shortdrama' || item.source_name === '短剧') return false
        if (item.source === 'bangumi') return false
        if (item.origin === 'live') return false
        return item.episodes === 1
      })
    } else if (favoriteFilter === 'tv') {
      filtered = favoriteItems.filter(item => {
        if (item.type) return item.type === 'tv'
        if (item.source === 'shortdrama' || item.source_name === '短剧') return false
        if (item.source === 'bangumi') return false
        if (item.origin === 'live') return false
        return item.episodes > 1
      })
    } else if (favoriteFilter === 'anime') {
      filtered = favoriteItems.filter(item => {
        if (item.type) return item.type === 'anime'
        return item.source === 'bangumi'
      })
    } else if (favoriteFilter === 'shortdrama') {
      filtered = favoriteItems.filter(item => {
        if (item.type) return item.type === 'shortdrama'
        return item.source === 'shortdrama' || item.source_name === '短剧'
      })
    } else if (favoriteFilter === 'live') {
      filtered = favoriteItems.filter(item => item.origin === 'live')
    } else if (favoriteFilter === 'variety') {
      filtered = favoriteItems.filter(item => {
        if (item.type) return item.type === 'variety'
        return false
      })
    }
    if (favoriteSortBy === 'title') {
      filtered = [...filtered].sort((a, b) => a.title.localeCompare(b.title, 'zh-CN'))
    }
    return filtered
  }

  return (
    <div>
      <TelegramWelcomeModal show={showTelegramModal} onClose={() => setShowTelegramModal(false)} />

      <div className="overflow-visible -mt-6 md:mt-0 pb-32 md:pb-safe-bottom">
        {/* Welcome Banner */}
        <div className="mb-6 relative overflow-hidden rounded-xl bg-gradient-to-r from-blue-500/90 via-purple-500/90 to-pink-500/90 backdrop-blur-sm shadow-xl border border-white/20">
          <div className="relative p-4 sm:p-5">
            <div className="absolute inset-0 bg-gradient-to-br from-white/5 via-transparent to-black/5"></div>
            <div className="relative z-10 flex items-center justify-between gap-4">
              <div className="flex-1 min-w-0">
                <h2 className="text-lg sm:text-xl font-bold text-white mb-1 flex items-center gap-2 flex-wrap">
                  <span>{greeting}{username && '，'}</span>
                  {username && <span className="text-yellow-300 font-semibold">{username}</span>}
                  <span className="inline-block">👋</span>
                </h2>
                <p className="text-sm text-white/90">发现更多精彩影视内容 ✨</p>
              </div>
              <div className="hidden md:flex items-center justify-center shrink-0 w-12 h-12 rounded-full bg-white/10 backdrop-blur-sm border border-white/20">
                <Film className="w-6 h-6 text-white" />
              </div>
            </div>
          </div>
        </div>

        {/* Tab Switch */}
        <div className="mb-8 flex items-center justify-center">
          <CapsuleSwitch
            options={[
              { label: '首页', value: 'home' },
              { label: '收藏夹', value: 'favorites' },
            ]}
            value={activeTab}
            onChange={(value) => startTransition(() => dispatch({ type: 'SET_ACTIVE_TAB', payload: value as 'home' | 'favorites' }))}
          />
        </div>

        <div className={`w-full mx-auto ${isPending ? 'opacity-70 transition-opacity duration-150' : ''}`}>
          {activeTab === 'favorites' ? (
            <section className="mb-8">
              <div className="mb-6 flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-800 dark:text-gray-200">我的收藏</h2>
                {favoriteItems.length > 0 && (
                  <button
                    className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-red-600 hover:text-white hover:bg-red-600 dark:text-red-400 dark:hover:text-white dark:hover:bg-red-500 border border-red-300 dark:border-red-700 hover:border-red-600 dark:hover:border-red-500 rounded-lg transition-all duration-200 shadow-sm hover:shadow-md"
                    onClick={() => setShowClearFavoritesDialog(true)}
                  >
                    <Trash2 className="w-4 h-4" />
                    <span>清空收藏</span>
                  </button>
                )}
              </div>

              {favoriteStats && (
                <div className="mb-4 flex flex-wrap gap-2 text-sm text-gray-600 dark:text-gray-400">
                  <span className="px-3 py-1 bg-gray-100 dark:bg-gray-800 rounded-full">
                    共 <strong className="text-gray-900 dark:text-gray-100">{favoriteStats.total}</strong> 项
                  </span>
                  {favoriteStats.movie > 0 && <span className="px-3 py-1 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 rounded-full">电影 {favoriteStats.movie}</span>}
                  {favoriteStats.tv > 0 && <span className="px-3 py-1 bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300 rounded-full">剧集 {favoriteStats.tv}</span>}
                  {favoriteStats.anime > 0 && <span className="px-3 py-1 bg-pink-50 dark:bg-pink-900/20 text-pink-700 dark:text-pink-300 rounded-full">动漫 {favoriteStats.anime}</span>}
                  {favoriteStats.shortdrama > 0 && <span className="px-3 py-1 bg-rose-50 dark:bg-rose-900/20 text-rose-700 dark:text-rose-300 rounded-full">短剧 {favoriteStats.shortdrama}</span>}
                  {favoriteStats.live > 0 && <span className="px-3 py-1 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 rounded-full">直播 {favoriteStats.live}</span>}
                  {favoriteStats.variety > 0 && <span className="px-3 py-1 bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-300 rounded-full">综艺 {favoriteStats.variety}</span>}
                </div>
              )}

              {favoriteItems.length > 0 && (
                <div className="mb-4 flex flex-wrap gap-2">
                  {[
                    { key: 'all' as const, label: '全部', icon: '📚' },
                    { key: 'movie' as const, label: '电影', icon: '🎬' },
                    { key: 'tv' as const, label: '剧集', icon: '📺' },
                    { key: 'anime' as const, label: '动漫', icon: '🎌' },
                    { key: 'shortdrama' as const, label: '短剧', icon: '🎭' },
                    { key: 'live' as const, label: '直播', icon: '📡' },
                    { key: 'variety' as const, label: '综艺', icon: '🎪' },
                  ].map(({ key, label, icon }) => (
                    <button
                      key={key}
                      onClick={() => setFavoriteFilter(key)}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                        favoriteFilter === key
                          ? 'bg-gradient-to-r from-blue-500 to-purple-500 text-white shadow-lg scale-105'
                          : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                      }`}
                    >
                      <span className="mr-1">{icon}</span>{label}
                    </button>
                  ))}
                </div>
              )}

              {favoriteItems.length > 0 && (
                <div className="mb-4 flex items-center gap-2 text-sm">
                  <span className="text-gray-600 dark:text-gray-400">排序：</span>
                  <div className="flex gap-2">
                    {[
                      { key: 'recent' as const, label: '最近添加' },
                      { key: 'title' as const, label: '标题 A-Z' },
                    ].map(({ key, label }) => (
                      <button
                        key={key}
                        onClick={() => setFavoriteSortBy(key)}
                        className={`px-3 py-1 rounded-md transition-colors ${
                          favoriteSortBy === key
                            ? 'bg-blue-500 text-white'
                            : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300'
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="justify-start grid grid-cols-3 gap-x-2 gap-y-14 sm:gap-y-20 px-0 sm:px-2 sm:grid-cols-[repeat(auto-fill,_minmax(11rem,_1fr))] sm:gap-x-8">
                {getFilteredFavorites().map((item) => {
                  let calculatedRemarks = item.remarks
                  if (item.releaseDate) {
                    const releaseDate = new Date(item.releaseDate)
                    const daysDiff = Math.ceil((releaseDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
                    if (daysDiff < 0) calculatedRemarks = `已上映${Math.abs(daysDiff)}天`
                    else if (daysDiff === 0) calculatedRemarks = '今日上映'
                    else calculatedRemarks = `${daysDiff}天后上映`
                  }
                  return (
                    <div key={item.id + item.source} className="w-full">
                      <VideoCard
                        query={item.search_title}
                        {...item}
                        from="favorite"
                        remarks={calculatedRemarks}
                      />
                    </div>
                  )
                })}
                {favoriteItems.length === 0 && (
                  <div className="col-span-full flex flex-col items-center justify-center py-16 px-4">
                    <h3 className="text-xl font-semibold text-gray-700 dark:text-gray-300 mb-2">收藏夹空空如也</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400 text-center max-w-xs">
                      快去发现喜欢的影视作品，点击 ❤️ 添加到收藏吧！
                    </p>
                  </div>
                )}
              </div>

              {showClearFavoritesDialog && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                  <div className="bg-white dark:bg-gray-900 rounded-xl p-6 max-w-sm w-full shadow-xl">
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">确认清空收藏</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                      确定要清空所有收藏吗？这将删除 {favoriteItems.length} 项收藏，此操作无法撤销。
                    </p>
                    <div className="flex gap-3">
                      <button
                        onClick={() => setShowClearFavoritesDialog(false)}
                        className="flex-1 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300"
                      >
                        取消
                      </button>
                      <button
                        onClick={() => { clearFavoritesMutation.mutate(); setShowClearFavoritesDialog(false) }}
                        className="flex-1 py-2 rounded-lg bg-red-600 text-white font-medium"
                      >
                        确认清空
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </section>
          ) : (
            <>
              {/* Hero Banner */}
              {!loading && (hotMovies.length > 0 || hotTvShows.length > 0) && (
                <section className="mb-8">
                  <HeroBanner
                    items={[
                      ...hotMovies.slice(0, 2).map((movie) => ({
                        id: movie.id,
                        title: movie.title,
                        poster: movie.poster,
                        backdrop: movie.backdrop,
                        trailerUrl: movie.trailerUrl,
                        description: movie.plot_summary,
                        year: movie.year,
                        rate: movie.rate,
                        douban_id: Number(movie.id),
                        type: 'movie',
                      })),
                      ...hotTvShows.slice(0, 2).map((show) => ({
                        id: show.id,
                        title: show.title,
                        poster: show.poster,
                        backdrop: show.backdrop,
                        trailerUrl: show.trailerUrl,
                        description: show.plot_summary,
                        year: show.year,
                        rate: show.rate,
                        douban_id: Number(show.id),
                        type: 'tv',
                      })),
                      ...hotVarietyShows.slice(0, 1).map((show) => ({
                        id: show.id,
                        title: show.title,
                        poster: show.poster,
                        backdrop: show.backdrop,
                        trailerUrl: show.trailerUrl,
                        description: show.plot_summary,
                        year: show.year,
                        rate: show.rate,
                        douban_id: Number(show.id),
                        type: 'variety',
                      })),
                      ...hotAnime.slice(0, 1).map((anime) => ({
                        id: anime.id,
                        title: anime.title,
                        poster: anime.poster,
                        backdrop: anime.backdrop,
                        trailerUrl: anime.trailerUrl,
                        description: anime.plot_summary,
                        year: anime.year,
                        rate: anime.rate,
                        douban_id: Number(anime.id),
                        type: 'anime',
                      })),
                    ]}
                    autoPlayInterval={8000}
                    showControls={true}
                    showIndicators={true}
                    enableVideo={true}
                  />
                </section>
              )}

              {/* Continue Watching */}
              <ContinueWatching />

              {/* Upcoming Releases */}
              {!loading && upcomingReleases.length > 0 && (
                <section className="mb-8">
                  <div className="mb-4 flex items-center justify-between">
                    <SectionTitle title="即将上映" icon={<Calendar className="w-5 h-5 text-orange-500" />} />
                    <Link
                      to="/release-calendar"
                      className="flex items-center text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
                    >
                      查看更多
                      <ChevronRight className="w-4 h-4 ml-1" />
                    </Link>
                  </div>
                  <div className="mb-4 flex gap-2">
                    {[
                      { key: 'all', label: '全部', count: upcomingReleases.length },
                      { key: 'movie', label: '电影', count: upcomingReleases.filter(r => r.type === 'movie').length },
                      { key: 'tv', label: '电视剧', count: upcomingReleases.filter(r => r.type === 'tv').length },
                    ].map(({ key, label, count }) => (
                      <button
                        key={key}
                        onClick={() => setUpcomingFilter(key as 'all' | 'movie' | 'tv')}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                          upcomingFilter === key
                            ? 'bg-orange-500 text-white shadow-md'
                            : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300'
                        }`}
                      >
                        {label}
                        {count > 0 && (
                          <span className={`ml-1.5 text-xs ${upcomingFilter === key ? 'text-white/80' : 'text-gray-500 dark:text-gray-400'}`}>
                            ({count})
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                  <ScrollableRow>
                    {upcomingReleases
                      .filter(release => upcomingFilter === 'all' || release.type === upcomingFilter)
                      .map((release, index) => {
                        const releaseDate = new Date(release.releaseDate)
                        const daysDiff = Math.ceil((releaseDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
                        let remarksText
                        if (daysDiff < 0) remarksText = `已上映${Math.abs(daysDiff)}天`
                        else if (daysDiff === 0) remarksText = '今日上映'
                        else remarksText = `${daysDiff}天后上映`
                        return (
                          <div key={`${release.id}-${index}`} className="min-w-[96px] w-24 sm:min-w-[180px] sm:w-44">
                            <VideoCard
                              source="upcoming_release"
                              id={release.id}
                              source_name="即将上映"
                              from="douban"
                              title={release.title}
                              poster={release.cover || '/placeholder-poster.jpg'}
                              year={release.releaseDate.split('-')[0]}
                              type={release.type}
                              remarks={remarksText}
                              releaseDate={release.releaseDate}
                              query={release.title}
                              episodes={release.episodes || (release.type === 'tv' ? undefined : 1)}
                            />
                          </div>
                        )
                      })}
                  </ScrollableRow>
                </section>
              )}

              {/* Hot Movies */}
              <section className="mb-8">
                <div className="mb-4 flex items-center justify-between">
                  <SectionTitle title="热门电影" icon={<Film className="w-5 h-5 text-red-500" />} />
                  <Link to="/douban?type=movie" className="flex items-center text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors">
                    查看更多<ChevronRight className="w-4 h-4 ml-1" />
                  </Link>
                </div>
                <ScrollableRow>
                  {loading
                    ? Array.from({ length: 8 }).map((_, i) => <SkeletonCard key={i} />)
                    : hotMovies.map((movie, index) => (
                        <div key={index} className="min-w-[96px] w-24 sm:min-w-[180px] sm:w-44">
                          <VideoCard
                            from="douban" source="douban" id={movie.id} source_name="豆瓣"
                            title={movie.title} poster={movie.poster} douban_id={Number(movie.id)}
                            rate={movie.rate} year={movie.year} type="movie"
                          />
                        </div>
                      ))
                  }
                </ScrollableRow>
              </section>

              {/* Hot TV Shows */}
              <section className="mb-8">
                <div className="mb-4 flex items-center justify-between">
                  <SectionTitle title="热门剧集" icon={<Tv className="w-5 h-5 text-blue-500" />} />
                  <Link to="/douban?type=tv" className="flex items-center text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors">
                    查看更多<ChevronRight className="w-4 h-4 ml-1" />
                  </Link>
                </div>
                <ScrollableRow>
                  {loading
                    ? Array.from({ length: 8 }).map((_, i) => <SkeletonCard key={i} />)
                    : hotTvShows.map((show, index) => (
                        <div key={index} className="min-w-[96px] w-24 sm:min-w-[180px] sm:w-44">
                          <VideoCard
                            from="douban" source="douban" id={show.id} source_name="豆瓣"
                            title={show.title} poster={show.poster} douban_id={Number(show.id)}
                            rate={show.rate} year={show.year} type="tv"
                          />
                        </div>
                      ))
                  }
                </ScrollableRow>
              </section>

              {/* Today's Anime */}
              <section className="mb-8">
                <div className="mb-4 flex items-center justify-between">
                  <SectionTitle title="新番放送" icon={<Calendar className="w-5 h-5 text-purple-500" />} />
                  <Link to="/douban?type=anime" className="flex items-center text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors">
                    查看更多<ChevronRight className="w-4 h-4 ml-1" />
                  </Link>
                </div>
                <ScrollableRow>
                  {loading
                    ? Array.from({ length: 8 }).map((_, i) => <SkeletonCard key={i} />)
                    : todayAnimes.map((anime: any, index: number) => (
                        <div key={`${anime.id}-${index}`} className="min-w-[96px] w-24 sm:min-w-[180px] sm:w-44">
                          <VideoCard
                            from="douban" source="bangumi" id={anime.id.toString()} source_name="Bangumi"
                            title={anime.name_cn || anime.name}
                            poster={anime.images?.large || anime.images?.common || anime.images?.medium || '/placeholder-poster.jpg'}
                            douban_id={anime.id}
                            rate={anime.rating?.score?.toFixed(1) || ''}
                            year={anime.air_date?.split('-')?.[0] || ''}
                            isBangumi={true}
                          />
                        </div>
                      ))
                  }
                </ScrollableRow>
              </section>

              {/* Hot Variety Shows */}
              <section className="mb-8">
                <div className="mb-4 flex items-center justify-between">
                  <SectionTitle title="热门综艺" icon={<Sparkles className="w-5 h-5 text-pink-500" />} />
                  <Link to="/douban?type=show" className="flex items-center text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors">
                    查看更多<ChevronRight className="w-4 h-4 ml-1" />
                  </Link>
                </div>
                <ScrollableRow>
                  {loading
                    ? Array.from({ length: 8 }).map((_, i) => <SkeletonCard key={i} />)
                    : hotVarietyShows.map((show, index) => (
                        <div key={index} className="min-w-[96px] w-24 sm:min-w-[180px] sm:w-44">
                          <VideoCard
                            from="douban" source="douban" id={show.id} source_name="豆瓣"
                            title={show.title} poster={show.poster} douban_id={Number(show.id)}
                            rate={show.rate} year={show.year} type="variety"
                          />
                        </div>
                      ))
                  }
                </ScrollableRow>
              </section>

              {/* Hot Short Dramas */}
              <section className="mb-8">
                <div className="mb-4 flex items-center justify-between">
                  <SectionTitle title="热门短剧" icon={<Play className="w-5 h-5 text-orange-500" />} />
                  <Link to="/shortdrama" className="flex items-center text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors">
                    查看更多<ChevronRight className="w-4 h-4 ml-1" />
                  </Link>
                </div>
                <ScrollableRow>
                  {loading
                    ? Array.from({ length: 8 }).map((_, i) => <SkeletonCard key={i} />)
                    : hotShortDramas.map((drama, index) => (
                        <div key={index} className="min-w-[96px] w-24 sm:min-w-[180px] sm:w-44">
                          <VideoCard
                            from="douban" source="shortdrama" id={drama.id} source_name="短剧"
                            title={drama.title} poster={drama.poster || '/placeholder-poster.jpg'}
                          />
                        </div>
                      ))
                  }
                </ScrollableRow>
              </section>
            </>
          )}
        </div>
      </div>

      {/* Announcement Modal */}
      {announcement && showAnnouncement && (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
          style={{ touchAction: 'none' }}
        >
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl dark:bg-gray-900">
            <div className="mb-4">
              <h3 className="text-2xl font-bold tracking-tight text-gray-800 dark:text-white border-b border-green-500 pb-1">提示</h3>
            </div>
            <div className="mb-6">
              <div className="relative overflow-hidden rounded-lg mb-4 bg-green-50 dark:bg-green-900/20">
                <div className="absolute inset-y-0 left-0 w-1.5 bg-green-500 dark:bg-green-400"></div>
                <p className="ml-4 text-gray-600 dark:text-gray-300 leading-relaxed">{announcement}</p>
              </div>
            </div>
            <button
              onClick={() => handleCloseAnnouncement(announcement)}
              className="w-full rounded-lg bg-gradient-to-r from-green-600 to-green-700 px-4 py-3 text-white font-medium shadow-md hover:shadow-lg transition-all"
            >
              我知道了
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default function HomePage() {
  return (
    <Suspense>
      <HomeClient />
    </Suspense>
  )
}
