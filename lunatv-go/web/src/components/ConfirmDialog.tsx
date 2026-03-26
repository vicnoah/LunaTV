import { createPortal } from 'react-dom'

interface ConfirmDialogProps {
  isOpen: boolean
  title: string
  message: string
  confirmText?: string
  cancelText?: string
  onConfirm: () => void
  onCancel: () => void
  danger?: boolean
}

export function ConfirmDialog({
  isOpen,
  title,
  message,
  confirmText = '确认',
  cancelText = '取消',
  onConfirm,
  onCancel,
  danger = false,
}: ConfirmDialogProps) {
  if (!isOpen) return null

  return createPortal(
    <div className='fixed inset-0 z-[3000] flex items-center justify-center'>
      <div className='absolute inset-0 bg-black/50 backdrop-blur-sm' onClick={onCancel} />
      <div className='relative bg-white dark:bg-gray-900 rounded-2xl shadow-2xl p-6 mx-4 max-w-sm w-full'>
        <h3 className='text-lg font-semibold text-gray-900 dark:text-white mb-2'>{title}</h3>
        <p className='text-sm text-gray-600 dark:text-gray-400 mb-6'>{message}</p>
        <div className='flex gap-3 justify-end'>
          <button
            onClick={onCancel}
            className='px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors'
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            className={`px-4 py-2 text-sm font-medium text-white rounded-lg transition-colors ${
              danger
                ? 'bg-red-500 hover:bg-red-600'
                : 'bg-blue-500 hover:bg-blue-600'
            }`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}
