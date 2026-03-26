import { LogOut, Settings, User } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useEffect, useRef, useState } from 'react'
import { getCurrentUser, clearToken } from '@/lib/auth'
import { SettingsPanel } from './SettingsPanel'
import { VersionPanel } from './VersionPanel'

export const UserMenu: React.FC = () => {
  const navigate = useNavigate()
  const [isOpen, setIsOpen] = useState(false)
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [isVersionPanelOpen, setIsVersionPanelOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  const user = getCurrentUser()

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    if (isOpen) document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isOpen])

  const handleLogout = () => {
    clearToken()
    navigate('/login', { replace: true })
  }

  return (
    <>
      <div className='relative' ref={menuRef}>
        <button
          onClick={() => setIsOpen(o => !o)}
          className='relative w-10 h-10 p-1 rounded-full flex items-center justify-center text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white transition-all duration-200 hover:bg-gray-100 dark:hover:bg-gray-800'
          aria-label='用户菜单'
        >
          <div className='w-8 h-8 rounded-full bg-linear-to-br from-green-500 to-emerald-600 flex items-center justify-center text-white text-sm font-bold'>
            {user?.username?.[0]?.toUpperCase() || <User className='w-4 h-4' />}
          </div>
        </button>

        {isOpen && (
          <div className='absolute right-0 top-12 w-56 bg-white dark:bg-gray-900 rounded-2xl shadow-xl border border-gray-200/50 dark:border-gray-700/50 overflow-hidden z-50'>
            {user && (
              <div className='px-4 py-3 border-b border-gray-100 dark:border-gray-800'>
                <div className='font-semibold text-gray-900 dark:text-white truncate'>{user.username}</div>
                <div className='text-xs text-gray-500 dark:text-gray-400 capitalize'>{user.role}</div>
              </div>
            )}
            <div className='py-1'>
              <button
                onClick={() => { setIsSettingsOpen(true); setIsOpen(false) }}
                className='w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors'
              >
                <Settings className='w-4 h-4' />
                设置
              </button>
              <button
                onClick={() => { setIsVersionPanelOpen(true); setIsOpen(false) }}
                className='w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors'
              >
                <span className='w-4 h-4 text-center text-xs font-bold'>v</span>
                版本信息
              </button>
              {(user?.role === 'owner' || user?.role === 'admin') ? (
                <button
                  onClick={() => { navigate('/admin'); setIsOpen(false) }}
                  className='w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors'
                >
                  <Settings className='w-4 h-4' />
                  管理后台
                </button>
              ) : null}
              <button
                onClick={handleLogout}
                className='w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors'
              >
                <LogOut className='w-4 h-4' />
                退出登录
              </button>
            </div>
          </div>
        )}
      </div>

      <SettingsPanel isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
      <VersionPanel isOpen={isVersionPanelOpen} onClose={() => setIsVersionPanelOpen(false)} />
    </>
  )
}
