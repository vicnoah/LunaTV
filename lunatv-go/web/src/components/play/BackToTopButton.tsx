import { ChevronUp } from 'lucide-react'

interface BackToTopButtonProps {
  show: boolean
}

export default function BackToTopButton({ show }: BackToTopButtonProps) {
  if (!show) return null
  return (
    <button
      onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
      className="fixed bottom-20 right-5 z-40 w-10 h-10 bg-green-500 text-white rounded-full shadow-lg flex items-center justify-center hover:bg-green-600 transition-colors"
    >
      <ChevronUp className="w-5 h-5" />
    </button>
  )
}
