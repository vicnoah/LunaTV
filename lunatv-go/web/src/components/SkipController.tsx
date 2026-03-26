/* eslint-disable @typescript-eslint/no-explicit-any */
import { Settings, SkipForward } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'

export interface SkipSegment {
  start: number
  end: number
  type: 'opening' | 'ending'
  title?: string
  autoSkip?: boolean
  autoNextEpisode?: boolean
  mode?: 'absolute' | 'remaining'
  remainingTime?: number
}

interface SkipControllerProps {
  artPlayerRef: React.MutableRefObject<any>
  source: string
  id: string
  title: string
  episodeIndex: number
  onNextEpisode?: () => void
}

export function SkipSettingsButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
    >
      <Settings className="w-4 h-4" />
      跳过设置
    </button>
  )
}

export default function SkipController({ artPlayerRef, source, id, title, episodeIndex, onNextEpisode }: SkipControllerProps) {
  const [skipSegments, setSkipSegments] = useState<SkipSegment[]>([])
  const [activeSkip, setActiveSkip] = useState<SkipSegment | null>(null)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    // Load skip config from API
    const load = async () => {
      try {
        const token = await import('@/lib/auth').then((m) => m.getToken())
        const headers: Record<string, string> = {}
        if (token) headers['Authorization'] = `Bearer ${token}`
        const res = await fetch(`/api/skip-config/${source}/${id}`, { headers })
        if (res.ok) {
          const data = await res.json()
          setSkipSegments(data.segments || [])
        }
      } catch {}
    }
    load()
  }, [source, id, episodeIndex])

  useEffect(() => {
    if (!artPlayerRef.current) return
    intervalRef.current = setInterval(() => {
      const player = artPlayerRef.current
      if (!player?.currentTime) return
      const ct = player.currentTime as number
      const duration = player.duration as number

      for (const seg of skipSegments) {
        let start = seg.start
        let end = seg.end
        if (seg.mode === 'remaining' && duration && seg.remainingTime !== undefined) {
          start = duration - seg.remainingTime
          end = duration
        }
        if (ct >= start && ct < end) {
          setActiveSkip(seg)
          if (seg.autoSkip) {
            if (seg.type === 'ending' && seg.autoNextEpisode) {
              onNextEpisode?.()
            } else {
              player.currentTime = end
            }
          }
          return
        }
      }
      setActiveSkip(null)
    }, 1000)

    return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
  }, [artPlayerRef, skipSegments, onNextEpisode])

  const handleSkip = useCallback(() => {
    if (!activeSkip || !artPlayerRef.current) return
    const player = artPlayerRef.current
    const duration = player.duration as number
    if (activeSkip.type === 'ending' && activeSkip.autoNextEpisode) {
      onNextEpisode?.()
    } else {
      let end = activeSkip.end
      if (activeSkip.mode === 'remaining' && duration && activeSkip.remainingTime !== undefined) {
        end = duration
      }
      player.currentTime = end
    }
    setActiveSkip(null)
  }, [activeSkip, artPlayerRef, onNextEpisode])

  if (!activeSkip) return null

  return (
    <button
      onClick={handleSkip}
      className="flex items-center gap-2 px-4 py-2 bg-black/70 text-white rounded-xl hover:bg-black/80 transition-colors text-sm font-medium backdrop-blur-sm border border-white/20"
    >
      <SkipForward className="w-4 h-4" />
      {activeSkip.type === 'opening' ? '跳过片头' : activeSkip.autoNextEpisode ? '下一集' : '跳过片尾'}
    </button>
  )
}
