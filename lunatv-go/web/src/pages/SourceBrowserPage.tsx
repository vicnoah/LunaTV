/* eslint-disable @typescript-eslint/no-explicit-any */
import { ExternalLink, Layers, Server } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { DoubanItem, SearchResult as GlobalSearchResult } from '@/types'

type Source = { key: string; name: string; api: string }
type Category = { type_id: string | number; type_name: string }
type Item = {
  id: string
  title: string
  poster: string
  year: string
  type_name?: string
  remarks?: string
}

export default function SourceBrowserPage() {
  const navigate = useNavigate()

  const [sources, setSources] = useState<Source[]>([])
  const [loadingSources, setLoadingSources] = useState(true)
  const [sourceError, setSourceError] = useState<string | null>(null)
  const [activeSourceKey, setActiveSourceKey] = useState('')
  const activeSource = useMemo(
    () => sources.find((s) => s.key === activeSourceKey),
    [sources, activeSourceKey]
  )

  const [categories, setCategories] = useState<Category[]>([])
  const [loadingCategories, setLoadingCategories] = useState(false)
  const [categoryError, setCategoryError] = useState<string | null>(null)
  const [activeCategory, setActiveCategory] = useState<string | number>('')

  const [items, setItems] = useState<Item[]>([])
  const [loadingItems, setLoadingItems] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [itemsError, setItemsError] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const [pageCount, setPageCount] = useState(1)
  const hasMore = page < pageCount
  const loadMoreRef = useRef<HTMLDivElement | null>(null)
  const lastFetchAtRef = useRef(0)
  const autoFillInProgressRef = useRef(false)

  const [query, setQuery] = useState('')
  const [mode, setMode] = useState<'category' | 'search'>('category')
  const [sortBy, setSortBy] = useState<'default' | 'title-asc' | 'title-desc' | 'year-asc' | 'year-desc'>('default')
  const [debounceId, setDebounceId] = useState<ReturnType<typeof setTimeout> | null>(null)

  const [filterKeyword, setFilterKeyword] = useState('')
  const [filterYear, setFilterYear] = useState<string>('')
  const [availableYears, setAvailableYears] = useState<string[]>([])

  const [previewOpen, setPreviewOpen] = useState(false)
  const [previewLoading, setPreviewLoading] = useState(false)
  const [previewError, setPreviewError] = useState<string | null>(null)
  const [previewData, setPreviewData] = useState<GlobalSearchResult | null>(null)
  const [previewItem, setPreviewItem] = useState<Item | null>(null)
  const [previewDouban, setPreviewDouban] = useState<DoubanItem | null>(null)
  const [previewDoubanLoading, setPreviewDoubanLoading] = useState(false)
  const [previewDoubanId, setPreviewDoubanId] = useState<number | null>(null)

  const fetchSources = useCallback(async () => {
    setLoadingSources(true)
    setSourceError(null)
    try {
      const res = await fetch('/api/source-browser/sites', { cache: 'no-store' })
      if (res.status === 401) throw new Error('登录状态已失效，请重新登录')
      if (res.status === 403) throw new Error('当前账号暂无可用资源站点')
      if (!res.ok) throw new Error('获取源失败')
      const data = await res.json()
      const list: Source[] = data.sources || []
      setSources(list)
      if (list.length > 0) setActiveSourceKey(list[0].key)
    } catch (e: unknown) {
      setSourceError(e instanceof Error ? e.message : '获取源失败')
    } finally {
      setLoadingSources(false)
    }
  }, [])

  const fetchCategories = useCallback(async (sourceKey: string) => {
    if (!sourceKey) return
    setLoadingCategories(true)
    setCategoryError(null)
    try {
      const res = await fetch(`/api/source-browser/categories?source=${encodeURIComponent(sourceKey)}`)
      if (!res.ok) throw new Error('获取分类失败')
      const data = await res.json()
      const list: Category[] = data.categories || []
      setCategories(list)
      if (list.length > 0) setActiveCategory(list[0].type_id)
      else setActiveCategory('')
    } catch (e: unknown) {
      setCategoryError(e instanceof Error ? e.message : '获取分类失败')
      setCategories([])
      setActiveCategory('')
    } finally {
      setLoadingCategories(false)
    }
  }, [])

  const fetchItems = useCallback(async (sourceKey: string, typeId: string | number, p = 1, append = false) => {
    if (!sourceKey || !typeId) return
    if (append) setLoadingMore(true)
    else setLoadingItems(true)
    setItemsError(null)
    try {
      const res = await fetch(
        `/api/source-browser/list?source=${encodeURIComponent(sourceKey)}&type_id=${encodeURIComponent(String(typeId))}&page=${p}`
      )
      if (!res.ok) throw new Error('获取列表失败')
      const data = (await res.json()) as { items?: Item[]; meta?: { page?: number; pagecount?: number } }
      const list: Item[] = data.items || []
      setItems((prev) => (append ? [...prev, ...list] : list))
      setPage(Number(data.meta?.page || p))
      setPageCount(Number(data.meta?.pagecount || 1))
      const years = Array.from(new Set(list.map((i) => (i.year || '').trim()).filter(Boolean)))
      years.sort((a, b) => (parseInt(b) || 0) - (parseInt(a) || 0))
      setAvailableYears(years)
    } catch (e: unknown) {
      setItemsError(e instanceof Error ? e.message : '获取列表失败')
      if (!append) setItems([])
      setPage(1)
      setPageCount(1)
      setAvailableYears([])
    } finally {
      if (append) setLoadingMore(false)
      else setLoadingItems(false)
    }
  }, [])

  const fetchSearch = useCallback(async (sourceKey: string, q: string, p = 1, append = false) => {
    if (!sourceKey || !q) return
    if (append) setLoadingMore(true)
    else setLoadingItems(true)
    setItemsError(null)
    try {
      const res = await fetch(`/api/source-browser/search?source=${encodeURIComponent(sourceKey)}&q=${encodeURIComponent(q)}&page=${p}`)
      if (!res.ok) throw new Error('搜索失败')
      const data = (await res.json()) as { items?: Item[]; meta?: { page?: number; pagecount?: number } }
      const list: Item[] = data.items || []
      setItems((prev) => (append ? [...prev, ...list] : list))
      setPage(Number(data.meta?.page || p))
      setPageCount(Number(data.meta?.pagecount || 1))
      const years = Array.from(new Set(list.map((i) => (i.year || '').trim()).filter(Boolean)))
      years.sort((a, b) => (parseInt(b) || 0) - (parseInt(a) || 0))
      setAvailableYears(years)
    } catch (e: unknown) {
      setItemsError(e instanceof Error ? e.message : '搜索失败')
      if (!append) setItems([])
      setPage(1)
      setPageCount(1)
      setAvailableYears([])
    } finally {
      if (append) setLoadingMore(false)
      else setLoadingItems(false)
    }
  }, [])

  useEffect(() => { fetchSources() }, [fetchSources])
  useEffect(() => { if (activeSourceKey) fetchCategories(activeSourceKey) }, [activeSourceKey, fetchCategories])
  useEffect(() => {
    if (activeSourceKey && activeCategory && mode === 'category') {
      setItems([])
      setPage(1)
      setPageCount(1)
      fetchItems(activeSourceKey, activeCategory, 1, false)
    }
  }, [activeSourceKey, activeCategory, mode, fetchItems])

  useEffect(() => {
    if (activeSourceKey && mode === 'search' && query.trim()) {
      setItems([])
      setPage(1)
      setPageCount(1)
      fetchSearch(activeSourceKey, query.trim(), 1, false)
    }
  }, [activeSourceKey, mode, query, fetchSearch])

  useEffect(() => {
    if (!loadMoreRef.current) return
    const el = loadMoreRef.current
    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0]
        if (entry.isIntersecting) {
          const now = Date.now()
          const intervalOk = now - lastFetchAtRef.current > 700
          if (!loadingItems && !loadingMore && hasMore && activeSourceKey && intervalOk) {
            lastFetchAtRef.current = now
            const next = page + 1
            if (mode === 'search' && query.trim()) fetchSearch(activeSourceKey, query.trim(), next, true)
            else if (mode === 'category' && activeCategory) fetchItems(activeSourceKey, activeCategory, next, true)
          }
        }
      },
      { root: null, rootMargin: '200px', threshold: 0 }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [loadingItems, loadingMore, hasMore, page, mode, activeSourceKey, activeCategory, query, fetchItems, fetchSearch])

  const filteredAndSorted = useMemo(() => {
    let arr = [...items]
    if (filterKeyword.trim()) {
      const kw = filterKeyword.trim().toLowerCase()
      arr = arr.filter((i) => (i.title || '').toLowerCase().includes(kw) || (i.remarks || '').toLowerCase().includes(kw))
    }
    if (filterYear) {
      arr = arr.filter((i) => (i.year || '').trim() === filterYear)
    }
    switch (sortBy) {
      case 'title-asc': return arr.sort((a, b) => a.title.localeCompare(b.title))
      case 'title-desc': return arr.sort((a, b) => b.title.localeCompare(a.title))
      case 'year-asc': return arr.sort((a, b) => (parseInt(a.year) || 0) - (parseInt(b.year) || 0))
      case 'year-desc': return arr.sort((a, b) => (parseInt(b.year) || 0) - (parseInt(a.year) || 0))
      default: return arr
    }
  }, [items, sortBy, filterKeyword, filterYear])

  const openPreview = async (item: Item) => {
    setPreviewItem(item)
    setPreviewOpen(true)
    setPreviewData(null)
    setPreviewError(null)
    setPreviewDouban(null)
    setPreviewDoubanId(null)
    setPreviewLoading(true)

    try {
      const res = await fetch(
        `/api/source-browser/detail?source=${encodeURIComponent(activeSourceKey)}&id=${encodeURIComponent(item.id)}`
      )
      if (!res.ok) throw new Error('获取详情失败')
      const data = await res.json()
      setPreviewData(data.result || data)
      if (data.result?.douban_id || data.douban_id) {
        const dId = data.result?.douban_id || data.douban_id
        setPreviewDoubanId(dId)
      }
    } catch (e: unknown) {
      setPreviewError(e instanceof Error ? e.message : '获取详情失败')
    } finally {
      setPreviewLoading(false)
    }
  }

  const handleQueryChange = (val: string) => {
    setQuery(val)
    if (debounceId) clearTimeout(debounceId)
    if (!val.trim()) {
      setMode('category')
      return
    }
    const id = setTimeout(() => {
      setMode('search')
    }, 400)
    setDebounceId(id)
  }

  if (loadingSources) {
    return (
      <>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-gray-500 dark:text-gray-400">加载中...</div>
        </div>
      </>
    )
  }

  if (sourceError) {
    return (
      <>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-red-500">{sourceError}</div>
        </div>
      </>
    )
  }

  return (
    <>
      <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex items-center gap-3 mb-6">
          <Layers className="w-6 h-6 text-blue-600 dark:text-blue-400" />
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">源浏览器</h1>
        </div>

        {/* Source selector */}
        <div className="flex gap-2 mb-4 overflow-x-auto pb-2" style={{ scrollbarWidth: 'none' }}>
          {sources.map((s) => (
            <button
              key={s.key}
              onClick={() => { setActiveSourceKey(s.key); setMode('category') }}
              className={`flex-shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                activeSourceKey === s.key
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
              }`}
            >
              <Server className="w-3.5 h-3.5" />
              {s.name}
            </button>
          ))}
        </div>

        <div className="flex gap-4">
          {/* Left: categories */}
          <div className="w-48 shrink-0 hidden md:block">
            {loadingCategories ? (
              <div className="text-sm text-gray-500 dark:text-gray-400 py-4 text-center">加载分类...</div>
            ) : categoryError ? (
              <div className="text-sm text-red-500 py-4 text-center">{categoryError}</div>
            ) : (
              <div className="space-y-1">
                {categories.map((cat) => (
                  <button
                    key={String(cat.type_id)}
                    onClick={() => { setActiveCategory(cat.type_id); setMode('category') }}
                    className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                      activeCategory === cat.type_id
                        ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 font-medium'
                        : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                    }`}
                  >
                    {cat.type_name}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Right: items */}
          <div className="flex-1 min-w-0">
            {/* Search & filter bar */}
            <div className="flex flex-wrap gap-2 mb-4">
              <input
                type="text"
                value={query}
                onChange={(e) => handleQueryChange(e.target.value)}
                placeholder="搜索..."
                className="flex-1 min-w-[160px] px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
              <input
                type="text"
                value={filterKeyword}
                onChange={(e) => setFilterKeyword(e.target.value)}
                placeholder="关键词过滤"
                className="w-32 px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
              {availableYears.length > 0 && (
                <select
                  value={filterYear}
                  onChange={(e) => setFilterYear(e.target.value)}
                  className="px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value="">全部年份</option>
                  {availableYears.map((y) => <option key={y} value={y}>{y}</option>)}
                </select>
              )}
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="default">默认排序</option>
                <option value="title-asc">标题 A-Z</option>
                <option value="title-desc">标题 Z-A</option>
                <option value="year-desc">年份最新</option>
                <option value="year-asc">年份最早</option>
              </select>
            </div>

            {/* Mobile categories */}
            <div className="flex gap-2 mb-4 overflow-x-auto pb-1 md:hidden" style={{ scrollbarWidth: 'none' }}>
              {categories.map((cat) => (
                <button
                  key={String(cat.type_id)}
                  onClick={() => { setActiveCategory(cat.type_id); setMode('category') }}
                  className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                    activeCategory === cat.type_id
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300'
                  }`}
                >
                  {cat.type_name}
                </button>
              ))}
            </div>

            {/* Item grid */}
            {loadingItems ? (
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                {Array.from({ length: 18 }).map((_, i) => (
                  <div key={i} className="animate-pulse">
                    <div className="aspect-[2/3] bg-gray-200 dark:bg-gray-700 rounded-lg" />
                    <div className="mt-2 h-3 bg-gray-200 dark:bg-gray-700 rounded w-3/4" />
                  </div>
                ))}
              </div>
            ) : itemsError ? (
              <div className="text-center py-16 text-red-500">{itemsError}</div>
            ) : filteredAndSorted.length === 0 ? (
              <div className="text-center py-16 text-gray-500 dark:text-gray-400">暂无内容</div>
            ) : (
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                {filteredAndSorted.map((item) => (
                  <div
                    key={item.id}
                    className="group cursor-pointer"
                    onClick={() => openPreview(item)}
                  >
                    <div className="relative aspect-[2/3] overflow-hidden rounded-lg bg-gray-200 dark:bg-gray-800">
                      <img
                        src={item.poster}
                        alt={item.title}
                        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                        loading="lazy"
                        onError={(e) => { (e.target as HTMLImageElement).src = '/placeholder-cover.jpg' }}
                      />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <ExternalLink className="w-6 h-6 text-white" />
                      </div>
                    </div>
                    <div className="mt-1.5">
                      <p className="text-sm font-medium text-gray-900 dark:text-white line-clamp-2">{item.title}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{item.year}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {loadingMore && (
              <div className="flex justify-center py-6">
                <div className="animate-spin h-6 w-6 border-2 border-blue-500 border-t-transparent rounded-full" />
              </div>
            )}

            <div ref={loadMoreRef} className="h-4 mt-4" />
          </div>
        </div>
      </div>

      {/* Preview modal */}
      {previewOpen && previewItem && (
        <div
          className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4"
          onClick={() => setPreviewOpen(false)}
        >
          <div
            className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6">
              <div className="flex items-start gap-4 mb-4">
                <img
                  src={previewItem.poster}
                  alt={previewItem.title}
                  className="w-24 aspect-[2/3] object-cover rounded-lg shrink-0"
                  onError={(e) => { (e.target as HTMLImageElement).src = '/placeholder-cover.jpg' }}
                />
                <div className="flex-1 min-w-0">
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white">{previewItem.title}</h2>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{previewItem.year}</p>
                  {previewItem.type_name && (
                    <span className="inline-block mt-2 px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-xs rounded">
                      {previewItem.type_name}
                    </span>
                  )}
                  {previewItem.remarks && (
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">{previewItem.remarks}</p>
                  )}
                </div>
              </div>

              {previewLoading && (
                <div className="flex justify-center py-8">
                  <div className="animate-spin h-8 w-8 border-2 border-blue-500 border-t-transparent rounded-full" />
                </div>
              )}

              {previewError && (
                <div className="text-center text-red-500 py-4">{previewError}</div>
              )}

              <div className="flex gap-3 mt-4">
                <button
                  onClick={() => navigate(`/search?q=${encodeURIComponent(previewItem.title)}`)}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
                >
                  搜索资源
                </button>
                <button
                  onClick={() => setPreviewOpen(false)}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg text-sm hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                >
                  关闭
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
