'use client'

import { useWelpPrice } from '../hooks/useWelpPrice'
import { TrendingUp } from 'lucide-react'

export function WelpPriceBadge() {
  const { formattedPrice } = useWelpPrice()

  if (!formattedPrice || formattedPrice === 'Loading...') {
    return null
  }

  return (
    <div className="group relative">
      <div className="flex items-center gap-2 px-3 py-1.5 bg-white/80 backdrop-blur-sm rounded-full border border-gray-200 cursor-default">
        <TrendingUp className="h-4 w-4 text-green-600" />
        <span className="text-sm font-medium text-gray-700">
          1 WELP = <span className="text-gray-900">{formattedPrice}</span>
        </span>
      </div>
      <div className="absolute left-1/2 -translate-x-1/2 top-full mt-2 px-3 py-2 bg-gray-900/90 backdrop-blur-sm text-white text-xs rounded-lg w-64 text-center opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 pointer-events-none z-50">
        Live ETH/USD price via Chainlink&apos;s decentralized oracle. Updates on heartbeat or ±0.5% deviation.
        <div className="absolute left-1/2 -translate-x-1/2 bottom-full w-0 h-0 border-l-4 border-r-4 border-b-4 border-l-transparent border-r-transparent border-b-gray-900/90" />
      </div>
    </div>
  )
}
