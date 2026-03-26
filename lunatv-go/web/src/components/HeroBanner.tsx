/* eslint-disable @typescript-eslint/no-explicit-any */
import { ChevronLeft, ChevronRight, Info, Play, Volume2, VolumeX } from 'lucide-react'
import { Link } from 'react-router-dom'
import { memo, useCallback, useEffect, useRef, useState } from 'react'
import { useAutoplay } from './hooks/useAutoplay'
import { useSwipeGesture } from './hooks/useSwipeGesture'
import {
  useRefreshedTrailerUrlsQuery,
  useRefreshTrailerUrlMutation,
  useClearTrailerUrlMutation,
} from '@/hooks/useHeroBannerQueries'

interface BannerItem {
  id: string | number
  title: string
  description?: string
  poster: string
  backdrop?: string
  year?: string
  rate?: string
  douban_id?: number
  type?: string
  trailerUrl?: string
}

interface HeroBannerProps {
  items: BannerItem[]
  autoPlayInterval?: number
  showControls?: boolean
  showIndicators?: boolean
  enableVideo?: boolean
}

function getProxiedImageUrl(url: string) {
  if (url?.includes('douban') || url?.includes('doubanio')) {
    return `/api/image-proxy?url=${encodeURIComponent(url)}`
  }
  return url
}

function getHDBackdrop(url?: string) {
  if (!url) return url
  return url
    .replace('/view/photo/s/', '/view/photo/l/')
    .replace('/view/photo/m/', '/view/photo/l/')
    .replace('/s_ratio_poster/', '/l_ratio_poster/')
    .replace('/m_ratio_poster/', '/l_ratio_poster/')
}

function HeroBanner({
  items,
  autoPlayInterval = 8000,
  showControls = true,
  showIndicators = true,
  enableVideo = false,
}: HeroBannerProps) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isHovered, setIsHovered] = useState(false)
  const [isTransitioning, setIsTransitioning] = useState(false)
  const [isMuted, setIsMuted] = useState(true)
  const [videoLoaded, setVideoLoaded] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)

  const { data: refreshedTrailerUrls = {} } = useRefreshedTrailerUrlsQuery()
  const refreshTrailerMutation = useRefreshTrailerUrlMutation()
  const clearTrailerMutation = useClearTrailerUrlMutation()

  const current = items[currentIndex]

  const getTrailerUrl = (item: BannerItem) => {
    if (!item.douban_id || !enableVideo) return null
    const refreshed = refreshedTrailerUrls[String(item.douban_id)]
    return refreshed || item.trailerUrl || null
  }

  const goTo = useCallback(
    (index: number) => {
      if (isTransitioning || items.length === 0) return
      setIsTransitioning(true)
      setVideoLoaded(false)
      setCurrentIndex((index + items.length) % items.length)
      setTimeout(() => setIsTransitioning(false), 300)
    },
    [isTransitioning, items.length],
  )

  const onNext = useCallback(() => goTo(currentIndex + 1), [goTo, currentIndex])
  const onPrev = useCallback(() => goTo(currentIndex - 1), [goTo, currentIndex])

  useAutoplay({ enabled: !isHovered && items.length > 1, interval: autoPlayInterval, onNext, isPaused: isHovered })

  const { onTouchStart, onTouchEnd } = useSwipeGesture({ onSwipeLeft: onNext, onSwipeRight: onPrev })

  if (items.length === 0) return null

  const backdrop = getHDBackdrop(current.backdrop) || current.poster
  const trailerUrl = getTrailerUrl(current)
  const playUrl = `/play?title=${encodeURIComponent(current.title)}${current.year ? `&year=${current.year}` : ''}${current.douban_id ? `&douban_id=${current.douban_id}` : ''}`

  return (
    <div
      className="relative w-full overflow-hidden rounded-2xl"
      style={{ aspectRatio: '16/7', minHeight: 280 }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      {/* Background */}
      <div
        className={`absolute inset-0 transition-opacity duration-500 ${isTransitioning ? 'opacity-0' : 'opacity-100'}`}
      >
        <img
          src={getProxiedImageUrl(backdrop || current.poster)}
          alt={current.title}
          className="w-full h-full object-cover"
          loading="eager"
        />
        {/* Video overlay */}
        {trailerUrl && enableVideo && (
          <video
            ref={videoRef}
            src={trailerUrl}
            className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-1000 ${videoLoaded ? 'opacity-100' : 'opacity-0'}`}
            autoPlay
            muted={isMuted}
            loop
            playsInline
            onCanPlay={() => setVideoLoaded(true)}
            onError={() => {
              if (current.douban_id) clearTrailerMutation.mutate({ doubanId: current.douban_id })
            }}
          />
        )}
      </div>

      {/* Gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/30 to-transparent" />
      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

      {/* Content */}
      <div className="absolute inset-0 flex flex-col justify-end p-6 sm:p-10">
        <div className="max-w-lg">
          {current.rate && (
            <div className="flex items-center gap-1.5 mb-2">
              <span className="text-amber-400 text-sm font-bold">{current.rate}</span>
              <span className="text-white/60 text-xs">豆瓣评分</span>
            </div>
          )}
          <h2 className="text-2xl sm:text-4xl font-bold text-white mb-2 drop-shadow-lg">
            {current.title}
          </h2>
          {current.description && (
            <p className="text-white/80 text-sm sm:text-base line-clamp-2 mb-4 drop-shadow">
              {current.description}
            </p>
          )}
          <div className="flex items-center gap-3">
            <Link
              to={playUrl}
              className="flex items-center gap-2 px-5 py-2.5 bg-white text-gray-900 font-semibold rounded-full hover:bg-gray-100 transition-colors shadow-lg"
            >
              <Play className="w-4 h-4 fill-current" />
              立即播放
            </Link>
            <Link
              to={playUrl}
              className="flex items-center gap-2 px-5 py-2.5 bg-white/20 text-white font-semibold rounded-full hover:bg-white/30 transition-colors backdrop-blur-sm"
            >
              <Info className="w-4 h-4" />
              详情
            </Link>
            {trailerUrl && enableVideo && (
              <button
                onClick={() => setIsMuted(!isMuted)}
                className="p-2.5 bg-white/20 text-white rounded-full hover:bg-white/30 transition-colors backdrop-blur-sm"
              >
                {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Controls */}
      {showControls && items.length > 1 && (
        <>
          <button
            onClick={onPrev}
            className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-black/40 text-white rounded-full flex items-center justify-center hover:bg-black/60 transition-colors backdrop-blur-sm opacity-0 group-hover:opacity-100"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button
            onClick={onNext}
            className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-black/40 text-white rounded-full flex items-center justify-center hover:bg-black/60 transition-colors backdrop-blur-sm opacity-0 group-hover:opacity-100"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </>
      )}

      {/* Indicators */}
      {showIndicators && items.length > 1 && (
        <div className="absolute bottom-4 right-6 flex gap-1.5">
          {items.map((_, i) => (
            <button
              key={i}
              onClick={() => goTo(i)}
              className={`rounded-full transition-all duration-300 ${
                i === currentIndex ? 'bg-white w-6 h-2' : 'bg-white/50 w-2 h-2'
              }`}
            />
          ))}
        </div>
      )}
    </div>
  )
}

export default memo(HeroBanner)
