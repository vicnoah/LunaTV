/* eslint-disable @typescript-eslint/no-explicit-any */
import { AlertCircle, Lock, Send, Sparkles, User, UserPlus } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { api } from '@/api/client'
import { setToken, setCurrentUser } from '@/lib/auth'
import { useSiteConfig } from '@/contexts/SiteContext'
import { OIDCProviderLogo, detectProvider, getProviderButtonStyle, getProviderButtonText } from '@/components/OIDCProviderLogos'
import { CURRENT_VERSION } from '@/lib/version'

export default function LoginPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { siteName, shouldAskUsername } = useSiteConfig()

  const [password, setPassword] = useState('')
  const [username, setUsername] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [bingWallpaper, setBingWallpaper] = useState<string>('')

  const [telegramLoading, setTelegramLoading] = useState(false)
  const [telegramDeepLink, setTelegramDeepLink] = useState('')
  const [telegramEnabled, setTelegramEnabled] = useState(false)
  const [telegramUsername, setTelegramUsername] = useState('')

  const [oidcProviders, setOidcProviders] = useState<Array<{ id: string; name: string; buttonText: string; issuer: string }>>([])
  const [oidcEnabled, setOidcEnabled] = useState(false)
  const [oidcButtonText, setOidcButtonText] = useState('使用OIDC登录')
  const [oidcIssuer, setOidcIssuer] = useState<string>('')

  useEffect(() => {
    fetch('/api/bing-wallpaper')
      .then((r) => r.json())
      .then((data) => { if (data.url) setBingWallpaper(data.url) })
      .catch(() => {})
  }, [])

  useEffect(() => {
    fetch('/api/server-config')
      .then((r) => r.json())
      .then((data) => {
        if (data.TelegramAuthConfig?.enabled) setTelegramEnabled(true)
        if (data.OIDCProviders && data.OIDCProviders.length > 0) {
          setOidcProviders(data.OIDCProviders)
          setOidcEnabled(true)
        } else if (data.OIDCConfig?.enabled) {
          setOidcEnabled(true)
          setOidcButtonText(data.OIDCConfig.buttonText || '使用OIDC登录')
          setOidcIssuer(data.OIDCConfig.issuer || '')
        }
      })
      .catch(() => {})
  }, [])

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(null)
    if (!password || (shouldAskUsername && !username)) return

    try {
      setLoading(true)
      const data = await api.post<{ token: string; user: any }>('/api/login', {
        password,
        ...(shouldAskUsername ? { username } : {}),
      })
      setToken(data.token)
      setCurrentUser(data.user)
      const redirect = searchParams.get('redirect') || '/'
      navigate(redirect, { replace: true })
    } catch (err: any) {
      setError(err.status === 401 ? '密码错误' : (err.message || '服务器错误'))
    } finally {
      setLoading(false)
    }
  }

  const handleTelegramLogin = async () => {
    setError(null)
    if (!telegramUsername.trim()) { setError('请输入您的 Telegram 用户名'); return }
    setTelegramLoading(true)
    try {
      const res = await fetch('/api/telegram/send-magic-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ telegramUsername: telegramUsername.trim() }),
      })
      const data = await res.json()
      if (res.ok && data.deepLink) {
        setTelegramDeepLink(data.deepLink)
        window.open(data.deepLink, '_blank')
      } else {
        setError(data.error || '生成链接失败，请重试')
      }
    } catch {
      setError('网络错误，请稍后重试')
    } finally {
      setTelegramLoading(false)
    }
  }

  return (
    <div className="relative min-h-screen flex items-center justify-center px-3 sm:px-4 py-8 sm:py-0 overflow-hidden">
      {bingWallpaper && (
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat transition-opacity duration-1000"
          style={{ backgroundImage: `url(${bingWallpaper})` }}
        />
      )}
      <div className="absolute inset-0 bg-gradient-to-br from-purple-600/40 via-blue-600/30 to-pink-500/40 dark:from-purple-900/50 dark:via-blue-900/40 dark:to-pink-900/50" />
      <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-black/30" />

      <div className="relative z-10 w-full max-w-md rounded-2xl sm:rounded-3xl bg-white/95 dark:bg-zinc-900/95 backdrop-blur-2xl shadow-[0_20px_80px_rgba(0,0,0,0.3)] p-6 sm:p-10 border border-white/50 dark:border-zinc-700/50">
        <div className="absolute -top-20 -left-20 w-40 h-40 bg-gradient-to-br from-purple-400/30 to-pink-400/30 rounded-full blur-3xl" />
        <div className="absolute -bottom-20 -right-20 w-40 h-40 bg-gradient-to-br from-blue-400/30 to-cyan-400/30 rounded-full blur-3xl" />

        <div className="text-center mb-6 sm:mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 sm:w-16 sm:h-16 mb-3 sm:mb-4 rounded-xl sm:rounded-2xl bg-gradient-to-br from-green-500 to-emerald-600 shadow-lg shadow-green-500/50">
            <Sparkles className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
          </div>
          <h1 className="text-transparent bg-clip-text bg-gradient-to-r from-green-600 via-emerald-600 to-teal-600 dark:from-green-400 dark:via-emerald-400 dark:to-teal-400 tracking-tight text-3xl sm:text-4xl font-extrabold mb-2">
            {siteName}
          </h1>
          <p className="text-gray-600 dark:text-gray-400 text-xs sm:text-sm font-medium">欢迎回来，请登录您的账户</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
          {shouldAskUsername && (
            <div className="group">
              <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 sm:mb-2">用户名</label>
              <div className="relative">
                <User className="absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 h-4 w-4 sm:h-5 sm:w-5 text-gray-400" />
                <input
                  type="text"
                  autoComplete="username"
                  className="block w-full pl-10 sm:pl-12 pr-3 sm:pr-4 py-2.5 sm:py-3.5 rounded-lg sm:rounded-xl border-0 bg-white/80 dark:bg-zinc-800/80 ring-2 ring-white/60 dark:ring-white/10 focus:ring-2 focus:ring-green-500 dark:focus:ring-green-400 outline-none text-sm sm:text-base text-gray-900 dark:text-gray-100 placeholder:text-gray-400 transition-all"
                  placeholder="请输入用户名"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                />
              </div>
            </div>
          )}

          <div className="group">
            <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 sm:mb-2">密码</label>
            <div className="relative">
              <Lock className="absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 h-4 w-4 sm:h-5 sm:w-5 text-gray-400" />
              <input
                type="password"
                autoComplete="current-password"
                className="block w-full pl-10 sm:pl-12 pr-3 sm:pr-4 py-2.5 sm:py-3.5 rounded-lg sm:rounded-xl border-0 bg-white/80 dark:bg-zinc-800/80 ring-2 ring-white/60 dark:ring-white/10 focus:ring-2 focus:ring-green-500 dark:focus:ring-green-400 outline-none text-sm sm:text-base text-gray-900 dark:text-gray-100 placeholder:text-gray-400 transition-all"
                placeholder="请输入访问密码"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          {error && (
            <div className="flex items-center gap-2 p-2.5 sm:p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/50">
              <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400 shrink-0" />
              <p className="text-xs sm:text-sm text-red-600 dark:text-red-400">{error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={!password || loading || (shouldAskUsername && !username)}
            className="group relative inline-flex w-full justify-center items-center gap-1.5 sm:gap-2 rounded-lg sm:rounded-xl bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 py-2.5 sm:py-3.5 text-sm sm:text-base font-semibold text-white shadow-lg shadow-green-500/30 transition-all duration-300 hover:shadow-xl hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0 overflow-hidden active:scale-95"
          >
            <Lock className="h-4 w-4 sm:h-5 sm:w-5" />
            {loading ? '登录中...' : '立即登录'}
          </button>

          {shouldAskUsername && (
            <div className="mt-4 sm:mt-6 pt-4 sm:pt-6 border-t border-gray-200 dark:border-gray-700">
              <p className="text-center text-gray-600 dark:text-gray-400 text-xs sm:text-sm mb-2.5 sm:mb-3">还没有账户？</p>
              <Link
                to="/register"
                className="group flex items-center justify-center gap-1.5 sm:gap-2 w-full px-4 sm:px-6 py-2 sm:py-2.5 rounded-lg bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border border-green-200 dark:border-green-800/50 text-green-700 dark:text-green-400 text-xs sm:text-sm font-semibold hover:from-green-100 hover:to-emerald-100 transition-all duration-300 hover:shadow-md"
              >
                <UserPlus className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                <span>立即注册</span>
                <span className="inline-block transition-transform group-hover:translate-x-1">→</span>
              </Link>
            </div>
          )}
        </form>

        {telegramEnabled && (
          <div className="mt-4 sm:mt-6 pt-4 sm:pt-6 border-t border-gray-200 dark:border-gray-700">
            <p className="text-center text-gray-600 dark:text-gray-400 text-xs sm:text-sm mb-3 sm:mb-4">或使用 Telegram 登录</p>
            <div className="mb-3 sm:mb-4">
              <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 sm:mb-2">Telegram 用户名</label>
              <div className="relative">
                <Send className="absolute left-2.5 sm:left-3 top-1/2 -translate-y-1/2 h-4 w-4 sm:h-5 sm:w-5 text-gray-400" />
                <input
                  type="text"
                  value={telegramUsername}
                  onChange={(e) => setTelegramUsername(e.target.value)}
                  placeholder="输入您的 Telegram 用户名"
                  className="block w-full pl-9 sm:pl-10 pr-2.5 sm:pr-3 py-2.5 sm:py-3 border border-gray-300 dark:border-gray-600 rounded-lg sm:rounded-xl bg-white/80 dark:bg-gray-700 text-sm sm:text-base text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                  disabled={telegramLoading}
                />
              </div>
            </div>
            <button
              onClick={handleTelegramLogin}
              disabled={telegramLoading || !telegramUsername.trim()}
              className="group relative inline-flex w-full justify-center items-center gap-1.5 sm:gap-2 rounded-lg sm:rounded-xl bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 py-2.5 sm:py-3.5 text-sm sm:text-base font-semibold text-white shadow-lg shadow-blue-500/30 transition-all duration-300 hover:shadow-xl hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50 overflow-hidden active:scale-95"
            >
              <Send className="h-4 w-4 sm:h-5 sm:w-5" />
              {telegramLoading ? '正在打开 Telegram...' : '通过 Telegram 登录'}
            </button>
            {telegramDeepLink && (
              <div className="mt-3 sm:mt-4 p-3 sm:p-4 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800/50">
                <p className="text-xs sm:text-sm text-blue-800 dark:text-blue-200 mb-1.5 sm:mb-2">📱 已在新标签页打开 Telegram</p>
                <p className="text-[11px] sm:text-xs text-blue-600 dark:text-blue-300">
                  如果没有自动打开，请点击{' '}
                  <a href={telegramDeepLink} target="_blank" rel="noopener noreferrer" className="underline font-semibold">这里</a>
                </p>
              </div>
            )}
          </div>
        )}

        {oidcEnabled && shouldAskUsername && (
          <div className="mt-4 sm:mt-6 pt-4 sm:pt-6 border-t border-gray-200 dark:border-gray-700">
            <div className="relative mb-3 sm:mb-4">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300 dark:border-gray-600" />
              </div>
              <div className="relative flex justify-center text-xs sm:text-sm">
                <span className="px-2 bg-white/60 dark:bg-zinc-900/60 text-gray-500 dark:text-gray-400">或</span>
              </div>
            </div>
            {oidcProviders.length > 0 ? (
              <div className="space-y-2.5 sm:space-y-3">
                {oidcProviders.map((provider) => {
                  const pid = provider.id.toLowerCase()
                  const det = ['google', 'github', 'microsoft', 'facebook', 'wechat', 'apple', 'linuxdo'].includes(pid)
                    ? (pid as any)
                    : detectProvider(provider.issuer || provider.buttonText)
                  const style = getProviderButtonStyle(det)
                  const custom = provider.buttonText !== '使用OIDC登录' ? provider.buttonText : undefined
                  return (
                    <button
                      key={provider.id}
                      type="button"
                      onClick={() => { window.location.href = `/api/auth/oidc/login?provider=${provider.id}` }}
                      className={`w-full inline-flex justify-center items-center rounded-lg py-2.5 sm:py-3 text-sm sm:text-base font-semibold shadow-sm transition-all duration-200 active:scale-95 ${style}`}
                    >
                      <OIDCProviderLogo provider={det} />
                      <span className="ml-2">{getProviderButtonText(det, custom)}</span>
                    </button>
                  )
                })}
              </div>
            ) : (
              (() => {
                const det = detectProvider(oidcIssuer || oidcButtonText)
                return (
                  <button
                    type="button"
                    onClick={() => { window.location.href = '/api/auth/oidc/login' }}
                    className={`mt-3 sm:mt-4 w-full inline-flex justify-center items-center rounded-lg py-2.5 sm:py-3 text-sm sm:text-base font-semibold shadow-sm transition-all duration-200 active:scale-95 ${getProviderButtonStyle(det)}`}
                  >
                    <OIDCProviderLogo provider={det} />
                    <span className="ml-2">{getProviderButtonText(det, oidcButtonText !== '使用OIDC登录' ? oidcButtonText : undefined)}</span>
                  </button>
                )
              })()
            )}
          </div>
        )}
      </div>

      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-xs text-gray-500 dark:text-gray-400 font-mono">
        v{CURRENT_VERSION}
      </div>
    </div>
  )
}
