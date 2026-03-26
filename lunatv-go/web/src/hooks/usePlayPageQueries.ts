import { useQuery } from '@tanstack/react-query'
import type { UseQueryResult } from '@tanstack/react-query'
import { getDoubanDetails, getDoubanComments } from '@/lib/douban.client'

export interface DoubanDetails {
  id: string
  title: string
  rating: number
  year: string
  directors: string[]
  actors: string[]
  genres: string[]
  summary: string
  poster: string
  [key: string]: unknown
}

export function useDoubanDetailsQuery(
  doubanId?: number | string,
  enabled?: boolean,
): UseQueryResult<DoubanDetails | null, Error> {
  return useQuery({
    queryKey: ['douban', 'details', doubanId],
    queryFn: async () => {
      if (!doubanId) throw new Error('Douban ID is required')
      const result = await getDoubanDetails(String(doubanId))
      if (result.code === 200 && result.data && result.data.title) return result.data as unknown as DoubanDetails
      return null
    },
    enabled: enabled !== undefined ? enabled : !!doubanId,
    staleTime: 30 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
    retry: 2,
  })
}

export function useDoubanCommentsQuery(
  doubanId?: number | string,
  enabled?: boolean,
) {
  return useQuery({
    queryKey: ['douban', 'comments', doubanId],
    queryFn: async () => {
      if (!doubanId) throw new Error('Douban ID is required')
      const result = await getDoubanComments(String(doubanId))
      if (result.code === 200 && result.data) return result.data
      return null
    },
    enabled: enabled !== undefined ? enabled : !!doubanId,
    staleTime: 30 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
    retry: 2,
  })
}
