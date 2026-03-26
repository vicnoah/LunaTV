import { Clock, Trash2 } from 'lucide-react'
import { memo, useEffect, useState } from 'react'
import { useContinueWatchingQuery, useWatchingUpdatesQuery } from '@/hooks/useContinueWatchingQueries'
import { useClearPlayRecordsMutation } from '@/hooks/usePlayRecordsMutations'
import ScrollableRow from './ScrollableRow'
import SectionTitle from './SectionTitle'
import VideoCard from './VideoCard'
import type { PlayRecordWithKey } from '@/hooks/useContinueWatchingQueries'

interface ContinueWatchingProps {
  className?: string
}

function ContinueWatching({ className }: ContinueWatchingProps) {
  const [showConfirmDialog, setShowConfirmDialog] = useState(false)

  const { data: playRecords = [], isLoading: loading } = useContinueWatchingQuery()
  const { data: watchingUpdates = null } = useWatchingUpdatesQuery(!loading && playRecords.length > 0)
  const clearPlayRecordsMutation = useClearPlayRecordsMutation()

  if (!loading && playRecords.length === 0) return null

  const getProgress = (record: PlayRecordWithKey) => {
    if (record.total_time === 0) return 0
    return (record.play_time / record.total_time) * 100
  }

  const parseKey = (key: string) => {
    const plusIdx = key.indexOf('+')
    return { source: key.slice(0, plusIdx), id: key.slice(plusIdx + 1) }
  }

  const handleClear = () => {
    clearPlayRecordsMutation.mutate()
    setShowConfirmDialog(false)
  }

  return (
    <section className={className}>
      <SectionTitle
        title="继续观看"
        icon={<Clock className="w-5 h-5" />}
        action={
          <button
            onClick={() => setShowConfirmDialog(true)}
            className="flex items-center gap-1 text-sm text-gray-500 hover:text-red-500 dark:text-gray-400 dark:hover:text-red-400 transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
            清空
          </button>
        }
      />

      {loading ? (
        <div className="flex gap-3 overflow-hidden">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="w-[140px] flex-shrink-0 animate-pulse">
              <div className="bg-gray-200 dark:bg-gray-700 rounded-xl aspect-[2/3] mb-2" />
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4" />
            </div>
          ))}
        </div>
      ) : (
        <ScrollableRow>
          {playRecords.map((record) => {
            const { source, id } = parseKey(record.key)
            return (
              <div key={record.key} className="flex-shrink-0 w-[140px]">
                <VideoCard
                  id={id}
                  source={source}
                  title={record.title}
                  poster={record.cover}
                  progress={getProgress(record)}
                  year={record.year}
                  episodes={record.total_episodes}
                  currentEpisode={record.index}
                  source_name={record.source_name}
                  from="playrecord"
                />
              </div>
            )
          })}
        </ScrollableRow>
      )}

      {showConfirmDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 max-w-sm mx-4 shadow-2xl">
            <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-2">确认清空</h3>
            <p className="text-gray-600 dark:text-gray-400 text-sm mb-5">确定要清空所有播放记录吗？此操作不可撤销。</p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowConfirmDialog(false)}
                className="px-4 py-2 text-sm rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleClear}
                className="px-4 py-2 text-sm rounded-lg bg-red-500 text-white hover:bg-red-600 transition-colors"
              >
                确认清空
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}

export default memo(ContinueWatching)
