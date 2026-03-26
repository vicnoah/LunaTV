interface DirectYouTubePlayerProps {
  videoId: string
  className?: string
}

export default function DirectYouTubePlayer({ videoId, className }: DirectYouTubePlayerProps) {
  return (
    <div className={`relative w-full ${className || ''}`} style={{ paddingTop: '56.25%' }}>
      <iframe
        className="absolute inset-0 w-full h-full rounded-xl"
        src={`https://www.youtube.com/embed/${videoId}?autoplay=1`}
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
      />
    </div>
  )
}
