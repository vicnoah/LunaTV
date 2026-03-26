import { createPortal } from 'react-dom'
import { X } from 'lucide-react'

interface ActionItem {
  label: string
  icon?: React.ReactNode
  onClick: () => void
  danger?: boolean
}

interface MobileActionSheetProps {
  isOpen: boolean
  onClose: () => void
  title?: string
  actions: ActionItem[]
}

export function MobileActionSheet({ isOpen, onClose, title, actions }: MobileActionSheetProps) {
  if (!isOpen) return null

  return createPortal(
    <div className='fixed inset-0 z-[3000] flex items-end justify-center'>
      <div className='absolute inset-0 bg-black/50 backdrop-blur-sm' onClick={onClose} />
      <div className='relative w-full max-w-lg bg-white dark:bg-gray-900 rounded-t-3xl shadow-2xl pb-safe-bottom'>
        {title && (
          <div className='flex items-center justify-between px-6 py-4 border-b border-gray-200/50 dark:border-gray-700/50'>
            <h3 className='text-lg font-semibold text-gray-900 dark:text-white'>{title}</h3>
            <button
              onClick={onClose}
              className='p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors'
            >
              <X className='w-5 h-5 text-gray-500 dark:text-gray-400' />
            </button>
          </div>
        )}
        <div className='py-2'>
          {actions.map((action, i) => (
            <button
              key={i}
              onClick={() => {
                action.onClick()
                onClose()
              }}
              className={`w-full flex items-center gap-3 px-6 py-4 text-left hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors ${
                action.danger ? 'text-red-500' : 'text-gray-900 dark:text-white'
              }`}
            >
              {action.icon && <span className='shrink-0'>{action.icon}</span>}
              <span className='font-medium'>{action.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>,
    document.body
  )
}
