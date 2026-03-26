import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { lazy, Suspense } from 'react'
import { isLoggedIn } from '@/lib/auth'
import PageLayout from '@/components/PageLayout'

const HomePage = lazy(() => import('@/pages/HomePage'))
const SearchPage = lazy(() => import('@/pages/SearchPage'))
const PlayPage = lazy(() => import('@/pages/PlayPage'))
const LoginPage = lazy(() => import('@/pages/LoginPage'))
const RegisterPage = lazy(() => import('@/pages/RegisterPage'))
const DoubanPage = lazy(() => import('@/pages/DoubanPage'))
const EmbyPage = lazy(() => import('@/pages/EmbyPage'))
const LivePage = lazy(() => import('@/pages/LivePage'))
const ShortDramaPage = lazy(() => import('@/pages/ShortDramaPage'))
const SourceBrowserPage = lazy(() => import('@/pages/SourceBrowserPage'))
const AdminPage = lazy(() => import('@/pages/AdminPage'))
const WatchRoomPage = lazy(() => import('@/pages/WatchRoomPage'))
const PlayStatsPage = lazy(() => import('@/pages/PlayStatsPage'))
const ReleaseCalendarPage = lazy(() => import('@/pages/ReleaseCalendarPage'))
const SourceTestPage = lazy(() => import('@/pages/SourceTestPage'))
const TVBoxPage = lazy(() => import('@/pages/TVBoxPage'))
const WarningPage = lazy(() => import('@/pages/WarningPage'))
const OIDCRegisterPage = lazy(() => import('@/pages/OIDCRegisterPage'))

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  if (!isLoggedIn()) return <Navigate to='/login' replace />
  return <>{children}</>
}

export default function App() {
  return (
    <BrowserRouter>
      <Suspense
        fallback={
          <div className='flex items-center justify-center min-h-screen'>
            <div className='animate-spin rounded-full h-8 w-8 border-b-2 border-primary' />
          </div>
        }
      >
        <Routes>
          <Route path='/login' element={<LoginPage />} />
          <Route path='/register' element={<RegisterPage />} />
          <Route path='/warning' element={<WarningPage />} />
          <Route path='/oidc-register' element={<OIDCRegisterPage />} />

          <Route
            element={
              <ProtectedRoute>
                <PageLayout />
              </ProtectedRoute>
            }
          >
            <Route path='/' element={<HomePage />} />
            <Route path='/search' element={<SearchPage />} />
            <Route path='/play' element={<PlayPage />} />
            <Route path='/douban' element={<DoubanPage />} />
            <Route path='/emby' element={<EmbyPage />} />
            <Route path='/live' element={<LivePage />} />
            <Route path='/shortdrama' element={<ShortDramaPage />} />
            <Route path='/source-browser' element={<SourceBrowserPage />} />
            <Route path='/admin' element={<AdminPage />} />
            <Route path='/watch-room' element={<WatchRoomPage />} />
            <Route path='/play-stats' element={<PlayStatsPage />} />
            <Route path='/release-calendar' element={<ReleaseCalendarPage />} />
            <Route path='/source-test' element={<SourceTestPage />} />
            <Route path='/tvbox' element={<TVBoxPage />} />
          </Route>
        </Routes>
      </Suspense>
    </BrowserRouter>
  )
}
