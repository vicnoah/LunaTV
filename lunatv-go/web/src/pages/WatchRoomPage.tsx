/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect } from 'react'
import { Users, UserPlus, List as ListIcon, Lock, RefreshCw, Video, LogOut, Play, Radio } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useWatchRoom } from '@/contexts/WatchRoomContext'
import { getCurrentUser } from '@/lib/auth'
import MiniVideoCard from '@/components/watch-room/MiniVideoCard'
import type { Room, PlayState, LiveState } from '@/types/watch-room.types'

type TabType = 'create' | 'join' | 'list'

export default function WatchRoomPage() {
  const navigate = useNavigate()
  const { room: currentRoom, members, isConnected } = useWatchRoom()

  const [activeTab, setActiveTab] = useState<TabType>('create')
  const [currentUsername, setCurrentUsername] = useState<string>('游客')

  useEffect(() => {
    const user = getCurrentUser()
    setCurrentUsername(user?.username || '游客')
  }, [])

  const [createForm, setCreateForm] = useState({ roomName: '', description: '', password: '', isPublic: true })
  const [joinForm, setJoinForm] = useState({ roomId: '', password: '' })
  const [rooms, setRooms] = useState<Room[]>([])
  const [loading, setLoading] = useState(false)
  const [createLoading, setCreateLoading] = useState(false)
  const [joinLoading, setJoinLoading] = useState(false)

  const loadRooms = async () => {
    if (!isConnected) return
    setLoading(true)
    try {
      const res = await fetch('/api/watch-room/list')
      if (res.ok) {
        const data = await res.json()
        setRooms(data.rooms || [])
      }
    } catch {
      // ignore
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (activeTab === 'list') loadRooms()
  }, [activeTab, isConnected])

  const handleCreateRoom = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!createForm.roomName.trim()) { alert('请输入房间名称'); return }
    setCreateLoading(true)
    try {
      const res = await fetch('/api/watch-room/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: createForm.roomName.trim(),
          description: createForm.description.trim(),
          password: createForm.password.trim() || undefined,
          isPublic: createForm.isPublic,
          userName: currentUsername,
        }),
      })
      if (!res.ok) throw new Error('创建失败')
      setCreateForm({ roomName: '', description: '', password: '', isPublic: true })
    } catch (error: any) {
      alert(error.message || '创建房间失败')
    } finally {
      setCreateLoading(false)
    }
  }

  const handleJoinRoom = async (e: React.FormEvent, roomId?: string) => {
    e.preventDefault()
    const targetRoomId = roomId || joinForm.roomId.trim().toUpperCase()
    if (!targetRoomId) { alert('请输入房间ID'); return }
    setJoinLoading(true)
    try {
      const res = await fetch('/api/watch-room/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roomId: targetRoomId,
          password: joinForm.password.trim() || undefined,
          userName: currentUsername,
        }),
      })
      if (!res.ok) throw new Error('加入失败')
      setJoinForm({ roomId: '', password: '' })
    } catch (error: any) {
      alert(error.message || '加入房间失败')
    } finally {
      setJoinLoading(false)
    }
  }

  const handleJoinFromList = (room: Room) => {
    setJoinForm({ roomId: room.id, password: '' })
    setActiveTab('join')
  }

  const handleLeaveRoom = async () => {
    const isOwner = currentRoom?.ownerId === currentUsername
    if (confirm(isOwner ? '确定要解散房间吗？所有成员将被踢出房间。' : '确定要退出房间吗？')) {
      try {
        await fetch('/api/watch-room/leave', { method: 'POST' })
      } catch { /* ignore */ }
    }
  }

  const formatTime = (timestamp: number) => {
    const diff = Date.now() - timestamp
    const minutes = Math.floor(diff / 60000)
    const hours = Math.floor(minutes / 60)
    const days = Math.floor(hours / 24)
    if (days > 0) return `${days}天前`
    if (hours > 0) return `${hours}小时前`
    if (minutes > 0) return `${minutes}分钟前`
    return '刚刚'
  }

  const tabs = [
    { id: 'create' as TabType, label: '创建房间', icon: Users },
    { id: 'join' as TabType, label: '加入房间', icon: UserPlus },
    { id: 'list' as TabType, label: '房间列表', icon: ListIcon },
  ]

  if (!isConnected) {
    return (
      <>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center max-w-md">
            <Video className="w-16 h-16 mx-auto mb-4 text-gray-400" />
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">观影室未连接</h2>
            <p className="text-gray-600 dark:text-gray-400 mb-4">请确认观影室功能已启用</p>
          </div>
        </div>
      </>
    )
  }

  return (
    <>
      <div className="flex flex-col gap-4 py-4 px-5 lg:px-12 2xl:px-20">
        <div className="py-1">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <h1 className="text-xl sm:text-2xl font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
              <Users className="w-5 h-5 sm:w-6 sm:h-6 text-indigo-500" />
              观影室
              {currentRoom && (
                <span className="text-xs sm:text-sm font-normal text-gray-500 dark:text-gray-400">
                  ({currentRoom.ownerId === currentUsername ? '房主' : '房员'})
                </span>
              )}
            </h1>
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
              <span className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">
                {isConnected ? '已连接' : '未连接'}
              </span>
            </div>
          </div>
          <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mt-1">与好友一起看视频，实时同步播放</p>
        </div>

        <div className="flex border-b border-gray-200 dark:border-gray-700 overflow-x-auto">
          {tabs.map((tab) => {
            const Icon = tab.icon
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-6 py-2.5 sm:py-3 text-xs sm:text-sm font-medium transition-colors relative whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'text-indigo-600 dark:text-indigo-400'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                }`}
              >
                <Icon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                {tab.label}
                {activeTab === tab.id && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-600 dark:bg-indigo-400" />
                )}
              </button>
            )
          })}
        </div>

        <div className="flex-1">
          {activeTab === 'create' && (
            <div className="max-w-2xl mx-auto py-8">
              <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg border border-gray-200 dark:border-gray-700">
                <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-6">创建新房间</h2>

                {currentRoom ? (
                  <div className="space-y-4">
                    <div className="bg-gradient-to-r from-indigo-500 to-purple-600 rounded-xl p-6 text-white">
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <h3 className="text-2xl font-bold mb-1">{currentRoom.name}</h3>
                          <p className="text-indigo-100 text-sm">{currentRoom.description || '暂无描述'}</p>
                        </div>
                        {currentRoom.ownerId === currentUsername && (
                          <span className="bg-yellow-400 text-yellow-900 px-3 py-1 rounded-full text-xs font-bold">房主</span>
                        )}
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 mt-4">
                        <div className="bg-white/10 backdrop-blur rounded-lg p-3">
                          <p className="text-indigo-100 text-xs mb-1">房间号</p>
                          <p className="text-lg sm:text-xl font-mono font-bold">{currentRoom.id}</p>
                        </div>
                        <div className="bg-white/10 backdrop-blur rounded-lg p-3">
                          <p className="text-indigo-100 text-xs mb-1">成员数</p>
                          <p className="text-lg sm:text-xl font-bold">{members.length} 人</p>
                        </div>
                      </div>
                    </div>

                    {currentRoom.currentState?.type === 'play' && (
                      <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-4">
                        <div className="flex items-center gap-2 mb-3">
                          <Play className="w-4 h-4 text-green-500" />
                          <h4 className="font-semibold text-gray-900 dark:text-gray-100">正在观看</h4>
                        </div>
                        <div
                          className="cursor-pointer"
                          onClick={() => {
                            const state = currentRoom.currentState as PlayState
                            const params = new URLSearchParams()
                            params.set('id', state.videoId)
                            params.set('source', state.source)
                            params.set('title', state.videoName)
                            if (state.videoYear) params.set('year', state.videoYear)
                            if (state.searchTitle) params.set('stitle', state.searchTitle)
                            if (state.episode !== undefined && state.episode !== null) {
                              params.set('index', state.episode.toString())
                            }
                            if (state.currentTime) params.set('t', state.currentTime.toString())
                            params.set('prefer', 'true')
                            navigate(`/play?${params.toString()}`)
                          }}
                        >
                          <MiniVideoCard state={currentRoom.currentState as PlayState} />
                        </div>
                      </div>
                    )}

                    {currentRoom.currentState?.type === 'live' && (
                      <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-4">
                        <div className="flex items-center gap-2 mb-3">
                          <Radio className="w-4 h-4 text-red-500" />
                          <h4 className="font-semibold text-gray-900 dark:text-gray-100">正在观看直播</h4>
                        </div>
                        <div
                          className="bg-white dark:bg-gray-800 rounded-lg p-4 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                          onClick={() => {
                            const state = currentRoom.currentState as LiveState
                            navigate(`/live?id=${state.channelId}&source=${state.channelUrl}`)
                          }}
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-12 h-12 bg-red-100 dark:bg-red-900/30 rounded-lg flex items-center justify-center">
                              <Radio className="w-6 h-6 text-red-500" />
                            </div>
                            <div>
                              <h5 className="font-medium text-gray-900 dark:text-gray-100">
                                {(currentRoom.currentState as LiveState).channelName}
                              </h5>
                              <p className="text-sm text-gray-500 dark:text-gray-400">点击加入观看</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-4">
                      <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-3">房间成员</h4>
                      <div className="space-y-2">
                        {members.map((member) => (
                          <div key={member.id} className="flex items-center justify-between bg-white dark:bg-gray-800 rounded-lg p-3">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-full bg-gradient-to-r from-indigo-400 to-purple-500 flex items-center justify-center text-white font-bold">
                                {member.name.charAt(0).toUpperCase()}
                              </div>
                              <span className="font-medium text-gray-900 dark:text-gray-100">{member.name}</span>
                            </div>
                            {member.isOwner && (
                              <span className="text-xs bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 px-2 py-1 rounded">房主</span>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>

                    <button
                      onClick={handleLeaveRoom}
                      className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800 rounded-xl hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
                    >
                      <LogOut className="w-4 h-4" />
                      {currentRoom.ownerId === currentUsername ? '解散房间' : '退出房间'}
                    </button>
                  </div>
                ) : (
                  <form onSubmit={handleCreateRoom} className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">房间名称 *</label>
                      <input
                        type="text"
                        value={createForm.roomName}
                        onChange={(e) => setCreateForm(prev => ({ ...prev, roomName: e.target.value }))}
                        placeholder="给房间起个名字"
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">房间描述</label>
                      <input
                        type="text"
                        value={createForm.description}
                        onChange={(e) => setCreateForm(prev => ({ ...prev, description: e.target.value }))}
                        placeholder="简单介绍一下"
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        <Lock className="w-3.5 h-3.5 inline mr-1" />房间密码（可选）
                      </label>
                      <input
                        type="password"
                        value={createForm.password}
                        onChange={(e) => setCreateForm(prev => ({ ...prev, password: e.target.value }))}
                        placeholder="留空则无密码"
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      />
                    </div>
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        id="isPublic"
                        checked={createForm.isPublic}
                        onChange={(e) => setCreateForm(prev => ({ ...prev, isPublic: e.target.checked }))}
                        className="rounded"
                      />
                      <label htmlFor="isPublic" className="text-sm text-gray-700 dark:text-gray-300">公开房间（在列表中显示）</label>
                    </div>
                    <button
                      type="submit"
                      disabled={createLoading}
                      className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors disabled:opacity-50"
                    >
                      {createLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Users className="w-4 h-4" />}
                      {createLoading ? '创建中...' : '创建房间'}
                    </button>
                  </form>
                )}
              </div>
            </div>
          )}

          {activeTab === 'join' && (
            <div className="max-w-2xl mx-auto py-8">
              <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg border border-gray-200 dark:border-gray-700">
                <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-6">加入房间</h2>
                <form onSubmit={handleJoinRoom} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">房间ID *</label>
                    <input
                      type="text"
                      value={joinForm.roomId}
                      onChange={(e) => setJoinForm(prev => ({ ...prev, roomId: e.target.value.toUpperCase() }))}
                      placeholder="输入房间号"
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white font-mono"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">房间密码（如有）</label>
                    <input
                      type="password"
                      value={joinForm.password}
                      onChange={(e) => setJoinForm(prev => ({ ...prev, password: e.target.value }))}
                      placeholder="留空则无密码"
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={joinLoading}
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-green-600 text-white rounded-xl hover:bg-green-700 transition-colors disabled:opacity-50"
                  >
                    {joinLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
                    {joinLoading ? '加入中...' : '加入房间'}
                  </button>
                </form>
              </div>
            </div>
          )}

          {activeTab === 'list' && (
            <div className="max-w-4xl mx-auto py-8">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">公开房间</h2>
                <button
                  onClick={loadRooms}
                  disabled={loading}
                  className="p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                >
                  <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                </button>
              </div>

              {loading ? (
                <div className="flex justify-center py-16">
                  <RefreshCw className="w-8 h-8 animate-spin text-indigo-500" />
                </div>
              ) : rooms.length === 0 ? (
                <div className="text-center py-16 text-gray-500 dark:text-gray-400">
                  <Video className="w-12 h-12 mx-auto mb-3 opacity-40" />
                  <p>暂无公开房间</p>
                </div>
              ) : (
                <div className="grid gap-3">
                  {rooms.map((room) => (
                    <div key={room.id} className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700 flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-gray-900 dark:text-gray-100 truncate">{room.name}</h3>
                          {!room.isPublic && <Lock className="w-3.5 h-3.5 text-gray-400 shrink-0" />}
                        </div>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5 truncate">{room.description || '暂无描述'}</p>
                        <div className="flex items-center gap-3 mt-1 text-xs text-gray-400 dark:text-gray-500">
                          <span>房主: {room.ownerName}</span>
                          <span>{room.memberCount} 人</span>
                          <span>{formatTime(room.createdAt)}</span>
                        </div>
                      </div>
                      <button
                        onClick={() => handleJoinFromList(room)}
                        className="ml-4 shrink-0 px-4 py-2 text-sm bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 rounded-lg hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-colors"
                      >
                        加入
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  )
}
