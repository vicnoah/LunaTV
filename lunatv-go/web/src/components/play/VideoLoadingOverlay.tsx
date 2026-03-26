interface VideoLoadingOverlayProps {
  show: boolean
  message?: string
}

export default function VideoLoadingOverlay({ show, message }: VideoLoadingOverlayProps) {
  if (!show) return null
  return (
    <div className="absolute inset-0 bg-black/60 flex items-center justify-center z-10">
      <div className="flex flex-col items-center gap-3">
        <div className="w-10 h-10 border-4 border-white/30 border-t-white rounded-full animate-spin" />
        {message && <p className="text-white text-sm">{message}</p>}
      </div>
    </div>
  )
}
