import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

export function useRefreshedTrailerUrlsQuery() {
  return useQuery<Record<string, string>>({
    queryKey: ['refreshedTrailerUrls'],
    queryFn: () => {
      try {
        const stored = localStorage.getItem('refreshed-trailer-urls')
        return stored ? JSON.parse(stored) : {}
      } catch {
        return {}
      }
    },
    initialData: () => {
      try {
        const stored = localStorage.getItem('refreshed-trailer-urls')
        return stored ? JSON.parse(stored) : {}
      } catch {
        return {}
      }
    },
    staleTime: Infinity,
    gcTime: Infinity,
  })
}

export function useRefreshTrailerUrlMutation() {
  const queryClient = useQueryClient()

  return useMutation<string | null, Error, { doubanId: number | string }>({
    mutationFn: async ({ doubanId }) => {
      const response = await fetch(`/api/douban/refresh-trailer?id=${doubanId}`)
      if (!response.ok) return null
      const data = await response.json()
      if (data.code === 200 && data.data?.trailerUrl) return data.data.trailerUrl
      return null
    },
    onSuccess: (newUrl, { doubanId }) => {
      if (newUrl) {
        queryClient.setQueryData<Record<string, string>>(
          ['refreshedTrailerUrls'],
          (old = {}) => {
            const updated = { ...old, [String(doubanId)]: newUrl }
            try { localStorage.setItem('refreshed-trailer-urls', JSON.stringify(updated)) } catch {}
            return updated
          },
        )
      }
    },
  })
}

export function useClearTrailerUrlMutation() {
  const queryClient = useQueryClient()

  return useMutation<void, Error, { doubanId: number | string }>({
    mutationFn: async ({ doubanId }) => {
      queryClient.setQueryData<Record<string, string>>(
        ['refreshedTrailerUrls'],
        (old = {}) => {
          const updated = { ...old }
          delete updated[String(doubanId)]
          try { localStorage.setItem('refreshed-trailer-urls', JSON.stringify(updated)) } catch {}
          return updated
        },
      )
    },
  })
}
