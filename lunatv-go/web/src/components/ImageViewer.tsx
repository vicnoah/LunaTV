import { X } from 'lucide-react'
import { useEffect } from 'react'
import { createPortal } from 'react-dom'

interface ImageViewerProps {
  url: string
  alt?: string
  onClose: () => void
}

export default function ImageViewer({ url, alt, onClose }: ImageViewerProps) {
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [onClose])

  return createPortal(
    <div
      className="fixed inset-0 z-[999] bg-black/90 flex items-center justify-center"
      onClick={onClose}
    >
      <button
        className="absolute top-4 right-4 text-white/80 hover:text-white"
        onClick={onClose}
      >
        <X className="w-8 h-8" />
      </button>
      <img
        src={url}
        alt={alt}
        className="max-w-full max-h-full object-contain"
        onClick={(e) => e.stopPropagation()}
      />
    </div>,
    document.body,
  )
}
