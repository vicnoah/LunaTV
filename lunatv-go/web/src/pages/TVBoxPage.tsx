/* eslint-disable @typescript-eslint/no-explicit-any */
import { AlertTriangle, Monitor, Tv, Activity, Heart, Wrench, Globe, Zap, CheckCircle2, XCircle, Clock, Search } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'

interface SecurityConfig {
  enableAuth: boolean
  token: string
  enableIpWhitelist: boolean
  allowedIPs: string[]
  enableRateLimit: boolean
  rateLimit: number
}

interface Source {
  key: string
  name: string
}

interface DiagnosisResult {
  spider?: string
  spiderReachable?: boolean
  sitesCount?: number
  livesCount?: number
  parsesCount?: number
  issues?: string[]
  pass?: boolean
  error?: string
}

interface SmartHealthResult {
  success: boolean
  timestamp: number
  executionTime: number
  network: { environment: 'domestic' | 'international'; region: string; detectionMethod: string; optimized: boolean }
  spider: { current: { success: boolean; source: string; size: number; md5: string; cached: boolean; tried_sources: number }; cached: any }
  reachability: {
    total_tested: number; successful: number; health_score: number
    tests: Array<{ url: string; success: boolean; responseTime: number; statusCode?: number; error?: string; size?: number }>
  }
  recommendations: string[]
  status: { overall: 'excellent' | 'good' | 'needs_attention'; spider_available: boolean; network_stable: boolean; recommendations_count: number }
  error?: string
}

export default function TVBoxPage() {
  const [copied, setCopied] = useState(false)
  const [format, setFormat] = useState<'json' | 'base64'>('json')
  const [configMode, setConfigMode] = useState<'standard' | 'safe' | 'fast' | 'yingshicang'>('standard')
  const [enableAdultFilter, setEnableAdultFilter] = useState(true)
  const [enableSmartProxy, setEnableSmartProxy] = useState(true)
  const [enableStrictMode, setEnableStrictMode] = useState(false)
  const [securityConfig, setSecurityConfig] = useState<SecurityConfig | null>(null)
  const [siteName, setSiteName] = useState('LunaTV')
  const [loading, setLoading] = useState(true)
  const [diagnosing, setDiagnosing] = useState(false)
  const [diagnosisResult, setDiagnosisResult] = useState<DiagnosisResult | null>(null)
  const [refreshingJar, setRefreshingJar] = useState(false)
  const [jarRefreshMsg, setJarRefreshMsg] = useState<string | null>(null)
  const [userToken, setUserToken] = useState('')
  const [allSources, setAllSources] = useState<Source[]>([])
  const [smartHealthResult, setSmartHealthResult] = useState<SmartHealthResult | null>(null)
  const [smartHealthLoading, setSmartHealthLoading] = useState(false)
  const [activeTab, setActiveTab] = useState<'basic' | 'smart-health' | 'diagnose'>('basic')

  const fetchSecurityConfig = useCallback(async () => {
    try {
      const response = await fetch('/api/tvbox-config')
      if (response.ok) {
        const data = await response.json()
        setSecurityConfig(data.securityConfig || null)
        setSiteName(data.siteName || 'LunaTV')
        setUserToken(data.userToken || '')
        setAllSources(data.allSources || [])
      }
    } catch { /* ignore */ } finally { setLoading(false) }
  }, [])

  useEffect(() => { fetchSecurityConfig() }, [fetchSecurityConfig])

  const getConfigUrl = useCallback(() => {
    const baseUrl = window.location.origin
    const params = new URLSearchParams()
    params.append('format', format)
    if (userToken) params.append('token', userToken)
    else if (securityConfig?.enableAuth && securityConfig.token) params.append('token', securityConfig.token)
    if (configMode !== 'standard') params.append('mode', configMode)
    if (!enableAdultFilter) params.append('filter', 'off')
    if (!enableSmartProxy) params.append('proxy', 'off')
    if (enableStrictMode) params.append('strict', '1')
    return `${baseUrl}/api/tvbox?${params.toString()}`
  }, [format, configMode, securityConfig, userToken, enableAdultFilter, enableSmartProxy, enableStrictMode])

  const copyToClipboard = async (text: string) => {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text)
      } else {
        const el = document.createElement('textarea')
        el.value = text
        el.style.position = 'fixed'
        el.style.left = '-999999px'
        document.body.appendChild(el)
        el.focus()
        el.select()
        try { document.execCommand('copy') } finally { el.remove() }
      }
      return true
    } catch { return false }
  }

  const handleCopy = async () => {
    const success = await copyToClipboard(getConfigUrl())
    if (success) { setCopied(true); setTimeout(() => setCopied(false), 2000) }
  }

  const handleDiagnose = async () => {
    setDiagnosing(true)
    setDiagnosisResult(null)
    try {
      const params = new URLSearchParams()
      if (securityConfig?.enableAuth && securityConfig.token) params.append('token', securityConfig.token)
      const response = await fetch(`/api/tvbox/diagnose?${params.toString()}`)
      const data = await response.json()
      setDiagnosisResult(data)
    } catch { setDiagnosisResult({ error: '诊断失败，请稍后重试' }) } finally { setDiagnosing(false) }
  }

  const handleRefreshJar = async () => {
    setRefreshingJar(true)
    setJarRefreshMsg(null)
    try {
      const response = await fetch('/api/tvbox/spider-status', { method: 'POST' })
      const data = await response.json()
      if (data.success) setJarRefreshMsg(`✓ JAR 缓存已刷新 (${data.jar_status?.source?.split('/').pop()})`)
      else setJarRefreshMsg(`✗ 刷新失败: ${data.error}`)
    } catch { setJarRefreshMsg('✗ 刷新失败，请稍后重试') } finally {
      setRefreshingJar(false)
      setTimeout(() => setJarRefreshMsg(null), 5000)
    }
  }

  const handleSmartHealthCheck = async () => {
    setSmartHealthLoading(true)
    setSmartHealthResult(null)
    try {
      const response = await fetch('/api/tvbox/smart-health')
      const data = await response.json()
      setSmartHealthResult(data)
    } catch { setSmartHealthResult({ success: false, error: '智能健康检查失败，请稍后重试' } as SmartHealthResult) } finally {
      setSmartHealthLoading(false)
    }
  }

  const configUrl = getConfigUrl()

  const tabs = [
    { id: 'basic' as const, label: '基本配置', icon: Tv },
    { id: 'smart-health' as const, label: '智能检测', icon: Activity },
    { id: 'diagnose' as const, label: '诊断工具', icon: Wrench },
  ]

  return (
    <>
      <div className="max-w-4xl mx-auto p-4 md:p-6">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="flex items-center justify-center w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-xl">
              <Tv className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">TVBox 配置</h1>
              <p className="text-gray-600 dark:text-gray-400">将 {siteName} 的视频源导入到 TVBox 应用中使用</p>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-6 border-b border-gray-200 dark:border-gray-700">
          {tabs.map((tab) => {
            const Icon = tab.icon
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium relative transition-colors ${
                  activeTab === tab.id ? 'text-blue-600 dark:text-blue-400' : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
                {activeTab === tab.id && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 dark:bg-blue-400" />}
              </button>
            )
          })}
        </div>

        {/* Basic config tab */}
        {activeTab === 'basic' && (
          <div className="space-y-6">
            {/* Feature toggles */}
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg p-4">
              <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-3 flex items-center gap-2">
                <Search className="w-4 h-4" />
                智能搜索和内容过滤
              </h3>
              <div className="space-y-3">
                {[
                  { label: '内容过滤', desc: '过滤成人内容', value: enableAdultFilter, setter: setEnableAdultFilter },
                  { label: '智能搜索', desc: '使用智能代理搜索', value: enableSmartProxy, setter: setEnableSmartProxy },
                  { label: '严格模式', desc: '严格内容过滤', value: enableStrictMode, setter: setEnableStrictMode },
                ].map((item) => (
                  <div key={item.label} className="flex items-center justify-between">
                    <div>
                      <span className="text-sm font-medium text-gray-800 dark:text-gray-200">{item.label}</span>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{item.desc}</p>
                    </div>
                    <button
                      onClick={() => item.setter(!item.value)}
                      className={`w-10 h-5 rounded-full transition-colors ${item.value ? 'bg-blue-500' : 'bg-gray-300 dark:bg-gray-600'}`}
                    >
                      <div className={`w-4 h-4 bg-white rounded-full shadow transition-transform mx-0.5 ${item.value ? 'translate-x-5' : 'translate-x-0'}`} />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Format and mode */}
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-3">配置选项</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">输出格式</label>
                  <select
                    value={format}
                    onChange={(e) => setFormat(e.target.value as 'json' | 'base64')}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                  >
                    <option value="json">JSON</option>
                    <option value="base64">Base64</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">配置模式</label>
                  <select
                    value={configMode}
                    onChange={(e) => setConfigMode(e.target.value as any)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                  >
                    <option value="standard">标准模式</option>
                    <option value="safe">安全模式</option>
                    <option value="fast">高速模式</option>
                    <option value="yingshicang">影视仓模式</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Config URL */}
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-3">配置地址</h3>
              {loading ? (
                <div className="text-gray-500 dark:text-gray-400 text-sm">加载中...</div>
              ) : (
                <>
                  <div className="flex items-center gap-2 mb-3">
                    <input
                      type="text"
                      readOnly
                      value={configUrl}
                      className="flex-1 px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-700 dark:text-gray-300"
                    />
                    <button
                      onClick={handleCopy}
                      className={`shrink-0 px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                        copied ? 'bg-green-600 text-white' : 'bg-blue-600 text-white hover:bg-blue-700'
                      }`}
                    >
                      {copied ? '已复制' : '复制'}
                    </button>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">将此地址填入 TVBox 的订阅/配置地址栏</p>
                </>
              )}
            </div>

            {/* Security info */}
            {securityConfig && (
              <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
                <h3 className="font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                  <Monitor className="w-4 h-4" />安全配置
                </h3>
                <div className="space-y-2">
                  {[
                    { label: 'Token 验证', value: securityConfig.enableAuth },
                    { label: 'IP 白名单', value: securityConfig.enableIpWhitelist },
                    { label: '访问限速', value: securityConfig.enableRateLimit },
                  ].map((item) => (
                    <div key={item.label} className="flex items-center justify-between text-sm">
                      <span className="text-gray-600 dark:text-gray-400">{item.label}</span>
                      <span className={item.value ? 'text-green-600 dark:text-green-400' : 'text-gray-400'}>
                        {item.value ? '已启用' : '未启用'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Smart health tab */}
        {activeTab === 'smart-health' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-gray-600 dark:text-gray-400 text-sm">检测网络环境和 JAR 文件可用性</p>
              <button
                onClick={handleSmartHealthCheck}
                disabled={smartHealthLoading}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 text-sm"
              >
                {smartHealthLoading ? <Activity className="w-4 h-4 animate-pulse" /> : <Zap className="w-4 h-4" />}
                {smartHealthLoading ? '检测中...' : '开始检测'}
              </button>
            </div>

            {smartHealthResult && (
              <div className="space-y-4">
                {/* Overall status */}
                <div className={`rounded-lg p-4 border ${
                  smartHealthResult.status?.overall === 'excellent' ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-700' :
                  smartHealthResult.status?.overall === 'good' ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-700' :
                  'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-700'
                }`}>
                  <div className="flex items-center gap-2">
                    {smartHealthResult.status?.overall === 'needs_attention' ?
                      <AlertTriangle className="w-5 h-5 text-amber-600" /> :
                      <CheckCircle2 className="w-5 h-5 text-green-600" />
                    }
                    <span className="font-semibold text-gray-900 dark:text-white">
                      {smartHealthResult.status?.overall === 'excellent' ? '状态优秀' :
                       smartHealthResult.status?.overall === 'good' ? '状态良好' : '需要关注'}
                    </span>
                  </div>
                </div>

                {/* Network info */}
                {smartHealthResult.network && (
                  <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
                    <h4 className="font-medium text-gray-900 dark:text-white mb-2 flex items-center gap-2">
                      <Globe className="w-4 h-4" />网络环境
                    </h4>
                    <div className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                      <div>环境: {smartHealthResult.network.environment === 'domestic' ? '国内' : '国际'}</div>
                      <div>地区: {smartHealthResult.network.region}</div>
                    </div>
                  </div>
                )}

                {/* Reachability */}
                {smartHealthResult.reachability && (
                  <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
                    <h4 className="font-medium text-gray-900 dark:text-white mb-2 flex items-center gap-2">
                      <Heart className="w-4 h-4" />可达性测试 ({smartHealthResult.reachability.successful}/{smartHealthResult.reachability.total_tested})
                    </h4>
                    <div className="space-y-2">
                      {smartHealthResult.reachability.tests.map((test, i) => (
                        <div key={i} className="flex items-center justify-between text-sm">
                          <div className="flex items-center gap-2 min-w-0">
                            {test.success ? <CheckCircle2 className="w-3.5 h-3.5 text-green-500 shrink-0" /> : <XCircle className="w-3.5 h-3.5 text-red-500 shrink-0" />}
                            <span className="text-gray-600 dark:text-gray-400 truncate">{test.url}</span>
                          </div>
                          {test.responseTime > 0 && (
                            <span className="shrink-0 ml-2 flex items-center gap-1 text-gray-400">
                              <Clock className="w-3 h-3" />{test.responseTime}ms
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Recommendations */}
                {smartHealthResult.recommendations?.length > 0 && (
                  <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-lg p-4">
                    <h4 className="font-medium text-amber-900 dark:text-amber-100 mb-2">建议</h4>
                    <ul className="space-y-1">
                      {smartHealthResult.recommendations.map((rec, i) => (
                        <li key={i} className="text-sm text-amber-800 dark:text-amber-200">• {rec}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Diagnose tab */}
        {activeTab === 'diagnose' && (
          <div className="space-y-4">
            <div className="flex flex-wrap gap-3">
              <button
                onClick={handleDiagnose}
                disabled={diagnosing}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 text-sm"
              >
                {diagnosing ? <Activity className="w-4 h-4 animate-pulse" /> : <Wrench className="w-4 h-4" />}
                {diagnosing ? '诊断中...' : 'TVBox 诊断'}
              </button>
              <button
                onClick={handleRefreshJar}
                disabled={refreshingJar}
                className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 text-sm"
              >
                {refreshingJar ? <Activity className="w-4 h-4 animate-pulse" /> : <Zap className="w-4 h-4" />}
                {refreshingJar ? '刷新中...' : '刷新 JAR 缓存'}
              </button>
            </div>

            {jarRefreshMsg && (
              <div className={`p-3 rounded-lg text-sm ${jarRefreshMsg.startsWith('✓') ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300' : 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300'}`}>
                {jarRefreshMsg}
              </div>
            )}

            {diagnosisResult && (
              <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
                <h4 className="font-medium text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                  {diagnosisResult.pass ? <CheckCircle2 className="w-4 h-4 text-green-500" /> : <XCircle className="w-4 h-4 text-red-500" />}
                  诊断结果
                </h4>
                {diagnosisResult.error ? (
                  <p className="text-red-500 text-sm">{diagnosisResult.error}</p>
                ) : (
                  <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                    {diagnosisResult.sitesCount !== undefined && <div>站点数量: {diagnosisResult.sitesCount}</div>}
                    {diagnosisResult.livesCount !== undefined && <div>直播源数量: {diagnosisResult.livesCount}</div>}
                    {diagnosisResult.parsesCount !== undefined && <div>解析数量: {diagnosisResult.parsesCount}</div>}
                    {diagnosisResult.issues && diagnosisResult.issues.length > 0 && (
                      <div>
                        <p className="font-medium text-amber-600 dark:text-amber-400 mb-1">问题:</p>
                        <ul className="space-y-1">
                          {diagnosisResult.issues.map((issue, i) => (
                            <li key={i} className="text-amber-700 dark:text-amber-300">• {issue}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </>
  )
}
