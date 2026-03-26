import { memo, useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'

interface SettingsPanelProps {
  isOpen: boolean
  onClose: () => void
}

function readLS<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback
  const v = localStorage.getItem(key)
  if (v === null) return fallback
  try { return JSON.parse(v) as T } catch { return v as unknown as T }
}

const Toggle = memo(({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) => (
  <label className='flex items-center cursor-pointer'>
    <div className='relative'>
      <input type='checkbox' className='sr-only peer' checked={checked} onChange={e => onChange(e.target.checked)} />
      <div className='w-11 h-6 bg-gray-300 rounded-full peer-checked:bg-green-500 transition-colors dark:bg-gray-600'></div>
      <div className='absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform peer-checked:translate-x-5'></div>
    </div>
  </label>
))
Toggle.displayName = 'Toggle'

export const SettingsPanel = memo(({ isOpen, onClose }: SettingsPanelProps) => {
  const [mounted, setMounted] = useState(false)
  const [defaultAggregateSearch, setDefaultAggregateSearch] = useState(true)
  const [doubanProxyUrl, setDoubanProxyUrl] = useState('')
  const [doubanImageProxyType, setDoubanImageProxyType] = useState('server')
  const [doubanImageProxyUrl, setDoubanImageProxyUrl] = useState('')

  useEffect(() => {
    setMounted(true)
    setDefaultAggregateSearch(readLS('defaultAggregateSearch', true))
    setDoubanProxyUrl(readLS('doubanProxyUrl', ''))
    setDoubanImageProxyType(readLS('doubanImageProxyType', 'server'))
    setDoubanImageProxyUrl(readLS('doubanImageProxyUrl', ''))
  }, [])

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
      return () => { document.body.style.overflow = '' }
    }
  }, [isOpen])

  if (!mounted || !isOpen) return null

  const handleSave = () => {
    localStorage.setItem('defaultAggregateSearch', JSON.stringify(defaultAggregateSearch))
    localStorage.setItem('doubanProxyUrl', doubanProxyUrl)
    localStorage.setItem('doubanImageProxyType', doubanImageProxyType)
    localStorage.setItem('doubanImageProxyUrl', doubanImageProxyUrl)
    onClose()
  }

  return createPortal(
    <div className='fixed inset-0 z-[2000] flex items-end md:items-center justify-center'>
      <div className='absolute inset-0 bg-black/50 backdrop-blur-sm' onClick={onClose} />
      <div className='relative w-full max-w-2xl bg-white dark:bg-gray-900 rounded-t-3xl md:rounded-3xl shadow-2xl max-h-[85vh] overflow-hidden flex flex-col'>
        <div className='flex items-center justify-between px-6 py-4 border-b border-gray-200/50 dark:border-gray-700/50 shrink-0'>
          <h2 className='text-xl font-bold text-gray-900 dark:text-white'>设置</h2>
          <button
            onClick={onClose}
            className='p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors'
          >
            <X className='w-5 h-5 text-gray-500' />
          </button>
        </div>

        <div className='flex-1 overflow-y-auto px-6 py-4 space-y-6'>
          <div className='flex items-center justify-between'>
            <div>
              <div className='font-medium text-gray-900 dark:text-white'>默认聚合搜索</div>
              <div className='text-sm text-gray-500 dark:text-gray-400'>搜索时默认搜索所有视频源</div>
            </div>
            <Toggle checked={defaultAggregateSearch} onChange={setDefaultAggregateSearch} />
          </div>

          <div className='space-y-2'>
            <label className='block font-medium text-gray-900 dark:text-white'>豆瓣图片代理类型</label>
            <select
              value={doubanImageProxyType}
              onChange={e => setDoubanImageProxyType(e.target.value)}
              className='w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm'
            >
              <option value='server'>服务器代理</option>
              <option value='direct'>直连</option>
              <option value='img3'>豆瓣官方CDN</option>
              <option value='custom'>自定义</option>
            </select>
          </div>

          {doubanImageProxyType === 'custom' && (
            <div className='space-y-2'>
              <label className='block font-medium text-gray-900 dark:text-white'>自定义图片代理地址</label>
              <input
                type='text'
                value={doubanImageProxyUrl}
                onChange={e => setDoubanImageProxyUrl(e.target.value)}
                placeholder='https://your-proxy.com/?url='
                className='w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm'
              />
            </div>
          )}

          <div className='space-y-2'>
            <label className='block font-medium text-gray-900 dark:text-white'>豆瓣代理地址</label>
            <input
              type='text'
              value={doubanProxyUrl}
              onChange={e => setDoubanProxyUrl(e.target.value)}
              placeholder='留空使用默认配置'
              className='w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm'
            />
          </div>
        </div>

        <div className='px-6 py-4 border-t border-gray-200/50 dark:border-gray-700/50 shrink-0'>
          <button
            onClick={handleSave}
            className='w-full py-3 bg-green-500 hover:bg-green-600 text-white font-semibold rounded-xl transition-colors'
          >
            保存设置
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
})
SettingsPanel.displayName = 'SettingsPanel'
