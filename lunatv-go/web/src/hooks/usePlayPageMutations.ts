import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { UseMutationResult } from '@tanstack/react-query'
import { savePlayRecord, saveFavorite, deleteFavorite } from '@/lib/db.client'
import type { PlayRecord, Favorite } from '@/types'

export interface SavePlayRecordParams {
  source: string
  id: string
  record: PlayRecord
}

export interface SaveFavoriteParams {
  source: string
  id: string
  favorite: Favorite
}

export interface DeleteFavoriteParams {
  source: string
  id: string
}

export function useSavePlayRecordMutation(): UseMutationResult<void, Error, SavePlayRecordParams> {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ source, id, record }: SavePlayRecordParams) =>
      savePlayRecord(source, id, record),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['playRecords'] })
      queryClient.invalidateQueries({ queryKey: ['continueWatching'] })
    },
  })
}

export function useSaveFavoriteMutation(): UseMutationResult<void, Error, SaveFavoriteParams> {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ source, id, favorite }: SaveFavoriteParams) =>
      saveFavorite(source, id, favorite),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['favorites'] })
    },
  })
}

export function useDeleteFavoriteMutation(): UseMutationResult<void, Error, DeleteFavoriteParams> {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ source, id }: DeleteFavoriteParams) =>
      deleteFavorite(source, id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['favorites'] })
    },
  })
}
