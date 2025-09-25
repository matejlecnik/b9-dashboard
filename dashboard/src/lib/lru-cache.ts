import { useCallback, useMemo, useState } from 'react'

/**
 * LRU (Least Recently Used) Cache implementation
 * Prevents memory leaks by limiting the size of cached data
 */

export class LRUCache<K, V> {
  private maxSize: number
  private cache: Map<K, V>

  constructor(maxSize = 100) {
    this.maxSize = maxSize
    this.cache = new Map()
  }

  get(key: K): V | undefined {
    if (!this.cache.has(key)) {
      return undefined
    }

    // Move to end (most recently used)
    const value = this.cache.get(key)!
    this.cache.delete(key)
    this.cache.set(key, value)
    return value
  }

  set(key: K, value: V): void {
    // If key exists, delete it first (to update position)
    if (this.cache.has(key)) {
      this.cache.delete(key)
    }

    // Add to end (most recently used)
    this.cache.set(key, value)

    // Remove oldest if over capacity
    if (this.cache.size > this.maxSize) {
      const firstKey = this.cache.keys().next().value
      if (firstKey !== undefined) {
        this.cache.delete(firstKey)
      }
    }
  }

  has(key: K): boolean {
    return this.cache.has(key)
  }

  delete(key: K): boolean {
    return this.cache.delete(key)
  }

  clear(): void {
    this.cache.clear()
  }

  get size(): number {
    return this.cache.size
  }

  keys(): IterableIterator<K> {
    return this.cache.keys()
  }

  values(): IterableIterator<V> {
    return this.cache.values()
  }

  entries(): IterableIterator<[K, V]> {
    return this.cache.entries()
  }

  forEach(callback: (value: V, key: K, map: Map<K, V>) => void): void {
    this.cache.forEach(callback)
  }
}

/**
 * LRU Set implementation with size limit
 * Automatically evicts least recently used items when limit is reached
 */
export class LRUSet<T> {
  private maxSize: number
  private set: Set<T>
  private accessOrder: T[]

  constructor(maxSize = 100, initialValues?: T[]) {
    this.maxSize = maxSize
    this.set = new Set(initialValues?.slice(0, maxSize))
    this.accessOrder = initialValues?.slice(0, maxSize) || []
  }

  add(value: T): this {
    // If value exists, update its position
    if (this.set.has(value)) {
      const index = this.accessOrder.indexOf(value)
      if (index > -1) {
        this.accessOrder.splice(index, 1)
      }
    }

    // Add to end (most recently used)
    this.set.add(value)
    this.accessOrder.push(value)

    // Remove oldest if over capacity
    if (this.set.size > this.maxSize) {
      const oldest = this.accessOrder.shift()
      if (oldest !== undefined) {
        this.set.delete(oldest)
      }
    }

    return this
  }

  has(value: T): boolean {
    if (this.set.has(value)) {
      // Update access order
      const index = this.accessOrder.indexOf(value)
      if (index > -1) {
        this.accessOrder.splice(index, 1)
        this.accessOrder.push(value)
      }
      return true
    }
    return false
  }

  delete(value: T): boolean {
    const deleted = this.set.delete(value)
    if (deleted) {
      const index = this.accessOrder.indexOf(value)
      if (index > -1) {
        this.accessOrder.splice(index, 1)
      }
    }
    return deleted
  }

  clear(): void {
    this.set.clear()
    this.accessOrder = []
  }

  get size(): number {
    return this.set.size
  }

  values(): IterableIterator<T> {
    return this.set.values()
  }

  forEach(callback: (value: T, value2: T, set: Set<T>) => void): void {
    this.set.forEach(callback)
  }

  [Symbol.iterator](): IterableIterator<T> {
    return this.set[Symbol.iterator]()
  }

  toArray(): T[] {
    return Array.from(this.set)
  }
}

/**
 * React hook for using LRU Set in components
 */

export function useLRUSet<T>(maxSize = 100, initialValues?: T[]) {
  const [version, setVersion] = useState(0)

  const lruSet = useMemo(
    () => new LRUSet<T>(maxSize, initialValues),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  )

  const add = useCallback((value: T) => {
    lruSet.add(value)
    setVersion((v: number) => v + 1)
  }, [lruSet])

  const remove = useCallback((value: T) => {
    const deleted = lruSet.delete(value)
    if (deleted) setVersion((v: number) => v + 1)
    return deleted
  }, [lruSet])

  const has = useCallback((value: T) => {
    return lruSet.has(value)
  }, [lruSet])

  const clear = useCallback(() => {
    lruSet.clear()
    setVersion((v: number) => v + 1)
  }, [lruSet])

  const toggle = useCallback((value: T) => {
    if (lruSet.has(value)) {
      lruSet.delete(value)
    } else {
      lruSet.add(value)
    }
    setVersion((v: number) => v + 1)
  }, [lruSet])

  return {
    set: lruSet,
    size: lruSet.size,
    add,
    remove,
    has,
    clear,
    toggle,
    values: () => lruSet.values(),
    toArray: () => lruSet.toArray(),
    // Force re-render when version changes
    version
  }
}

/**
 * React hook for using LRU Cache in components
 */
export function useLRUCache<K, V>(maxSize = 100) {
  const [version, setVersion] = useState(0)

  const cache = useMemo(
    () => new LRUCache<K, V>(maxSize),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  )

  const get = useCallback((key: K) => {
    return cache.get(key)
  }, [cache])

  const set = useCallback((key: K, value: V) => {
    cache.set(key, value)
    setVersion((v: number) => v + 1)
  }, [cache])

  const remove = useCallback((key: K) => {
    const deleted = cache.delete(key)
    if (deleted) setVersion((v: number) => v + 1)
    return deleted
  }, [cache])

  const has = useCallback((key: K) => {
    return cache.has(key)
  }, [cache])

  const clear = useCallback(() => {
    cache.clear()
    setVersion((v: number) => v + 1)
  }, [cache])

  return {
    cache,
    size: cache.size,
    get,
    set,
    remove,
    has,
    clear,
    // Force re-render when version changes
    version
  }
}