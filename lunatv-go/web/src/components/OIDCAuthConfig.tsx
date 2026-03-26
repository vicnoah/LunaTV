import { useState } from 'react'
import { Save } from 'lucide-react'
import { api } from '@/api/client'
import type { AdminConfig } from '@/types/admin.types'

interface OIDCAuthConfigProps {
  config: AdminConfig | null
  refreshConfig: () => Promise<void>
}

export function OIDCAuthConfig({ config, refreshConfig }: OIDCAuthConfigProps) {
  const oidc = config?.OIDCAuthConfig
  const [form, setForm] = useState({
    enabled: oidc?.enabled ?? false,
    enableRegistration: oidc?.enableRegistration ?? false,
    issuer: oidc?.issuer ?? '',
    clientId: oidc?.clientId ?? '',
    clientSecret: oidc?.clientSecret ?? '',
    buttonText: oidc?.buttonText ?? '使用 OIDC 登录',
  })
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')

  const handleSave = async () => {
    setSaving(true)
    try {
      await api.post('/api/admin/config', { OIDCAuthConfig: form })
      await refreshConfig()
      setMsg('已保存')
      setTimeout(() => setMsg(''), 3000)
    } catch { setMsg('保存失败') }
    finally { setSaving(false) }
  }

  return (
    <div className="space-y-4">
      {msg && <div className="p-3 rounded-lg text-sm bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400">{msg}</div>}
      <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
        <input type="checkbox" checked={form.enabled} onChange={(e) => setForm({ ...form, enabled: e.target.checked })} className="rounded" />
        启用 OIDC 认证
      </label>
      {form.enabled && (
        <div className="space-y-3">
          {[['issuer', 'Issuer URL'], ['clientId', 'Client ID'], ['buttonText', '按钮文字']].map(([key, label]) => (
            <div key={key}>
              <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">{label}</label>
              <input type="text" value={(form as unknown as Record<string, string>)[key]} onChange={(e) => setForm({ ...form, [key]: e.target.value })} className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white" />
            </div>
          ))}
          <div>
            <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Client Secret</label>
            <input type="password" value={form.clientSecret} onChange={(e) => setForm({ ...form, clientSecret: e.target.value })} className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white" />
          </div>
          <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
            <input type="checkbox" checked={form.enableRegistration} onChange={(e) => setForm({ ...form, enableRegistration: e.target.checked })} className="rounded" />
            允许 OIDC 用户自动注册
          </label>
        </div>
      )}
      <button onClick={handleSave} disabled={saving} className="flex items-center gap-2 px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50">
        <Save className="h-4 w-4" />{saving ? '保存中...' : '保存'}
      </button>
    </div>
  )
}
