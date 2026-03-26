import { Users } from 'lucide-react'

interface WatchRoomSyncBannerProps {
  show: boolean
  roomName?: string
  memberCount?: number
  isOwner?: boolean
  syncPaused?: boolean
  onResync?: () => void
}

export default function WatchRoomSyncBanner({ show, roomName, memberCount, isOwner, syncPaused, onResync }: WatchRoomSyncBannerProps) {
  if (!show) return null
  return (
    <div className="bg-blue-600 text-white px-4 py-2 flex items-center justify-between text-sm">
      <div className="flex items-center gap-2">
        <Users className="w-4 h-4" />
        <span>
          {isOwner ? '您是房主' : '同步观看'} · {roomName}
          {memberCount !== undefined && ` · ${memberCount}人在线`}
        </span>
        {syncPaused && <span className="text-blue-200 text-xs">（同步已暂停）</span>}
      </div>
      {syncPaused && onResync && (
        <button
          onClick={onResync}
          className="text-xs bg-white/20 hover:bg-white/30 px-2 py-1 rounded transition-colors"
        >
          重新同步
        </button>
      )}
    </div>
  )
}
