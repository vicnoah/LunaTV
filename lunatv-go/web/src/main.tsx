import React from 'react'
import ReactDOM from 'react-dom/client'
import { QueryProvider } from '@/components/QueryProvider'
import { ThemeProvider } from '@/components/ThemeProvider'
import { SiteProvider } from '@/contexts/SiteContext'
import { DownloadProvider } from '@/contexts/DownloadContext'
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
          <DownloadProvider>
            <App />
            <GlobalErrorIndicator />
            <SessionTracker />
            <Toaster richColors position="top-right" />
          </DownloadProvider>
        </SiteProvider>
      </QueryProvider>
    </ThemeProvider>
  </React.StrictMode>
)
