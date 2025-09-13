import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Format large numbers with abbreviations (K, M, B)
 * @param num - The number to format
 * @returns Formatted string with abbreviation (e.g., "1.2K", "500", "2.5M")
 */
export function formatNumber(num: number | null | undefined): string {
  if (num === null || num === undefined) return '0'
  if (num >= 1000000000) return `${(num / 1000000000).toFixed(1)}B`
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`
  return num.toString()
}

/**
 * Format large numbers with commas for detailed views
 * @param num - The number to format
 * @returns Formatted string with commas (e.g., "1,234,567")
 */
export function formatNumberWithCommas(num: number | null | undefined): string {
  if (num === null || num === undefined) return '0'
  return num.toLocaleString('en-US')
}
