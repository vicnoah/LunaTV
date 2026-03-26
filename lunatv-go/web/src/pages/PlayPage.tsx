/* eslint-disable @typescript-eslint/no-explicit-any, react-hooks/exhaustive-deps, no-console */

import { Suspense, useCallback, useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import Hls from 'hls.js'
import { useDownload } from '@/contexts/DownloadContext'
import { useDanmu } from '@/hooks/useDanmu'
import type { DanmuManualOverride } from '@/hooks/useDanmu'
import DownloadEpisodeSelector from '@/components/download/DownloadEpisodeSelector'
import DanmuManualMatchModal, { type DanmuManualSelection } from '@/components/DanmuManualMatchModal'
import SkipController, { SkipSettingsButton } from '@/components/SkipController'
import VideoCard from '@/components/VideoCard'
import CommentSection from '@/components/play/CommentSection'
import DownloadButtons from '@/components/play/DownloadButtons'
import NetDiskButton from '@/components/play/NetDiskButton'
import CollapseButton from '@/components/play/CollapseButton'
import BackToTopButton from '@/components/play/BackToTopButton'
import LoadingScreen from '@/components/play/LoadingScreen'
import VideoInfoSection from '@/components/play/VideoInfoSection'
import VideoLoadingOverlay from '@/components/play/VideoLoadingOverlay'
import WatchRoomSyncBanner from '@/components/play/WatchRoomSyncBanner'
import SourceSwitchDialog from '@/components/play/SourceSwitchDialog'
import OwnerChangeDialog from '@/components/play/OwnerChangeDialog'
import VideoCoverDisplay from '@/components/play/VideoCoverDisplay'
import PlayErrorDisplay from '@/components/play/PlayErrorDisplay'
import DanmuSettingsPanel from '@/components/play/DanmuSettingsPanel'
import WebSRSettingsPanel from '@/components/play/WebSRSettingsPanel'
import {
  deleteFavorite,
  generateStorageKey,
  getAllFavorites,
  getAllPlayRecords,
  isFavorited,
  saveFavorite,
  savePlayRecord,
} from '@/lib/db.client'
import { getDoubanActorMovies } from '@/lib/douban.client'
import { SearchResult } from '@/types'
import { processImageUrl } from '@/lib/utils'
import { useWatchRoomSync } from '@/hooks/useWatchRoomSync'
import { useDoubanDetailsQuery, useDoubanCommentsQuery } from '@/hooks/usePlayPageQueries'

// ─── Playback rate persistence ────────────────────────────────────────────────

const PLAYER_PLAYBACK_RATE_KEY = 'moontv_player_playback_rate'

function sanitizePlaybackRate(value: unknown): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return 1.0
  const allowedRates = [0.5, 0.75, 1, 1.25, 1.5, 2, 3]
  return allowedRates.includes(value) ? value : 1.0
}

function loadPlaybackRate(): number {
  try {
    const raw = localStorage.getItem(PLAYER_PLAYBACK_RATE_KEY)
    if (!raw) return 1.0
    return sanitizePlaybackRate(Number(raw))
  } catch {
    return 1.0
  }
}

// ─── HLS buffer config ────────────────────────────────────────────────────────

function getHlsBufferConfig() {
  const mode = localStorage.getItem('playerBufferMode') || 'standard'
  switch (mode) {
    case 'enhanced': return { maxBufferLength: 45, backBufferLength: 45, maxBufferSize: 90 * 1000 * 1000 }
    case 'max': return { maxBufferLength: 90, backBufferLength: 60, maxBufferSize: 180 * 1000 * 1000 }
    default: return { maxBufferLength: 30, backBufferLength: 30, maxBufferSize: 60 * 1000 * 1000 }
  }
}

// ─── EpisodeSelector inline (no external dep) ────────────────────────────────

interface EpisodeSelectorProps {
  totalEpisodes: number
  episodesTitles: string[]
  value: number
  onChange: (index: number) => void
  onSourceChange: (source: string, id: string) => void
  currentSource: string
  currentId: string
  videoTitle: string
  availableSources: SearchResult[]
  sourceSearchLoading: boolean
  sourceSearchError: string | null
}

function EpisodeSelector({
  totalEpisodes, episodesTitles, value, onChange, onSourceChange,
  currentSource, currentId, videoTitle, availableSources,
  sourceSearchLoading, sourceSearchError,
}: EpisodeSelectorProps) {
  const [activeTab, setActiveTab] = useState<'episodes' | 'sources'>('episodes')

  return (
    <div className="h-full flex flex-col bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
      <div className="flex border-b border-gray-200 dark:border-gray-700">
        <button
          onClick={() => setActiveTab('episodes')}
          className={`flex-1 py-2 text-sm font-medium transition-colors ${activeTab === 'episodes' ? 'text-green-600 dark:text-green-400 border-b-2 border-green-500' : 'text-gray-600 dark:text-gray-400'}`}
        >
          选集 ({totalEpisodes})
        </button>
        <button
          onClick={() => setActiveTab('sources')}
          className={`flex-1 py-2 text-sm font-medium transition-colors ${activeTab === 'sources' ? 'text-green-600 dark:text-green-400 border-b-2 border-green-500' : 'text-gray-600 dark:text-gray-400'}`}
        >
          换源 ({availableSources.length})
        </button>
      </div>
      <div className="flex-1 overflow-y-auto p-2">
        {activeTab === 'episodes' ? (
          totalEpisodes <= 1 ? (
            <div className="flex items-center justify-center h-full">
              <button
                onClick={() => onChange(0)}
                className={`w-full py-2 px-4 rounded-lg text-sm font-medium transition-colors ${value === 1 ? 'bg-green-500 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'}`}
              >
                正片
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-4 gap-1.5">
              {Array.from({ length: totalEpisodes }, (_, i) => (
                <button
                  key={i}
                  onClick={() => onChange(i)}
                  className={`py-1.5 px-1 rounded-md text-xs font-medium transition-colors truncate ${value === i + 1 ? 'bg-green-500 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'}`}
                  title={episodesTitles[i] || `第${i + 1}集`}
                >
                  {episodesTitles[i] ? episodesTitles[i].slice(0, 4) : i + 1}
                </button>
              ))}
            </div>
          )
        ) : (
          <div className="space-y-1.5">
            {sourceSearchLoading && <p className="text-xs text-gray-500 text-center py-2">搜索中...</p>}
            {sourceSearchError && <p className="text-xs text-red-500 text-center py-2">{sourceSearchError}</p>}
            {availableSources.map((source) => (
              <button
                key={`${source.source}-${source.id}`}
                onClick={() => onSourceChange(source.source, source.id)}
                className={`w-full text-left px-3 py-2 rounded-lg text-xs transition-colors ${source.source === currentSource && source.id === currentId ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 font-medium' : 'bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'}`}
              >
                <span className="font-medium block truncate">{source.source_name || source.source}</span>
                <span className="text-gray-500 dark:text-gray-400">{source.episodes?.length || 0}集</span>
              </button>
            ))}
            {availableSources.length === 0 && !sourceSearchLoading && (
              <p className="text-xs text-gray-500 text-center py-4 dark:text-gray-400">暂无其他源</p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Main PlayPage component ──────────────────────────────────────────────────

function PlayPageClient() {
  const [searchParams, setSearchParams] = useSearchParams()
  const { createTask, setShowDownloadPanel } = useDownload()

  // Core state
  const [loading, setLoading] = useState(true)
  const [loadingStage, setLoadingStage] = useState<'searching' | 'preferring' | 'fetching' | 'ready'>('searching')
  const [loadingMessage, setLoadingMessage] = useState('正在搜索播放源...')
  const [error, setError] = useState<string | null>(null)
  const [detail, setDetail] = useState<SearchResult | null>(null)

  // Favorite state
  const [favorited, setFavorited] = useState(false)
  const favoritedKeyRef = useRef<string | null>(null)

  // Back to top
  const [showBackToTop, setShowBackToTop] = useState(false)

  // Netdisk state
  const [netdiskResults, setNetdiskResults] = useState<{ [key: string]: any[] } | null>(null)
  const [netdiskLoading, setNetdiskLoading] = useState(false)
  const [netdiskError, setNetdiskError] = useState<string | null>(null)
  const [netdiskTotal, setNetdiskTotal] = useState(0)
  const [showNetdiskModal, setShowNetdiskModal] = useState(false)
  const [netdiskResourceType, setNetdiskResourceType] = useState<'netdisk' | 'acg'>('netdisk')

  // Celebrity works
  const [selectedCelebrityName, setSelectedCelebrityName] = useState<string | null>(null)
  const [celebrityWorks, setCelebrityWorks] = useState<any[]>([])
  const [loadingCelebrityWorks, setLoadingCelebrityWorks] = useState(false)

  // Skip controller state
  const [isSkipSettingOpen, setIsSkipSettingOpen] = useState(false)
  const [currentPlayTime, setCurrentPlayTime] = useState(0)
  const [videoDuration, setVideoDuration] = useState(0)

  // Danmu settings
  const [isDanmuSettingsPanelOpen, setIsDanmuSettingsPanelOpen] = useState(false)
  const [isDanmuManualModalOpen, setIsDanmuManualModalOpen] = useState(false)
  const [manualDanmuOverrides, setManualDanmuOverrides] = useState<Record<string, DanmuManualSelection>>({})

  // WebSR state
  const [isWebSRSettingsPanelOpen, setIsWebSRSettingsPanelOpen] = useState(false)

  // Download state
  const [showDownloadEpisodeSelector, setShowDownloadEpisodeSelector] = useState(false)
  const [downloadEnabled, setDownloadEnabled] = useState(true)

  // URL params
  const [videoTitle, setVideoTitle] = useState(searchParams.get('title') || '')
  const [videoYear, setVideoYear] = useState(searchParams.get('year') || '')
  const [videoCover, setVideoCover] = useState('')
  const [videoDoubanId, setVideoDoubanId] = useState(parseInt(searchParams.get('douban_id') || '0') || 0)
  const [currentSource, setCurrentSource] = useState(searchParams.get('source') || '')
  const [currentId, setCurrentId] = useState(searchParams.get('id') || '')
  const [shortdramaId] = useState(searchParams.get('shortdrama_id') || '')
  const [searchTitle] = useState(searchParams.get('stitle') || '')
  const [searchType] = useState(searchParams.get('stype') || '')
  const [needPrefer, setNeedPrefer] = useState(searchParams.get('prefer') === 'true')
  const needPreferRef = useRef(needPrefer)

  const [currentEpisodeIndex, setCurrentEpisodeIndex] = useState(() => {
    const indexParam = searchParams.get('index')
    return indexParam ? parseInt(indexParam, 10) : 0
  })

  // TanStack Query - Douban details and comments
  const { data: movieDetails, status: movieDetailsStatus, error: movieDetailsError } = useDoubanDetailsQuery(videoDoubanId)
  const { data: movieComments, status: commentsStatus, error: commentsError } = useDoubanCommentsQuery(videoDoubanId)

  const loadingMovieDetails = movieDetailsStatus === 'pending'
  const loadingComments = commentsStatus === 'pending'

  // Episode and source state
  const [availableSources, setAvailableSources] = useState<SearchResult[]>([])
  const availableSourcesRef = useRef<SearchResult[]>([])
  const currentSourceRef = useRef(currentSource)
  const currentIdRef = useRef(currentId)
  const videoTitleRef = useRef(videoTitle)
  const videoYearRef = useRef(videoYear)
  const videoDoubanIdRef = useRef(videoDoubanId)
  const detailRef = useRef<SearchResult | null>(detail)
  const currentEpisodeIndexRef = useRef(currentEpisodeIndex)

  // ArtPlayer refs
  const artPlayerRef = useRef<any>(null)
  const artRef = useRef<HTMLDivElement | null>(null)

  // Danmu
  const danmuScopeKey = `${videoTitle}_${videoYear}_${videoDoubanId}_${currentEpisodeIndex + 1}`
  const activeManualDanmuOverride: DanmuManualOverride | null = manualDanmuOverrides[danmuScopeKey] || null

  const {
    externalDanmuEnabled,
    setExternalDanmuEnabled,
    danmuList,
    loading: danmuLoading,
    loadMeta: danmuLoadMeta,
    error: danmuError,
    loadExternalDanmu,
    handleDanmuOperationOptimized,
    externalDanmuEnabledRef,
    danmuLoadingRef,
    lastDanmuLoadKeyRef,
    danmuPluginStateRef,
  } = useDanmu({
    videoTitle,
    videoYear,
    videoDoubanId,
    currentEpisodeIndex,
    currentSource,
    artPlayerRef,
    manualOverride: activeManualDanmuOverride,
  })

  // Video URL and playback
  const [videoUrl, setVideoUrl] = useState('')
  const totalEpisodes = detail?.episodes?.length || 0
  const resumeTimeRef = useRef<number | null>(null)
  const lastVolumeRef = useRef<number>(0.7)
  const lastPlaybackRateRef = useRef<number>(loadPlaybackRate())
  const [sourceSearchLoading, setSourceSearchLoading] = useState(false)
  const [sourceSearchError, setSourceSearchError] = useState<string | null>(null)
  const [isEpisodeSelectorCollapsed, setIsEpisodeSelectorCollapsed] = useState(false)
  const [playerReady, setPlayerReady] = useState(false)
  const [isVideoLoading, setIsVideoLoading] = useState(false)
  const [videoLoadingStage, setVideoLoadingStage] = useState<string>('')
  const [reloadTrigger, setReloadTrigger] = useState(0)
  const reloadFlagRef = useRef<string | null>(null)
  const wakeLockRef = useRef<any>(null)

  // Watch room sync
  const watchRoomSync = useWatchRoomSync({
    watchRoom: null,
    artPlayerRef,
    detail: null,
    episodeIndex: currentEpisodeIndex,
    playerReady,
    videoId: currentId,
    currentSource,
    videoTitle,
    videoYear,
    setCurrentEpisodeIndex,
  })

  // Sync refs
  useEffect(() => {
    externalDanmuEnabledRef.current = externalDanmuEnabled
    needPreferRef.current = needPrefer
    currentSourceRef.current = currentSource
    currentIdRef.current = currentId
    detailRef.current = detail
    currentEpisodeIndexRef.current = currentEpisodeIndex
    videoTitleRef.current = videoTitle
    videoYearRef.current = videoYear
    videoDoubanIdRef.current = videoDoubanId
    availableSourcesRef.current = availableSources
  }, [externalDanmuEnabled, needPrefer, currentSource, currentId, detail, currentEpisodeIndex, videoTitle, videoYear, videoDoubanId, availableSources])

  // Fetch server config (for download enabled)
  useEffect(() => {
    fetch('/api/server-config')
      .then(r => r.ok ? r.json() : {})
      .then(config => setDownloadEnabled((config as any).DownloadEnabled ?? true))
      .catch(() => setDownloadEnabled(true))
  }, [])

  // Watch URL for source/id reload
  useEffect(() => {
    const newSource = searchParams.get('source') || ''
    const newId = searchParams.get('id') || ''
    const newIndex = parseInt(searchParams.get('index') || '0')
    const reloadFlag = searchParams.get('_reload')
    if (reloadFlag && reloadFlag !== reloadFlagRef.current && (newSource !== currentSource || newId !== currentId)) {
      reloadFlagRef.current = reloadFlag
      setCurrentSource(newSource)
      setCurrentId(newId)
      setCurrentEpisodeIndex(newIndex)
      setError(null)
      setLoading(true)
      setNeedPrefer(false)
      setPlayerReady(false)
      setReloadTrigger(prev => prev + 1)
    }
  }, [searchParams, currentSource, currentId])

  // Watch URL index param
  useEffect(() => {
    const indexParam = searchParams.get('index')
    const newIndex = indexParam ? parseInt(indexParam, 10) : 0
    if (newIndex !== currentEpisodeIndex) setCurrentEpisodeIndex(newIndex)
  }, [searchParams])

  // Back to top scroll detection
  useEffect(() => {
    const handleScroll = () => setShowBackToTop(document.body.scrollTop > 300)
    document.body.addEventListener('scroll', handleScroll, { passive: true })
    return () => document.body.removeEventListener('scroll', handleScroll)
  }, [])

  // ─── initAll: load video sources ───────────────────────────────────────────

  const initAll = useCallback(async () => {
    setLoading(true)
    setError(null)
    setDetail(null)
    setAvailableSources([])

    const title = searchParams.get('title') || ''
    const source = currentSourceRef.current
    const id = currentIdRef.current
    const year = searchParams.get('year') || ''
    const stype = searchParams.get('stype') || ''
    const stitle = searchParams.get('stitle') || ''
    const prefer = needPreferRef.current
    const doubanIdParam = parseInt(searchParams.get('douban_id') || '0') || 0

    setVideoTitle(title)
    setVideoYear(year)
    if (doubanIdParam > 0) setVideoDoubanId(doubanIdParam)

    try {
      let apiUrl = ''
      if (source && id) {
        // Direct source+id play
        setLoadingStage('fetching')
        setLoadingMessage('正在加载播放地址...')
        const parseResult = source.startsWith('emby_')
          ? { source: 'emby', embyKey: source.substring(5) }
          : { source, embyKey: undefined }
        const embyParam = parseResult.embyKey ? `&emby_key=${parseResult.embyKey}` : ''
        apiUrl = `/api/play?source=${parseResult.source}&id=${id}${embyParam}`
        if (title) apiUrl += `&title=${encodeURIComponent(title)}`
        if (year) apiUrl += `&year=${encodeURIComponent(year)}`
      } else {
        // Search for source
        setLoadingStage('searching')
        setLoadingMessage('正在搜索播放源...')
        if (!title) { setError('缺少视频标题'); setLoading(false); return }
        apiUrl = `/api/search/one?q=${encodeURIComponent(stitle || title)}`
        if (year) apiUrl += `&year=${encodeURIComponent(year)}`
        if (stype) apiUrl += `&type=${encodeURIComponent(stype)}`
        if (prefer) {
          setLoadingStage('preferring')
          setLoadingMessage('正在优选播放源...')
          apiUrl += '&prefer=true'
        }
      }

      const res = await fetch(apiUrl)
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || '加载失败')
      }
      const data = await res.json()

      if (data.results && Array.isArray(data.results)) {
        // Multiple results from search
        if (data.results.length === 0) {
          setError('未找到播放源')
          setLoading(false)
          return
        }
        const best = data.results[0]
        setDetail(best)
        setCurrentSource(best.source)
        setCurrentId(best.id)
        setAvailableSources(data.results)
        if (best.poster) setVideoCover(processImageUrl(best.poster))
        if (best.douban_id && best.douban_id > 0) setVideoDoubanId(best.douban_id)
        if (best.episodes && best.episodes.length > 0) {
          const epIdx = currentEpisodeIndexRef.current
          const url = best.episodes[Math.min(epIdx, best.episodes.length - 1)]
          setVideoUrl(url)
        }
      } else if (data.episodes) {
        // Direct play result
        setDetail(data)
        if (!currentSourceRef.current) setCurrentSource(data.source)
        if (!currentIdRef.current) setCurrentId(data.id)
        if (data.poster) setVideoCover(processImageUrl(data.poster))
        if (data.douban_id && data.douban_id > 0) setVideoDoubanId(data.douban_id)
        if (data.episodes && data.episodes.length > 0) {
          const epIdx = currentEpisodeIndexRef.current
          const url = data.episodes[Math.min(epIdx, data.episodes.length - 1)]
          setVideoUrl(url)
        }
        // Also search for background sources
        if (title) {
          setSourceSearchLoading(true)
          fetch(`/api/search?q=${encodeURIComponent(stitle || title)}${year ? `&year=${encodeURIComponent(year)}` : ''}`)
            .then(r => r.ok ? r.json() : { results: [] })
            .then(bgData => {
              if (bgData.results) setAvailableSources(bgData.results)
            })
            .catch(() => {})
            .finally(() => setSourceSearchLoading(false))
        }
      } else {
        setError('无效的播放数据')
      }
    } catch (err: any) {
      setError(err.message || '加载失败')
    } finally {
      setLoading(false)
      setLoadingStage('ready')
    }
  }, [searchParams, reloadTrigger])

  useEffect(() => {
    initAll()
  }, [initAll])

  // ─── ArtPlayer initialization ─────────────────────────────────────────────

  useEffect(() => {
    if (!artRef.current || !videoUrl) return
    if (artPlayerRef.current) {
      artPlayerRef.current.destroy()
      artPlayerRef.current = null
    }

    let hlsInstance: Hls | null = null

    const loadArtplayer = async () => {
      const { default: Artplayer } = await import('artplayer')
      const bufConfig = getHlsBufferConfig()

      const isHls = videoUrl.includes('.m3u8') || videoUrl.includes('m3u8')
      const isFlv = videoUrl.includes('.flv') || videoUrl.includes('flv')

      const customType: Record<string, (video: HTMLVideoElement, url: string) => void> = {}

      if (isHls && Hls.isSupported()) {
        customType['m3u8'] = (video, url) => {
          if (hlsInstance) { hlsInstance.destroy(); hlsInstance = null }
          hlsInstance = new Hls({
            ...bufConfig,
            enableWorker: true,
            lowLatencyMode: false,
          })
          hlsInstance.loadSource(url)
          hlsInstance.attachMedia(video)
          ;(video as any).hls = hlsInstance
        }
      }

      const art = new Artplayer({
        container: artRef.current!,
        url: videoUrl,
        volume: lastVolumeRef.current,
        playbackRate: true,
        aspectRatio: true,
        setting: true,
        fullscreen: true,
        fullscreenWeb: true,
        hotkey: true,
        pip: true,
        mutex: true,
        backdrop: true,
        subtitleOffset: true,
        miniProgressBar: true,
        autoPlayback: true,
        airplay: true,
        lang: navigator.language.toLowerCase(),
        customType: isHls ? customType : undefined,
        type: isHls ? 'm3u8' : isFlv ? 'flv' : '',
      })

      art.on('ready', () => {
        setPlayerReady(true)
        art.playbackRate = lastPlaybackRateRef.current
        const resumeTime = resumeTimeRef.current
        if (resumeTime && resumeTime > 5) {
          art.currentTime = resumeTime
          resumeTimeRef.current = null
        }
        // Load danmaku
        if (externalDanmuEnabledRef.current) {
          loadExternalDanmu({ force: false })
        }
      })

      art.on('video:timeupdate', () => {
        const time = art.currentTime
        setCurrentPlayTime(time)
        // Save play record every 30s
        if (Math.floor(time) % 30 === 0 && detailRef.current) {
          savePlayRecord(currentSourceRef.current, currentIdRef.current, {
            title: videoTitleRef.current,
            source_name: detailRef.current.source_name || '',
            cover: detailRef.current.poster || '',
            year: videoYearRef.current,
            index: currentEpisodeIndexRef.current,
            total_episodes: detailRef.current.episodes?.length || 1,
            play_time: time,
            total_time: 0,
            save_time: Date.now(),
            search_title: videoTitleRef.current,
          }).catch(() => {})
        }
      })

      art.on('video:durationchange', () => {
        setVideoDuration(art.duration)
      })

      art.on('video:volumechange', () => {
        lastVolumeRef.current = art.volume
      })

      art.on('video:ratechange', () => {
        lastPlaybackRateRef.current = art.playbackRate
        localStorage.setItem(PLAYER_PLAYBACK_RATE_KEY, String(art.playbackRate))
      })

      art.on('video:ended', () => {
        // Auto advance to next episode if available
        const nextIdx = currentEpisodeIndexRef.current + 1
        if (detailRef.current?.episodes && nextIdx < detailRef.current.episodes.length) {
          handleNextEpisode()
        }
      })

      art.on('video:loadeddata', () => {
        setIsVideoLoading(false)
      })

      art.on('video:waiting', () => setIsVideoLoading(true))
      art.on('video:playing', () => setIsVideoLoading(false))
      art.on('video:error', () => setIsVideoLoading(false))

      artPlayerRef.current = art

      // Wake lock
      if ('wakeLock' in navigator) {
        try {
          wakeLockRef.current = await (navigator as any).wakeLock.request('screen')
        } catch {}
      }
    }

    loadArtplayer().catch(console.error)

    return () => {
      if (hlsInstance) { hlsInstance.destroy(); hlsInstance = null }
      if (artPlayerRef.current) {
        artPlayerRef.current.destroy()
        artPlayerRef.current = null
      }
      if (wakeLockRef.current) {
        wakeLockRef.current.release().catch(() => {})
        wakeLockRef.current = null
      }
    }
  }, [videoUrl])

  // ─── Episode change ──────────────────────────────────────────────────────

  const handleEpisodeChange = useCallback((index: number) => {
    if (!detail?.episodes) return
    const newIndex = Math.max(0, Math.min(index, detail.episodes.length - 1))
    setCurrentEpisodeIndex(newIndex)
    const url = detail.episodes[newIndex]
    setVideoUrl(url)
    setIsVideoLoading(true)
    setVideoLoadingStage('loading')
    // Save play record for previous episode
    if (detailRef.current) {
      savePlayRecord(currentSourceRef.current, currentIdRef.current, {
        title: videoTitleRef.current,
        source_name: detailRef.current.source_name || '',
        cover: detailRef.current.poster || '',
        year: videoYearRef.current,
        index: newIndex,
        total_episodes: detailRef.current.episodes?.length || 1,
        play_time: 0,
        total_time: 0,
        save_time: Date.now(),
        search_title: videoTitleRef.current,
      }).catch(() => {})
    }
    // Sync via watch room if active
    watchRoomSync.broadcastPlayState?.()
  }, [detail, watchRoomSync])

  const handleNextEpisode = useCallback(() => {
    if (!detail?.episodes) return
    const nextIdx = currentEpisodeIndexRef.current + 1
    if (nextIdx < detail.episodes.length) {
      handleEpisodeChange(nextIdx)
    }
  }, [detail, handleEpisodeChange])

  // ─── Source change ────────────────────────────────────────────────────────

  const handleSourceChange = useCallback(async (newSource: string, newId: string) => {
    if (newSource === currentSourceRef.current && newId === currentIdRef.current) return
    setCurrentSource(newSource)
    setCurrentId(newId)
    setIsVideoLoading(true)
    setVideoLoadingStage('switching')
    setError(null)

    try {
      const parseResult = newSource.startsWith('emby_')
        ? { source: 'emby', embyKey: newSource.substring(5) }
        : { source: newSource, embyKey: undefined }
      const embyParam = parseResult.embyKey ? `&emby_key=${parseResult.embyKey}` : ''
      const res = await fetch(`/api/play?source=${parseResult.source}&id=${newId}${embyParam}`)
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || '换源失败')
      }
      const data: SearchResult = await res.json()
      setDetail(data)
      if (data.episodes && data.episodes.length > 0) {
        const epIdx = Math.min(currentEpisodeIndexRef.current, data.episodes.length - 1)
        setVideoUrl(data.episodes[epIdx])
      }
    } catch (err: any) {
      setError(err.message || '换源失败')
    } finally {
      setIsVideoLoading(false)
    }
  }, [])

  // ─── Favorite toggle ──────────────────────────────────────────────────────

  const handleToggleFavorite = useCallback(async () => {
    if (!detail) return
    const key = generateStorageKey(currentSourceRef.current, currentIdRef.current)
    if (favorited) {
      const keyToDelete = favoritedKeyRef.current || key
      await deleteFavorite(keyToDelete.split('+')[0], keyToDelete.split('+')[1])
      setFavorited(false)
      favoritedKeyRef.current = null
    } else {
      await saveFavorite(currentSourceRef.current, currentIdRef.current, {
        title: videoTitleRef.current,
        cover: detail.poster || '',
        total_episodes: detail.episodes?.length || 1,
        source_name: detail.source_name || '',
        year: videoYearRef.current,
        save_time: Date.now(),
        search_title: videoTitleRef.current,
      })
      setFavorited(true)
      favoritedKeyRef.current = key
    }
  }, [favorited, detail])

  // Check initial favorite state
  useEffect(() => {
    if (!currentSource || !currentId) return
    isFavorited(currentSource, currentId)
      .then(result => {
        setFavorited(result)
        if (result) favoritedKeyRef.current = generateStorageKey(currentSource, currentId)
      })
      .catch(() => {})
  }, [currentSource, currentId])

  // Load resume time from play records
  useEffect(() => {
    if (!currentSource || !currentId) return
    getAllPlayRecords()
      .then(records => {
        const key = generateStorageKey(currentSource, currentId)
        const record = (records as any)[key]
        if (record?.time && record.time > 5) {
          resumeTimeRef.current = record.time
          if (record.index !== undefined) setCurrentEpisodeIndex(record.index)
        }
      })
      .catch(() => {})
  }, [currentSource, currentId])

  // ─── Netdisk search ────────────────────────────────────────────────────────

  const handleNetDiskSearch = useCallback(async (query?: string) => {
    const q = query || videoTitle
    if (!q) return
    setNetdiskLoading(true); setNetdiskError(null); setNetdiskResults(null); setNetdiskTotal(0)
    try {
      const res = await fetch(`/api/netdisk/search?q=${encodeURIComponent(q)}`)
      const data = await res.json()
      if (res.ok && data.success) {
        setNetdiskResults(data.data.merged_by_type || {})
        setNetdiskTotal(data.data.total || 0)
      } else {
        setNetdiskError(data.error || '网盘搜索失败')
      }
    } catch {
      setNetdiskError('网盘搜索请求失败')
    } finally {
      setNetdiskLoading(false)
    }
  }, [videoTitle])

  // ─── Celebrity works ───────────────────────────────────────────────────────

  const handleCelebrityClick = useCallback(async (name: string) => {
    if (selectedCelebrityName === name) {
      setSelectedCelebrityName(null)
      setCelebrityWorks([])
      return
    }
    setSelectedCelebrityName(name)
    setLoadingCelebrityWorks(true)
    try {
      const res = await getDoubanActorMovies(name)
      if (res.code === 200 && res.list) setCelebrityWorks(res.list)
    } catch {}
    finally { setLoadingCelebrityWorks(false) }
  }, [selectedCelebrityName])

  // ─── Download episodes ────────────────────────────────────────────────────

  const handleDownloadEpisodes = useCallback((indices: number[]) => {
    if (!detail?.episodes) return
    indices.forEach(idx => {
      const url = detail.episodes![idx]
      createTask({
        title: `${videoTitle} ${totalEpisodes > 1 ? `第${idx + 1}集` : ''}`.trim(),
        url,
      })
    })
    setShowDownloadPanel(true)
  }, [detail, videoTitle, totalEpisodes, currentSource, currentId, createTask, setShowDownloadPanel])

  if (loading) {
    return (
      <LoadingScreen
        stage={loadingStage}
        message={loadingMessage}
      />
    )
  }

  if (error && !detail) {
    return (
      <PlayErrorDisplay
        error={error}
        onRetry={initAll}
      />
    )
  }

  return (
    <>
      <div className="flex flex-col gap-3 py-4 px-5 lg:px-[3rem] 2xl:px-20">
        {/* Watch room sync banner */}
        <WatchRoomSyncBanner
          show={watchRoomSync.isInRoom}
          isOwner={watchRoomSync.isOwner}
          syncPaused={watchRoomSync.syncPaused}
        />

        {/* Watch room source switch dialog */}
        {watchRoomSync.showSourceSwitchDialog && watchRoomSync.pendingOwnerState && (
          <SourceSwitchDialog
            show={watchRoomSync.showSourceSwitchDialog}
            sources={[{
              source: watchRoomSync.pendingOwnerState.source,
              source_name: watchRoomSync.pendingOwnerState.source,
              id: watchRoomSync.pendingOwnerState.videoId,
            }]}
            currentSource={currentSource}
            onSelect={(src) => {
              handleSourceChange(src.source, src.id)
              watchRoomSync.setShowSourceSwitchDialog(false)
            }}
            onClose={() => watchRoomSync.setShowSourceSwitchDialog(false)}
          />
        )}

        {/* Owner change dialog */}
        {watchRoomSync.pendingOwnerChange && (
          <OwnerChangeDialog
            show={!!watchRoomSync.pendingOwnerChange}
            videoTitle={watchRoomSync.pendingOwnerChange.videoName}
            episode={watchRoomSync.pendingOwnerChange.episode}
            onConfirm={() => {
              if (watchRoomSync.pendingOwnerChange) {
                handleSourceChange(watchRoomSync.pendingOwnerChange.source, watchRoomSync.pendingOwnerChange.videoId)
                watchRoomSync.setPendingOwnerState(null)
              }
            }}
            onDecline={() => watchRoomSync.setPendingOwnerState(null)}
          />
        )}

        {/* Video title */}
        <div className="py-1">
          <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
            {videoTitle || '影片标题'}
            {totalEpisodes > 1 && (
              <span className="text-gray-500 dark:text-gray-400">
                {` > ${detail?.episodes_titles?.[currentEpisodeIndex] || `第 ${currentEpisodeIndex + 1} 集`}`}
              </span>
            )}
          </h1>
        </div>

        {/* Player row */}
        <div className="space-y-2">
          <div className="flex justify-end items-center gap-2 sm:gap-3">
            <NetDiskButton
              onClick={() => { handleNetDiskSearch(); setShowNetdiskModal(true) }}
              active={!!netdiskResults || netdiskLoading}
            />
            {downloadEnabled && (
              <DownloadButtons
                onDownload={() => setShowDownloadEpisodeSelector(true)}
                onShowPanel={() => setShowDownloadPanel(true)}
              />
            )}
            <CollapseButton
              collapsed={isEpisodeSelectorCollapsed}
              onToggle={() => setIsEpisodeSelectorCollapsed(!isEpisodeSelectorCollapsed)}
            />
          </div>

          <div
            className={`grid gap-4 lg:h-[500px] xl:h-[650px] 2xl:h-[750px] transition-all duration-300 ease-in-out ${
              isEpisodeSelectorCollapsed ? 'grid-cols-1' : 'grid-cols-1 md:grid-cols-4'
            }`}
          >
            {/* Video player */}
            <div
              className={`h-full transition-all duration-300 ease-in-out rounded-xl border border-white/0 dark:border-white/30 ${
                isEpisodeSelectorCollapsed ? 'col-span-1' : 'md:col-span-3'
              }`}
            >
              <div className="relative w-full h-[300px] lg:h-full">
                <div
                  ref={artRef}
                  className="bg-black w-full h-full rounded-xl overflow-hidden shadow-lg"
                />

                {/* Video loading overlay */}
                <VideoLoadingOverlay
                  show={isVideoLoading}
                  message={videoLoadingStage}
                />

                {/* Video cover (before player ready) */}
                <VideoCoverDisplay poster={videoCover} title={videoTitle} show={!playerReady && !!videoCover} />

                {/* Skip settings button */}
                {currentSource && currentId && (
                  <div className="absolute top-4 right-4 z-10">
                    <SkipSettingsButton onClick={() => setIsSkipSettingOpen(true)} />
                  </div>
                )}

                {/* Skip controller */}
                {currentSource && currentId && detail?.title && (
                  <SkipController
                    source={currentSource}
                    id={currentId}
                    title={detail.title}
                    episodeIndex={currentEpisodeIndex}
                    artPlayerRef={artPlayerRef}
                    onNextEpisode={handleNextEpisode}
                  />
                )}
              </div>
            </div>

            {/* Episode selector */}
            <div
              className={`h-[300px] lg:h-full md:overflow-hidden transition-all duration-300 ease-in-out ${
                isEpisodeSelectorCollapsed
                  ? 'md:col-span-1 lg:hidden lg:opacity-0'
                  : 'md:col-span-1 lg:opacity-100'
              }`}
            >
              <EpisodeSelector
                totalEpisodes={totalEpisodes}
                episodesTitles={detail?.episodes_titles || []}
                value={currentEpisodeIndex + 1}
                onChange={handleEpisodeChange}
                onSourceChange={handleSourceChange}
                currentSource={currentSource}
                currentId={currentId}
                videoTitle={searchTitle || videoTitle}
                availableSources={availableSources.filter(source => {
                  if (!source.episodes || source.episodes.length < 1) return false
                  if (source.source === 'shortdrama') return true
                  if (detail && detail.episodes && detail.episodes.length > 0) {
                    const tolerance = Math.max(5, Math.ceil(detail.episodes.length * 0.3))
                    return Math.abs(source.episodes.length - detail.episodes.length) <= tolerance
                  }
                  return true
                })}
                sourceSearchLoading={sourceSearchLoading}
                sourceSearchError={sourceSearchError}
              />
            </div>
          </div>
        </div>

        {/* Details section */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <VideoInfoSection
            detail={detail}
            doubanInfo={movieDetails}
            loading={loadingMovieDetails}
          />
        </div>

        {/* Celebrity works */}
        {selectedCelebrityName && (
          <div className="mt-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">
              {selectedCelebrityName} 的作品
            </h3>
            {loadingCelebrityWorks ? (
              <div className="text-sm text-gray-500 dark:text-gray-400">加载中...</div>
            ) : (
              <div className="grid grid-cols-3 gap-x-2 gap-y-10 sm:grid-cols-[repeat(auto-fill,_minmax(9rem,_1fr))] sm:gap-x-6">
                {celebrityWorks.map((work, i) => (
                  <div key={work.id || i} className="w-full">
                    <VideoCard
                      title={work.title}
                      poster={work.poster}
                      year={work.year}
                      rate={work.rate}
                      from="douban"
                      source="douban"
                      id={String(work.id || '')}
                      source_name="豆瓣"
                      type={work.type}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Comment section */}
        {videoDoubanId > 0 && (
          <CommentSection
            comments={movieComments?.comments || []}
            loading={loadingComments}
            doubanId={videoDoubanId}
          />
        )}
      </div>

      {/* Danmu settings panel */}
      <DanmuSettingsPanel
        show={isDanmuSettingsPanelOpen}
        onClose={() => setIsDanmuSettingsPanelOpen(false)}
        enabled={externalDanmuEnabled}
        onToggle={(v: boolean) => setExternalDanmuEnabled(v)}
        onRefresh={() => loadExternalDanmu({ force: true })}
        count={danmuList.length}
      />

      {/* WebSR settings panel */}
      <WebSRSettingsPanel
        show={isWebSRSettingsPanelOpen}
        onClose={() => setIsWebSRSettingsPanelOpen(false)}
      />

      {/* Danmu manual match modal */}
      {isDanmuManualModalOpen && (
        <DanmuManualMatchModal
          show={isDanmuManualModalOpen}
          defaultQuery={videoTitle}
          onSelect={(selection) => {
            setManualDanmuOverrides(prev => ({ ...prev, [danmuScopeKey]: selection }))
            setIsDanmuManualModalOpen(false)
          }}
          onClose={() => setIsDanmuManualModalOpen(false)}
        />
      )}

      {/* Download episode selector */}
      {showDownloadEpisodeSelector && detail?.episodes && (
        <DownloadEpisodeSelector
          show={showDownloadEpisodeSelector}
          episodes={detail.episodes}
          onClose={() => setShowDownloadEpisodeSelector(false)}
          onDownload={handleDownloadEpisodes}
        />
      )}

      {/* Netdisk modal */}
      {showNetdiskModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50">
          <div className="bg-white dark:bg-gray-800 rounded-t-2xl sm:rounded-2xl w-full sm:max-w-2xl max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 dark:border-gray-700">
              <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                网盘资源 {netdiskTotal > 0 && `(${netdiskTotal})`}
              </h3>
              <button onClick={() => setShowNetdiskModal(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                <span className="text-xl">×</span>
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              {netdiskLoading ? (
                <div className="text-center py-8 text-gray-500">搜索中...</div>
              ) : netdiskError ? (
                <div className="text-center py-8 text-red-500">{netdiskError}</div>
              ) : netdiskResults ? (
                Object.entries(netdiskResults).map(([type, items]) => (
                  <div key={type} className="mb-4">
                    <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">{type}</h4>
                    <div className="space-y-2">
                      {(items as any[]).map((item, i) => (
                        <a key={i} href={item.url || item.link} target="_blank" rel="noopener noreferrer"
                          className="block p-3 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors">
                          <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{item.title || item.name}</p>
                          {item.size && <p className="text-xs text-gray-500 mt-1">{item.size}</p>}
                        </a>
                      ))}
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-gray-500 dark:text-gray-400">暂无网盘资源</div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Back to top */}
      <BackToTopButton show={showBackToTop} />
    </>
  )
}

function PlayPageWithKey() {
  const [searchParams] = useSearchParams()
  // Remount when title+source+id combination changes (for direct navigation)
  const key = `${searchParams.get('title')}-${searchParams.get('source')}-${searchParams.get('id')}`
  return <PlayPageClient key={key} />
}

export default function PlayPage() {
  return (
    <Suspense>
      <PlayPageWithKey />
    </Suspense>
  )
}
