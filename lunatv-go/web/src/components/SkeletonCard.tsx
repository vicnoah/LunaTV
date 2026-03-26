export default function SkeletonCard({ className }: { className?: string }) {
  return (
    <div className={`animate-pulse ${className || ''}`}>
      <div className="bg-gray-200 dark:bg-gray-700 rounded-xl aspect-[2/3] w-full mb-2" />
      <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-1" />
      <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2" />
    </div>
  )
}
