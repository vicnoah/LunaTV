/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useState, useMemo } from 'react'
import { Calendar, Search, Film, Tv, ChevronUp, RefreshCw } from 'lucide-react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'

interface ReleaseCalendarItem {
  id: string
  title: string
  type: 'movie' | 'tv'
  releaseDate: string
  poster: string
  region: string
  genre: string
  director: string
  actors: string
  description?: string
  douban_id?: number
}

interface ReleaseCalendarResult {
  items: ReleaseCalendarItem[]
  total: number
  hasMore: boolean
  filters: {
    types: { value: string; label: string; count: number }[]
    regions: { value: string; label: string; count: number }[]
    genres: { value: string; label: string; count: number }[]
  }
}

export default function ReleaseCalendarPage() {
  const queryClient = useQueryClient()
  const navigate = useNavigate()

  const [filters, setFilters] = useState({
    type: '' as 'movie' | 'tv' | '',
    region: '',
    genre: '',
    dateFrom: '',
    dateTo: '',
    search: '',
  })

  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 20

  const [viewMode, setViewMode] = useState<'grid' | 'timeline' | 'calendar'>('grid')
  const [showBackToTop, setShowBackToTop] = useState(false)

  const {
    data: rawData,
    isLoading: loading,
    error: queryError,
  } = useQuery<ReleaseCalendarResult>({
    queryKey: ['releaseCalendar'],
    queryFn: async () => {
      const response = await fetch('/api/release-calendar')
      if (!response.ok) throw new Error('获取数据失败')
      const result: ReleaseCalendarResult = await response.json()
      localStorage.removeItem('release_calendar_all_data')
      localStorage.removeItem('release_calendar_all_data_time')
      return result
    },
    staleTime: 30 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
  })

  const error = (queryError as Error)?.message || null

  const data = useMemo(() => {
    if (!rawData) return null
    let filteredItems = [...rawData.items]
    if (filters.type) filteredItems = filteredItems.filter(item => item.type === filters.type)
    if (filters.region && filters.region !== '全部') filteredItems = filteredItems.filter(item => item.region.includes(filters.region))
    if (filters.genre && filters.genre !== '全部') filteredItems = filteredItems.filter(item => item.genre.includes(filters.genre))
    if (filters.dateFrom) filteredItems = filteredItems.filter(item => item.releaseDate >= filters.dateFrom)
    if (filters.dateTo) filteredItems = filteredItems.filter(item => item.releaseDate <= filters.dateTo)
    if (filters.search) {
      const q = filters.search.toLowerCase()
      filteredItems = filteredItems.filter(item =>
        item.title.toLowerCase().includes(q) ||
        item.director.toLowerCase().includes(q) ||
        item.actors.toLowerCase().includes(q)
      )
    }
    return { ...rawData, items: filteredItems, total: filteredItems.length, hasMore: false }
  }, [rawData, filters])

  const resetFilters = () => {
    setFilters({ type: '', region: '', genre: '', dateFrom: '', dateTo: '', search: '' })
    setCurrentPage(1)
  }

  const handleRefreshClick = async () => {
    try {
      localStorage.removeItem('release_calendar_all_data')
      localStorage.removeItem('release_calendar_all_data_time')
      await fetch('/api/release-calendar?refresh=true')
      await queryClient.invalidateQueries({ queryKey: ['releaseCalendar'] })
    } catch { /* ignore */ }
  }

  const totalItems = data?.items.length || 0
  const totalPages = Math.ceil(totalItems / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const currentItems = data?.items.slice(startIndex, startIndex + itemsPerPage) || []

  useEffect(() => {
    const handleScroll = () => setShowBackToTop(window.scrollY > 300)
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' })
  }

  const getTypeIcon = (type: 'movie' | 'tv') =>
    type === 'movie' ? <Film className="w-4 h-4" /> : <Tv className="w-4 h-4" />

  const getTypeLabel = (type: 'movie' | 'tv') => type === 'movie' ? '电影' : '电视剧'

  return (
    <>
      <div className="min-h-screen p-6">
        <div className="max-w-7xl mx-auto">
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-4">
              <Calendar className="w-8 h-8 text-blue-600" />
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">影视上映日程</h1>
            </div>
            <p className="text-gray-600 dark:text-gray-400">探索即将上映的电影和电视剧，不错过任何精彩内容</p>
          </div>

          {/* Filters */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 mb-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">类型</label>
                <select
                  value={filters.type}
                  onChange={(e) => setFilters(prev => ({ ...prev, type: e.target.value as 'movie' | 'tv' | '' }))}
                  className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value="">全部</option>
                  {data?.filters.types.map(type => (
                    <option key={type.value} value={type.value}>{type.label} ({type.count})</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">地区</label>
                <select
                  value={filters.region}
                  onChange={(e) => setFilters(prev => ({ ...prev, region: e.target.value }))}
                  className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value="">全部</option>
                  {data?.filters.regions.map(region => (
                    <option key={region.value} value={region.value}>{region.label} ({region.count})</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">类型标签</label>
                <select
                  value={filters.genre}
                  onChange={(e) => setFilters(prev => ({ ...prev, genre: e.target.value }))}
                  className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value="">全部</option>
                  {data?.filters.genres.map(genre => (
                    <option key={genre.value} value={genre.value}>{genre.label} ({genre.count})</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">搜索</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <input
                    type="text"
                    placeholder="搜索标题、导演、演员..."
                    value={filters.search}
                    onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                    className="w-full pl-10 p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">开始日期</label>
                <input
                  type="date"
                  value={filters.dateFrom}
                  onChange={(e) => setFilters(prev => ({ ...prev, dateFrom: e.target.value }))}
                  className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">结束日期</label>
                <input
                  type="date"
                  value={filters.dateTo}
                  onChange={(e) => setFilters(prev => ({ ...prev, dateTo: e.target.value }))}
                  className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                onClick={resetFilters}
                className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
              >
                重置
              </button>
              <button
                onClick={handleRefreshClick}
                disabled={loading}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                {loading ? '刷新中...' : '刷新数据'}
              </button>
              <div className="flex items-center gap-2 ml-auto">
                {(['grid', 'calendar'] as const).map((mode) => (
                  <button
                    key={mode}
                    onClick={() => setViewMode(mode)}
                    className={`px-3 py-2 rounded-lg transition-colors text-sm ${
                      viewMode === mode
                        ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
                    }`}
                  >
                    {mode === 'grid' ? '📱 网格' : '📅 日历'}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Stats */}
          {data && (
            <div className="mb-4 text-sm text-gray-600 dark:text-gray-400">
              共 {data.total} 条记录
              {totalPages > 1 && ` · 第 ${currentPage}/${totalPages} 页`}
            </div>
          )}

          {loading && (
            <div className="flex justify-center py-16">
              <div className="animate-spin h-8 w-8 border-2 border-blue-500 border-t-transparent rounded-full" />
            </div>
          )}

          {error && <div className="text-center py-8 text-red-500">{error}</div>}

          {!loading && !error && currentItems.length === 0 && (
            <div className="text-center py-16 text-gray-500 dark:text-gray-400">暂无内容</div>
          )}

          {!loading && !error && currentItems.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
              {currentItems.map((item) => (
                <div
                  key={item.id}
                  className="group cursor-pointer"
                  onClick={() => navigate(`/search?q=${encodeURIComponent(item.title)}${item.douban_id ? `&douban_id=${item.douban_id}` : ''}`)}
                >
                  <div className="relative aspect-[2/3] overflow-hidden rounded-lg bg-gray-200 dark:bg-gray-800">
                    <img
                      src={item.poster}
                      alt={item.title}
                      className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                      loading="lazy"
                      onError={(e) => { (e.target as HTMLImageElement).src = '/placeholder-cover.jpg' }}
                    />
                    <div className="absolute top-2 left-2">
                      <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-medium ${
                        item.type === 'movie'
                          ? 'bg-blue-600/90 text-white'
                          : 'bg-green-600/90 text-white'
                      }`}>
                        {getTypeIcon(item.type)}
                        {getTypeLabel(item.type)}
                      </span>
                    </div>
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-2">
                      <p className="text-white text-xs line-clamp-2">{item.description}</p>
                    </div>
                  </div>
                  <div className="mt-1.5">
                    <p className="text-sm font-medium text-gray-900 dark:text-white line-clamp-2">{item.title}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {formatDate(item.releaseDate)}
                    </p>
                    {item.region && (
                      <p className="text-xs text-gray-400 dark:text-gray-500">{item.region}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex justify-center gap-2 mt-8">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-sm disabled:opacity-50 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                上一页
              </button>
              <span className="px-3 py-2 text-sm text-gray-600 dark:text-gray-400">
                {currentPage} / {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-sm disabled:opacity-50 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                下一页
              </button>
            </div>
          )}
        </div>
      </div>

      {showBackToTop && (
        <button
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          className="fixed bottom-20 right-6 z-30 flex items-center justify-center w-10 h-10 bg-blue-600 text-white rounded-full shadow-lg hover:bg-blue-700 transition-colors"
        >
          <ChevronUp className="h-5 w-5" />
        </button>
      )}
    </>
  )
}
