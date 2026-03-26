import { createContext, ReactNode, useContext, useEffect, useState } from 'react'

interface SiteConfig {
  siteName: string
  announcement?: string
  disableHeroTrailer?: boolean
  shouldAskUsername?: boolean
}

const SiteContext = createContext<SiteConfig>({
  siteName: 'MoonTV',
})

export function useSiteConfig(): SiteConfig {
  return useContext(SiteContext)
}

// Legacy alias
export const useSite = useSiteConfig

export function SiteProvider({ children }: { children: ReactNode }) {
  const [config, setConfig] = useState<SiteConfig>({ siteName: 'MoonTV' })

  useEffect(() => {
    fetch('/api/server-config')
      .then((r) => r.json())
      .then((data) => {
        setConfig({
          siteName: data.siteName || 'MoonTV',
          announcement: data.announcement,
          disableHeroTrailer: data.disableHeroTrailer,
          shouldAskUsername: data.storageType !== 'localstorage',
        })
      })
      .catch(() => {/* keep defaults */})
  }, [])

  return <SiteContext.Provider value={config}>{children}</SiteContext.Provider>
}
