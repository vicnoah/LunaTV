/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  closestCenter,
  DndContext,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import { restrictToVerticalAxis } from '@dnd-kit/modifiers'
import { arrayMove, SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import {
  Activity, AlertCircle, AlertTriangle, Brain, CheckCircle,
  ChevronDown, ChevronUp, Database, Download, FileText, FolderOpen,
  GripVertical, KeyRound, MessageSquare, Settings, Shield,
  TestTube, Tv, Upload, Users, Video,
} from 'lucide-react'
import { Suspense, useCallback, useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import AIRecommendConfig from '@/components/AIRecommendConfig'
import CacheManager from '@/components/CacheManager'
import CustomAdFilterConfig from '@/components/CustomAdFilterConfig'
import DanmuApiConfig from '@/components/DanmuApiConfig'
import DataMigration from '@/components/DataMigration'
import EmbyConfig from '@/components/EmbyConfig'
import ImportExportModal from '@/components/ImportExportModal'
import { OIDCAuthConfig } from '@/components/OIDCAuthConfig'
import OfflineDownloadConfig from '@/components/OfflineDownloadConfig'
import SourceTestModule from '@/components/SourceTestModule'
import { TelegramAuthConfig } from '@/components/TelegramAuthConfig'
import TVBoxSecurityConfig from '@/components/TVBoxSecurityConfig'
import TrustedNetworkConfig from '@/components/TrustedNetworkConfig'
import WatchRoomConfig from '@/components/WatchRoomConfig'
import YouTubeConfig from '@/components/YouTubeConfig'
import PerformanceMonitor from '@/components/admin/PerformanceMonitor'
import { TVBoxTokenCell } from '@/components/TVBoxTokenManager'
import type { AdminConfig, AdminConfigResult } from '@/types/admin.types'

// ─── Button styles ────────────────────────────────────────────────────────────

const btn = {
  primary: 'px-3 py-1.5 text-sm font-medium bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors',
  success: 'px-3 py-1.5 text-sm font-medium bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors',
  danger: 'px-3 py-1.5 text-sm font-medium bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors',
  secondary: 'px-3 py-1.5 text-sm font-medium bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors',
  dangerSmall: 'px-2 py-1 text-xs font-medium bg-red-600 hover:bg-red-700 text-white rounded-md transition-colors',
  disabled: 'px-3 py-1.5 text-sm font-medium bg-gray-400 cursor-not-allowed text-white rounded-lg',
}

// ─── AlertModal ───────────────────────────────────────────────────────────────

interface AlertModalProps {
  isOpen: boolean
  onClose: () => void
  type: 'success' | 'error' | 'warning'
  title: string
  message?: string
  timer?: number
  showConfirm?: boolean
}

function AlertModal({ isOpen, onClose, type, title, message, timer, showConfirm }: AlertModalProps) {
  useEffect(() => {
    if (isOpen && timer) {
      const t = setTimeout(onClose, timer)
      return () => clearTimeout(t)
    }
  }, [isOpen, timer, onClose])

  if (!isOpen) return null

  const icons = {
    success: <CheckCircle className="w-8 h-8 text-green-500" />,
    error: <AlertCircle className="w-8 h-8 text-red-500" />,
    warning: <AlertTriangle className="w-8 h-8 text-yellow-500" />,
  }

  return createPortal(
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-sm w-full p-6 text-center">
        <div className="flex justify-center mb-4">{icons[type]}</div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">{title}</h3>
        {message && <p className="text-gray-600 dark:text-gray-400 mb-4">{message}</p>}
        {showConfirm && (
          <button onClick={onClose} className={btn.primary}>确定</button>
        )}
      </div>
    </div>,
    document.body
  )
}

function useAlertModal() {
  const [alertModal, setAlertModal] = useState<{
    isOpen: boolean; type: 'success' | 'error' | 'warning'; title: string; message?: string; timer?: number; showConfirm?: boolean
  }>({ isOpen: false, type: 'success', title: '' })

  const showAlert = (cfg: Omit<typeof alertModal, 'isOpen'>) => setAlertModal({ ...cfg, isOpen: true })
  const hideAlert = () => setAlertModal(prev => ({ ...prev, isOpen: false }))
  return { alertModal, showAlert, hideAlert }
}

function useLoadingState() {
  const [states, setStates] = useState<Record<string, boolean>>({})
  const isLoading = (k: string) => states[k] ?? false
  const withLoading = async (k: string, fn: () => Promise<any>) => {
    setStates(p => ({ ...p, [k]: true }))
    try { return await fn() } finally { setStates(p => ({ ...p, [k]: false })) }
  }
  return { isLoading, withLoading }
}

// ─── CollapsibleTab ───────────────────────────────────────────────────────────

function CollapsibleTab({ title, icon, isExpanded, onToggle, children }: {
  title: string; icon?: React.ReactNode; isExpanded: boolean; onToggle: () => void; children: React.ReactNode
}) {
  return (
    <div className="rounded-xl shadow-sm mb-4 overflow-hidden bg-white dark:bg-gray-800/50 dark:ring-1 dark:ring-gray-700">
      <button
        onClick={onToggle}
        className="w-full px-6 py-4 flex items-center justify-between bg-gray-50 dark:bg-gray-800/60 hover:bg-gray-100 dark:hover:bg-gray-700/60 transition-colors"
      >
        <div className="flex items-center gap-3">
          {icon}
          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">{title}</h3>
        </div>
        <span className="text-gray-500">{isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}</span>
      </button>
      {isExpanded && <div className="px-6 py-4">{children}</div>}
    </div>
  )
}

// ─── DataSource types (derived from AdminConfig) ──────────────────────────────

type DataSource = AdminConfig['SourceConfig'][number]
type LiveDataSource = NonNullable<AdminConfig['LiveConfig']>[number]

// ─── SortableRow helper ───────────────────────────────────────────────────────

function SortableRow({ id, children }: { id: string; children: (drag: React.ReactNode) => React.ReactNode }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id })
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 }
  return (
    <tr ref={setNodeRef} style={style}>
      {children(
        <button {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing p-1 text-gray-400 hover:text-gray-600">
          <GripVertical className="w-4 h-4" />
        </button>
      )}
    </tr>
  )
}

// ─── VideoSourceConfig ─────────────────────────────────────────────────────────

function VideoSourceConfig({ config, refreshConfig }: { config: AdminConfig | null; refreshConfig: () => Promise<void> }) {
  const { alertModal, showAlert, hideAlert } = useAlertModal()
  const { isLoading, withLoading } = useLoadingState()
  const [sources, setSources] = useState<DataSource[]>([])
  const [showAddForm, setShowAddForm] = useState(false)
  const [newSource, setNewSource] = useState<DataSource>({ name: '', key: '', api: '', detail: '', disabled: false, from: 'config' })
  const [orderChanged, setOrderChanged] = useState(false)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor)
  )

  useEffect(() => {
    if (config?.SourceConfig) setSources([...config.SourceConfig])
  }, [config])

  const handleDragEnd = (event: any) => {
    const { active, over } = event
    if (active.id !== over?.id) {
      setSources(items => {
        const oldIndex = items.findIndex(s => s.key === active.id)
        const newIndex = items.findIndex(s => s.key === over.id)
        setOrderChanged(true)
        return arrayMove(items, oldIndex, newIndex)
      })
    }
  }

  const saveOrder = async () => {
    await withLoading('saveOrder', async () => {
      const res = await fetch('/api/admin/source', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reorder', sources: sources.map((s, i) => ({ key: s.key, weight: 100 - i })) }),
      })
      if (!res.ok) throw new Error('保存失败')
      setOrderChanged(false)
      await refreshConfig()
      showAlert({ type: 'success', title: '保存成功', timer: 2000 })
    }).catch(e => showAlert({ type: 'error', title: '错误', message: e.message, showConfirm: true }))
  }

  const toggleDisable = async (source: DataSource) => {
    await fetch('/api/admin/source', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'toggle', key: source.key, disabled: !source.disabled }),
    })
    await refreshConfig()
  }

  const deleteSource = async (key: string) => {
    await fetch('/api/admin/source', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'delete', key }),
    })
    await refreshConfig()
  }

  const addSource = async () => {
    if (!newSource.name || !newSource.key || !newSource.api) {
      showAlert({ type: 'error', title: '错误', message: '请填写必填字段', showConfirm: true })
      return
    }
    await withLoading('addSource', async () => {
      const res = await fetch('/api/admin/source', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'add', ...newSource }),
      })
      if (!res.ok) throw new Error('添加失败')
      setShowAddForm(false)
      setNewSource({ name: '', key: '', api: '', detail: '', disabled: false, from: 'config' })
      await refreshConfig()
      showAlert({ type: 'success', title: '添加成功', timer: 2000 })
    }).catch(e => showAlert({ type: 'error', title: '错误', message: e.message, showConfirm: true }))
  }

  return (
    <div>
      <AlertModal {...alertModal} onClose={hideAlert} />
      <div className="flex gap-2 mb-4">
        <button onClick={() => setShowAddForm(v => !v)} className={btn.success}>添加视频源</button>
        {orderChanged && (
          <button onClick={saveOrder} disabled={isLoading('saveOrder')} className={isLoading('saveOrder') ? btn.disabled : btn.primary}>
            {isLoading('saveOrder') ? '保存中...' : '保存排序'}
          </button>
        )}
      </div>

      {showAddForm && (
        <div className="mb-4 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg space-y-3">
          <div className="grid grid-cols-2 gap-3">
            {(['name', 'key', 'api', 'detail'] as const).map(f => (
              <div key={f}>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">{f === 'name' ? '名称*' : f === 'key' ? '唯一标识*' : f === 'api' ? 'API地址*' : '详情地址'}</label>
                <input
                  value={(newSource as any)[f] || ''}
                  onChange={e => setNewSource(p => ({ ...p, [f]: e.target.value }))}
                  className="w-full p-2 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                />
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <button onClick={addSource} disabled={isLoading('addSource')} className={isLoading('addSource') ? btn.disabled : btn.success}>
              {isLoading('addSource') ? '添加中...' : '确认添加'}
            </button>
            <button onClick={() => setShowAddForm(false)} className={btn.secondary}>取消</button>
          </div>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs font-medium text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-700">
              <th className="pb-2 w-8"></th>
              <th className="pb-2">名称</th>
              <th className="pb-2">标识</th>
              <th className="pb-2">API</th>
              <th className="pb-2">来源</th>
              <th className="pb-2">状态</th>
              <th className="pb-2">操作</th>
            </tr>
          </thead>
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd} modifiers={[restrictToVerticalAxis]}>
            <SortableContext items={sources.map(s => s.key)} strategy={verticalListSortingStrategy}>
              <tbody>
                {sources.map(source => (
                  <SortableRow key={source.key} id={source.key}>
                    {drag => (
                      <>
                        <td className="py-2 pr-2">{drag}</td>
                        <td className="py-2 pr-4 font-medium text-gray-900 dark:text-white">{source.name}</td>
                        <td className="py-2 pr-4 text-gray-500 font-mono text-xs">{source.key}</td>
                        <td className="py-2 pr-4 text-gray-500 text-xs truncate max-w-[200px]" title={source.api}>{source.api}</td>
                        <td className="py-2 pr-4">
                          <span className={`px-1.5 py-0.5 rounded text-xs ${source.from === 'custom' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300' : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'}`}>
                            {source.from === 'custom' ? '自定义' : '预设'}
                          </span>
                        </td>
                        <td className="py-2 pr-4">
                          <span className={`px-1.5 py-0.5 rounded text-xs ${source.disabled ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300' : 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'}`}>
                            {source.disabled ? '禁用' : '启用'}
                          </span>
                        </td>
                        <td className="py-2">
                          <div className="flex items-center gap-1">
                            <button onClick={() => toggleDisable(source)} className="text-xs px-2 py-1 rounded bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 transition-colors">
                              {source.disabled ? '启用' : '禁用'}
                            </button>
                            {source.from === 'custom' && (
                              <button onClick={() => deleteSource(source.key)} className="text-xs px-2 py-1 rounded bg-red-100 dark:bg-red-900/30 hover:bg-red-200 text-red-700 dark:text-red-300 transition-colors">
                                删除
                              </button>
                            )}
                          </div>
                        </td>
                      </>
                    )}
                  </SortableRow>
                ))}
              </tbody>
            </SortableContext>
          </DndContext>
        </table>
      </div>
      {sources.length === 0 && <p className="text-center py-8 text-gray-500">暂无视频源</p>}
    </div>
  )
}

// ─── LiveSourceConfig ──────────────────────────────────────────────────────────

function LiveSourceConfig({ config, refreshConfig }: { config: AdminConfig | null; refreshConfig: () => Promise<void> }) {
  const { alertModal, showAlert, hideAlert } = useAlertModal()
  const { isLoading, withLoading } = useLoadingState()
  const [sources, setSources] = useState<LiveDataSource[]>([])
  const [showAddForm, setShowAddForm] = useState(false)
  const [newSource, setNewSource] = useState<LiveDataSource>({ name: '', key: '', url: '', disabled: false, from: 'config' })

  useEffect(() => {
    if (config?.LiveConfig) setSources([...config.LiveConfig])
  }, [config])

  const addSource = async () => {
    if (!newSource.name || !newSource.key || !newSource.url) {
      showAlert({ type: 'error', title: '错误', message: '请填写必填字段', showConfirm: true })
      return
    }
    await withLoading('addSource', async () => {
      const res = await fetch('/api/admin/live-source', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'add', ...newSource }),
      })
      if (!res.ok) throw new Error('添加失败')
      setShowAddForm(false)
      setNewSource({ name: '', key: '', url: '', disabled: false, from: 'config' })
      await refreshConfig()
      showAlert({ type: 'success', title: '添加成功', timer: 2000 })
    }).catch(e => showAlert({ type: 'error', title: '错误', message: e.message, showConfirm: true }))
  }

  const toggleDisable = async (source: LiveDataSource) => {
    await fetch('/api/admin/live-source', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'toggle', key: source.key, disabled: !source.disabled }),
    })
    await refreshConfig()
  }

  const deleteSource = async (key: string) => {
    await fetch('/api/admin/live-source', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'delete', key }),
    })
    await refreshConfig()
  }

  return (
    <div>
      <AlertModal {...alertModal} onClose={hideAlert} />
      <button onClick={() => setShowAddForm(v => !v)} className={`${btn.success} mb-4`}>添加直播源</button>

      {showAddForm && (
        <div className="mb-4 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg space-y-3">
          <div className="grid grid-cols-2 gap-3">
            {([['name', '名称*'], ['key', '唯一标识*'], ['url', 'M3U地址*'], ['ua', 'User-Agent'], ['epg', 'EPG地址']] as [keyof LiveDataSource, string][]).map(([f, label]) => (
              <div key={f}>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">{label}</label>
                <input
                  value={(newSource as any)[f] || ''}
                  onChange={e => setNewSource(p => ({ ...p, [f]: e.target.value }))}
                  className="w-full p-2 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                />
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <button onClick={addSource} disabled={isLoading('addSource')} className={isLoading('addSource') ? btn.disabled : btn.success}>
              {isLoading('addSource') ? '添加中...' : '确认添加'}
            </button>
            <button onClick={() => setShowAddForm(false)} className={btn.secondary}>取消</button>
          </div>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs font-medium text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-700">
              <th className="pb-2">名称</th>
              <th className="pb-2">标识</th>
              <th className="pb-2">URL</th>
              <th className="pb-2">来源</th>
              <th className="pb-2">状态</th>
              <th className="pb-2">操作</th>
            </tr>
          </thead>
          <tbody>
            {sources.map(source => (
              <tr key={source.key} className="border-b border-gray-100 dark:border-gray-700/50">
                <td className="py-2 pr-4 font-medium text-gray-900 dark:text-white">{source.name}</td>
                <td className="py-2 pr-4 text-gray-500 font-mono text-xs">{source.key}</td>
                <td className="py-2 pr-4 text-gray-500 text-xs truncate max-w-[200px]" title={source.url}>{source.url}</td>
                <td className="py-2 pr-4">
                  <span className={`px-1.5 py-0.5 rounded text-xs ${source.from === 'custom' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300' : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'}`}>
                    {source.from === 'custom' ? '自定义' : '预设'}
                  </span>
                </td>
                <td className="py-2 pr-4">
                  <span className={`px-1.5 py-0.5 rounded text-xs ${source.disabled ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300' : 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'}`}>
                    {source.disabled ? '禁用' : '启用'}
                  </span>
                </td>
                <td className="py-2">
                  <div className="flex gap-1">
                    <button onClick={() => toggleDisable(source)} className="text-xs px-2 py-1 rounded bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 transition-colors">
                      {source.disabled ? '启用' : '禁用'}
                    </button>
                    {source.from === 'custom' && (
                      <button onClick={() => deleteSource(source.key)} className="text-xs px-2 py-1 rounded bg-red-100 dark:bg-red-900/30 hover:bg-red-200 text-red-700 dark:text-red-300 transition-colors">
                        删除
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {sources.length === 0 && <p className="text-center py-8 text-gray-500">暂无直播源</p>}
    </div>
  )
}

// ─── UserConfig ────────────────────────────────────────────────────────────────

type User = AdminConfig['UserConfig']['Users'][number]

function UserConfig({ config, role, refreshConfig }: { config: AdminConfig | null; role: 'owner' | 'admin' | null; refreshConfig: () => Promise<void> }) {
  const { alertModal, showAlert, hideAlert } = useAlertModal()
  const { isLoading, withLoading } = useLoadingState()
  const [showAddForm, setShowAddForm] = useState(false)
  const [showChangePasswordForm, setShowChangePasswordForm] = useState(false)
  const [newUser, setNewUser] = useState({ username: '', password: '' })
  const [changePasswordUser, setChangePasswordUser] = useState({ username: '', password: '' })

  const users: User[] = config?.UserConfig?.Users || []

  const addUser = async () => {
    if (!newUser.username || !newUser.password) {
      showAlert({ type: 'error', title: '错误', message: '用户名和密码不能为空', showConfirm: true })
      return
    }
    await withLoading('addUser', async () => {
      const res = await fetch('/api/admin/user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'add', ...newUser }),
      })
      if (!res.ok) { const d = await res.json(); throw new Error(d.error || '添加失败') }
      setShowAddForm(false)
      setNewUser({ username: '', password: '' })
      await refreshConfig()
      showAlert({ type: 'success', title: '添加成功', timer: 2000 })
    }).catch(e => showAlert({ type: 'error', title: '错误', message: e.message, showConfirm: true }))
  }

  const changePassword = async () => {
    if (!changePasswordUser.username || !changePasswordUser.password) {
      showAlert({ type: 'error', title: '错误', message: '请填写所有字段', showConfirm: true })
      return
    }
    await withLoading('changePassword', async () => {
      const res = await fetch('/api/admin/user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'change_password', ...changePasswordUser }),
      })
      if (!res.ok) throw new Error('修改失败')
      setShowChangePasswordForm(false)
      setChangePasswordUser({ username: '', password: '' })
      showAlert({ type: 'success', title: '修改成功', timer: 2000 })
    }).catch(e => showAlert({ type: 'error', title: '错误', message: e.message, showConfirm: true }))
  }

  const toggleBan = async (username: string, banned: boolean) => {
    await fetch('/api/admin/user', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: banned ? 'unban' : 'ban', username }),
    })
    await refreshConfig()
  }

  const deleteUser = async (username: string) => {
    if (!confirm(`确认删除用户 ${username}？`)) return
    await fetch('/api/admin/user', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'delete', username }),
    })
    await refreshConfig()
  }

  const allowRegister = config?.UserConfig?.AllowRegister ?? false

  const toggleAllowRegister = async () => {
    if (!config) return
    await fetch('/api/admin/config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...config, UserConfig: { ...config.UserConfig, AllowRegister: !allowRegister } }),
    })
    await refreshConfig()
  }

  return (
    <div>
      <AlertModal {...alertModal} onClose={hideAlert} />

      {/* Allow register toggle */}
      <div className="flex items-center gap-3 mb-4 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">允许注册</span>
        <button
          onClick={toggleAllowRegister}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${allowRegister ? 'bg-green-600' : 'bg-gray-200 dark:bg-gray-700'}`}
        >
          <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${allowRegister ? 'translate-x-6' : 'translate-x-1'}`} />
        </button>
      </div>

      <div className="flex flex-wrap gap-2 mb-4">
        <button onClick={() => { setShowAddForm(v => !v); setShowChangePasswordForm(false) }} className={btn.success}>添加用户</button>
        <button onClick={() => { setShowChangePasswordForm(v => !v); setShowAddForm(false) }} className={btn.primary}>修改密码</button>
      </div>

      {showAddForm && (
        <div className="mb-4 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">用户名*</label>
              <input value={newUser.username} onChange={e => setNewUser(p => ({ ...p, username: e.target.value }))}
                className="w-full p-2 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">密码*</label>
              <input type="password" value={newUser.password} onChange={e => setNewUser(p => ({ ...p, password: e.target.value }))}
                className="w-full p-2 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white" />
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={addUser} disabled={isLoading('addUser')} className={isLoading('addUser') ? btn.disabled : btn.success}>
              {isLoading('addUser') ? '添加中...' : '确认添加'}
            </button>
            <button onClick={() => setShowAddForm(false)} className={btn.secondary}>取消</button>
          </div>
        </div>
      )}

      {showChangePasswordForm && (
        <div className="mb-4 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">用户名*</label>
              <select value={changePasswordUser.username} onChange={e => setChangePasswordUser(p => ({ ...p, username: e.target.value }))}
                className="w-full p-2 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white">
                <option value="">选择用户</option>
                {users.map(u => <option key={u.username} value={u.username}>{u.username}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">新密码*</label>
              <input type="password" value={changePasswordUser.password} onChange={e => setChangePasswordUser(p => ({ ...p, password: e.target.value }))}
                className="w-full p-2 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white" />
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={changePassword} disabled={isLoading('changePassword')} className={isLoading('changePassword') ? btn.disabled : btn.primary}>
              {isLoading('changePassword') ? '修改中...' : '确认修改'}
            </button>
            <button onClick={() => setShowChangePasswordForm(false)} className={btn.secondary}>取消</button>
          </div>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs font-medium text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-700">
              <th className="pb-2">用户名</th>
              <th className="pb-2">角色</th>
              <th className="pb-2">状态</th>
              <th className="pb-2">TVBox Token</th>
              <th className="pb-2">操作</th>
            </tr>
          </thead>
          <tbody>
            {users.map(u => (
              <tr key={u.username} className="border-b border-gray-100 dark:border-gray-700/50">
                <td className="py-2 pr-4 font-medium text-gray-900 dark:text-white">{u.username}</td>
                <td className="py-2 pr-4">
                  <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${u.role === 'owner' ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300' : u.role === 'admin' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300' : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'}`}>
                    {u.role === 'owner' ? '站长' : u.role === 'admin' ? '管理员' : '用户'}
                  </span>
                </td>
                <td className="py-2 pr-4">
                  <span className={`px-1.5 py-0.5 rounded text-xs ${u.banned ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300' : 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'}`}>
                    {u.banned ? '已封禁' : '正常'}
                  </span>
                </td>
                <td className="py-2 pr-4">
                  <TVBoxTokenCell
                    username={u.username}
                    token={u.tvboxToken}
                    onUpdated={refreshConfig}
                  />
                </td>
                <td className="py-2">
                  <div className="flex gap-1">
                    {u.role !== 'owner' && (
                      <button onClick={() => toggleBan(u.username, u.banned ?? false)} className="text-xs px-2 py-1 rounded bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 transition-colors">
                        {u.banned ? '解封' : '封禁'}
                      </button>
                    )}
                    {u.role !== 'owner' && role === 'owner' && (
                      <button onClick={() => deleteUser(u.username)} className="text-xs px-2 py-1 rounded bg-red-100 dark:bg-red-900/30 hover:bg-red-200 text-red-700 dark:text-red-300 transition-colors">
                        删除
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

    </div>
  )
}

// ─── SiteConfigComponent ───────────────────────────────────────────────────────

function SiteConfigComponent({ config, refreshConfig }: { config: AdminConfig | null; refreshConfig: () => Promise<void> }) {
  const { alertModal, showAlert, hideAlert } = useAlertModal()
  const { isLoading, withLoading } = useLoadingState()

  const defaultSettings = {
    SiteName: '', Announcement: '',
    SearchDownstreamMaxPage: 1, SiteInterfaceCacheTime: 7200,
    DoubanProxyType: 'direct', DoubanProxy: '',
    DoubanImageProxyType: 'direct', DoubanImageProxy: '',
    DisableYellowFilter: false, ShowAdultContent: false,
    FluidSearch: true, EnableWebLive: false,
    TMDBApiKey: '', TMDBLanguage: 'zh-CN', EnableTMDBActorSearch: false,
  }

  const [settings, setSettings] = useState(defaultSettings)

  useEffect(() => {
    if (config?.SiteConfig) {
      setSettings({
        SiteName: config.SiteConfig.SiteName || '',
        Announcement: config.SiteConfig.Announcement || '',
        SearchDownstreamMaxPage: config.SiteConfig.SearchDownstreamMaxPage || 1,
        SiteInterfaceCacheTime: config.SiteConfig.SiteInterfaceCacheTime || 7200,
        DoubanProxyType: config.SiteConfig.DoubanProxyType || 'direct',
        DoubanProxy: config.SiteConfig.DoubanProxy || '',
        DoubanImageProxyType: config.SiteConfig.DoubanImageProxyType || 'direct',
        DoubanImageProxy: config.SiteConfig.DoubanImageProxy || '',
        DisableYellowFilter: config.SiteConfig.DisableYellowFilter || false,
        ShowAdultContent: config.SiteConfig.ShowAdultContent || false,
        FluidSearch: config.SiteConfig.FluidSearch ?? true,
        EnableWebLive: config.SiteConfig.EnableWebLive ?? false,
        TMDBApiKey: config.SiteConfig.TMDBApiKey || '',
        TMDBLanguage: config.SiteConfig.TMDBLanguage || 'zh-CN',
        EnableTMDBActorSearch: config.SiteConfig.EnableTMDBActorSearch || false,
      })
    }
  }, [config])

  const save = async () => {
    if (!config) return
    await withLoading('save', async () => {
      const res = await fetch('/api/admin/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...config, SiteConfig: { ...config.SiteConfig, ...settings } }),
      })
      if (!res.ok) throw new Error('保存失败')
      await refreshConfig()
      showAlert({ type: 'success', title: '保存成功', timer: 2000 })
    }).catch(e => showAlert({ type: 'error', title: '错误', message: e.message, showConfirm: true }))
  }

  const toggleField = (field: keyof typeof settings) => {
    setSettings(p => ({ ...p, [field]: !(p as any)[field] }))
  }

  const boolFields: [keyof typeof settings, string][] = [
    ['DisableYellowFilter', '禁用黄色内容过滤'],
    ['ShowAdultContent', '显示成人内容'],
    ['FluidSearch', '流式搜索'],
    ['EnableWebLive', '启用网页直播'],
    ['EnableTMDBActorSearch', '启用TMDB演员搜索'],
  ]

  const doubanProxyOptions = [
    { value: 'direct', label: '直连' },
    { value: 'cors-proxy-zwei', label: 'Cors Proxy By Zwei' },
    { value: 'cmliussss-cdn-tencent', label: '豆瓣CDN腾讯云' },
    { value: 'cmliussss-cdn-ali', label: '豆瓣CDN阿里云' },
    { value: 'custom', label: '自定义代理' },
  ]

  const doubanImageProxyOptions = [
    { value: 'direct', label: '直连' },
    { value: 'server', label: '服务器代理' },
    { value: 'img3', label: '豆瓣官方CDN' },
    { value: 'cmliussss-cdn-tencent', label: '豆瓣CDN腾讯云' },
    { value: 'cmliussss-cdn-ali', label: '豆瓣CDN阿里云' },
    { value: 'baidu', label: '百度图片代理' },
    { value: 'custom', label: '自定义代理' },
  ]

  return (
    <div>
      <AlertModal {...alertModal} onClose={hideAlert} />
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {([['SiteName', '站点名称'], ['Announcement', '站点公告']] as [keyof typeof settings, string][]).map(([f, label]) => (
            <div key={f}>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{label}</label>
              <input
                value={(settings as any)[f] || ''}
                onChange={e => setSettings(p => ({ ...p, [f]: e.target.value }))}
                className="w-full p-2 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              />
            </div>
          ))}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">豆瓣数据源代理</label>
            <select value={settings.DoubanProxyType} onChange={e => setSettings(p => ({ ...p, DoubanProxyType: e.target.value }))}
              className="w-full p-2 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white">
              {doubanProxyOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
          {settings.DoubanProxyType === 'custom' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">自定义豆瓣代理URL</label>
              <input value={settings.DoubanProxy} onChange={e => setSettings(p => ({ ...p, DoubanProxy: e.target.value }))}
                className="w-full p-2 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white" />
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">豆瓣图片代理</label>
            <select value={settings.DoubanImageProxyType} onChange={e => setSettings(p => ({ ...p, DoubanImageProxyType: e.target.value }))}
              className="w-full p-2 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white">
              {doubanImageProxyOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
          {settings.DoubanImageProxyType === 'custom' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">自定义图片代理URL</label>
              <input value={settings.DoubanImageProxy} onChange={e => setSettings(p => ({ ...p, DoubanImageProxy: e.target.value }))}
                className="w-full p-2 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white" />
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">TMDB API Key</label>
            <input value={settings.TMDBApiKey} onChange={e => setSettings(p => ({ ...p, TMDBApiKey: e.target.value }))}
              className="w-full p-2 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">搜索最大页数</label>
            <input type="number" min={1} max={10} value={settings.SearchDownstreamMaxPage}
              onChange={e => setSettings(p => ({ ...p, SearchDownstreamMaxPage: Number(e.target.value) }))}
              className="w-full p-2 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">接口缓存时间（秒）</label>
            <input type="number" min={0} value={settings.SiteInterfaceCacheTime}
              onChange={e => setSettings(p => ({ ...p, SiteInterfaceCacheTime: Number(e.target.value) }))}
              className="w-full p-2 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white" />
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {boolFields.map(([field, label]) => (
            <label key={field} className="flex items-center gap-2 cursor-pointer">
              <button
                onClick={() => toggleField(field)}
                className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${(settings as any)[field] ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-700'}`}
              >
                <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${(settings as any)[field] ? 'translate-x-5' : 'translate-x-0.5'}`} />
              </button>
              <span className="text-sm text-gray-700 dark:text-gray-300">{label}</span>
            </label>
          ))}
        </div>

        <button onClick={save} disabled={isLoading('save')} className={isLoading('save') ? btn.disabled : btn.primary}>
          {isLoading('save') ? '保存中...' : '保存配置'}
        </button>
      </div>
    </div>
  )
}

// ─── ConfigFileComponent ───────────────────────────────────────────────────────

function ConfigFileComponent({ config, refreshConfig }: { config: AdminConfig | null; refreshConfig: () => Promise<void> }) {
  const { alertModal, showAlert, hideAlert } = useAlertModal()
  const { isLoading, withLoading } = useLoadingState()
  const [subscribeUrl, setSubscribeUrl] = useState('')
  const [showImportExport, setShowImportExport] = useState(false)

  useEffect(() => {
    if (config?.ConfigSubscribtion?.URL) setSubscribeUrl(config.ConfigSubscribtion.URL)
  }, [config])

  const handleSubscribe = async () => {
    await withLoading('subscribe', async () => {
      const res = await fetch('/api/admin/config/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: subscribeUrl }),
      })
      if (!res.ok) throw new Error('订阅失败')
      await refreshConfig()
      showAlert({ type: 'success', title: '订阅成功', timer: 2000 })
    }).catch(e => showAlert({ type: 'error', title: '错误', message: e.message, showConfirm: true }))
  }

  const handleRefresh = async () => {
    await withLoading('refresh', async () => {
      const res = await fetch('/api/admin/config/refresh', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' })
      if (!res.ok) throw new Error('刷新失败')
      await refreshConfig()
      showAlert({ type: 'success', title: '刷新成功', timer: 2000 })
    }).catch(e => showAlert({ type: 'error', title: '错误', message: e.message, showConfirm: true }))
  }

  return (
    <div className="space-y-4">
      <AlertModal {...alertModal} onClose={hideAlert} />

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">配置文件路径</label>
        <p className="text-sm text-gray-500 dark:text-gray-400 font-mono bg-gray-50 dark:bg-gray-700 px-3 py-2 rounded">{config?.ConfigFile || '未配置'}</p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">远程配置订阅URL</label>
        <div className="flex gap-2">
          <input
            value={subscribeUrl}
            onChange={e => setSubscribeUrl(e.target.value)}
            placeholder="https://..."
            className="flex-1 p-2 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
          />
          <button onClick={handleSubscribe} disabled={isLoading('subscribe')} className={isLoading('subscribe') ? btn.disabled : btn.primary}>
            {isLoading('subscribe') ? '订阅中...' : '订阅'}
          </button>
          {config?.ConfigSubscribtion?.URL && (
            <button onClick={handleRefresh} disabled={isLoading('refresh')} className={isLoading('refresh') ? btn.disabled : btn.secondary}>
              {isLoading('refresh') ? '刷新中...' : '刷新'}
            </button>
          )}
        </div>
        {config?.ConfigSubscribtion?.LastCheck && (
          <p className="text-xs text-gray-400 mt-1">上次检查：{new Date(config.ConfigSubscribtion.LastCheck).toLocaleString('zh-CN')}</p>
        )}
      </div>

      <div className="flex gap-2">
        <button onClick={() => setShowImportExport(true)} className={btn.secondary}>
          <Upload className="w-4 h-4 inline mr-1" />导入/导出
        </button>
      </div>

      {showImportExport && (
        <ImportExportModal
          isOpen={showImportExport}
          onClose={() => setShowImportExport(false)}
          onImport={refreshConfig}
        />
      )}
    </div>
  )
}

// ─── AdminPageClient ───────────────────────────────────────────────────────────

const ADMIN_TAB_KEYS = [
  'configFile', 'siteConfig', 'userConfig', 'videoSource', 'sourceTest',
  'liveSource', 'categoryConfig', 'netdiskConfig', 'aiRecommendConfig',
  'youtubeConfig', 'embyConfig', 'downloadConfig', 'customAdFilter',
  'watchRoomConfig', 'tvboxSecurityConfig', 'trustedNetworkConfig',
  'danmuApiConfig', 'telegramAuthConfig', 'oidcAuthConfig',
  'cacheManager', 'dataMigration', 'performanceMonitor',
] as const

function AdminPageClient() {
  const { alertModal, showAlert, hideAlert } = useAlertModal()
  const { isLoading, withLoading } = useLoadingState()
  const [config, setConfig] = useState<AdminConfig | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [role, setRole] = useState<'owner' | 'admin' | null>(null)
  const [showResetModal, setShowResetModal] = useState(false)

  const [expanded, setExpanded] = useState<Record<string, boolean>>(
    Object.fromEntries(ADMIN_TAB_KEYS.map(k => [k, false]))
  )

  const toggle = (k: string) => setExpanded(p => ({ ...p, [k]: !p[k] }))

  const fetchConfig = useCallback(async (showLoading = false) => {
    try {
      if (showLoading) setLoading(true)
      const res = await fetch('/api/admin/config')
      if (!res.ok) { const d = await res.json(); throw new Error(d.error || '获取配置失败') }
      const data: AdminConfigResult = await res.json()
      setConfig(data.Config)
      setRole(data.Role)
    } catch (e: any) {
      const msg = e.message || '获取配置失败'
      setError(msg)
      showAlert({ type: 'error', title: '错误', message: msg, showConfirm: true })
    } finally {
      if (showLoading) setLoading(false)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { fetchConfig(true) }, [fetchConfig])

  const handleReset = async () => {
    await withLoading('reset', async () => {
      const res = await fetch('/api/admin/reset')
      if (!res.ok) throw new Error('重置失败')
      showAlert({ type: 'success', title: '重置成功，请刷新页面', timer: 3000 })
      setShowResetModal(false)
      await fetchConfig()
    }).catch(e => showAlert({ type: 'error', title: '错误', message: e.message, showConfirm: true }))
  }

  if (loading) {
    return (
      <>
        <div className="max-w-5xl mx-auto px-4 py-8">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-8">管理员设置</h1>
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-16 bg-gray-100 dark:bg-gray-800 rounded-xl animate-pulse" />
            ))}
          </div>
        </div>
      </>
    )
  }

  if (error && !config) return null

  return (
    <>
      <div className="max-w-5xl mx-auto px-4 py-8 pb-40">
        <AlertModal {...alertModal} onClose={hideAlert} />

        <div className="flex items-center gap-3 mb-8">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">管理员设置</h1>
          {role === 'owner' && (
            <button onClick={() => setShowResetModal(true)} className={btn.dangerSmall}>重置配置</button>
          )}
        </div>

        <div className="space-y-4">
          {role === 'owner' && (
            <CollapsibleTab title="配置文件" icon={<FileText size={20} className="text-gray-500" />} isExpanded={expanded.configFile} onToggle={() => toggle('configFile')}>
              <ConfigFileComponent config={config} refreshConfig={fetchConfig} />
            </CollapsibleTab>
          )}

          <CollapsibleTab title="站点配置" icon={<Settings size={20} className="text-gray-500" />} isExpanded={expanded.siteConfig} onToggle={() => toggle('siteConfig')}>
            <SiteConfigComponent config={config} refreshConfig={fetchConfig} />
          </CollapsibleTab>

          <CollapsibleTab title="用户配置" icon={<Users size={20} className="text-gray-500" />} isExpanded={expanded.userConfig} onToggle={() => toggle('userConfig')}>
            <UserConfig config={config} role={role} refreshConfig={fetchConfig} />
          </CollapsibleTab>

          <CollapsibleTab title="视频源配置" icon={<Video size={20} className="text-gray-500" />} isExpanded={expanded.videoSource} onToggle={() => toggle('videoSource')}>
            <VideoSourceConfig config={config} refreshConfig={fetchConfig} />
          </CollapsibleTab>

          <CollapsibleTab title="源检测" icon={<TestTube size={20} className="text-gray-500" />} isExpanded={expanded.sourceTest} onToggle={() => toggle('sourceTest')}>
            <SourceTestModule />
          </CollapsibleTab>

          <CollapsibleTab title="直播源配置" icon={<Tv size={20} className="text-gray-500" />} isExpanded={expanded.liveSource} onToggle={() => toggle('liveSource')}>
            <LiveSourceConfig config={config} refreshConfig={fetchConfig} />
          </CollapsibleTab>

          <CollapsibleTab title="AI推荐配置" icon={<Brain size={20} className="text-gray-500" />} isExpanded={expanded.aiRecommendConfig} onToggle={() => toggle('aiRecommendConfig')}>
            <AIRecommendConfig config={config} refreshConfig={fetchConfig} />
          </CollapsibleTab>

          <CollapsibleTab title="YouTube配置" icon={<Video size={20} className="text-gray-500" />} isExpanded={expanded.youtubeConfig} onToggle={() => toggle('youtubeConfig')}>
            <YouTubeConfig config={config} refreshConfig={fetchConfig} />
          </CollapsibleTab>

          <CollapsibleTab title="Emby私人影库" icon={<FolderOpen size={20} className="text-indigo-500" />} isExpanded={expanded.embyConfig} onToggle={() => toggle('embyConfig')}>
            <EmbyConfig config={config} refreshConfig={fetchConfig} />
          </CollapsibleTab>

          <CollapsibleTab title="下载配置" icon={<Download size={20} className="text-green-500" />} isExpanded={expanded.downloadConfig} onToggle={() => toggle('downloadConfig')}>
            <OfflineDownloadConfig config={config} refreshConfig={fetchConfig} />
          </CollapsibleTab>

          <CollapsibleTab title="自定义去广告" icon={<Video size={20} className="text-purple-500" />} isExpanded={expanded.customAdFilter} onToggle={() => toggle('customAdFilter')}>
            <CustomAdFilterConfig config={config} refreshConfig={fetchConfig} />
          </CollapsibleTab>

          <CollapsibleTab title="观影室配置" icon={<Users size={20} className="text-indigo-500" />} isExpanded={expanded.watchRoomConfig} onToggle={() => toggle('watchRoomConfig')}>
            <WatchRoomConfig config={config} refreshConfig={fetchConfig} />
          </CollapsibleTab>

          <CollapsibleTab title="TVBox安全配置" icon={<Settings size={20} className="text-gray-500" />} isExpanded={expanded.tvboxSecurityConfig} onToggle={() => toggle('tvboxSecurityConfig')}>
            <TVBoxSecurityConfig config={config} refreshConfig={fetchConfig} />
          </CollapsibleTab>

          {role === 'owner' && (
            <CollapsibleTab title="信任网络配置" icon={<Shield size={20} className="text-green-500" />} isExpanded={expanded.trustedNetworkConfig} onToggle={() => toggle('trustedNetworkConfig')}>
              <TrustedNetworkConfig config={config} refreshConfig={fetchConfig} />
            </CollapsibleTab>
          )}

          {role === 'owner' && (
            <CollapsibleTab title="弹幕API配置" icon={<MessageSquare size={20} className="text-purple-500" />} isExpanded={expanded.danmuApiConfig} onToggle={() => toggle('danmuApiConfig')}>
              <DanmuApiConfig config={config} refreshConfig={fetchConfig} />
            </CollapsibleTab>
          )}

          {role === 'owner' && (
            <CollapsibleTab
              title="Telegram 登录配置"
              icon={<svg viewBox="0 0 24 24" width="20" height="20" className="text-blue-500" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69.01-.03.01-.14-.07-.2-.08-.06-.19-.04-.27-.02-.12.03-1.99 1.27-5.62 3.72-.53.36-1.01.54-1.44.53-.47-.01-1.38-.27-2.05-.49-.82-.27-1.47-.42-1.42-.88.03-.24.37-.48 1.02-.73 4-1.74 6.68-2.88 8.03-3.44 3.82-1.58 4.61-1.85 5.13-1.86.11 0 .37.03.54.17.14.11.18.26.2.37.02.08.03.29.01.45z" /></svg>}
              isExpanded={expanded.telegramAuthConfig}
              onToggle={() => toggle('telegramAuthConfig')}
            >
              <TelegramAuthConfig config={config} refreshConfig={fetchConfig} />
            </CollapsibleTab>
          )}

          {role === 'owner' && (
            <CollapsibleTab title="OIDC 登录配置" icon={<KeyRound size={20} className="text-purple-500" />} isExpanded={expanded.oidcAuthConfig} onToggle={() => toggle('oidcAuthConfig')}>
              <OIDCAuthConfig config={config} refreshConfig={fetchConfig} />
            </CollapsibleTab>
          )}

          {role === 'owner' && (
            <CollapsibleTab title="缓存管理" icon={<Database size={20} className="text-gray-500" />} isExpanded={expanded.cacheManager} onToggle={() => toggle('cacheManager')}>
              <CacheManager />
            </CollapsibleTab>
          )}

          {role === 'owner' && (
            <CollapsibleTab title="数据迁移" icon={<Database size={20} className="text-gray-500" />} isExpanded={expanded.dataMigration} onToggle={() => toggle('dataMigration')}>
              <DataMigration />
            </CollapsibleTab>
          )}

          {role === 'owner' && (
            <CollapsibleTab title="性能监控" icon={<Activity size={20} className="text-gray-500" />} isExpanded={expanded.performanceMonitor} onToggle={() => toggle('performanceMonitor')}>
              <PerformanceMonitor />
            </CollapsibleTab>
          )}
        </div>
      </div>

      {showResetModal && createPortal(
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowResetModal(false)}>
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-md w-full p-6" onClick={e => e.stopPropagation()}>
            <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">确认重置配置</h3>
            <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4 mb-6">
              <p className="text-sm text-yellow-700 dark:text-yellow-400">
                此操作将重置用户封禁和管理员设置、自定义视频源，站点配置将重置为默认值，是否继续？
              </p>
            </div>
            <div className="flex justify-end gap-3">
              <button onClick={() => setShowResetModal(false)} className={btn.secondary}>取消</button>
              <button onClick={handleReset} disabled={isLoading('reset')} className={isLoading('reset') ? btn.disabled : btn.danger}>
                {isLoading('reset') ? '重置中...' : '确认重置'}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  )
}

export default function AdminPage() {
  return (
    <Suspense>
      <AdminPageClient />
    </Suspense>
  )
}
