import { useQuery } from '@tanstack/react-query'
import { api } from '@/api/client'
import type { PlayStatsResult } from '@/types'

export function useAdminStatsQuery(enabled: boolean) {
  return useQuery<PlayStatsResult>({
    queryKey: ['playStats', 'admin'],
    queryFn: () => api.get<PlayStatsResult>('/api/admin/play-stats'),
    enabled,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    retry: 1,
  })
}

export function useUserStatsQuery(enabled: boolean) {
  return useQuery({
    queryKey: ['playStats', 'user'],
    queryFn: () => api.get('/api/user/my-stats'),
    enabled,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    retry: 1,
  })
}
