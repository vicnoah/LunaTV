import { useEffect, useRef, useState } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { ArrowDownWideNarrow, ArrowUpNarrowWide, RefreshCw, Search, X } from 'lucide-react'
import { useInfiniteQuery, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/api/client'

interface EmbySourceOption { key: string; name: string }
interface EmbyView { id: string; name: string; type: string }
interface Video { id: string; title: string; poster: string; year?: string; rating?: number; mediaType: 'movie' | 'tv' }

const PAGE_SIZE = 20

export default function EmbyPage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const observerTarget = useRef<HTMLDivElement>(null)
  const [embyKey, setEmbyKey] = useState<string | undefined>()
  const [selectedView, setSelectedView] = useState('all')
  const [sortBy, setSortBy] = useState(() => localStorage.getItem('emby_sortBy') ?? 'PremiereDate')
  const [sortOrder, setSortOrder] = useState<'Ascending' | 'Descending'>(() => (localStorage.getItem('emby_sortOrder') as 'Ascending' | 'Descending') || 'Descending')
  const [searchKeyword, setSearchKeyword] = useState('')
  const [isRefreshing, setIsRefreshing] = useState(false)

  useEffect(() => {
    const src = searchParams.get('source')
    if (src?.includes(':')) setEmbyKey(src.split(':')[1])
    else if (src) setEmbyKey(src)
  }, [searchParams])

  const { data: sourcesData } = useQuery({
    queryKey: ['emby', 'sources'],
    queryFn: () => api.get<{ sources: EmbySourceOption[] }>('/api/emby/sources'),
    staleTime: 5 * 60 * 1000,
  })
  const embySourceOptions = sourcesData?.sources ?? []

  useEffect(() => {
    if (!embyKey && embySourceOptions.length > 0) setEmbyKey(embySourceOptions[0].key)
  }, [embyKey, embySourceOptions])

  const { data: viewsData } = useQuery({
    queryKey: ['emby', 'views', embyKey],
    queryFn: () => api.get<{ views: EmbyView[] }>(`/api/emby/views?key=${embyKey}`),
    enabled: !!embyKey,
    staleTime: 5 * 60 * 1000,
  })
  const embyViews = viewsData?.views ?? []

  const { data: listData, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading, isError } = useInfiniteQuery({
    queryKey: ['emby', 'list', embyKey, selectedView, sortBy, sortOrder],
    queryFn: async ({ pageParam }) => {
      const q = new URLSearchParams({ page: String(pageParam), pageSize: String(PAGE_SIZE), sortBy, sortOrder })
      if (embyKey) q.set('key', embyKey)
      if (selectedView !== 'all') q.set('parentId', selectedView)
      return api.get<{ list: Video[]; totalPages: number; currentPage: number; total: number }>(`/api/emby/list?${q}`)
    },
    initialPageParam: 1,
    getNextPageParam: (last) => last.currentPage < last.totalPages ? last.currentPage + 1 : undefined,
    enabled: !!embyKey,
  })

  const videos = listData?.pages.flatMap(p => p.list) ?? []

  useEffect(() => {
    if (!hasNextPage || isFetchingNextPage) return
    const observer = new IntersectionObserver((entries) => { if (entries[0].isIntersecting) fetchNextPage() }, { threshold: 0.1 })
    if (observerTarget.current) observer.observe(observerTarget.current)
    return () => observer.disconnect()
  }, [hasNextPage, isFetchingNextPage, fetchNextPage])

  const { data: searchData, isFetching: isSearching } = useQuery({
    queryKey: ['emby', 'search', embyKey, searchKeyword],
    queryFn: () => api.get<{ videos: Video[] }>(`/api/emby/search?keyword=${encodeURIComponent(searchKeyword)}&key=${embyKey}`),
    enabled: !!embyKey && searchKeyword.trim().length > 0,
    staleTime: 60 * 1000,
  })
  const displayVideos = searchKeyword.trim() ? (searchData?.videos ?? []) : videos

  const handleRefresh = async () => {
    setIsRefreshing(true)
    await queryClient.invalidateQueries({ queryKey: ['emby'] })
    setIsRefreshing(false)
  }

  const toggleSort = () => {
    const newOrder = sortOrder === 'Descending' ? 'Ascending' : 'Descending'
    setSortOrder(newOrder)
    localStorage.setItem('emby_sortOrder', newOrder)
  }

  if (!embyKey && embySourceOptions.length > 0) return <div className="flex justify-center py-16"><div className="animate-spin h-8 w-8 border-2 border-blue-500 border-t-transparent rounded-full" /></div>

  if (embySourceOptions.length === 0 && !isLoading) {
    return (
      <>
        <div className="max-w-screen-2xl mx-auto px-4 py-16 text-center">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">未配置 Emby</h2>
          <p className="text-gray-500 dark:text-gray-400">请在管理页面配置 Emby 服务器</p>
        </div>
      </>
    )
  }

  return (
    <>
      <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">私有媒体库</h1>
            {embySourceOptions.length > 1 && (
              <select value={embyKey} onChange={(e) => { setEmbyKey(e.target.value); navigate(`/emby?source=emby:${e.target.value}`) }}
                className="text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white px-3 py-1.5">
                {embySourceOptions.map(s => <option key={s.key} value={s.key}>{s.name}</option>)}
              </select>
            )}
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input type="text" value={searchKeyword} onChange={(e) => setSearchKeyword(e.target.value)} placeholder="搜索..."
                className="pl-9 pr-8 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-full bg-white dark:bg-gray-700 text-gray-900 dark:text-white w-40" />
              {searchKeyword && <button onClick={() => setSearchKeyword('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"><X className="h-3.5 w-3.5" /></button>}
            </div>
            <button onClick={toggleSort} title={sortOrder === 'Descending' ? '降序' : '升序'} className="p-2 text-gray-500 hover:text-blue-600 border border-gray-300 dark:border-gray-600 rounded-lg">
              {sortOrder === 'Descending' ? <ArrowDownWideNarrow className="h-4 w-4" /> : <ArrowUpNarrowWide className="h-4 w-4" />}
            </button>
            <button onClick={handleRefresh} disabled={isRefreshing} className="p-2 text-gray-500 hover:text-blue-600 border border-gray-300 dark:border-gray-600 rounded-lg">
              <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Views tabs */}
        {embyViews.length > 0 && (
          <div className="flex gap-2 mb-4 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
            <button onClick={() => setSelectedView('all')} className={`flex-shrink-0 px-3 py-1.5 text-sm rounded-full ${selectedView === 'all' ? 'bg-blue-600 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'}`}>全部</button>
            {embyViews.map(v => <button key={v.id} onClick={() => setSelectedView(v.id)} className={`flex-shrink-0 px-3 py-1.5 text-sm rounded-full ${selectedView === v.id ? 'bg-blue-600 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'}`}>{v.name}</button>)}
          </div>
        )}

        {/* Content */}
        {isLoading || isSearching ? (
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8 gap-4">
            {Array.from({ length: 20 }).map((_, i) => <div key={i} className="animate-pulse"><div className="aspect-[2/3] bg-gray-200 dark:bg-gray-700 rounded-lg" /><div className="mt-2 h-3 bg-gray-200 dark:bg-gray-700 rounded w-3/4" /></div>)}
          </div>
        ) : isError ? (
          <div className="text-center py-16 text-red-500">加载失败，请刷新重试</div>
        ) : (
          <>
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8 gap-4">
              {displayVideos.map(video => (
                <div key={video.id} className="group cursor-pointer" onClick={() => navigate(`/play?id=${video.id}&source=emby:${embyKey}`)}>
                  <div className="relative aspect-[2/3] rounded-lg overflow-hidden bg-gray-200 dark:bg-gray-800">
                    <img src={video.poster} alt={video.title} className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300" loading="lazy"
                      onError={(e) => { (e.target as HTMLImageElement).src = '/placeholder-cover.jpg' }} />
                    {video.rating && <div className="absolute top-2 right-2 bg-yellow-500 text-white text-xs font-bold px-1.5 py-0.5 rounded">{video.rating.toFixed(1)}</div>}
                  </div>
                  <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white line-clamp-2 group-hover:text-blue-600 dark:group-hover:text-blue-400">{video.title}</h3>
                  {video.year && <p className="text-xs text-gray-500 dark:text-gray-400">{video.year}</p>}
                </div>
              ))}
            </div>
            {displayVideos.length === 0 && <div className="text-center py-16 text-gray-500 dark:text-gray-400">暂无内容</div>}
          </>
        )}

        <div ref={observerTarget} className="h-8 mt-4" />
        {isFetchingNextPage && <div className="flex justify-center py-4"><div className="animate-spin h-6 w-6 border-2 border-blue-500 border-t-transparent rounded-full" /></div>}
      </div>
    </>
  )
}
