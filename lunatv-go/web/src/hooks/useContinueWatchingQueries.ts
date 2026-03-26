import { useQuery } from '@tanstack/react-query'
import { getAllPlayRecords } from '@/lib/db.client'
import type { PlayRecord } from '@/types'

export type PlayRecordWithKey = PlayRecord & { key: string }

export function useContinueWatchingQuery() {
  return useQuery<PlayRecordWithKey[]>({
    queryKey: ['continueWatching'],
    queryFn: async () => {
      const all = await getAllPlayRecords()
      return Object.entries(all)
        .sort(([, a], [, b]) => (b.save_time || 0) - (a.save_time || 0))
        .slice(0, 20)
        .map(([key, record]) => ({ ...record, key }))
    },
    staleTime: 30 * 1000,
    gcTime: 5 * 60 * 1000,
  })
}

export function useWatchingUpdatesQuery(enabled: boolean) {
  return useQuery({
    queryKey: ['watchingUpdates'],
    queryFn: async () => {
      const res = await import('@/api/client').then((m) => m.api)
      return res.get<{ updatedSeries: Array<{ sourceKey: string; videoId: string; hasNewEpisode: boolean }> }>('/api/watching-updates')
    },
    enabled,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  })
}
