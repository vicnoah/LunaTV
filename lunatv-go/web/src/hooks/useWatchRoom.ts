import { useCallback, useEffect, useRef, useState } from 'react'
import { io, Socket } from 'socket.io-client'
import type {
  ChatMessage,
  ClientToServerEvents,
  LiveState,
  Member,
  PlayState,
  Room,
  ServerToClientEvents,
} from '@/types/watch-room.types'

type TypedSocket = Socket<ServerToClientEvents, ClientToServerEvents>

export interface UseWatchRoomOptions {
  serverUrl: string
  authKey: string
  userName: string
  onError?: (error: string) => void
  onDisconnect?: () => void
}

export interface UseWatchRoomReturn {
  socket: TypedSocket | null
  connected: boolean
  currentRoom: Room | null
  members: Member[]
  messages: ChatMessage[]
  isOwner: boolean
  createRoom: (data: { name: string; description: string; password?: string; isPublic: boolean }) => Promise<{ success: boolean; room?: Room; error?: string }>
  joinRoom: (roomId: string, password?: string) => Promise<{ success: boolean; room?: Room; members?: Member[]; error?: string }>
  leaveRoom: () => void
  getRoomList: () => Promise<Room[]>
  updatePlayState: (state: PlayState) => void
  seekTo: (currentTime: number) => void
  play: () => void
  pause: () => void
  changeVideo: (state: PlayState) => void
  clearState: () => Promise<{ success: boolean; error?: string }>
  changeLiveChannel: (state: LiveState) => void
  sendMessage: (content: string, type?: 'text' | 'emoji') => void
  connectionError: string | null
}

export function useWatchRoom(options: UseWatchRoomOptions): UseWatchRoomReturn {
  const { serverUrl, authKey, userName, onError, onDisconnect } = options
  const socketRef = useRef<TypedSocket | null>(null)
  const [connected, setConnected] = useState(false)
  const [currentRoom, setCurrentRoom] = useState<Room | null>(null)
  const [members, setMembers] = useState<Member[]>([])
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [isOwner, setIsOwner] = useState(false)
  const [connectionError, setConnectionError] = useState<string | null>(null)

  useEffect(() => {
    if (!serverUrl || !authKey) return

    const socket = io(serverUrl, {
      auth: { key: authKey, userName },
      transports: ['websocket'],
    }) as TypedSocket

    socketRef.current = socket

    socket.on('connect', () => { setConnected(true); setConnectionError(null) })
    socket.on('disconnect', () => { setConnected(false); onDisconnect?.() })
    socket.on('connect_error', (err) => { setConnectionError(err.message); onError?.(err.message) })

    socket.on('room:joined', (data) => {
      setMembers(data.members)
      setCurrentRoom(data.room)
    })
    socket.on('chat:message', (msg) => setMessages((prev) => [...prev, msg]))
    socket.on('room:member-joined', (member) => setMembers(prev => [...prev, member]))
    socket.on('room:member-left', (userId) => setMembers(prev => prev.filter(m => m.id !== userId)))

    return () => { socket.disconnect() }
  }, [serverUrl, authKey, userName])

  const createRoom = useCallback(async (data: { name: string; description: string; password?: string; isPublic: boolean }) => {
    return new Promise<{ success: boolean; room?: Room; error?: string }>((resolve) => {
      if (!socketRef.current) return resolve({ success: false, error: 'Not connected' })
      socketRef.current.emit('room:create', { ...data, userName }, (res) => resolve(res))
    })
  }, [userName])

  const joinRoom = useCallback(async (roomId: string, password?: string) => {
    return new Promise<{ success: boolean; room?: Room; members?: Member[]; error?: string }>((resolve) => {
      if (!socketRef.current) return resolve({ success: false, error: 'Not connected' })
      socketRef.current.emit('room:join', { roomId, password, userName }, (res) => {
        if (res.success && res.room) {
          setCurrentRoom(res.room)
          setIsOwner(res.room.ownerName === userName)
        }
        resolve(res)
      })
    })
  }, [userName])

  const leaveRoom = useCallback(() => {
    socketRef.current?.emit('room:leave')
    setCurrentRoom(null)
    setMembers([])
    setIsOwner(false)
  }, [])

  const getRoomList = useCallback(async () => {
    return new Promise<Room[]>((resolve) => {
      if (!socketRef.current) return resolve([])
      socketRef.current.emit('room:list', (rooms) => resolve(rooms))
    })
  }, [])

  const updatePlayState = useCallback((state: PlayState) => {
    socketRef.current?.emit('play:update', state)
  }, [])

  const seekTo = useCallback((currentTime: number) => {
    socketRef.current?.emit('play:seek', currentTime)
  }, [])

  const play = useCallback(() => {
    socketRef.current?.emit('play:play')
  }, [])

  const pause = useCallback(() => {
    socketRef.current?.emit('play:pause')
  }, [])

  const changeVideo = useCallback((state: PlayState) => {
    socketRef.current?.emit('play:change', state)
  }, [])

  const clearState = useCallback(async () => {
    return new Promise<{ success: boolean; error?: string }>((resolve) => {
      if (!socketRef.current) return resolve({ success: false, error: 'Not connected' })
      socketRef.current.emit('state:clear', (res) => resolve(res ?? { success: true }))
    })
  }, [])

  const changeLiveChannel = useCallback((state: LiveState) => {
    socketRef.current?.emit('live:change', state)
  }, [])

  const sendMessage = useCallback((content: string, type: 'text' | 'emoji' = 'text') => {
    socketRef.current?.emit('chat:message', { content, type })
  }, [])

  return {
    socket: socketRef.current,
    connected,
    currentRoom,
    members,
    messages,
    isOwner,
    createRoom,
    joinRoom,
    leaveRoom,
    getRoomList,
    updatePlayState,
    seekTo,
    play,
    pause,
    changeVideo,
    clearState,
    changeLiveChannel,
    sendMessage,
    connectionError,
  }
}
