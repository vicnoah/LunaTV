/* eslint-disable @typescript-eslint/no-explicit-any */
import { useCallback, useEffect, useRef, useState } from 'react'

interface VirtualGridProps {
  items: any[]
  renderItem: (item: any, index: number) => React.ReactNode
  itemHeight?: number
  itemWidth?: number
  className?: string
  overscan?: number
}

export default function VirtualGrid({
  items,
  renderItem,
  itemHeight = 300,
  className,
}: VirtualGridProps) {
  // Simple non-virtual implementation for now - renders all items
  return (
    <div className={`grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 ${className || ''}`}>
      {items.map((item, index) => (
        <div key={item.id || index}>
          {renderItem(item, index)}
        </div>
      ))}
    </div>
  )
}
