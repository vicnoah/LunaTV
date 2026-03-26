/* eslint-disable @typescript-eslint/no-explicit-any */
import { api } from '@/api/client'
import type { PlayRecord, Favorite } from '@/types'

export type { PlayRecord, Favorite }

export function generateStorageKey(source: string, id: string): string {
  return `${source}+${id}`
}

export async function savePlayRecord(source: string, id: string, record: PlayRecord): Promise<void> {
  await api.post(`/api/playrecords/${source}/${id}`, record)
}

export async function deletePlayRecord(source: string, id: string): Promise<void> {
  await api.delete(`/api/playrecords/${source}/${id}`)
}

export async function getAllPlayRecords(): Promise<Record<string, PlayRecord & { key?: string }>> {
  return api.get('/api/playrecords')
}

export async function saveFavorite(source: string, id: string, favorite: Favorite): Promise<void> {
  await api.post(`/api/favorites/${source}/${id}`, favorite)
}

export async function deleteFavorite(source: string, id: string): Promise<void> {
  await api.delete(`/api/favorites/${source}/${id}`)
}

export async function getAllFavorites(): Promise<Record<string, Favorite>> {
  return api.get('/api/favorites')
}

export async function isFavorited(source: string, id: string): Promise<boolean> {
  try {
    const res = await api.get<{ favorited: boolean }>(`/api/favorites/${source}/${id}/check`)
    return res.favorited
  } catch {
    return false
  }
}

export async function getSearchHistory(): Promise<string[]> {
  return api.get('/api/searchhistory')
}

export async function addSearchHistory(keyword: string): Promise<void> {
  await api.post('/api/searchhistory', { keyword })
}

export async function deleteSearchHistory(keyword: string): Promise<void> {
  await api.delete('/api/searchhistory', { keyword })
}

export async function clearSearchHistory(): Promise<void> {
  await api.delete('/api/searchhistory')
}

// Event subscription system for compatibility with original db.client
type DataUpdateCallback = (data: any) => void
const eventSubscribers = new Map<string, Set<DataUpdateCallback>>()

export function subscribeToDataUpdates(eventType: string, callback: DataUpdateCallback): () => void {
  if (!eventSubscribers.has(eventType)) {
    eventSubscribers.set(eventType, new Set())
  }
  eventSubscribers.get(eventType)!.add(callback)
  return () => {
    eventSubscribers.get(eventType)?.delete(callback)
  }
}

export function emitDataUpdate(eventType: string, data: any): void {
  eventSubscribers.get(eventType)?.forEach(cb => cb(data))
}
