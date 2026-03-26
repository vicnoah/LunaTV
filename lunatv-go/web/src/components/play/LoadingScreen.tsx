interface LoadingScreenProps {
  stage?: 'searching' | 'preferring' | 'fetching' | 'ready'
  message?: string
}

const stageMessages: Record<string, string> = {
  searching: '正在搜索播放源...',
  preferring: '正在选择最优源...',
  fetching: '正在获取视频信息...',
  ready: '准备就绪',
}

export default function LoadingScreen({ stage = 'searching', message }: LoadingScreenProps) {
  const displayMessage = message || stageMessages[stage] || '加载中...'

  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] gap-6">
      <div className="relative w-16 h-16">
        <div className="absolute inset-0 rounded-full border-4 border-green-100 dark:border-green-900/30" />
        <div className="absolute inset-0 rounded-full border-4 border-green-500 border-t-transparent animate-spin" />
      </div>
      <div className="text-center">
        <p className="text-gray-700 dark:text-gray-300 font-medium">{displayMessage}</p>
      </div>
    </div>
  )
}
