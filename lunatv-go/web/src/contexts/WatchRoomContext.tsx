import { createContext, useContext, useState, type ReactNode } from 'react'
import type { Room, Member, PlayState, LiveState, ChatMessage } from '@/types/watch-room.types'

interface WatchRoomContextValue {
  room: Room | null
  members: Member[]
  playState: PlayState | null
  liveState: LiveState | null
  messages: ChatMessage[]
  isConnected: boolean
  setRoom: (room: Room | null) => void
  setMembers: (members: Member[]) => void
  setPlayState: (state: PlayState | null) => void
  setLiveState: (state: LiveState | null) => void
  addMessage: (message: ChatMessage) => void
  setIsConnected: (connected: boolean) => void
}

const WatchRoomContext = createContext<WatchRoomContextValue | null>(null)

export function WatchRoomProvider({ children }: { children: ReactNode }) {
  const [room, setRoom] = useState<Room | null>(null)
  const [members, setMembers] = useState<Member[]>([])
  const [playState, setPlayState] = useState<PlayState | null>(null)
  const [liveState, setLiveState] = useState<LiveState | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [isConnected, setIsConnected] = useState(false)

  const addMessage = (message: ChatMessage) => {
    setMessages(prev => [...prev, message])
  }

  return (
    <WatchRoomContext.Provider
      value={{
        room,
        members,
        playState,
        liveState,
        messages,
        isConnected,
        setRoom,
        setMembers,
        setPlayState,
        setLiveState,
        addMessage,
        setIsConnected,
      }}
    >
      {children}
    </WatchRoomContext.Provider>
  )
}

export function useWatchRoom() {
  const ctx = useContext(WatchRoomContext)
  if (!ctx) throw new Error('useWatchRoom must be used within WatchRoomProvider')
  return ctx
}
