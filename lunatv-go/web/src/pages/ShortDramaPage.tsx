import { useCallback, useEffect, useRef, useState } from 'react'
import { ChevronUp, Search, X } from 'lucide-react'
import { getShortDramaCategories, getShortDramaList, searchShortDramas } from '@/lib/shortdrama.client'
import type { ShortDramaCategory, ShortDramaItem } from '@/types'
import ShortDramaCard from '@/components/ShortDramaCard'

export default function ShortDramaPage() {
  const [categories, setCategories] = useState<ShortDramaCategory[]>([])
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null)
  const [dramas, setDramas] = useState<ShortDramaItem[]>([])
  const [loading, setLoading] = useState(true)
  const [hasMore, setHasMore] = useState(true)
  const [page, setPage] = useState(1)
  const [searchQuery, setSearchQuery] = useState('')
  const [isSearchMode, setIsSearchMode] = useState(false)
  const [showBackToTop, setShowBackToTop] = useState(false)
  const loadingRef = useRef<HTMLDivElement>(null)
  const isLoadingRef = useRef(false)

  useEffect(() => {
    getShortDramaCategories().then((cats) => {
      setCategories(cats)
      if (cats.length > 0) setSelectedCategory(cats[0].type_id)
    }).catch(() => {})
  }, [])

  useEffect(() => {
    if (selectedCategory === null || isSearchMode) return
    setDramas([])
    setPage(1)
    setHasMore(true)
    setLoading(true)
    getShortDramaList({ categoryId: selectedCategory, page: 1 }).then((result) => {
      setDramas(result.list || [])
      setHasMore(result.hasMore)
    }).catch(() => setHasMore(false))
    .finally(() => setLoading(false))
  }, [selectedCategory, isSearchMode]) // eslint-disable-line react-hooks/exhaustive-deps

  const loadMore = useCallback(async () => {
    if (!hasMore || isLoadingRef.current || isSearchMode) return
    isLoadingRef.current = true
    const nextPage = page + 1
    try {
      const result = await getShortDramaList({ categoryId: selectedCategory ?? undefined, page: nextPage })
      setDramas((prev) => [...prev, ...(result.list || [])])
      setHasMore(result.hasMore)
      setPage(nextPage)
    } catch { setHasMore(false) }
    finally { isLoadingRef.current = false }
  }, [hasMore, page, selectedCategory, isSearchMode])

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => { if (entries[0].isIntersecting) loadMore() },
      { threshold: 0.1 }
    )
    if (loadingRef.current) observer.observe(loadingRef.current)
    return () => observer.disconnect()
  }, [loadMore])

  useEffect(() => {
    const handleScroll = () => setShowBackToTop(window.scrollY > 300)
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const handleSearch = async () => {
    if (!searchQuery.trim()) return
    setIsSearchMode(true)
    setLoading(true)
    try {
      const result = await searchShortDramas(searchQuery)
      setDramas(result.list || [])
      setHasMore(false)
    } catch {} finally { setLoading(false) }
  }

  const clearSearch = () => {
    setSearchQuery('')
    setIsSearchMode(false)
  }

  return (
    <>
      <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">短剧</h1>
          <div className="flex items-center gap-2">
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                placeholder="搜索短剧..."
                className="pl-4 pr-8 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-full bg-white dark:bg-gray-700 text-gray-900 dark:text-white w-48"
              />
              {searchQuery && (
                <button onClick={clearSearch} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
            <button onClick={handleSearch} className="p-2 bg-blue-600 text-white rounded-full hover:bg-blue-700 transition-colors">
              <Search className="h-4 w-4" />
            </button>
          </div>
        </div>

        {!isSearchMode && (
          <div className="flex gap-2 mb-6 overflow-x-auto pb-2" style={{ scrollbarWidth: 'none' }}>
            {categories.map((cat) => (
              <button
                key={cat.type_id}
                onClick={() => setSelectedCategory(cat.type_id)}
                className={`flex-shrink-0 px-4 py-1.5 text-sm rounded-full font-medium transition-colors ${
                  selectedCategory === cat.type_id
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                }`}
              >
                {cat.type_name}
              </button>
            ))}
          </div>
        )}

        {loading ? (
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8 gap-4">
            {Array.from({ length: 24 }).map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="aspect-[2/3] bg-gray-200 dark:bg-gray-700 rounded-lg" />
                <div className="mt-2 space-y-1">
                  <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-3/4" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8 gap-4">
            {dramas.map((drama) => (
              <ShortDramaCard key={drama.id} drama={drama} />
            ))}
          </div>
        )}

        {dramas.length === 0 && !loading && (
          <div className="text-center py-16 text-gray-500 dark:text-gray-400">
            <p>{isSearchMode ? `未找到"${searchQuery}"相关短剧` : '暂无内容'}</p>
          </div>
        )}

        <div ref={loadingRef} className="h-4 mt-4" />

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
