import { Outlet, useLocation } from 'react-router-dom'
import { BackButton } from './BackButton'
import MobileBottomNav from './MobileBottomNav'
import MobileHeader from './MobileHeader'
import ModernNav from './ModernNav'
import Sidebar from './Sidebar'
import { ThemeToggle } from './ThemeToggle'
import { UserMenu } from './UserMenu'
import { useSite } from '@/contexts/SiteContext'

interface PageLayoutProps {
  useModernNav?: boolean
}

const PageLayout = ({ useModernNav = true }: PageLayoutProps) => {
  const { pathname } = useLocation()
  const { siteName } = useSite()

  if (useModernNav) {
    return (
      <>
        <div className='w-full min-h-screen'>
          <ModernNav />

          <div className='md:hidden fixed top-0 left-0 right-0 z-40 bg-white/90 dark:bg-gray-900/90 backdrop-blur-md shadow-sm'>
            <div className='flex items-center justify-between h-11 px-4'>
              <div className='text-base font-bold bg-linear-to-r from-green-600 via-emerald-600 to-teal-600 dark:from-green-400 dark:via-emerald-400 dark:to-teal-400 bg-clip-text text-transparent'>
                {siteName}
              </div>
              <div className='flex items-center gap-1.5'>
                <ThemeToggle />
                <UserMenu />
              </div>
            </div>
          </div>

          <main className='w-full min-h-screen pt-[44px] md:pt-16 pb-16 md:pb-8'>
            <div className='w-full max-w-[2560px] mx-auto px-4 sm:px-6 md:px-8 lg:px-12 xl:px-16 2xl:px-20'>
              <Outlet />
            </div>
          </main>
        </div>
      </>
    )
  }

  return (
    <div className='w-full min-h-screen'>
      <MobileHeader showBackButton={['/play', '/live'].includes(pathname)} />

      <div className='flex md:grid md:grid-cols-[auto_1fr] w-full min-h-screen md:min-h-auto'>
        <div className='hidden md:block'>
          <Sidebar activePath={pathname} />
        </div>

        <div className='relative min-w-0 flex-1 transition-all duration-300'>
          {['/play', '/live'].includes(pathname) && (
            <div className='absolute top-3 left-1 z-20 hidden md:flex'>
              <BackButton />
            </div>
          )}
          <div className='absolute top-2 right-4 z-20 hidden md:flex items-center gap-2'>
            <ThemeToggle />
            <UserMenu />
          </div>
          <main
            className='flex-1 md:min-h-0 mb-14 md:mb-0 md:mt-0 mt-12'
            style={{ paddingBottom: 'calc(5.5rem + env(safe-area-inset-bottom))' }}
          >
            <Outlet />
          </main>
        </div>
      </div>

      <div className='md:hidden'>
        <MobileBottomNav activePath={pathname} />
      </div>
    </div>
  )
}

export default PageLayout
