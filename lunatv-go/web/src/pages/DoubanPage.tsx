import { useCallback, useEffect, useRef, useState } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { ChevronUp } from 'lucide-react'
import { getDoubanList, getDoubanRecommends } from '@/lib/douban.client'
import type { DoubanItem } from '@/types'
import DoubanCardSkeleton from '@/components/DoubanCardSkeleton'
import DoubanSelector from '@/components/DoubanSelector'

const PAGE_SIZE = 25

// Simple video card for Douban items
function DoubanVideoCard({ item }: { item: DoubanItem }) {
  const navigate = useNavigate()
  const [imgLoaded, setImgLoaded] = useState(false)

  return (
    <div
      className="group relative cursor-pointer transition-all duration-300 hover:scale-[1.05] hover:z-30"
      onClick={() => navigate(`/search?q=${encodeURIComponent(item.title)}&douban_id=${item.id}`)}
    >
      <div className="relative aspect-[2/3] w-full overflow-hidden rounded-lg bg-gray-200 dark:bg-gray-800">
        <img
          src={item.poster}
          alt={item.title}
          className={`h-full w-full object-cover transition-all duration-500 ${imgLoaded ? 'opacity-100' : 'opacity-0'} group-hover:scale-105`}
          loading="lazy"
          onLoad={() => setImgLoaded(true)}
          onError={(e) => { (e.target as HTMLImageElement).src = '/placeholder-cover.jpg'; setImgLoaded(true) }}
        />
        <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity">
          <div className="text-white font-medium text-sm px-3 py-1 bg-black/50 rounded-full">搜索资源</div>
        </div>
        {item.rate && parseFloat(item.rate) > 0 && (
          <div className="absolute top-2 right-2 bg-yellow-500 text-white text-xs font-bold px-1.5 py-0.5 rounded">
            {item.rate}
          </div>
        )}
      </div>
      <div className="mt-2">
        <h3 className="text-sm font-medium text-gray-900 dark:text-white line-clamp-2">{item.title}</h3>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{item.year}</p>
      </div>
    </div>
  )
}

export default function DoubanPage() {
  const [searchParams] = useSearchParams()
  const type = (searchParams.get('type') || 'movie') as 'movie' | 'tv' | 'show' | 'anime'

  const [items, setItems] = useState<DoubanItem[]>([])
  const [loading, setLoading] = useState(false)
  const [currentPage, setCurrentPage] = useState(0)
  const [hasMore, setHasMore] = useState(true)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [showBackToTop, setShowBackToTop] = useState(false)

  const [primarySelection, setPrimarySelection] = useState(() => {
    if (type === 'movie') return '热门'
    if (type === 'tv' || type === 'show') return '最近热门'
    if (type === 'anime') return '每日放送'
    return '热门'
  })
  const [secondarySelection, setSecondarySelection] = useState(() => {
    if (type === 'movie') return '全部'
    if (type === 'tv') return 'tv'
    if (type === 'show') return 'show'
    return '全部'
  })
  const [selectedWeekday, setSelectedWeekday] = useState('')
  const loadingRef = useRef<HTMLDivElement>(null)
  const isLoadingMoreRef = useRef(false)

  const fetchData = useCallback(async (page: number, reset = false) => {
    if (isLoadingMoreRef.current) return
    isLoadingMoreRef.current = true

    if (reset) {
      setLoading(true)
      setItems([])
    } else {
      setIsLoadingMore(true)
    }

    try {
      let result: { list: DoubanItem[] } | null = null

      if (type === 'anime' && primarySelection === '每日放送' && selectedWeekday) {
        // bangumi daily
        result = await getDoubanRecommends(type, primarySelection, secondarySelection, selectedWeekday, page, PAGE_SIZE)
      } else {
        result = await getDoubanList(type, primarySelection, secondarySelection, page, PAGE_SIZE)
      }

      if (result && result.list) {
        setItems((prev) => reset ? result!.list : [...prev, ...result!.list])
        setHasMore(result.list.length >= PAGE_SIZE)
      } else {
        setHasMore(false)
      }
    } catch {
      setHasMore(false)
    } finally {
      setLoading(false)
      setIsLoadingMore(false)
      isLoadingMoreRef.current = false
    }
  }, [type, primarySelection, secondarySelection, selectedWeekday])

  // Reset and refetch on filter change
  useEffect(() => {
    setCurrentPage(0)
    setHasMore(true)
    fetchData(0, true)
  }, [type, primarySelection, secondarySelection, selectedWeekday]) // eslint-disable-line react-hooks/exhaustive-deps

  // Infinite scroll
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !isLoadingMoreRef.current) {
          const nextPage = currentPage + 1
          setCurrentPage(nextPage)
          fetchData(nextPage)
        }
      },
      { threshold: 0.1 }
    )
    if (loadingRef.current) observer.observe(loadingRef.current)
    return () => observer.disconnect()
  }, [hasMore, currentPage, fetchData])

  // Back to top
  useEffect(() => {
    const handleScroll = () => setShowBackToTop(window.scrollY > 300)
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const tabs = [
    { type: 'movie', label: '电影' },
    { type: 'tv', label: '剧集' },
    { type: 'show', label: '综艺' },
    { type: 'anime', label: '动漫' },
  ]

  return (
    <>
      <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Type tabs */}
        <div className="flex gap-2 mb-4 overflow-x-auto pb-1">
          {tabs.map((tab) => (
            <a
              key={tab.type}
              href={`/douban?type=${tab.type}`}
              className={`flex-shrink-0 px-5 py-2 text-sm font-medium rounded-full transition-colors ${
                type === tab.type
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
              }`}
            >
              {tab.label}
            </a>
          ))}
        </div>

        {/* Selectors */}
        <div className="mb-6">
          <DoubanSelector
            type={type}
            primarySelection={primarySelection}
            secondarySelection={secondarySelection}
            onPrimaryChange={(v) => setPrimarySelection(v)}
            onSecondaryChange={(v) => setSecondarySelection(v)}
            onWeekdayChange={(v) => setSelectedWeekday(v)}
          />
        </div>

        {/* Grid */}
        {loading ? (
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8 gap-4">
            {Array.from({ length: 24 }).map((_, i) => <DoubanCardSkeleton key={i} />)}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8 gap-4">
              {items.map((item) => (
                <DoubanVideoCard key={item.id} item={item} />
              ))}
            </div>

            {isLoadingMore && (
              <div className="flex justify-center py-6">
                <div className="animate-spin h-6 w-6 border-2 border-blue-500 border-t-transparent rounded-full" />
              </div>
            )}

            {!hasMore && items.length > 0 && (
              <p className="text-center text-sm text-gray-500 dark:text-gray-400 py-6">已加载全部内容</p>
            )}

            {items.length === 0 && !loading && (
              <div className="text-center py-16 text-gray-500 dark:text-gray-400">
                <p>暂无内容</p>
              </div>
            )}
          </>
        )}

        {/* Infinite scroll trigger */}
        <div ref={loadingRef} className="h-4" />

        {/* Back to top */}
        {showBackToTop && (
          <button
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            className="fixed bottom-20 right-6 z-30 flex items-center justify-center w-10 h-10 bg-blue-600 text-white rounded-full shadow-lg hover:bg-blue-700 transition-colors"
          >
            <ChevronUp className="h-5 w-5" />
          </button>
        )}
      </div>
    </>
  )
}
