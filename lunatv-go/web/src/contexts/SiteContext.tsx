import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'

interface RuntimeConfig {
  STORAGE_TYPE: string
  DOUBAN_PROXY_TYPE: string
  DOUBAN_PROXY: string
  DOUBAN_IMAGE_PROXY_TYPE: string
  DOUBAN_IMAGE_PROXY: string
  DISABLE_YELLOW_FILTER: boolean
  CUSTOM_CATEGORIES: { name: string; type: 'movie' | 'tv'; query: string }[]
  FLUID_SEARCH: boolean
  ENABLE_WEB_LIVE: boolean
  CUSTOM_AD_FILTER_VERSION: number
  AI_RECOMMEND_ENABLED: boolean
  EMBY_ENABLED: boolean
  PRIVATE_LIBRARY_ENABLED: boolean
  DISABLE_HERO_TRAILER: boolean
}

interface SiteContextValue {
  siteName: string
  announcement: string
  runtimeConfig: RuntimeConfig | null
  loading: boolean
}

const defaultRuntimeConfig: RuntimeConfig = {
  STORAGE_TYPE: 'localstorage',
  DOUBAN_PROXY_TYPE: 'direct',
  DOUBAN_PROXY: '',
  DOUBAN_IMAGE_PROXY_TYPE: 'server',
  DOUBAN_IMAGE_PROXY: '',
  DISABLE_YELLOW_FILTER: false,
  CUSTOM_CATEGORIES: [],
  FLUID_SEARCH: true,
  ENABLE_WEB_LIVE: false,
  CUSTOM_AD_FILTER_VERSION: 0,
  AI_RECOMMEND_ENABLED: false,
  EMBY_ENABLED: false,
  PRIVATE_LIBRARY_ENABLED: false,
  DISABLE_HERO_TRAILER: false,
}

const SiteContext = createContext<SiteContextValue>({
  siteName: 'MoonTV',
  announcement: '',
  runtimeConfig: null,
  loading: true,
})

export function SiteProvider({ children }: { children: ReactNode }) {
  const [siteName, setSiteName] = useState('MoonTV')
  const [announcement, setAnnouncement] = useState('')
  const [runtimeConfig, setRuntimeConfig] = useState<RuntimeConfig | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const res = await fetch('/api/server-config')
        if (res.ok) {
          const data = await res.json()
          const config: RuntimeConfig = {
            ...defaultRuntimeConfig,
            ...data,
          }
          setSiteName(data.siteName || data.SITE_NAME || 'MoonTV')
          setAnnouncement(data.announcement || data.ANNOUNCEMENT || '')
          setRuntimeConfig(config)
          // Inject into window for legacy components
          ;(window as unknown as { RUNTIME_CONFIG: RuntimeConfig }).RUNTIME_CONFIG = config
        } else {
          setRuntimeConfig(defaultRuntimeConfig)
          ;(window as unknown as { RUNTIME_CONFIG: RuntimeConfig }).RUNTIME_CONFIG = defaultRuntimeConfig
        }
      } catch {
        setRuntimeConfig(defaultRuntimeConfig)
        ;(window as unknown as { RUNTIME_CONFIG: RuntimeConfig }).RUNTIME_CONFIG = defaultRuntimeConfig
      } finally {
        setLoading(false)
      }
    }

    fetchConfig()
  }, [])

  return (
    <SiteContext.Provider value={{ siteName, announcement, runtimeConfig, loading }}>
      {children}
    </SiteContext.Provider>
  )
}

export function useSite() {
  return useContext(SiteContext)
}
