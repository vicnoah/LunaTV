/* eslint-disable @typescript-eslint/no-explicit-any */
import { Heart, Play, Star, Trash2 } from 'lucide-react'
import React, { forwardRef, memo, useCallback, useImperativeHandle, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ImagePlaceholder } from './ImagePlaceholder'
import { loadedImageUrls } from '@/lib/imageCache'

export interface VideoCardProps {
  id?: string
  source?: string
  title?: string
  query?: string
  poster?: string
  episodes?: number
  source_name?: string
  source_names?: string[]
  progress?: number
  year?: string
  from: 'playrecord' | 'favorite' | 'search' | 'douban'
  currentEpisode?: number
  douban_id?: number
  onDelete?: () => void
  rate?: string
  type?: string
  isBangumi?: boolean
  isAggregate?: boolean
  origin?: 'vod' | 'live'
  remarks?: string
  releaseDate?: string
  priority?: boolean
  aiEnabled?: boolean
  aiCheckComplete?: boolean
}

export type VideoCardHandle = {
  setEpisodes: (episodes?: number) => void
  setSourceNames: (names?: string[]) => void
  setDoubanId: (id?: number) => void
}

const VideoCard = forwardRef<VideoCardHandle, VideoCardProps>(function VideoCard(
  {
    id,
    title = '',
    query = '',
    poster = '',
    episodes,
    source_name,
    source_names,
    progress,
    year,
    from,
    currentEpisode,
    douban_id,
    onDelete,
    rate,
    type,
    source,
    isAggregate,
    remarks,
    releaseDate,
    priority,
  },
  ref,
) {
  const navigate = useNavigate()
  const [imgLoaded, setImgLoaded] = useState(() => loadedImageUrls.has(poster))
  const [imgError, setImgError] = useState(false)
  const [dynamicEpisodes, setDynamicEpisodes] = useState(episodes)
  const [dynamicSourceNames, setDynamicSourceNames] = useState(source_names)
  const [dynamicDoubanId, setDynamicDoubanId] = useState(douban_id)

  useImperativeHandle(ref, () => ({
    setEpisodes: (eps) => setDynamicEpisodes(eps),
    setSourceNames: (names) => setDynamicSourceNames(names),
    setDoubanId: (id) => setDynamicDoubanId(id),
  }))

  const getPlayUrl = useCallback(() => {
    const yearParam = year && year !== 'unknown' ? `&year=${year}` : ''
    const queryParam = query ? `&stitle=${encodeURIComponent(query.trim())}` : ''
    const typeParam = type ? `&stype=${type}` : ''
    const doubanParam = dynamicDoubanId && dynamicDoubanId > 0 ? `&douban_id=${dynamicDoubanId}` : ''
    if (isAggregate || !source || !id) {
      return `/play?title=${encodeURIComponent(title.trim())}${yearParam}${typeParam}${queryParam}${doubanParam}`
    }
    return `/play?source=${source}&id=${id}&title=${encodeURIComponent(title.trim())}${yearParam}${queryParam}${typeParam}${doubanParam}`
  }, [id, source, title, query, year, type, isAggregate, dynamicDoubanId])

  const handleClick = useCallback(() => {
    navigate(getPlayUrl())
  }, [navigate, getPlayUrl])

  const handleImgLoad = () => {
    loadedImageUrls.add(poster)
    setImgLoaded(true)
  }

  const progressPercent = progress !== undefined ? progress : undefined

  return (
    <div
      className="group cursor-pointer"
      onClick={handleClick}
    >
      <div className="relative rounded-xl overflow-hidden bg-gray-100 dark:bg-gray-800 aspect-[2/3] mb-2">
        {!imgLoaded && !imgError && (
          <div className="absolute inset-0 animate-pulse bg-gray-200 dark:bg-gray-700" />
        )}
        {imgError ? (
          <ImagePlaceholder className="absolute inset-0 w-full h-full" text={title} />
        ) : (
          <img
            src={poster}
            alt={title}
            loading={priority ? 'eager' : 'lazy'}
            className={`w-full h-full object-cover transition-all duration-300 group-hover:scale-105 ${imgLoaded ? 'opacity-100' : 'opacity-0'}`}
            onLoad={handleImgLoad}
            onError={() => setImgError(true)}
          />
        )}

        {/* Progress bar */}
        {progressPercent !== undefined && progressPercent > 0 && (
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-black/30">
            <div
              className="h-full bg-green-500"
              style={{ width: `${Math.min(progressPercent, 100)}%` }}
            />
          </div>
        )}

        {/* Play overlay */}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors duration-200 flex items-center justify-center">
          <Play className="w-10 h-10 text-white opacity-0 group-hover:opacity-100 transition-opacity duration-200 fill-white" />
        </div>

        {/* Rate badge */}
        {rate && (
          <div className="absolute top-2 right-2 bg-black/60 text-amber-400 text-xs font-bold px-1.5 py-0.5 rounded-full flex items-center gap-1">
            <Star className="w-3 h-3 fill-amber-400" />
            {rate}
          </div>
        )}

        {/* Remarks badge */}
        {remarks && (
          <div className="absolute top-2 left-2 bg-green-500/90 text-white text-[10px] font-medium px-1.5 py-0.5 rounded-full truncate max-w-[70%]">
            {remarks}
          </div>
        )}

        {/* Delete button */}
        {onDelete && (
          <button
            className="absolute top-2 right-2 bg-black/60 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-200 hover:bg-red-500/80"
            onClick={(e) => { e.stopPropagation(); onDelete() }}
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      <div>
        <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{title}</p>
        <div className="flex items-center gap-1 mt-0.5">
          {year && <span className="text-xs text-gray-500 dark:text-gray-400">{year}</span>}
          {dynamicEpisodes && dynamicEpisodes > 1 && (
            <span className="text-xs text-gray-400 dark:text-gray-500">
              {currentEpisode !== undefined ? `第${currentEpisode + 1}集` : `${dynamicEpisodes}集`}
            </span>
          )}
          {source_name && !dynamicSourceNames && (
            <span className="text-xs text-gray-400 dark:text-gray-500 truncate">{source_name}</span>
          )}
        </div>
      </div>
    </div>
  )
})

export default memo(VideoCard)
