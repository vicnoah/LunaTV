interface VideoCoverDisplayProps {
  poster: string
  title: string
  show: boolean
}

export default function VideoCoverDisplay({ poster, title, show }: VideoCoverDisplayProps) {
  if (!show) return null
  return (
    <div className="absolute inset-0 flex items-center justify-center bg-black">
      <img
        src={poster}
        alt={title}
        className="h-full w-full object-contain"
      />
    </div>
  )
}
