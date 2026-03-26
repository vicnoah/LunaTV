import { Moon, Sun } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useTheme } from './ThemeProvider'

export function ThemeToggle() {
  const [mounted, setMounted] = useState(false)
  const { theme, setTheme } = useTheme()

  const resolvedTheme = theme === 'system'
    ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
    : theme

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return <div className='w-10 h-10' />
  }

  const toggleTheme = () => {
    const targetTheme = resolvedTheme === 'dark' ? 'light' : 'dark'

    if (!(document as unknown as Record<string, unknown>).startViewTransition) {
      setTheme(targetTheme)
      return
    }

    ;(document as unknown as { startViewTransition: (cb: () => void) => void }).startViewTransition(() => {
      setTheme(targetTheme)
    })
  }

  return (
    <button
      onClick={toggleTheme}
      className='relative w-10 h-10 p-2 rounded-full flex items-center justify-center text-gray-600 hover:text-amber-500 dark:text-gray-300 dark:hover:text-amber-400 transition-all duration-300 hover:scale-110 hover:shadow-lg hover:shadow-amber-500/30 dark:hover:shadow-amber-400/30 group'
      aria-label='Toggle theme'
    >
      <div className='absolute inset-0 rounded-full bg-linear-to-br from-amber-400/0 to-amber-600/0 group-hover:from-amber-400/20 group-hover:to-amber-600/20 dark:group-hover:from-amber-300/20 dark:group-hover:to-amber-500/20 transition-all duration-300'></div>
      {resolvedTheme === 'dark' ? (
        <Sun className='w-full h-full relative z-10 group-hover:rotate-180 transition-transform duration-500' />
      ) : (
        <Moon className='w-full h-full relative z-10 group-hover:rotate-180 transition-transform duration-500' />
      )}
    </button>
  )
}
