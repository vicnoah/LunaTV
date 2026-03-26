import { useQueries } from '@tanstack/react-query'
import { useCallback } from 'react'
import { GetBangumiCalendarData, BangumiCalendarData } from '@/lib/bangumi.client'
import { getDoubanCategories } from '@/lib/douban.client'
import { getRecommendedShortDramas } from '@/lib/shortdrama.client'
import { DoubanItem, ShortDramaItem } from '@/types'

export interface HomePageData {
  hotMovies: DoubanItem[]
  hotTvShows: DoubanItem[]
  hotVarietyShows: DoubanItem[]
  hotAnime: DoubanItem[]
  hotShortDramas: ShortDramaItem[]
  bangumiCalendar: BangumiCalendarData[]
}

export interface HomePageQueriesResult {
  data: HomePageData
  isLoading: boolean
  isFetching: boolean
  errors: Error[]
  hasError: boolean
  refetch: () => void
}

export function useHomePageQueries(): HomePageQueriesResult {
  const combine = useCallback((results: any[]) => {
    const [moviesResult, tvResult, varietyResult, animeResult, shortDramasResult, bangumiResult] = results

    const data: HomePageData = {
      hotMovies: moviesResult.data?.code === 200 ? moviesResult.data.list : [],
      hotTvShows: tvResult.data?.code === 200 ? tvResult.data.list : [],
      hotVarietyShows: varietyResult.data?.code === 200 ? varietyResult.data.list : [],
      hotAnime: animeResult.data?.code === 200 ? animeResult.data.list : [],
      hotShortDramas: shortDramasResult.data || [],
      bangumiCalendar: bangumiResult.data || [],
    }

    const isLoading = results.some((r: any) => r.isLoading)
    const isFetching = results.some((r: any) => r.isFetching)
    const errors = results.filter((r: any) => r.error).map((r: any) => r.error as Error)
    const hasError = errors.length > 0
    const refetch = () => results.forEach((r: any) => r.refetch())

    return { data, isLoading, isFetching, errors, hasError, refetch }
  }, [])

  return useQueries({
    queries: [
      {
        queryKey: ['douban', 'categories', 'movie', '热门', '全部'],
        queryFn: () => getDoubanCategories({ kind: 'movie', category: '热门', type: '全部' }),
        staleTime: 2 * 60 * 1000,
        gcTime: 10 * 60 * 1000,
        retry: 2,
      },
      {
        queryKey: ['douban', 'categories', 'tv', 'tv', 'tv'],
        queryFn: () => getDoubanCategories({ kind: 'tv', category: 'tv', type: 'tv' }),
        staleTime: 2 * 60 * 1000,
        gcTime: 10 * 60 * 1000,
        retry: 2,
      },
      {
        queryKey: ['douban', 'categories', 'tv', 'show', 'show'],
        queryFn: () => getDoubanCategories({ kind: 'tv', category: 'show', type: 'show' }),
        staleTime: 2 * 60 * 1000,
        gcTime: 10 * 60 * 1000,
        retry: 2,
      },
      {
        queryKey: ['douban', 'categories', 'tv', 'tv', 'tv_animation'],
        queryFn: () => getDoubanCategories({ kind: 'tv', category: 'tv', type: 'tv_animation' }),
        staleTime: 2 * 60 * 1000,
        gcTime: 10 * 60 * 1000,
        retry: 2,
      },
      {
        queryKey: ['shortdramas', 'recommended', 8],
        queryFn: () => getRecommendedShortDramas(undefined, 8),
        staleTime: 5 * 60 * 1000,
        gcTime: 15 * 60 * 1000,
        retry: 2,
      },
      {
        queryKey: ['bangumi', 'calendar'],
        queryFn: () => GetBangumiCalendarData(),
        staleTime: 10 * 60 * 1000,
        gcTime: 30 * 60 * 1000,
        retry: 2,
      },
    ],
    combine: combine as any,
  }) as unknown as HomePageQueriesResult
}
