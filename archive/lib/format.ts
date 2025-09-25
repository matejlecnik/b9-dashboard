export function formatNumber(value: number | null | undefined): string {
  if (typeof value !== 'number' || Number.isNaN(value)) return '—'
  return new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(value)
}

export function formatPercent(value: number | null | undefined, fractionDigits = 2): string {
  if (typeof value !== 'number' || Number.isNaN(value)) return '—'
  const options: Intl.NumberFormatOptions = {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits
  }
  return `${new Intl.NumberFormat('en-US', options).format(value)}%`
}

export function formatTimeISO(iso: string | Date | null | undefined): string {
  if (!iso) return '—'
  const date = typeof iso === 'string' ? new Date(iso) : iso
  try {
    return new Intl.DateTimeFormat('en-US', {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      timeZone: 'UTC'
    }).format(date)
  } catch {
    return '—'
  }
}

export function formatDateISO(iso: string | Date | null | undefined): string {
  if (!iso) return '—'
  const date = typeof iso === 'string' ? new Date(iso) : iso
  try {
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      timeZone: 'UTC'
    }).format(date)
  } catch {
    return '—'
  }
}

export function formatDateTimeISO(iso: string | Date | null | undefined): string {
  if (!iso) return '—'
  const date = typeof iso === 'string' ? new Date(iso) : iso
  try {
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
      timeZone: 'UTC'
    }).format(date)
  } catch {
    return '—'
  }
}


