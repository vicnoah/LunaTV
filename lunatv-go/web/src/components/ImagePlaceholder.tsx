interface ImagePlaceholderProps {
  className?: string
  text?: string
}

export function ImagePlaceholder({ className, text }: ImagePlaceholderProps) {
  return (
    <div
      className={`flex items-center justify-center bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-600 text-xs ${className || ''}`}
    >
      {text || '暂无图片'}
    </div>
  )
}
