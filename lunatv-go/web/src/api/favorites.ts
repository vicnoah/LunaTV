import { api } from './client'
import type { Favorite } from '@/types'

export interface FavoritesMap {
  [key: string]: Favorite
}

export const favoritesApi = {
  getAll: () => api.get<FavoritesMap>('/api/favorites'),
  save: (source: string, id: string, favorite: Favorite) =>
    api.post(`/api/favorites/${source}/${id}`, favorite),
  delete: (source: string, id: string) =>
    api.delete(`/api/favorites/${source}/${id}`),
  clear: () => api.delete('/api/favorites'),
  isFavorited: (source: string, id: string) =>
    api.get<{ favorited: boolean }>(`/api/favorites/${source}/${id}/check`),
}
