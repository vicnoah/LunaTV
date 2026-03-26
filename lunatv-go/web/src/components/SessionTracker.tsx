import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'

export function SessionTracker() {
  const { pathname } = useLocation()

  useEffect(() => {
    const checkSessionResume = async () => {
      try {
        if (pathname === '/login') return

        const authCookie = document.cookie.split(';').find(cookie => {
          const trimmed = cookie.trim()
          return trimmed.startsWith('user_auth=') || trimmed.startsWith('auth=')
        })

        if (!authCookie) return

        const lastRecordedLogin = localStorage.getItem('lastRecordedLogin')
        const now = Date.now()
        const sessionTimeout = 4 * 60 * 60 * 1000

        const shouldRecordLogin = !lastRecordedLogin ||
          (now - parseInt(lastRecordedLogin)) > sessionTimeout

        if (shouldRecordLogin) {
          const response = await fetch('/api/user/my-stats', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ loginTime: now }),
          })

          if (response.ok) {
            localStorage.setItem('lastRecordedLogin', now.toString())
          }
        }
      } catch (error) {
        console.error('会话检测失败:', error)
      }
    }

    checkSessionResume()

    const handleVisibilityChange = () => {
      if (!document.hidden) {
        setTimeout(checkSessionResume, 1000)
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange)
  }, [pathname])

  return null
}
