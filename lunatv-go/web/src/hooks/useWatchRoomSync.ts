import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { PlayState } from '@/types/watch-room.types'

export interface OwnerPlayState {
  videoId: string
  source: string
  episode: number
  currentTime: number
  videoName?: string
  videoYear?: string
  searchTitle?: string
  poster?: string
  totalEpisodes?: number
  doubanId?: number
}

interface UseWatchRoomSyncOptions {
  watchRoom: unknown
  artPlayerRef: React.MutableRefObject<unknown>
  detail: unknown
  episodeIndex: number
  playerReady: boolean
  videoId: string
  currentSource: string
  videoTitle: string
  videoYear: string
  videoDoubanId?: number
  searchTitle?: string
  setCurrentEpisodeIndex: (index: number) => void
}

export function useWatchRoomSync({
  watchRoom,
  artPlayerRef,
  detail,
  episodeIndex,
  playerReady,
  videoId,
  currentSource,
  videoTitle,
  videoYear,
  videoDoubanId,
  searchTitle,
  setCurrentEpisodeIndex,
}: UseWatchRoomSyncOptions) {
  const navigate = useNavigate()
  const isHandlingRemoteCommandRef = useRef(false)
  const lastSyncTimeRef = useRef(0)
  const [showSourceSwitchDialog, setShowSourceSwitchDialog] = useState(false)
  const [pendingOwnerState, setPendingOwnerState] = useState<OwnerPlayState | null>(null)
  const [syncPaused, setSyncPaused] = useState(false)
  const [ownerState, setOwnerState] = useState<OwnerPlayState | null>(null)
  const [pendingOwnerChange, setPendingOwnerChange] = useState<OwnerPlayState | null>(null)
  const initialSyncDoneRef = useRef(false)

  const wr = watchRoom as Record<string, unknown> | null

  const isInRoom = !!(wr?.currentRoom)
  const isOwner = (wr?.isOwner as boolean) || false
  const socket = wr?.socket as { on: (...args: unknown[]) => void; off: (...args: unknown[]) => void } | null

  // Broadcast play state as owner
  const broadcastPlayState = useCallback(() => {
    if (!isInRoom || !isOwner || !artPlayerRef.current) return
    const player = artPlayerRef.current as Record<string, unknown>
    const updatePlayState = (wr as Record<string, unknown>)?.updatePlayState as ((state: PlayState) => void) | undefined
    if (!updatePlayState) return
    updatePlayState({
      videoId,
      source: currentSource,
      episode: episodeIndex,
      currentTime: (player.currentTime as number) || 0,
      isPlaying: (player.playing as boolean) || false,
      videoName: videoTitle,
      videoYear,
      searchTitle,
      doubanId: videoDoubanId,
    } as PlayState)
  }, [isInRoom, isOwner, artPlayerRef, wr, videoId, currentSource, episodeIndex, videoTitle, videoYear, searchTitle, videoDoubanId])

  return {
    showSourceSwitchDialog,
    setShowSourceSwitchDialog,
    pendingOwnerState,
    setPendingOwnerState,
    syncPaused,
    setSyncPaused,
    ownerState,
    pendingOwnerChange,
    broadcastPlayState,
    isInRoom,
    isOwner,
  }
}
