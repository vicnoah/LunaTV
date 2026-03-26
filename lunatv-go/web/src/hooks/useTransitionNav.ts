import { useCallback } from 'react'
import { useNavigate } from 'react-router-dom'

export function useTransitionNav() {
  const navigate = useNavigate()

  const navigateTo = useCallback(
    (to: string, options?: { replace?: boolean; state?: unknown }) => {
      navigate(to, options)
    },
    [navigate],
  )

  return navigateTo
}
