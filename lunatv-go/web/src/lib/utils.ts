import { clsx, type ClassValue } from 'clsx'
import he from 'he'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

const userAgent = typeof navigator !== 'undefined' ? navigator.userAgent : ''

export const isIOS = /iPad|iPhone|iPod/i.test(userAgent) && !(window as unknown as Record<string, unknown>).MSStream
export const isIOS13Plus = isIOS || (
  userAgent.includes('Macintosh') &&
  typeof navigator !== 'undefined' &&
  navigator.maxTouchPoints >= 1
)
export const isIPad = /iPad/i.test(userAgent) || (
  userAgent.includes('Macintosh') &&
  typeof navigator !== 'undefined' &&
  navigator.maxTouchPoints > 2
)
export const isAndroid = /Android/i.test(userAgent)
export const isMobile = isIOS13Plus || isAndroid || /webOS|BlackBerry|IEMobile|Opera Mini/i.test(userAgent)
export const isTablet = isIPad || (isAndroid && !/Mobile/i.test(userAgent)) ||
  (typeof screen !== 'undefined' && screen.width >= 768)
export const isSafari = /^(?:(?!chrome|android).)*safari/i.test(userAgent) && !isAndroid
export const isWebKit = /WebKit/i.test(userAgent)

export type DevicePerformance = 'low' | 'medium' | 'high'

export function getDevicePerformanceLevel(): DevicePerformance {
  if (typeof navigator === 'undefined') return 'medium'
  const cores = navigator.hardwareConcurrency || 4
  if (isMobile) {
    return cores >= 6 ? 'medium' : 'low'
  } else {
    return cores >= 8 ? 'high' : cores >= 4 ? 'medium' : 'low'
  }
}

export const devicePerformance = getDevicePerformanceLevel()

function getDoubanImageProxyConfig(): {
  proxyType: 'direct' | 'server' | 'img3' | 'cmliussss-cdn-tencent' | 'cmliussss-cdn-ali' | 'baidu' | 'custom'
  proxyUrl: string
} {
  let doubanImageProxyType: 'direct' | 'server' | 'img3' | 'cmliussss-cdn-tencent' | 'cmliussss-cdn-ali' | 'baidu' | 'custom' = 'server'
  let doubanImageProxy = ''

  if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
    const storedType = localStorage.getItem('doubanImageProxyType')
    const runtimeConfig = (window as unknown as { RUNTIME_CONFIG?: Record<string, unknown> }).RUNTIME_CONFIG
    const runtimeType = runtimeConfig?.DOUBAN_IMAGE_PROXY_TYPE as string | undefined

    let effectiveStoredType = storedType
    if (storedType === 'direct') {
      effectiveStoredType = 'server'
      localStorage.setItem('doubanImageProxyType', 'server')
    }
    const effectiveRuntimeType = (runtimeType === 'direct') ? 'server' : runtimeType

    doubanImageProxyType = (effectiveStoredType || effectiveRuntimeType || 'server') as typeof doubanImageProxyType
    doubanImageProxy =
      localStorage.getItem('doubanImageProxyUrl') ||
      (runtimeConfig?.DOUBAN_IMAGE_PROXY as string) ||
      ''
  }

  return { proxyType: doubanImageProxyType, proxyUrl: doubanImageProxy }
}

export function processImageUrl(originalUrl: string): string {
  if (!originalUrl) return originalUrl

  if (originalUrl.includes('manmankan.com')) {
    return `/api/image-proxy?url=${encodeURIComponent(originalUrl)}`
  }

  if (!originalUrl.includes('doubanio.com')) {
    return originalUrl
  }

  const { proxyType, proxyUrl } = getDoubanImageProxyConfig()
  switch (proxyType) {
    case 'server':
      return `/api/image-proxy?url=${encodeURIComponent(originalUrl)}`
    case 'img3':
      return originalUrl.replace(/img\d+\.doubanio\.com/g, 'img3.doubanio.com')
    case 'cmliussss-cdn-tencent':
      return originalUrl.replace(/img\d+\.doubanio\.com/g, 'img.doubanio.cmliussss.net')
    case 'cmliussss-cdn-ali':
      return originalUrl.replace(/img\d+\.doubanio\.com/g, 'img.doubanio.cmliussss.com')
    case 'baidu':
      return `https://image.baidu.com/search/down?url=${encodeURIComponent(originalUrl)}`
    case 'custom':
      return `${proxyUrl}${encodeURIComponent(originalUrl)}`
    case 'direct':
    default:
      return originalUrl
  }
}

export function cleanHtmlTags(text: string): string {
  if (!text) return ''
  const cleanedText = text
    .replace(/<[^>]+>/g, '\n')
    .replace(/\n+/g, '\n')
    .replace(/[ \t]+/g, ' ')
    .replace(/^\n+|\n+$/g, '')
    .trim()
  return he.decode(cleanedText)
}

export function isSeriesCompleted(remarks?: string): boolean {
  if (!remarks) return false
  return /完结|已完结|全\d+集|完(?!整)/.test(remarks)
}
