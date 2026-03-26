import LoadingProgressIndicator from './LoadingProgressIndicator'

interface SpeedTestProgressProps {
  progress: { current: number; total: number; currentSource: string; result?: string } | null
}

export default function SpeedTestProgress({ progress }: SpeedTestProgressProps) {
  if (!progress) return null
  return (
    <div className="mt-3">
      <LoadingProgressIndicator
        current={progress.current}
        total={progress.total}
        currentSource={progress.currentSource}
      />
      {progress.result && (
        <p className="text-xs text-green-600 dark:text-green-400 mt-1">{progress.result}</p>
      )}
    </div>
  )
}
