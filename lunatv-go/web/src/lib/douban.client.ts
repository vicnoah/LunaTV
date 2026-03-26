import { api } from '@/api/client'
import type { DoubanResult, DoubanCommentsResult, DoubanItem } from '@/types'

export interface DoubanDetailsData extends DoubanItem {
  plot_summary?: string
  trailerUrl?: string
}

export async function getDoubanCategories(params: {
  kind: 'movie' | 'tv'
  category: string
  type: string
}): Promise<DoubanResult> {
  const q = new URLSearchParams({
    kind: params.kind,
    category: params.category,
    type: params.type,
  })
  return api.get<DoubanResult>(`/api/douban/categories?${q}`)
}

export async function getDoubanDetails(id: string): Promise<{ code: number; data: DoubanDetailsData }> {
  return api.get(`/api/douban/details/${id}`)
}

export async function getDoubanComments(id: string, start = 0, limit = 20): Promise<DoubanCommentsResult> {
  return api.get(`/api/douban/comments/${id}?start=${start}&limit=${limit}`)
}

export async function getDoubanActorMovies(actorId: string, type: 'movie' | 'tv' = 'movie'): Promise<DoubanResult> {
  return api.get(`/api/douban/actor/${actorId}?type=${type}`)
}
