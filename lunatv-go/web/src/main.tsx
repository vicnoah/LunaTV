import React from 'react'
import ReactDOM from 'react-dom/client'
import { QueryProvider } from '@/components/QueryProvider'
import { ThemeProvider } from '@/components/ThemeProvider'
import { SiteProvider } from '@/contexts/SiteContext'
import { DownloadProvider } from '@/contexts/DownloadContext'
import { WatchRoomProvider } from '@/contexts/WatchRoomContext'
import { GlobalCacheProvider } from '@/contexts/GlobalCacheContext'
import { GlobalErrorIndicator } from '@/components/GlobalErrorIndicator'
import { SessionTracker } from '@/components/SessionTracker'
import { Toaster } from 'sonner'
import App from './App'
import '@/styles/globals.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ThemeProvider>
      <QueryProvider>
        <SiteProvider>
          <GlobalCacheProvider>
            <DownloadProvider>
              <WatchRoomProvider>
                <App />
                <GlobalErrorIndicator />
                <SessionTracker />
                <Toaster richColors position='top-right' />
              </WatchRoomProvider>
            </DownloadProvider>
          </GlobalCacheProvider>
        </SiteProvider>
      </QueryProvider>
    </ThemeProvider>
  </React.StrictMode>
)
