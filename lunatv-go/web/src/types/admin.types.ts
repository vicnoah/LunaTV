export interface AdminConfig {
  ConfigSubscribtion: {
    URL: string
    AutoUpdate: boolean
    LastCheck: string
  }
  ConfigFile: string
  SiteConfig: {
    SiteName: string
    Announcement: string
    SearchDownstreamMaxPage: number
    SiteInterfaceCacheTime: number
    DoubanProxyType: string
    DoubanProxy: string
    DoubanImageProxyType: string
    DoubanImageProxy: string
    DisableYellowFilter: boolean
    ShowAdultContent: boolean
    FluidSearch: boolean
    EnableWebLive: boolean
    TMDBApiKey?: string
    TMDBLanguage?: string
    EnableTMDBActorSearch?: boolean
    CustomAdFilterCode?: string
    CustomAdFilterVersion?: number
    DefaultUserTags?: string[]
  }
  UserConfig: {
    AllowRegister?: boolean
    AutoCleanupInactiveUsers?: boolean
    InactiveUserDays?: number
    Users: {
      username: string
      role: 'user' | 'admin' | 'owner'
      banned?: boolean
      enabledApis?: string[]
      tags?: string[]
      createdAt?: number
      tvboxToken?: string
      tvboxEnabledSources?: string[]
      showAdultContent?: boolean
      oidcSub?: string
      embyConfig?: {
        sources: Array<{
          key: string
          name: string
          enabled: boolean
          ServerURL: string
          ApiKey?: string
          Username?: string
          Password?: string
          UserId?: string
          AuthToken?: string
          Libraries?: string[]
          removeEmbyPrefix?: boolean
          appendMediaSourceId?: boolean
          transcodeMp4?: boolean
          proxyPlay?: boolean
        }>
      }
    }[]
    Tags?: {
      name: string
      enabledApis: string[]
      showAdultContent?: boolean
    }[]
  }
  SourceConfig: {
    key: string
    name: string
    api: string
    detail?: string
    from: 'config' | 'custom'
    disabled?: boolean
    is_adult?: boolean
    type?: 'vod' | 'shortdrama'
    weight?: number
  }[]
  CustomCategories: {
    name?: string
    type: 'movie' | 'tv'
    query: string
    from: 'config' | 'custom'
    disabled?: boolean
  }[]
  LiveConfig?: {
    key: string
    name: string
    url: string
    ua?: string
    epg?: string
    isTvBox?: boolean
    from: 'config' | 'custom'
    channelNumber?: number
    disabled?: boolean
  }[]
  NetDiskConfig?: {
    enabled: boolean
    pansouUrl: string
    timeout: number
    enabledCloudTypes: string[]
  }
  AIRecommendConfig?: {
    enabled: boolean
    apiUrl: string
    apiKey: string
    model: string
    temperature: number
    maxTokens: number
    enableOrchestrator?: boolean
    enableWebSearch?: boolean
    tavilyApiKeys?: string[]
  }
  YouTubeConfig?: {
    enabled: boolean
    apiKey: string
    enableDemo: boolean
    maxResults: number
    enabledRegions: string[]
    enabledCategories: string[]
  }
  TVBoxSecurityConfig?: {
    enableAuth: boolean
    token: string
    enableIpWhitelist: boolean
    allowedIPs: string[]
    enableRateLimit: boolean
    rateLimit: number
  }
  TVBoxProxyConfig?: {
    enabled: boolean
    proxyUrl: string
  }
  VideoProxyConfig?: {
    enabled: boolean
    proxyUrl: string
  }
  TelegramAuthConfig?: {
    enabled: boolean
    botToken: string
    botUsername: string
    autoRegister: boolean
    buttonSize: 'large' | 'medium' | 'small'
    showAvatar: boolean
    requestWriteAccess: boolean
  }
  OIDCAuthConfig?: {
    enabled: boolean
    enableRegistration: boolean
    issuer: string
    authorizationEndpoint: string
    tokenEndpoint: string
    userInfoEndpoint: string
    clientId: string
    clientSecret: string
    buttonText: string
    minTrustLevel: number
  }
  OIDCProviders?: {
    id: string
    name: string
    enabled: boolean
    enableRegistration: boolean
    issuer: string
    authorizationEndpoint: string
    tokenEndpoint: string
    userInfoEndpoint: string
    clientId: string
    clientSecret: string
    buttonText: string
    minTrustLevel: number
  }[]
  ShortDramaConfig?: {
    primaryApiUrl: string
    alternativeApiUrl: string
    enableAlternative: boolean
  }
  DownloadConfig?: {
    enabled: boolean
  }
  WatchRoomConfig?: {
    enabled: boolean
    serverUrl: string
    authKey: string
  }
  DoubanConfig?: {
    enablePuppeteer: boolean
    cookies?: string
  }
  CronConfig?: {
    enableAutoRefresh: boolean
    maxRecordsPerRun: number
    onlyRefreshRecent: boolean
    recentDays: number
    onlyRefreshOngoing: boolean
  }
  TrustedNetworkConfig?: {
    enabled: boolean
    trustedIPs: string[]
  }
  DanmuApiConfig?: {
    enabled: boolean
    useCustomApi: boolean
    customApiUrl: string
    customToken: string
    timeout: number
  }
  EmbyConfig?: {
    Sources?: Array<{
      key: string
      name: string
      enabled: boolean
      ServerURL: string
      ApiKey?: string
      Username?: string
      Password?: string
      UserId?: string
      AuthToken?: string
      Libraries?: string[]
      LastSyncTime?: number
      ItemCount?: number
      isDefault?: boolean
      isPublic?: boolean
      removeEmbyPrefix?: boolean
      appendMediaSourceId?: boolean
      transcodeMp4?: boolean
      proxyPlay?: boolean
    }>
  }
}

export interface AdminConfigResult {
  Role: 'owner' | 'admin'
  Config: AdminConfig
}
