// Play record
export interface PlayRecord {
  title: string
  source_name: string
  cover: string
  year: string
  index: number
  total_episodes: number
  original_episodes?: number
  play_time: number
  total_time: number
  save_time: number
  search_title: string
  remarks?: string
  douban_id?: number
  type?: string
}

// Favorite
export interface Favorite {
  source_name: string
  total_episodes: number
  title: string
  year: string
  cover: string
  save_time: number
  search_title: string
  origin?: 'vod' | 'live' | 'shortdrama'
  type?: string
  releaseDate?: string
  remarks?: string
}

// Short drama category
export interface ShortDramaCategory {
  type_id: number
  type_name: string
}

// Short drama item
export interface ShortDramaItem {
  id: number
  name: string
  cover: string
  update_time: string
  score: number
  episode_count: number
  description?: string
  author?: string
  backdrop?: string
  vote_average?: number
  tmdb_id?: number
}

// Short drama parse result
export interface ShortDramaParseResult {
  code: number
  msg?: string
  data?: {
    videoId: number
    videoName: string
    currentEpisode: number
    totalEpisodes: number
    parsedUrl: string
    proxyUrl: string
    cover: string
    description: string
    episode?: {
      index: number
      label: string
      parsedUrl: string
      proxyUrl?: string
      title?: string
    }
  }
  metadata?: {
    author?: string
    backdrop?: string
    vote_average?: number
    tmdb_id?: number
  }
}

// Short drama API response
export interface ShortDramaResponse<T> {
  code: number
  msg?: string
  data: T
}

// Search result
export interface SearchResult {
  id: string
  title: string
  poster: string
  episodes: string[]
  episodes_titles: string[]
  source: string
  source_name: string
  class?: string
  year: string
  desc?: string
  type_name?: string
  douban_id?: number
  remarks?: string
  vod_remarks?: string
  rate?: string
  drama_name?: string
  metadata?: {
    author?: string
    backdrop?: string
    vote_average?: number
    tmdb_id?: number
  }
}

// Douban item
export interface DoubanItem {
  id: string
  title: string
  poster: string
  rate: string
  year: string
  directors?: string[]
  screenwriters?: string[]
  cast?: string[]
  genres?: string[]
  countries?: string[]
  languages?: string[]
  episodes?: number
  episode_length?: number
  movie_duration?: number
  first_aired?: string
  plot_summary?: string
  backdrop?: string
  trailerUrl?: string
}

export interface DoubanResult {
  code: number
  message: string
  list: DoubanItem[]
}

// Douban comment
export interface DoubanComment {
  username: string
  user_id: string
  avatar: string
  rating: number
  time: string
  location: string
  content: string
  useful_count: number
}

export interface DoubanCommentsResult {
  code: number
  message: string
  data?: {
    comments: DoubanComment[]
    start: number
    limit: number
    count: number
  }
}

// Skip config
export interface SkipSegment {
  start: number
  end: number
  type: 'opening' | 'ending'
  title?: string
  autoSkip?: boolean
  autoNextEpisode?: boolean
  mode?: 'absolute' | 'remaining'
  remainingTime?: number
}

export interface EpisodeSkipConfig {
  source: string
  id: string
  title: string
  segments: SkipSegment[]
  updated_time: number
}

// Play stats
export interface UserPlayStat {
  username: string
  totalWatchTime: number
  totalPlays: number
  lastPlayTime: number
  recentRecords: PlayRecord[]
  avgWatchTime: number
  mostWatchedSource: string
  totalMovies?: number
  firstWatchDate?: number
  lastUpdateTime?: number
  createdAt?: number
  loginDays?: number
  lastLoginDate?: number
  lastLoginTime?: number
  firstLoginTime?: number
  loginCount?: number
  activeStreak?: number
  continuousLoginDays?: number
}

export interface ContentStat {
  source: string
  count: number
}

export interface PlayStatsResult {
  totalUsers: number
  totalWatchTime: number
  totalPlays: number
  avgWatchTimePerUser: number
  avgPlaysPerUser: number
  userStats: Array<{
    username: string
    totalWatchTime: number
    totalPlays: number
    lastPlayTime: number
    recentRecords: PlayRecord[]
    avgWatchTime: number
    mostWatchedSource: string
    registrationDays: number
    lastLoginTime: number
    loginCount: number
    createdAt: number
  }>
  topSources: Array<{
    source: string
    count: number
  }>
  dailyStats: Array<{
    date: string
    watchTime: number
    plays: number
  }>
  registrationStats: {
    todayNewUsers: number
    totalRegisteredUsers: number
    registrationTrend: Array<{
      date: string
      newUsers: number
    }>
  }
}
