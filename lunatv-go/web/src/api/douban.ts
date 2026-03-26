import { api } from './client'
import type { DoubanItem, DoubanResult, DoubanComment, DoubanCommentsResult } from '@/types'

export interface DoubanCategoryParams {
  kind: 'movie' | 'tv'
  category: string
  type: string
  page?: number
  limit?: number
}

export const doubanApi = {
  getCategories: (params: DoubanCategoryParams) => {
    const q = new URLSearchParams({
      kind: params.kind,
      category: params.category,
      type: params.type,
      ...(params.page ? { page: String(params.page) } : {}),
      ...(params.limit ? { limit: String(params.limit) } : {}),
    })
    return api.get<DoubanResult>(`/api/douban/categories?${q}`)
  },
  getDetails: (id: string) =>
    api.get<{ code: number; data: DoubanItem & { plot_summary?: string; backdrop?: string; trailerUrl?: string } }>(`/api/douban/details/${id}`),
  getComments: (id: string, start = 0, limit = 20) =>
    api.get<DoubanCommentsResult>(`/api/douban/comments/${id}?start=${start}&limit=${limit}`),
  getActorMovies: (actorId: string, type: 'movie' | 'tv' = 'movie') =>
    api.get<DoubanResult>(`/api/douban/actor/${actorId}?type=${type}`),
}
