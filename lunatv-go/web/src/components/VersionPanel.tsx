import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { X, RefreshCw } from 'lucide-react'

const CURRENT_VERSION = '7.0.0'

interface VersionPanelProps {
  isOpen: boolean
  onClose: () => void
}

export const VersionPanel: React.FC<VersionPanelProps> = ({ isOpen, onClose }) => {
  const [mounted, setMounted] = useState(false)
  const [latestVersion, setLatestVersion] = useState('')
  const [hasUpdate, setHasUpdate] = useState(false)
  const [checking, setChecking] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
      return () => { document.body.style.overflow = '' }
    }
  }, [isOpen])

  const checkForUpdates = async () => {
    setChecking(true)
    try {
      const res = await fetch('https://api.github.com/repos/senshinya/moonTV/releases/latest')
      if (res.ok) {
        const data = await res.json()
        const latest = data.tag_name?.replace(/^v/, '') || ''
        setLatestVersion(latest)
        setHasUpdate(latest > CURRENT_VERSION)
      }
    } catch {
      // ignore
    } finally {
      setChecking(false)
    }
  }

  useEffect(() => {
    if (isOpen) checkForUpdates()
  }, [isOpen]) // eslint-disable-line react-hooks/exhaustive-deps

  if (!mounted || !isOpen) return null

  return createPortal(
    <div className='fixed inset-0 z-[2000] flex items-end md:items-center justify-center'>
      <div className='absolute inset-0 bg-black/50 backdrop-blur-sm' onClick={onClose} />
      <div className='relative w-full max-w-lg bg-white dark:bg-gray-900 rounded-t-3xl md:rounded-3xl shadow-2xl'>
        <div className='flex items-center justify-between px-6 py-4 border-b border-gray-200/50 dark:border-gray-700/50'>
          <h2 className='text-xl font-bold text-gray-900 dark:text-white'>版本信息</h2>
          <button
            onClick={onClose}
            className='p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors'
          >
            <X className='w-5 h-5 text-gray-500' />
          </button>
        </div>
        <div className='px-6 py-6 space-y-4'>
          <div className='flex items-center justify-between'>
            <span className='text-gray-600 dark:text-gray-400'>当前版本</span>
            <span className='font-semibold text-gray-900 dark:text-white'>v{CURRENT_VERSION}</span>
          </div>
          {latestVersion && (
            <div className='flex items-center justify-between'>
              <span className='text-gray-600 dark:text-gray-400'>最新版本</span>
              <span className={`font-semibold ${hasUpdate ? 'text-green-500' : 'text-gray-900 dark:text-white'}`}>
                v{latestVersion}
              </span>
            </div>
          )}
          {hasUpdate && (
            <div className='p-3 bg-green-50 dark:bg-green-900/20 rounded-lg text-sm text-green-600 dark:text-green-400'>
              有新版本可用，请前往 GitHub 更新
            </div>
          )}
          <button
            onClick={checkForUpdates}
            disabled={checking}
            className='flex items-center gap-2 px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors'
          >
            <RefreshCw className={`w-4 h-4 ${checking ? 'animate-spin' : ''}`} />
            检查更新
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}
