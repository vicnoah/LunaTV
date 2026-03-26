import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/api/client'
import { getAllPlayRecords } from '@/lib/db.client'

export function usePlayRecordsQuery() {
  return useQuery({
    queryKey: ['playRecords'],
    queryFn: () => getAllPlayRecords(),
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  })
}

export function useUpdatePasswordMutation() {
  return useMutation({
    mutationFn: ({ currentPassword, newPassword }: { currentPassword: string; newPassword: string }) =>
      api.post('/api/user/change-password', { currentPassword, newPassword }),
  })
}

export function useLogoutMutation() {
  return useMutation({
    mutationFn: async () => {
      const { clearToken } = await import('@/lib/auth')
      clearToken()
    },
  })
}
