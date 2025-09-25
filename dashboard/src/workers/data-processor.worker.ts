
/**
 * Web Worker for heavy data processing
 * Handles filtering, sorting, and other CPU-intensive operations off the main thread
 */

// Type definitions for worker messages
export interface WorkerRequest {
  id: string
  type: 'filter' | 'sort' | 'search' | 'aggregate' | 'batch'
  data: { items?: unknown[]; query?: string; field?: string; order?: string }
  config?: unknown
}

export interface WorkerResponse {
  id: string
  type: 'success' | 'error' | 'progress'
  data?: unknown
  error?: string
  progress?: number
}

// Heavy computation functions
const processors = {
  /**
   * Filter large datasets based on multiple criteria
   */
  filter: (data: { items?: unknown[]; query?: string; field?: string; order?: string }[], config: { filters?: Record<string, unknown>, searchTerm?: string }) => {
    const { filters, searchTerm } = config
    let result = [...data]

    // Apply filters
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== null && value !== undefined && value !== '') {
          result = result.filter(item => {
            const itemValue = (item as Record<string, unknown>)[key]
            if (Array.isArray(value)) {
              return value.includes(itemValue)
            }
            if (typeof value === 'boolean') {
              return itemValue === value
            }
            if (typeof value === 'string') {
              return String(itemValue).toLowerCase().includes(value.toLowerCase())
            }
            return itemValue === value
          })
        }
      })
    }

    // Apply search
    if (searchTerm && searchTerm.trim()) {
      const search = searchTerm.trim().toLowerCase()
      result = result.filter(item => {
        return Object.values(item as Record<string, unknown>).some(value =>
          String(value).toLowerCase().includes(search)
        )
      })
    }

    return result
  },

  /**
   * Sort large datasets with multiple sort criteria
   */
  sort: (data: { items?: unknown[]; query?: string; field?: string; order?: string }[], config: { field?: string, direction?: string, secondary?: { field: string, direction: string } }) => {
    const { field, direction = 'asc', secondary } = config

    if (!field) return data

    return [...data].sort((a, b) => {
      const aVal = (a as Record<string, unknown>)[field]
      const bVal = (b as Record<string, unknown>)[field]

      // Handle null/undefined
      if (aVal == null && bVal == null) return 0
      if (aVal == null) return direction === 'asc' ? 1 : -1
      if (bVal == null) return direction === 'asc' ? -1 : 1

      // Compare values
      let comparison = 0
      if (typeof aVal === 'string' && typeof bVal === 'string') {
        comparison = aVal.localeCompare(bVal)
      } else if (typeof aVal === 'number' && typeof bVal === 'number') {
        comparison = aVal - bVal
      } else if (aVal instanceof Date && bVal instanceof Date) {
        comparison = aVal.getTime() - bVal.getTime()
      }

      // Apply direction
      comparison = direction === 'asc' ? comparison : -comparison

      // Secondary sort if values are equal
      if (comparison === 0 && secondary) {
        const secA = (a as Record<string, unknown>)[secondary.field]
        const secB = (b as Record<string, unknown>)[secondary.field]
        if (secA != null && secB != null) {
          let secComp = 0
          if (typeof secA === 'string' && typeof secB === 'string') {
            secComp = secA.localeCompare(secB)
          } else if (typeof secA === 'number' && typeof secB === 'number') {
            secComp = secA - secB
          }
          comparison = secondary.direction === 'asc' ? secComp : -secComp
        }
      }

      return comparison
    })
  },

  /**
   * Search with fuzzy matching
   */
  search: (data: { items?: unknown[]; query?: string; field?: string; order?: string }[], config: { query?: string, fields?: string[] }) => {
    const { query, fields } = config

    if (!query || !query.trim()) return data

    const searchTerms = query.toLowerCase().split(' ').filter(Boolean)

    return data.filter(item => {
      const searchableText = fields
        ? fields.map((f: string) => String((item as Record<string, unknown>)[f] || '')).join(' ')
        : Object.values(item as Record<string, unknown>).map(v => String(v || '')).join(' ')

      const text = searchableText.toLowerCase()

      // Check if all search terms are found
      return searchTerms.every((term: string) => text.includes(term))
    }).map(item => ({
      ...item,
      _score: calculateRelevanceScore(item, searchTerms, fields)
    })).sort((a, b) => b._score - a._score)
  },

  /**
   * Aggregate data for statistics
   */
  aggregate: (data: { items?: unknown[]; query?: string; field?: string; order?: string }[], config: { groupBy?: string, metrics?: string[] }) => {
    const { groupBy, metrics } = config

    interface MetricData {
      sum: number
      avg: number
      min: number
      max: number
    }

    interface GroupData {
      count: number
      items: unknown[]
      [metric: string]: number | unknown[] | MetricData
    }

    const groups: Record<string, GroupData> = {}

    data.forEach(item => {
      const key = String(groupBy ? (item as Record<string, unknown>)[groupBy] : 'all')
      if (!groups[key]) {
        groups[key] = {
          count: 0,
          items: [],
          ...Object.fromEntries(
            metrics?.map((m: string) => [m, { sum: 0, avg: 0, min: Infinity, max: -Infinity }]) || []
          )
        }
      }

      const group = groups[key]
      group.count++
      group.items.push(item)

      metrics?.forEach((metric: string) => {
        const value = Number((item as Record<string, unknown>)[metric]) || 0
        if (!group[metric] || typeof group[metric] !== 'object' || Array.isArray(group[metric])) {
          group[metric] = { sum: 0, avg: 0, min: Infinity, max: -Infinity }
        }
        const metricData = group[metric] as MetricData
        metricData.sum += value
        metricData.min = Math.min(metricData.min, value)
        metricData.max = Math.max(metricData.max, value)
      })
    })

    // Calculate averages
    Object.values(groups).forEach((group: GroupData) => {
      metrics?.forEach((metric: string) => {
        const metricData = group[metric]
        if (metricData && typeof metricData === 'object' && !Array.isArray(metricData)) {
          (metricData as MetricData).avg = (metricData as MetricData).sum / group.count
        }
      })
    })

    return groups
  },

  /**
   * Process data in batches with progress updates
   */
  batch: async (data: { items?: unknown[]; query?: string; field?: string; order?: string }[], config: { batchSize?: number, processor?: (batch: unknown[]) => Promise<unknown[]>, progressCallback?: (progress: number) => void }) => {
    const { batchSize = 100, processor, progressCallback } = config
    const results: unknown[] = []
    const total = data.length

    if (!processor) {
      return data
    }

    for (let i = 0; i < total; i += batchSize) {
      const batch = data.slice(i, i + batchSize)
      const processed = await processor(batch)
      results.push(...processed)

      if (progressCallback) {
        const progress = Math.min(100, Math.round((i + batchSize) / total * 100))
        progressCallback(progress)
      }

      // Allow other operations to process
      await new Promise(resolve => setTimeout(resolve, 0))
    }

    return results
  }
}

/**
 * Calculate relevance score for search results
 */
function calculateRelevanceScore(
  item: unknown,
  searchTerms: string[],
  fields?: string[]
): number {
  let score = 0
  const searchableFields = fields || Object.keys(item as Record<string, unknown>)

  searchTerms.forEach(term => {
    searchableFields.forEach(field => {
      const value = String((item as Record<string, unknown>)[field] || '').toLowerCase()
      if (value.includes(term)) {
        // Exact match gets higher score
        if (value === term) {
          score += 10
        }
        // Match at beginning of word
        else if (value.startsWith(term) || value.includes(' ' + term)) {
          score += 5
        }
        // Match anywhere
        else {
          score += 1
        }
      }
    })
  })

  return score
}

/**
 * Message handler for the worker
 */
self.addEventListener('message', async (event: MessageEvent<WorkerRequest>) => {
  const { id, type, data, config } = event.data

  try {
    // Send progress update
    self.postMessage({
      id,
      type: 'progress',
      progress: 0
    } as WorkerResponse)

    // Process based on type
    let result

    if (type === 'batch') {
      // Special handling for batch processing with progress
      const batchData = (data.items as { items?: unknown[]; query?: string; field?: string; order?: string }[]) || []
      result = await processors.batch(batchData, {
        ...(config as Record<string, unknown>),
        progressCallback: (progress: number) => {
          self.postMessage({
            id,
            type: 'progress',
            progress
          } as WorkerResponse)
        }
      })
    } else if (type in processors) {
      const processorFunc = processors[type as keyof typeof processors]
      const processData = (data.items as unknown[]) || (data as unknown[]) || []
      result = await (processorFunc as (data: unknown[], config: unknown) => unknown)(
        processData,
        config || {}
      )
    } else {
      throw new Error(`Unknown processor type: ${type}`)
    }

    // Send success response
    self.postMessage({
      id,
      type: 'success',
      data: result
    } as WorkerResponse)

  } catch (error) {
    // Send error response
    self.postMessage({
      id,
      type: 'error',
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    } as WorkerResponse)
  }
})

// Export for TypeScript
export {}