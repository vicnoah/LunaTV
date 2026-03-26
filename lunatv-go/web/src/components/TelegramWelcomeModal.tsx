import { X } from 'lucide-react'
import { useEffect, useState } from 'react'

interface TelegramWelcomeModalProps {
  show: boolean
  onClose: () => void
  username?: string
}

export function TelegramWelcomeModal({ show, onClose, username }: TelegramWelcomeModalProps) {
  if (!show) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 max-w-sm w-full mx-4 shadow-2xl text-center">
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600">
          <X className="w-5 h-5" />
        </button>
        <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
          <span className="text-2xl">✈️</span>
        </div>
        <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-2">
          欢迎回来{username ? `，${username}` : ''}！
        </h3>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-5">
          通过 Telegram 登录成功
        </p>
        <button
          onClick={onClose}
          className="w-full py-2.5 bg-green-500 text-white rounded-xl font-medium hover:bg-green-600 transition-colors"
        >
          开始探索
        </button>
      </div>
    </div>
  )
}
