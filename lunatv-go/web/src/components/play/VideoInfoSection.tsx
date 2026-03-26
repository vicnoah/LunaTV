/* eslint-disable @typescript-eslint/no-explicit-any */
interface VideoInfoSectionProps {
  detail: any
  doubanInfo?: any
  loading?: boolean
}

export default function VideoInfoSection({ detail, doubanInfo, loading }: VideoInfoSectionProps) {
  const info = doubanInfo || detail

  if (loading) {
    return (
      <div className="animate-pulse space-y-2">
        <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded w-1/2" />
        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4" />
        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-2/3" />
      </div>
    )
  }

  if (!info) return null

  return (
    <div className="space-y-3">
      {info.genres && (
        <div className="flex flex-wrap gap-1.5">
          {info.genres.map((g: string) => (
            <span key={g} className="px-2 py-0.5 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 text-xs rounded-full">
              {g}
            </span>
          ))}
        </div>
      )}
      {(info.directors || info.cast) && (
        <div className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
          {info.directors?.length > 0 && (
            <p><span className="font-medium text-gray-700 dark:text-gray-300">导演：</span>{info.directors.join(' / ')}</p>
          )}
          {info.cast?.length > 0 && (
            <p><span className="font-medium text-gray-700 dark:text-gray-300">主演：</span>{info.cast.slice(0, 5).join(' / ')}</p>
          )}
        </div>
      )}
      {(info.plot_summary || info.summary || info.desc) && (
        <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed line-clamp-4">
          {info.plot_summary || info.summary || info.desc}
        </p>
      )}
    </div>
  )
}
