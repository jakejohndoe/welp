'use client'

import { useWelpPrice } from '../hooks/useWelpPrice'
import { TrendingUp } from 'lucide-react'

export function WelpPriceBadge() {
  const { formattedPrice } = useWelpPrice()

  if (!formattedPrice || formattedPrice === 'Loading...') {
    return null
  }

  return (
    <div className="flex items-center gap-2 px-3 py-1.5 bg-white/80 backdrop-blur-sm rounded-full border border-gray-200">
      <TrendingUp className="h-4 w-4 text-green-600" />
      <span className="text-sm font-medium text-gray-700">
        1 WELP = <span className="text-gray-900">{formattedPrice}</span>
      </span>
    </div>
  )
}