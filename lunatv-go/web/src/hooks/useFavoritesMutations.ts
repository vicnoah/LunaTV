import { useMutation, useQueryClient } from '@tanstack/react-query'
import { saveFavorite, deleteFavorite, getAllFavorites } from '@/lib/db.client'
import type { Favorite } from '@/types'

export function useAddFavoriteMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ source, id, favorite }: { source: string; id: string; favorite: Favorite }) =>
      saveFavorite(source, id, favorite),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['favorites'] })
    },
  })
}

export function useRemoveFavoriteMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ source, id }: { source: string; id: string }) =>
      deleteFavorite(source, id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['favorites'] })
    },
  })
}

export function useToggleFavoriteMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      source,
      id,
      favorite,
      currentlyFavorited,
    }: {
      source: string
      id: string
      favorite: Favorite
      currentlyFavorited: boolean
    }) => {
      if (currentlyFavorited) {
        await deleteFavorite(source, id)
      } else {
        await saveFavorite(source, id, favorite)
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['favorites'] })
    },
  })
}

export function useClearFavoritesMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async () => {
      const api = await import('@/api/client').then((m) => m.api)
      await api.delete('/api/favorites')
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['favorites'] })
    },
  })
}
