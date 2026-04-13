import { useReadContract } from 'wagmi'
import { priceFeedAbi, PRICE_FEED_ADDRESS } from '../contracts/PriceFeed'
import { formatUnits } from 'viem'

export function useWelpPrice() {
  const { data: welpPriceRaw, isError, isLoading, refetch } = useReadContract({
    address: PRICE_FEED_ADDRESS as `0x${string}`,
    abi: priceFeedAbi,
    functionName: 'getWelpPriceUsd',
    // Refetch every 30 seconds
    query: {
      refetchInterval: 30000,
    }
  })

  // Convert from 8 decimals to human-readable format
  const welpPriceUsd = welpPriceRaw ? parseFloat(formatUnits(welpPriceRaw, 8)) : null

  // Format as currency string
  const formattedPrice = welpPriceUsd
    ? `$${welpPriceUsd.toFixed(4)}`
    : isError
    ? 'Price unavailable'
    : isLoading
    ? 'Loading...'
    : null

  return {
    price: welpPriceUsd,
    formattedPrice,
    isError,
    isLoading,
    refetch
  }
}