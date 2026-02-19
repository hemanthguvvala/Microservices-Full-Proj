import React, { useCallback, useRef, useEffect } from 'react'
import { Loader2, AlertCircle } from 'lucide-react'
import { useIntersectionObserver } from '../hooks/useProduction'

interface InfiniteScrollProps<T> {
  /**
   * Array of items to render
   */
  items: T[]
  
  /**
   * Render function for each item
   */
  renderItem: (item: T, index: number) => React.ReactNode
  
  /**
   * Callback to load more items
   */
  onLoadMore: () => void | Promise<void>
  
  /**
   * Whether currently loading more items
   */
  loading: boolean
  
  /**
   * Whether there are more items to load
   */
  hasMore: boolean
  
  /**
   * Error message if loading failed
   */
  error?: string | null
  
  /**
   * Custom loading component
   */
  loader?: React.ReactNode
  
  /**
   * Custom end message
   */
  endMessage?: React.ReactNode
  
  /**
   * Container className
   */
  className?: string
  
  /**
   * Threshold for triggering load more (0-1)
   * @default 0.01
   */
  threshold?: number
  
  /**
   * Root margin for intersection observer
   * @default '100px'
   */
  rootMargin?: string
  
  /**
   * Key extractor for list items
   */
  keyExtractor?: (item: T, index: number) => string | number
}

/**
 * Infinite scroll component with intersection observer
 * Automatically loads more items when scrolling near the bottom
 * 
 * @example
 * ```tsx
 * <InfiniteScroll
 *   items={employees}
 *   renderItem={(employee) => <EmployeeCard employee={employee} />}
 *   onLoadMore={fetchNextPage}
 *   loading={isFetchingNextPage}
 *   hasMore={hasNextPage}
 * />
 * ```
 */
export function InfiniteScroll<T>({
  items,
  renderItem,
  onLoadMore,
  loading,
  hasMore,
  error,
  loader,
  endMessage,
  className = '',
  threshold = 0.01,
  rootMargin = '100px',
  keyExtractor = (_, index) => index,
}: InfiniteScrollProps<T>) {
  const loadMoreRef = useRef<HTMLDivElement>(null)
  const isLoadingRef = useRef(false)

  // Intersection observer to detect when to load more
  const [setNode, entry] = useIntersectionObserver({
    threshold,
    rootMargin,
  })

  useEffect(() => {
    if (loadMoreRef.current) {
      setNode(loadMoreRef.current)
    }
  }, [setNode])

  // Trigger load more when sentinel is visible
  useEffect(() => {
    if (
      entry?.isIntersecting &&
      hasMore &&
      !loading &&
      !isLoadingRef.current &&
      !error
    ) {
      isLoadingRef.current = true
      Promise.resolve(onLoadMore()).finally(() => {
        isLoadingRef.current = false
      })
    }
  }, [entry?.isIntersecting, hasMore, loading, onLoadMore, error])

  const defaultLoader = (
    <div className="flex justify-center items-center py-8">
      <Loader2 className="h-6 w-6 animate-spin text-primary-600" />
      <span className="ml-2 text-sm text-gray-600">Loading more...</span>
    </div>
  )

  const defaultEndMessage = (
    <div className="flex justify-center items-center py-8">
      <p className="text-sm text-gray-500">
        {items.length === 0 ? 'No items found' : 'No more items to load'}
      </p>
    </div>
  )

  const errorMessage = error && (
    <div className="flex flex-col items-center justify-center py-8 space-y-2">
      <AlertCircle className="h-6 w-6 text-red-500" />
      <p className="text-sm text-red-600">{error}</p>
      <button
        onClick={onLoadMore}
        className="px-4 py-2 text-sm text-white bg-primary-600 rounded hover:bg-primary-700"
      >
        Try Again
      </button>
    </div>
  )

  return (
    <div className={className}>
      {/* Render items */}
      {items.map((item, index) => (
        <React.Fragment key={keyExtractor(item, index)}>
          {renderItem(item, index)}
        </React.Fragment>
      ))}

      {/* Loading indicator */}
      {loading && (loader || defaultLoader)}

      {/* Error message */}
      {error && errorMessage}

      {/* End message or sentinel */}
      {!loading && !error && (
        <>
          {hasMore ? (
            <div ref={loadMoreRef} className="h-10" />
          ) : (
            endMessage || defaultEndMessage
          )}
        </>
      )}
    </div>
  )
}

/**
 * Virtualized infinite scroll for large lists
 * Uses react-window for performance
 */
import { FixedSizeList as List } from 'react-window'

interface VirtualInfiniteScrollProps<T> {
  items: T[]
  renderItem: (item: T, index: number) => React.ReactNode
  onLoadMore: () => void | Promise<void>
  loading: boolean
  hasMore: boolean
  itemHeight: number
  height: number
  width?: string | number
  className?: string
  overscanCount?: number
  keyExtractor?: (item: T, index: number) => string | number
}

/**
 * Virtualized infinite scroll for rendering thousands of items efficiently
 * Only renders items in viewport
 * 
 * @example
 * ```tsx
 * <VirtualInfiniteScroll
 *   items={employees}
 *   renderItem={(employee) => <EmployeeRow employee={employee} />}
 *   onLoadMore={fetchNextPage}
 *   loading={isFetchingNextPage}
 *   hasMore={hasNextPage}
 *   itemHeight={80}
 *   height={600}
 * />
 * ```
 */
export function VirtualInfiniteScroll<T>({
  items,
  renderItem,
  onLoadMore,
  loading,
  hasMore,
  itemHeight,
  height,
  width = '100%',
  className = '',
  overscanCount = 5,
  keyExtractor = (_, index) => index,
}: VirtualInfiniteScrollProps<T>) {
  const listRef = useRef<List>(null)
  const isLoadingRef = useRef(false)

  const handleScroll = useCallback(
    ({ scrollOffset, scrollUpdateWasRequested }: any) => {
      if (scrollUpdateWasRequested || !listRef.current) return

      const totalHeight = items.length * itemHeight
      const visibleHeight = height
      
      // Load more when scrolled to 80% of the list
      const scrollPercentage = (scrollOffset + visibleHeight) / totalHeight
      
      if (
        scrollPercentage > 0.8 &&
        hasMore &&
        !loading &&
        !isLoadingRef.current
      ) {
        isLoadingRef.current = true
        Promise.resolve(onLoadMore()).finally(() => {
          isLoadingRef.current = false
        })
      }
    },
    [items.length, itemHeight, height, hasMore, loading, onLoadMore]
  )

  const Row = ({ index, style }: { index: number; style: React.CSSProperties }) => {
    // Show loading indicator for items being loaded
    if (index === items.length) {
      return (
        <div style={style} className="flex justify-center items-center">
          <Loader2 className="h-5 w-5 animate-spin text-primary-600" />
        </div>
      )
    }

    const item = items[index]
    return (
      <div style={style} key={keyExtractor(item, index)}>
        {renderItem(item, index)}
      </div>
    )
  }

  // Add 1 to item count for loading indicator
  const itemCount = hasMore && loading ? items.length + 1 : items.length

  return (
    <div className={className}>
      <List
        ref={listRef}
        height={height}
        itemCount={itemCount}
        itemSize={itemHeight}
        width={width}
        onScroll={handleScroll}
        overscanCount={overscanCount}
      >
        {Row}
      </List>
    </div>
  )
}

/**
 * Hook for infinite scroll functionality
 * Provides state management for infinite scroll
 * 
 * @example
 * ```tsx
 * const {
 *   items,
 *   loading,
 *   hasMore,
 *   error,
 *   loadMore,
 *   reset,
 * } = useInfiniteScrollData({
 *   fetchItems: async (page) => {
 *     const response = await fetch(`/api/employees?page=${page}`)
 *     return response.json()
 *   },
 *   pageSize: 20,
 * })
 * 
 * <InfiniteScroll
 *   items={items}
 *   onLoadMore={loadMore}
 *   loading={loading}
 *   hasMore={hasMore}
 *   error={error}
 * />
 * ```
 */
interface UseInfiniteScrollDataOptions<T> {
  fetchItems: (page: number, pageSize: number) => Promise<T[]>
  pageSize?: number
  initialPage?: number
}

export function useInfiniteScrollData<T>({
  fetchItems,
  pageSize = 20,
  initialPage = 1,
}: UseInfiniteScrollDataOptions<T>) {
  const [items, setItems] = React.useState<T[]>([])
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [page, setPage] = React.useState(initialPage)
  const [hasMore, setHasMore] = React.useState(true)

  const loadMore = useCallback(async () => {
    if (loading || !hasMore) return

    setLoading(true)
    setError(null)

    try {
      const newItems = await fetchItems(page, pageSize)
      
      if (newItems.length === 0) {
        setHasMore(false)
      } else {
        setItems((prev) => [...prev, ...newItems])
        setPage((prev) => prev + 1)
        
        // If we got fewer items than pageSize, we've reached the end
        if (newItems.length < pageSize) {
          setHasMore(false)
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load items')
    } finally {
      setLoading(false)
    }
  }, [loading, hasMore, page, pageSize, fetchItems])

  const reset = useCallback(() => {
    setItems([])
    setPage(initialPage)
    setHasMore(true)
    setError(null)
    setLoading(false)
  }, [initialPage])

  // Load initial items
  useEffect(() => {
    loadMore()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return {
    items,
    loading,
    hasMore,
    error,
    loadMore,
    reset,
  }
}

export default InfiniteScroll
