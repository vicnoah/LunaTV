import { api } from './client'
import type { PlayRecord } from '@/types'

export interface PlayRecordsMap {
  [key: string]: PlayRecord & { key?: string }
}

export const playRecordsApi = {
  getAll: () => api.get<PlayRecordsMap>('/api/playrecords'),
  save: (source: string, id: string, record: PlayRecord) =>
    api.post(`/api/playrecords/${source}/${id}`, record),
  delete: (source: string, id: string) =>
    api.delete(`/api/playrecords/${source}/${id}`),
  clear: () => api.delete('/api/playrecords'),
}
