/* eslint-disable @typescript-eslint/no-explicit-any */
import { useCallback, useEffect, useState } from 'react'
import { ChevronUp, RefreshCw } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { getCurrentUser } from '@/lib/auth'
import type { PlayRecord, UserPlayStat } from '@/types'

// User level system
const USER_LEVELS = [
  { level: 1, name: '新星观众', icon: '🌟', minLogins: 1, maxLogins: 9, description: '刚刚开启观影之旅', gradient: 'from-slate-400 to-slate-600' },
  { level: 2, name: '常客影迷', icon: '🎬', minLogins: 10, maxLogins: 49, description: '热爱电影的观众', gradient: 'from-blue-400 to-blue-600' },
  { level: 3, name: '资深观众', icon: '📺', minLogins: 50, maxLogins: 199, description: '对剧集有独特品味', gradient: 'from-emerald-400 to-emerald-600' },
  { level: 4, name: '影院达人', icon: '🎭', minLogins: 200, maxLogins: 499, description: '深度电影爱好者', gradient: 'from-violet-400 to-violet-600' },
  { level: 5, name: '观影专家', icon: '🏆', minLogins: 500, maxLogins: 999, description: '拥有丰富观影经验', gradient: 'from-amber-400 to-amber-600' },
  { level: 6, name: '传奇影神', icon: '👑', minLogins: 1000, maxLogins: 2999, description: '影视界的传奇人物', gradient: 'from-red-400 via-red-500 to-red-600' },
  { level: 7, name: '殿堂影帝', icon: '💎', minLogins: 3000, maxLogins: 9999, description: '影视殿堂的至尊', gradient: 'from-pink-400 via-pink-500 to-pink-600' },
  { level: 8, name: '永恒之光', icon: '✨', minLogins: 10000, maxLogins: Infinity, description: '永恒闪耀的观影之光', gradient: 'from-indigo-400 via-purple-500 to-pink-500' },
]

function calculateUserLevel(loginCount: number) {
  if (loginCount === 0) return { level: 0, name: '待激活', icon: '💤', minLogins: 0, maxLogins: 0, description: '尚未开始观影之旅', gradient: 'from-gray-400 to-gray-500' }
  for (const level of USER_LEVELS) {
    if (loginCount >= level.minLogins && loginCount <= level.maxLogins) return level
  }
  return USER_LEVELS[USER_LEVELS.length - 1]
}

function formatLoginDisplay(loginCount: number) {
  const userLevel = calculateUserLevel(loginCount)
  return {
    isSimple: false,
    level: userLevel,
    displayCount: loginCount === 0 ? '0' : loginCount > 10000 ? '10000+' : loginCount > 1000 ? `${Math.floor(loginCount / 1000)}k+` : loginCount.toString(),
  }
}

function formatTime(seconds: number): string {
  if (seconds === 0) return '00:00'
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const secs = Math.round(seconds % 60)
  if (hours === 0) return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
}

function formatDateTime(timestamp: number): string {
  if (!timestamp) return '未知时间'
  const date = new Date(timestamp)
  if (isNaN(date.getTime())) return '时间格式错误'
  return date.toLocaleString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })
}

function getProgressPercentage(playTime: number, totalTime: number): number {
  if (!totalTime || totalTime === 0) return 0
  return Math.min(Math.round((playTime / totalTime) * 100), 100)
}

export default function PlayStatsPage() {
  const navigate = useNavigate()
  const [expandedUsers, setExpandedUsers] = useState<Set<string>>(new Set())
  const [authInfo, setAuthInfo] = useState<{ username?: string; role?: string } | null>(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [showBackToTop, setShowBackToTop] = useState(false)
  const [activeTab, setActiveTab] = useState<'admin' | 'personal'>('admin')

  const [statsData, setStatsData] = useState<any>(null)
  const [userStats, setUserStats] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const user = getCurrentUser()
    if (!user || !user.username) { navigate('/login'); return }
    setAuthInfo(user)
    const adminRole = user.role === 'admin' || user.role === 'owner'
    setIsAdmin(adminRole)
  }, [navigate])

  const fetchData = useCallback(async () => {
    if (!authInfo) return
    setLoading(true)
    setError(null)
    try {
      const [userRes, adminRes] = await Promise.all([
        fetch('/api/play-stats/user'),
        isAdmin ? fetch('/api/admin/play-stats') : Promise.resolve(null),
      ])
      if (userRes.ok) {
        const data = await userRes.json()
        setUserStats(data.data || data)
      }
      if (adminRes?.ok) {
        const data = await adminRes.json()
        setStatsData(data.data || data)
      }
    } catch (e: any) {
      setError(e.message || '加载失败')
    } finally {
      setLoading(false)
    }
  }, [authInfo, isAdmin])

  useEffect(() => { if (authInfo) fetchData() }, [authInfo, fetchData])

  useEffect(() => {
    const handleScroll = () => setShowBackToTop(window.scrollY > 300)
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const toggleUserExpanded = (username: string) => {
    setExpandedUsers((prev) => {
      const s = new Set(prev)
      if (s.has(username)) s.delete(username)
      else s.add(username)
      return s
    })
  }

  const handlePlayRecord = (record: PlayRecord) => {
    const searchTitle = record.search_title || record.title
    const params = new URLSearchParams({ title: record.title, year: record.year, stitle: searchTitle, stype: record.total_episodes > 1 ? 'tv' : 'movie' })
    navigate(`/play?${params.toString()}`)
  }

  if (!authInfo) return null

  const myUserStat = userStats as UserPlayStat | null
  const loginDisplay = myUserStat?.loginDays !== undefined ? formatLoginDisplay(myUserStat.loginDays) : null

  return (
    <>
      <div className="max-w-screen-xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">播放统计</h1>
          <button onClick={fetchData} disabled={loading} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors">
            <RefreshCw className={`w-5 h-5 text-gray-600 dark:text-gray-400 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {isAdmin && (
          <div className="flex gap-2 mb-6 border-b border-gray-200 dark:border-gray-700">
            {(['admin', 'personal'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-2 text-sm font-medium relative ${activeTab === tab ? 'text-blue-600 dark:text-blue-400' : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'}`}
              >
                {tab === 'admin' ? '所有用户' : '我的统计'}
                {activeTab === tab && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 dark:bg-blue-400" />}
              </button>
            ))}
          </div>
        )}

        {loading && (
          <div className="flex justify-center py-16">
            <div className="animate-spin h-8 w-8 border-2 border-blue-500 border-t-transparent rounded-full" />
          </div>
        )}

        {error && (
          <div className="text-center py-8 text-red-500">{error}</div>
        )}

        {!loading && !error && ((!isAdmin || activeTab === 'personal') && myUserStat) && (
          <div className="space-y-6">
            {/* User level card */}
            {loginDisplay && (
              <div className={`bg-gradient-to-r ${loginDisplay.level.gradient} rounded-xl p-6 text-white`}>
                <div className="flex items-center gap-4">
                  <div className="text-5xl">{loginDisplay.level.icon}</div>
                  <div>
                    <div className="text-2xl font-bold">{loginDisplay.level.name}</div>
                    <div className="text-white/80 text-sm mt-1">{loginDisplay.level.description}</div>
                    <div className="text-white/80 text-xs mt-1">登录天数: {loginDisplay.displayCount}</div>
                  </div>
                </div>
              </div>
            )}

            {/* Stats cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
                <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">总播放次数</div>
                <div className="text-2xl font-bold text-gray-900 dark:text-white">{myUserStat.totalPlays || 0}</div>
              </div>
              <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
                <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">总观看时长</div>
                <div className="text-2xl font-bold text-gray-900 dark:text-white">{formatTime(myUserStat.totalWatchTime || 0)}</div>
              </div>
              <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
                <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">平均时长</div>
                <div className="text-2xl font-bold text-gray-900 dark:text-white">{formatTime(myUserStat.avgWatchTime || 0)}</div>
              </div>
              <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
                <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">最常用源</div>
                <div className="text-lg font-bold text-gray-900 dark:text-white truncate">{myUserStat.mostWatchedSource || '-'}</div>
              </div>
            </div>

            {/* Recent records */}
            {myUserStat.recentRecords?.length > 0 && (
              <div>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">最近播放</h2>
                <div className="space-y-2">
                  {myUserStat.recentRecords.map((record, idx) => (
                    <div
                      key={idx}
                      className="bg-white dark:bg-gray-800 rounded-lg p-3 border border-gray-200 dark:border-gray-700 cursor-pointer hover:border-blue-300 dark:hover:border-blue-700 transition-colors"
                      onClick={() => handlePlayRecord(record)}
                    >
                      <div className="flex items-center gap-3">
                        <img
                          src={record.cover}
                          alt={record.title}
                          className="w-12 h-16 object-cover rounded shrink-0"
                          onError={(e) => { (e.target as HTMLImageElement).src = '/placeholder-cover.jpg' }}
                        />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-gray-900 dark:text-white truncate">{record.title}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                            {record.year} · {record.source_name}
                            {record.total_episodes > 1 && ` · 第${record.index}集`}
                          </p>
                          <div className="mt-1.5">
                            <div className="flex items-center gap-2">
                              <div className="flex-1 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-blue-500 rounded-full"
                                  style={{ width: `${getProgressPercentage(record.play_time, record.total_time)}%` }}
                                />
                              </div>
                              <span className="text-xs text-gray-400">{getProgressPercentage(record.play_time, record.total_time)}%</span>
                            </div>
                          </div>
                        </div>
                        <div className="text-xs text-gray-400 shrink-0 text-right">
                          <div>{formatTime(record.play_time)}</div>
                          <div className="mt-1">{formatDateTime(record.save_time)}</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {!loading && !error && isAdmin && activeTab === 'admin' && statsData && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
              <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
                <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">用户数</div>
                <div className="text-2xl font-bold text-gray-900 dark:text-white">{statsData.users?.length || 0}</div>
              </div>
              <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
                <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">总播放</div>
                <div className="text-2xl font-bold text-gray-900 dark:text-white">
                  {(statsData.users || []).reduce((sum: number, u: UserPlayStat) => sum + (u.totalPlays || 0), 0)}
                </div>
              </div>
            </div>

            {(statsData.users || []).map((user: UserPlayStat) => (
              <div key={user.username} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                <button
                  className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                  onClick={() => toggleUserExpanded(user.username)}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-gradient-to-r from-blue-400 to-indigo-500 flex items-center justify-center text-white font-bold text-sm">
                      {user.username.charAt(0).toUpperCase()}
                    </div>
                    <div className="text-left">
                      <p className="font-medium text-gray-900 dark:text-white">{user.username}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {user.totalPlays} 次播放 · {formatTime(user.totalWatchTime)}
                        {user.loginDays !== undefined && ` · 登录${user.loginDays}天`}
                      </p>
                    </div>
                  </div>
                  <ChevronUp className={`w-4 h-4 text-gray-400 transition-transform ${expandedUsers.has(user.username) ? 'rotate-0' : 'rotate-180'}`} />
                </button>

                {expandedUsers.has(user.username) && user.recentRecords?.length > 0 && (
                  <div className="border-t border-gray-200 dark:border-gray-700 p-4 space-y-2">
                    {user.recentRecords.slice(0, 5).map((record, idx) => (
                      <div key={idx} className="flex items-center gap-3">
                        <img
                          src={record.cover}
                          alt={record.title}
                          className="w-10 h-14 object-cover rounded shrink-0"
                          onError={(e) => { (e.target as HTMLImageElement).src = '/placeholder-cover.jpg' }}
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{record.title}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">{record.year} · {record.source_name}</p>
                          <div className="mt-1 h-1 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                            <div className="h-full bg-blue-500 rounded-full" style={{ width: `${getProgressPercentage(record.play_time, record.total_time)}%` }} />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {showBackToTop && (
        <button
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          className="fixed bottom-20 right-6 z-30 flex items-center justify-center w-10 h-10 bg-blue-600 text-white rounded-full shadow-lg hover:bg-blue-700 transition-colors"
        >
          <ChevronUp className="h-5 w-5" />
        </button>
      )}
    </>
  )
}
