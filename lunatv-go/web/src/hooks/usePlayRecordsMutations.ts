import { useMutation, useQueryClient } from '@tanstack/react-query'
import { savePlayRecord, deletePlayRecord } from '@/lib/db.client'
import type { PlayRecord } from '@/types'

export function useSavePlayRecordMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ source, id, record }: { source: string; id: string; record: PlayRecord }) =>
      savePlayRecord(source, id, record),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['playRecords'] })
    },
  })
}

export function useDeletePlayRecordMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ source, id }: { source: string; id: string }) =>
      deletePlayRecord(source, id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['playRecords'] })
    },
  })
}

export function useClearPlayRecordsMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async () => {
      const api = await import('@/api/client').then((m) => m.api)
      await api.delete('/api/playrecords')
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['playRecords'] })
      queryClient.invalidateQueries({ queryKey: ['continueWatching'] })
    },
  })
}
