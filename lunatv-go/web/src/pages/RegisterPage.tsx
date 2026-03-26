import { AlertCircle, CheckCircle, Lock, Shield, Sparkles, User, UserPlus } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useSiteConfig } from '@/contexts/SiteContext'
import { CURRENT_VERSION } from '@/lib/version'

export default function RegisterPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { siteName } = useSiteConfig()

  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [shouldShowRegister, setShouldShowRegister] = useState(false)
  const [registrationDisabled, setRegistrationDisabled] = useState(false)
  const [disabledReason, setDisabledReason] = useState('')
  const [bingWallpaper, setBingWallpaper] = useState<string>('')

  useEffect(() => {
    fetch('/api/bing-wallpaper').then((r) => r.json()).then((d) => { if (d.url) setBingWallpaper(d.url) }).catch(() => {})
  }, [])

  useEffect(() => {
    const check = async () => {
      try {
        const res = await fetch('/api/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username: '', password: '', confirmPassword: '' }),
        })
        const data = await res.json()
        if (data.error === 'localStorage 模式不支持用户注册') { navigate('/login', { replace: true }); return }
        if (data.error === '管理员已关闭用户注册功能') {
          setRegistrationDisabled(true)
          setDisabledReason('管理员已关闭用户注册功能')
          setShouldShowRegister(true)
          return
        }
        setShouldShowRegister(true)
      } catch {
        setShouldShowRegister(true)
      }
    }
    check()
  }, [navigate])

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(null)
    setSuccess(null)
    if (!username || !password || !confirmPassword) { setError('请填写完整信息'); return }
    if (password !== confirmPassword) { setError('两次输入的密码不一致'); return }
    try {
      setLoading(true)
      const res = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password, confirmPassword }),
      })
      const data = await res.json()
      if (res.ok) {
        setSuccess('注册成功！正在跳转...')
        const delay = data.needDelay ? 2500 : 1500
        setTimeout(() => { navigate(searchParams.get('redirect') || '/', { replace: true }) }, delay)
      } else {
        setError(data.error ?? '注册失败')
      }
    } catch {
      setError('网络错误，请稍后重试')
    } finally {
      setLoading(false)
    }
  }

  if (!shouldShowRegister) return <div className="min-h-screen flex items-center justify-center"><div className="w-8 h-8 border-3 border-green-500 border-t-transparent rounded-full animate-spin" /></div>

  const bgStyle = bingWallpaper ? { backgroundImage: `url(${bingWallpaper})` } : {}

  if (registrationDisabled) {
    return (
      <div className="relative min-h-screen flex items-center justify-center px-4 overflow-hidden">
        {bingWallpaper && <div className="absolute inset-0 bg-cover bg-center" style={bgStyle} />}
        <div className="absolute inset-0 bg-gradient-to-br from-purple-600/40 via-blue-600/30 to-pink-500/40" />
        <div className="relative z-10 w-full max-w-md rounded-3xl bg-white/95 dark:bg-zinc-900/95 backdrop-blur-2xl shadow-2xl p-10 border border-white/50 dark:border-zinc-700/50 text-center space-y-6">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-yellow-500 to-orange-600 shadow-lg mx-auto">
            <AlertCircle className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-200">注册功能暂不可用</h2>
          <p className="text-gray-700 dark:text-gray-300 text-sm">{disabledReason}</p>
          <button onClick={() => navigate('/login')} className="w-full py-3.5 text-base font-semibold text-white bg-gradient-to-r from-green-600 to-emerald-600 rounded-xl hover:from-green-700 hover:to-emerald-700 transition-all">
            返回登录 →
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="relative min-h-screen flex items-center justify-center px-3 sm:px-4 py-8 sm:py-0 overflow-hidden">
      {bingWallpaper && <div className="absolute inset-0 bg-cover bg-center" style={bgStyle} />}
      <div className="absolute inset-0 bg-gradient-to-br from-purple-600/40 via-blue-600/30 to-pink-500/40 dark:from-purple-900/50 dark:via-blue-900/40 dark:to-pink-900/50" />
      <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-black/30" />

      <div className="relative z-10 w-full max-w-md rounded-2xl sm:rounded-3xl bg-white/95 dark:bg-zinc-900/95 backdrop-blur-2xl shadow-2xl p-6 sm:p-10 border border-white/50 dark:border-zinc-700/50">
        <div className="text-center mb-6 sm:mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 sm:w-16 sm:h-16 mb-3 sm:mb-4 rounded-xl sm:rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 shadow-lg shadow-blue-500/50">
            <UserPlus className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
          </div>
          <h1 className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 dark:from-blue-400 dark:via-indigo-400 dark:to-purple-400 tracking-tight text-3xl sm:text-4xl font-extrabold mb-2">
            {siteName}
          </h1>
          <p className="text-gray-600 dark:text-gray-400 text-xs sm:text-sm font-medium">创建您的新账户</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5">
          {[
            { id: 'username', label: '用户名', icon: User, type: 'text', placeholder: '3-20位字母数字下划线', value: username, onChange: setUsername, autoComplete: 'username' },
            { id: 'password', label: '密码', icon: Lock, type: 'password', placeholder: '至少6位字符', value: password, onChange: setPassword, autoComplete: 'new-password' },
            { id: 'confirmPassword', label: '确认密码', icon: Shield, type: 'password', placeholder: '再次输入密码', value: confirmPassword, onChange: setConfirmPassword, autoComplete: 'new-password' },
          ].map(({ id, label, icon: Icon, type, placeholder, value, onChange, autoComplete }) => (
            <div key={id} className="group">
              <label htmlFor={id} className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{label}</label>
              <div className="relative">
                <Icon className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  id={id}
                  type={type}
                  autoComplete={autoComplete}
                  className="block w-full pl-12 pr-4 py-3.5 rounded-xl border-0 bg-white/80 dark:bg-zinc-800/80 ring-2 ring-white/60 dark:ring-white/10 focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 outline-none sm:text-base text-gray-900 dark:text-gray-100 placeholder:text-gray-400 transition-all"
                  placeholder={placeholder}
                  value={value}
                  onChange={(e) => onChange(e.target.value)}
                />
              </div>
            </div>
          ))}

          {error && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/50">
              <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400 shrink-0" />
              <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
            </div>
          )}
          {success && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800/50">
              <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400 shrink-0" />
              <p className="text-sm text-green-600 dark:text-green-400">{success}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={!username || !password || !confirmPassword || loading || !!success}
            className="group relative inline-flex w-full justify-center items-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 py-3.5 text-base font-semibold text-white shadow-lg shadow-blue-500/30 transition-all duration-300 hover:shadow-xl hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50 overflow-hidden active:scale-95"
          >
            <UserPlus className="h-5 w-5" />
            {loading ? '注册中...' : success ? '注册成功，正在跳转...' : '立即注册'}
          </button>

          <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
            <p className="text-center text-gray-600 dark:text-gray-400 text-sm mb-3">已有账户？</p>
            <Link
              to="/login"
              className="group flex items-center justify-center gap-2 w-full px-6 py-2.5 rounded-lg bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border border-blue-200 dark:border-blue-800/50 text-blue-700 dark:text-blue-400 text-sm font-semibold hover:from-blue-100 hover:to-indigo-100 transition-all duration-300 hover:shadow-md"
            >
              <Lock className="w-4 h-4" />
              <span>立即登录</span>
              <span className="inline-block transition-transform group-hover:translate-x-1">→</span>
            </Link>
          </div>
        </form>
      </div>

      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-xs text-gray-500 dark:text-gray-400 font-mono">
        v{CURRENT_VERSION}
      </div>
    </div>
  )
}
