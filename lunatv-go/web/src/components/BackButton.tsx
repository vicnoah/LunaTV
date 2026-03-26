import { ChevronLeft } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

export function BackButton() {
  const navigate = useNavigate()

  return (
    <button
      onClick={() => navigate(-1)}
      className='flex items-center justify-center w-9 h-9 rounded-full bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/50 text-gray-600 dark:text-gray-300 hover:bg-white dark:hover:bg-gray-800 transition-all duration-200 shadow-sm'
      aria-label='返回'
    >
      <ChevronLeft className='w-5 h-5' />
    </button>
  )
}
