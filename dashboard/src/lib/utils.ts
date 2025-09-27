import { ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// formatNumber and formatNumberWithCommas have been moved to @/lib/formatters
// Please import from there instead:
// import { formatNumber, formatNumberWithCommas } from '@/lib/formatters'
