import { api } from '@/api/client'
import type { ShortDramaItem } from '@/types'

export async function getRecommendedShortDramas(category?: string, limit = 8): Promise<ShortDramaItem[]> {
  const params = new URLSearchParams()
  if (category) params.set('category', category)
  params.set('limit', String(limit))
  return api.get<ShortDramaItem[]>(`/api/shortdrama/recommended?${params}`)
}
