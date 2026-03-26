import { Link, useNavigate } from 'react-router-dom'
import { startTransition, type MouseEvent, type ReactNode } from 'react'

interface FastLinkProps {
  href: string
  children: ReactNode
  className?: string
  forceRefresh?: boolean
  useTransitionNav?: boolean
  onClick?: (e: MouseEvent<HTMLAnchorElement>) => void
  'aria-label'?: string
  target?: string
  rel?: string
}

export function FastLink({
  href,
  children,
  className,
  forceRefresh = false,
  useTransitionNav = false,
  onClick,
  'aria-label': ariaLabel,
  target,
  rel,
}: FastLinkProps) {
  const navigate = useNavigate()

  const handleClick = (e: MouseEvent<HTMLAnchorElement>) => {
    onClick?.(e)

    const isModifiedClick = e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || target === '_blank'
    if (isModifiedClick) return

    if (href.startsWith('http://') || href.startsWith('https://')) return

    e.preventDefault()

    if (forceRefresh) {
      window.location.assign(href)
      return
    }

    if (useTransitionNav) {
      startTransition(() => {
        navigate(href)
      })
      return
    }

    navigate(href)
  }

  return (
    <Link
      to={href}
      onClick={handleClick}
      className={className}
      aria-label={ariaLabel}
      target={target}
      rel={target === '_blank' ? rel || 'noopener noreferrer' : rel}
    >
      {children}
    </Link>
  )
}
