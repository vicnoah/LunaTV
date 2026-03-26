import { api } from '@/api/client'

export interface BangumiItem {
  id: number
  name: string
  image: string
  url: string
  air_date?: string
  comment?: string
}

export interface BangumiCalendarData {
  weekday: { en: string; cn: string; id: number }
  items: BangumiItem[]
}

export async function GetBangumiCalendarData(): Promise<BangumiCalendarData[]> {
  return api.get<BangumiCalendarData[]>('/api/bangumi/calendar')
}
