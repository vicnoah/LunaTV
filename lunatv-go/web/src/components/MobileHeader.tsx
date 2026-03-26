import { Link } from 'react-router-dom'
import { BackButton } from './BackButton'
import { useSite } from '@/contexts/SiteContext'
import { ThemeToggle } from './ThemeToggle'
import { UserMenu } from './UserMenu'

interface MobileHeaderProps {
  showBackButton?: boolean
}

const MobileHeader = ({ showBackButton = false }: MobileHeaderProps) => {
  const { siteName } = useSite()
  return (
    <header className='md:hidden fixed top-0 left-0 right-0 z-[999] w-full bg-white/90 backdrop-blur-md border-b border-gray-200/50 shadow-sm dark:bg-gray-900/90 dark:border-gray-700/50'>
      <div className='h-12 flex items-center justify-between px-4'>
        <div className='flex items-center gap-2'>
          <Link
            to='/search'
            className='w-10 h-10 p-2 rounded-full flex items-center justify-center text-gray-600 hover:bg-gray-200/50 dark:text-gray-300 dark:hover:bg-gray-700/50 transition-colors'
          >
            <svg className='w-full h-full' fill='none' stroke='currentColor' viewBox='0 0 24 24' xmlns='http://www.w3.org/2000/svg'>
              <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z' />
            </svg>
          </Link>
          {showBackButton && <BackButton />}
        </div>

        <div className='flex items-center gap-2'>
          <ThemeToggle />
          <UserMenu />
        </div>
      </div>

      <div className='absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2'>
        <Link to='/' className='text-2xl font-bold text-green-600 tracking-tight hover:opacity-80 transition-opacity'>
          {siteName}
        </Link>
      </div>
    </header>
  )
}

export default MobileHeader
