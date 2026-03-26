import { api } from './client'

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
}

export interface SearchResponse {
  results: SearchResult[]
  total: number
}

export const searchApi = {
  search: (q: string, page = 1) =>
    api.get<SearchResponse>(`/api/search?q=${encodeURIComponent(q)}&page=${page}`),
  searchOne: (q: string, source: string) =>
    api.get<SearchResult>(`/api/search/one?q=${encodeURIComponent(q)}&source=${source}`),
  getSuggestions: (q: string) =>
    api.get<string[]>(`/api/search/suggestions?q=${encodeURIComponent(q)}`),
  getHistory: () => api.get<string[]>('/api/searchhistory'),
  addHistory: (keyword: string) => api.post('/api/searchhistory', { keyword }),
  clearHistory: () => api.delete('/api/searchhistory'),
}
