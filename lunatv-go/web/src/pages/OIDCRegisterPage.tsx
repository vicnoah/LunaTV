import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSiteConfig } from '@/contexts/SiteContext'
import { CURRENT_VERSION } from '@/lib/version'

export default function OIDCRegisterPage() {
  const navigate = useNavigate()
  const { siteName } = useSiteConfig()
  const [username, setUsername] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [oidcInfo, setOidcInfo] = useState<unknown>(null)

  useEffect(() => {
    fetch('/api/auth/oidc/session-info')
      .then((r) => {
        if (r.ok) return r.json()
        navigate('/login?error=' + encodeURIComponent('OIDC会话已过期'), { replace: true })
        return null
      })
      .then((data) => { if (data) setOidcInfo(data) })
      .catch(() => navigate('/login', { replace: true }))
  }, [navigate])

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(null)
    if (!username) { setError('请输入用户名'); return }
    try {
      setLoading(true)
      const res = await fetch('/api/auth/oidc/complete-register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username }),
      })
      if (res.ok) {
        const data = await res.json()
        setTimeout(() => navigate('/', { replace: true }), data.needDelay ? 1500 : 0)
      } else {
        const data = await res.json().catch(() => ({}))
        setError(data.error || '注册失败')
      }
    } catch {
      setError('网络错误，请稍后重试')
    } finally {
      setLoading(false)
    }
  }

  const info = oidcInfo as Record<string, unknown> | null

  if (!oidcInfo) {
    return (
      <div className="relative min-h-screen flex items-center justify-center px-3 sm:px-4">
        <div className="text-sm sm:text-base text-gray-500 dark:text-gray-400">加载中...</div>
      </div>
    )
  }

  return (
    <div className="relative min-h-screen flex items-center justify-center px-3 sm:px-4 py-8 sm:py-0 overflow-hidden">
      <div className="relative z-10 w-full max-w-md rounded-2xl sm:rounded-3xl bg-white/90 dark:bg-zinc-900/90 backdrop-blur-xl shadow-2xl p-6 sm:p-10 dark:border dark:border-zinc-800">
        <h1 className="text-green-600 tracking-tight text-center text-2xl sm:text-3xl font-extrabold mb-2">{siteName}</h1>
        <p className="text-center text-xs sm:text-sm text-gray-600 dark:text-gray-400 mb-6 sm:mb-8">完成OIDC注册</p>

        {info && (
          <div className="mb-5 sm:mb-6 p-3 sm:p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
            <p className="text-xs sm:text-sm text-blue-700 dark:text-blue-400 leading-relaxed">
              {!!info.email && <><span>邮箱: </span><strong className="break-all">{String(info.email)}</strong><br /></>}
              {!!info.name && <><span>名称: </span><strong className="break-all">{String(info.name)}</strong><br /></>}
              {info.trust_level !== undefined && <><span>信任等级: </span><strong>{String(info.trust_level)}</strong></>}
            </p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5 sm:space-y-6">
          <div>
            <label htmlFor="username" className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 sm:mb-2">
              选择用户名
            </label>
            <input
              id="username"
              type="text"
              autoComplete="username"
              className="block w-full rounded-lg border-0 py-2.5 sm:py-3 px-3 sm:px-4 bg-white/60 dark:bg-zinc-800/60 ring-1 ring-white/60 dark:ring-white/20 focus:ring-2 focus:ring-green-500 outline-none text-sm sm:text-base text-gray-900 dark:text-gray-100 placeholder:text-gray-500 dark:placeholder:text-gray-400 transition-all"
              placeholder="输入用户名（3-20位）"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
            <p className="mt-1.5 text-[11px] sm:text-xs text-gray-500 dark:text-gray-400">用户名只能包含字母、数字、下划线，长度3-20位</p>
          </div>

          {error && (
            <div className="p-2.5 sm:p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/50">
              <p className="text-xs sm:text-sm text-red-600 dark:text-red-400">{error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={!username || loading}
            className="inline-flex w-full justify-center rounded-lg bg-green-600 py-2.5 sm:py-3 text-sm sm:text-base font-semibold text-white shadow-lg transition-all duration-200 hover:bg-green-700 hover:shadow-xl hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50 active:scale-95"
          >
            {loading ? '注册中...' : '完成注册'}
          </button>

          <div className="text-center pt-2">
            <a href="/login" className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 transition-colors inline-flex items-center gap-1">
              <span>←</span>
              <span>返回登录</span>
            </a>
          </div>
        </form>

        <div className="mt-6 sm:mt-8 text-center text-[11px] sm:text-xs text-gray-500 dark:text-gray-400">
          v{CURRENT_VERSION}
        </div>
      </div>
    </div>
  )
}
