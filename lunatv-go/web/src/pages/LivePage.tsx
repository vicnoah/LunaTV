/* eslint-disable @typescript-eslint/no-explicit-any */
import { useCallback, useEffect, useRef, useState } from 'react'
import { Heart, Menu, RefreshCw, Search, Tv, X } from 'lucide-react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Tab, Tabs, Box } from '@mui/material'
import Hls from 'hls.js'
import EpgScrollableRow from '@/components/EpgScrollableRow'

interface EpgProgram {
  start: string
  end: string
  title: string
}

interface Channel {
  id: string
  name: string
  url: string
  logo?: string
  group: string
  epg?: EpgProgram[]
  isFavorite?: boolean
  healthStatus?: 'ok' | 'slow' | 'error' | 'unknown'
}

interface ChannelGroup {
  name: string
  channels: Channel[]
  isPinned?: boolean
}

interface LiveSource {
  id: string
  name: string
  url: string
}

const PROXY_KEY = 'live_proxy_mode'
const FAV_KEY = 'live_favorites'
const PINNED_KEY = 'live_pinned_groups'

function getHealthBadge(status: Channel['healthStatus']) {
  if (!status || status === 'unknown') return null
  const map: Record<string, string> = {
    ok: 'bg-green-500',
    slow: 'bg-yellow-500',
    error: 'bg-red-500',
  }
  return <span className={`inline-block w-2 h-2 rounded-full ${map[status] ?? 'bg-gray-400'} ml-1`} />
}

export default function LivePage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  // Sources
  const [sources, setSources] = useState<LiveSource[]>([])
  const [sourceIndex, setSourceIndex] = useState(0)

  // Channels & groups
  const [groups, setGroups] = useState<ChannelGroup[]>([])
  const [activeGroup, setActiveGroup] = useState(0)
  const [channel, setChannel] = useState<Channel | null>(null)

  // UI state
  const [proxyMode, setProxyMode] = useState(() => localStorage.getItem(PROXY_KEY) === 'true')
  const [favorites, setFavorites] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem(FAV_KEY) || '[]') } catch { return [] }
  })
  const [pinnedGroups, setPinnedGroups] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem(PINNED_KEY) || '[]') } catch { return [] }
  })
  const [search, setSearch] = useState('')
  const [showSidebar, setShowSidebar] = useState(true)
  const [showGroupModal, setShowGroupModal] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [currentTime, setCurrentTime] = useState(new Date())

  const videoRef = useRef<HTMLVideoElement>(null)
  const artRef = useRef<any>(null)
  const hlsRef = useRef<Hls | null>(null)

  // Clock tick
  useEffect(() => {
    const t = setInterval(() => setCurrentTime(new Date()), 30_000)
    return () => clearInterval(t)
  }, [])

  // Fetch live sources
  const fetchSources = useCallback(async () => {
    try {
      const res = await fetch('/api/live/sources')
      if (!res.ok) return
      const data = await res.json()
      setSources(data.sources || [])
    } catch { /* ignore */ }
  }, [])

  // Fetch channels for current source
  const fetchChannels = useCallback(async (srcIdx: number) => {
    const src = sources[srcIdx]
    if (!src) return
    setLoading(true)
    setError('')
    try {
      const res = await fetch(`/api/live/channels?source=${encodeURIComponent(src.url)}`)
      if (!res.ok) throw new Error('获取频道列表失败')
      const data = await res.json()
      const rawGroups: ChannelGroup[] = data.groups || []
      // Apply pinned order
      const pinned = rawGroups.filter(g => pinnedGroups.includes(g.name)).map(g => ({ ...g, isPinned: true }))
      const rest = rawGroups.filter(g => !pinnedGroups.includes(g.name))
      setGroups([...pinned, ...rest])
      setActiveGroup(0)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [sources, pinnedGroups])

  useEffect(() => { fetchSources() }, [fetchSources])
  useEffect(() => { if (sources.length) fetchChannels(sourceIndex) }, [sources, sourceIndex]) // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-select channel from URL param
  useEffect(() => {
    const chanName = searchParams.get('channel')
    if (!chanName || !groups.length) return
    for (const g of groups) {
      const found = g.channels.find(c => c.name === chanName)
      if (found) { setChannel(found); return }
    }
  }, [searchParams, groups])

  // Cleanup player
  const cleanupPlayer = useCallback(() => {
    if (hlsRef.current) { hlsRef.current.destroy(); hlsRef.current = null }
    if (artRef.current) { try { artRef.current.destroy() } catch { /* */ } artRef.current = null }
    if (videoRef.current) { videoRef.current.src = '' }
  }, [])

  // Play channel
  const playChannel = useCallback(async (ch: Channel) => {
    cleanupPlayer()
    if (!videoRef.current) return

    let url = ch.url
    if (proxyMode) {
      const isFlv = url.toLowerCase().includes('.flv')
      const endpoint = isFlv ? '/api/proxy/stream' : '/api/proxy/m3u8'
      url = `${endpoint}?url=${encodeURIComponent(url)}`
    }

    const video = videoRef.current
    const isFlv = ch.url.toLowerCase().includes('.flv')

    if (isFlv) {
      const flv = await import('flv.js')
      if (flv.default.isSupported()) {
        const player = flv.default.createPlayer({ type: 'flv', url, isLive: true })
        player.attachMediaElement(video)
        player.load()
        player.play()
        artRef.current = player
      }
      return
    }

    if (Hls.isSupported()) {
      const hls = new Hls({ enableWorker: false })
      hlsRef.current = hls
      hls.loadSource(url)
      hls.attachMedia(video)
      hls.on(Hls.Events.MANIFEST_PARSED, () => video.play().catch(() => {}))
      return
    }

    if (video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = url
      video.play().catch(() => {})
    }
  }, [proxyMode, cleanupPlayer])

  useEffect(() => {
    if (channel) playChannel(channel)
    return cleanupPlayer
  }, [channel]) // eslint-disable-line react-hooks/exhaustive-deps

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (!videoRef.current) return
      if (e.key === 'ArrowUp') videoRef.current.volume = Math.min(1, videoRef.current.volume + 0.1)
      if (e.key === 'ArrowDown') videoRef.current.volume = Math.max(0, videoRef.current.volume - 0.1)
      if (e.key === ' ') { e.preventDefault(); videoRef.current.paused ? videoRef.current.play() : videoRef.current.pause() }
      if (e.key === 'f' || e.key === 'F') videoRef.current.requestFullscreen?.()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  const toggleFavorite = (ch: Channel) => {
    setFavorites(prev => {
      const next = prev.includes(ch.id) ? prev.filter(id => id !== ch.id) : [...prev, ch.id]
      localStorage.setItem(FAV_KEY, JSON.stringify(next))
      return next
    })
  }

  const togglePin = (groupName: string) => {
    setPinnedGroups(prev => {
      const next = prev.includes(groupName) ? prev.filter(n => n !== groupName) : [...prev, groupName]
      localStorage.setItem(PINNED_KEY, JSON.stringify(next))
      return next
    })
  }

  const toggleProxy = () => {
    setProxyMode(prev => {
      localStorage.setItem(PROXY_KEY, String(!prev))
      return !prev
    })
  }

  const currentGroup = groups[activeGroup]
  const displayChannels = currentGroup
    ? currentGroup.channels.filter(c => !search || c.name.toLowerCase().includes(search.toLowerCase()))
    : []

  const currentEpg = channel?.epg || []

  return (
    <>
      <div className="flex h-[calc(100vh-56px)] overflow-hidden">
        {/* Sidebar */}
        {showSidebar && (
          <div className="w-64 flex flex-col border-r border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 flex-shrink-0">
            {/* Source selector */}
            {sources.length > 1 && (
              <div className="p-2 border-b border-gray-200 dark:border-gray-700">
                <select
                  value={sourceIndex}
                  onChange={e => setSourceIndex(Number(e.target.value))}
                  className="w-full text-sm p-1.5 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                >
                  {sources.map((s, i) => (
                    <option key={s.id} value={i}>{s.name}</option>
                  ))}
                </select>
              </div>
            )}

            {/* Group tabs */}
            <Box className="border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
              <Tabs
                value={activeGroup}
                onChange={(_, v) => setActiveGroup(v)}
                variant="scrollable"
                scrollButtons="auto"
                orientation="horizontal"
                sx={{
                  minHeight: 36,
                  '& .MuiTab-root': { minHeight: 36, fontSize: '0.7rem', padding: '4px 8px' },
                }}
              >
                {groups.map((g, i) => (
                  <Tab
                    key={g.name}
                    label={g.name}
                    value={i}
                    onClick={() => { if (activeGroup === i) setShowGroupModal(true) }}
                  />
                ))}
              </Tabs>
            </Box>

            {/* Search */}
            <div className="p-2 border-b border-gray-200 dark:border-gray-700">
              <div className="relative">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                <input
                  type="text"
                  placeholder="搜索频道..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="w-full pl-7 pr-2 py-1.5 text-sm rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400"
                />
              </div>
            </div>

            {/* Channel list */}
            <div className="flex-1 overflow-y-auto">
              {loading ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin h-6 w-6 border-2 border-blue-500 border-t-transparent rounded-full" />
                </div>
              ) : error ? (
                <div className="p-4 text-sm text-red-500 text-center">{error}</div>
              ) : displayChannels.length === 0 ? (
                <div className="p-4 text-sm text-gray-500 text-center">暂无频道</div>
              ) : (
                displayChannels.map(ch => (
                  <div
                    key={ch.id}
                    onClick={() => setChannel(ch)}
                    className={`flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors ${
                      channel?.id === ch.id ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300' : 'text-gray-900 dark:text-white'
                    }`}
                  >
                    {ch.logo ? (
                      <img src={ch.logo} alt="" className="w-6 h-6 object-contain flex-shrink-0" onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />
                    ) : (
                      <Tv className="w-4 h-4 flex-shrink-0 text-gray-400" />
                    )}
                    <span className="text-sm truncate flex-1">{ch.name}</span>
                    {getHealthBadge(ch.healthStatus)}
                    <button
                      onClick={e => { e.stopPropagation(); toggleFavorite(ch) }}
                      className={`flex-shrink-0 ${favorites.includes(ch.id) ? 'text-red-500' : 'text-gray-300 hover:text-gray-500'}`}
                    >
                      <Heart className="w-3.5 h-3.5" fill={favorites.includes(ch.id) ? 'currentColor' : 'none'} />
                    </button>
                  </div>
                ))
              )}
            </div>

            {/* Sidebar footer */}
            <div className="p-2 border-t border-gray-200 dark:border-gray-700 flex items-center gap-2">
              <button
                onClick={toggleProxy}
                className={`flex-1 text-xs py-1 rounded transition-colors ${proxyMode ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300' : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'}`}
              >
                {proxyMode ? '代理模式' : '直连模式'}
              </button>
              <button
                onClick={() => fetchChannels(sourceIndex)}
                className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500"
                title="刷新"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* Main area */}
        <div className="flex-1 flex flex-col overflow-hidden bg-black">
          {/* Top bar */}
          <div className="flex items-center gap-2 px-3 py-2 bg-gray-900 text-white flex-shrink-0">
            <button onClick={() => setShowSidebar(v => !v)} className="p-1 hover:bg-gray-700 rounded">
              <Menu className="w-4 h-4" />
            </button>
            <span className="text-sm truncate flex-1">{channel ? channel.name : '请选择频道'}</span>
            <span className="text-xs text-gray-400">{currentTime.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}</span>
            <button
              onClick={() => navigate(-1)}
              className="p-1 hover:bg-gray-700 rounded text-gray-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Video */}
          <div className="flex-1 relative bg-black">
            {!channel && (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-500">
                <Tv className="w-16 h-16 mb-4 opacity-30" />
                <p className="text-sm">从左侧选择频道开始观看</p>
              </div>
            )}
            <video
              ref={videoRef}
              className="w-full h-full object-contain"
              controls
              playsInline
            />
          </div>

          {/* EPG */}
          {channel && currentEpg.length > 0 && (
            <div className="flex-shrink-0 bg-gray-900 border-t border-gray-700">
              <EpgScrollableRow programs={currentEpg} currentTime={currentTime} />
            </div>
          )}
        </div>
      </div>

      {/* Group selector modal */}
      {showGroupModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-md max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-base font-semibold text-gray-900 dark:text-white">频道组管理</h2>
              <button onClick={() => setShowGroupModal(false)} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-2">
              {groups.map(g => (
                <div
                  key={g.name}
                  className="flex items-center justify-between px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg"
                >
                  <span className="text-sm text-gray-900 dark:text-white">{g.name}</span>
                  <button
                    onClick={() => togglePin(g.name)}
                    className={`text-xs px-2 py-1 rounded transition-colors ${pinnedGroups.includes(g.name) ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300' : 'bg-gray-100 dark:bg-gray-700 text-gray-500'}`}
                  >
                    {pinnedGroups.includes(g.name) ? '已置顶' : '置顶'}
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
