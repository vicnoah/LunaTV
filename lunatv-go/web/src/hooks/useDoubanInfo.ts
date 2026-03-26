import { useQuery } from '@tanstack/react-query'
import { getDoubanDetails, getDoubanComments } from '@/lib/douban.client'

export function useDoubanInfo(doubanId?: number | string) {
  const details = useQuery({
    queryKey: ['douban', 'details', doubanId],
    queryFn: async () => {
      if (!doubanId) return null
      const res = await getDoubanDetails(String(doubanId))
      if (res.code === 200 && res.data) return res.data
      return null
    },
    enabled: !!doubanId,
    staleTime: 30 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
    retry: 2,
  })

  const comments = useQuery({
    queryKey: ['douban', 'comments', doubanId],
    queryFn: async () => {
      if (!doubanId) return null
      const res = await getDoubanComments(String(doubanId))
      if (res.code === 200 && res.data) return res.data
      return null
    },
    enabled: !!doubanId,
    staleTime: 30 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
    retry: 2,
  })

  return { details, comments }
}
