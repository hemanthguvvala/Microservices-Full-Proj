import React, { Suspense, ComponentType, lazy } from 'react'
import { Loader2 } from 'lucide-react'
import ErrorBoundary from './ErrorBoundary'

// Loading fallback component
export const LoadingFallback: React.FC<{ message?: string }> = ({ 
  message = 'Loading...' 
}) => {
  return (
    <div className="flex flex-col items-center justify-center min-h-[200px] space-y-4">
      <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
      <p className="text-sm text-gray-600">{message}</p>
    </div>
  )
}

// Skeleton loader for better perceived performance
export const SkeletonLoader: React.FC = () => {
  return (
    <div className="space-y-4 p-6 animate-pulse">
      <div className="h-8 bg-gray-200 rounded w-1/4" />
      <div className="space-y-3">
        <div className="h-4 bg-gray-200 rounded" />
        <div className="h-4 bg-gray-200 rounded w-5/6" />
        <div className="h-4 bg-gray-200 rounded w-4/6" />
      </div>
      <div className="grid grid-cols-3 gap-4 mt-6">
        <div className="h-32 bg-gray-200 rounded" />
        <div className="h-32 bg-gray-200 rounded" />
        <div className="h-32 bg-gray-200 rounded" />
      </div>
    </div>
  )
}

interface LazyLoadProps {
  /**
   * Fallback component to show while loading
   * Can be 'spinner' | 'skeleton' | custom React component
   */
  fallback?: 'spinner' | 'skeleton' | React.ReactNode
  
  /**
   * Custom loading message
   */
  message?: string
  
  /**
   * Children to render
   */
  children: React.ReactNode
  
  /**
   * Whether to wrap with error boundary
   * @default true
   */
  withErrorBoundary?: boolean
  
  /**
   * Custom error fallback
   */
  errorFallback?: React.ReactNode
}

/**
 * LazyLoad wrapper component with Suspense and optional ErrorBoundary
 * 
 * Usage:
 * ```tsx
 * import { lazyLoadRoute } from './components/LazyLoad'
 * 
 * const Dashboard = lazyLoadRoute(() => import('./pages/Dashboard'))
 * 
 * // In routes
 * <Route path="/dashboard" element={<Dashboard />} />
 * ```
 */
export const LazyLoad: React.FC<LazyLoadProps> = ({
  fallback = 'spinner',
  message,
  children,
  withErrorBoundary = true,
  errorFallback,
}) => {
  const getFallbackComponent = () => {
    if (React.isValidElement(fallback)) {
      return fallback
    }
    
    switch (fallback) {
      case 'skeleton':
        return <SkeletonLoader />
      case 'spinner':
      default:
        return <LoadingFallback message={message} />
    }
  }

  const content = (
    <Suspense fallback={getFallbackComponent()}>
      {children}
    </Suspense>
  )

  if (withErrorBoundary) {
    return (
      <ErrorBoundary fallback={errorFallback}>
        {content}
      </ErrorBoundary>
    )
  }

  return content
}

/**
 * Utility to lazy load a route component with automatic Suspense + ErrorBoundary
 * 
 * @example
 * ```tsx
 * const Dashboard = lazyLoadRoute(() => import('./pages/Dashboard'))
 * const EmployeeList = lazyLoadRoute(
 *   () => import('./pages/EmployeeList'),
 *   { fallback: 'skeleton' }
 * )
 * ```
 */
export const lazyLoadRoute = <T extends ComponentType<any>>(
  importFunc: () => Promise<{ default: T }>,
  options?: Omit<LazyLoadProps, 'children'>
) => {
  const LazyComponent = lazy(importFunc)

  return (props: React.ComponentProps<T>) => (
    <LazyLoad {...options}>
      <LazyComponent {...props} />
    </LazyLoad>
  )
}

/**
 * Preload a lazy component
 * Useful for preloading on hover or route prediction
 * 
 * @example
 * ```tsx
 * const Dashboard = lazy(() => import('./pages/Dashboard'))
 * 
 * <button
 *   onMouseEnter={() => preloadComponent(Dashboard)}
 *   onClick={() => navigate('/dashboard')}
 * >
 *   Dashboard
 * </button>
 * ```
 */
export const preloadComponent = <T extends ComponentType<any>>(
  LazyComponent: React.LazyExoticComponent<T>
) => {
  // Force lazy component to load
  const component = LazyComponent as any
  if (component._result === null) {
    component._result = component._ctor()
  }
  return component._result
}

/**
 * HOC to add retry logic to lazy imports
 * Retries failed imports with exponential backoff
 * 
 * @example
 * ```tsx
 * const Dashboard = lazy(
 *   retryLazyImport(() => import('./pages/Dashboard'), 3)
 * )
 * ```
 */
export const retryLazyImport = <T extends ComponentType<any>>(
  importFunc: () => Promise<{ default: T }>,
  maxRetries = 3,
  delayMs = 1000
) => {
  return async () => {
    let lastError: Error | null = null
    
    for (let i = 0; i < maxRetries; i++) {
      try {
        return await importFunc()
      } catch (error) {
        lastError = error as Error
        
        // Don't retry on the last attempt
        if (i < maxRetries - 1) {
          // Exponential backoff: 1s, 2s, 4s
          const delay = delayMs * Math.pow(2, i)
          await new Promise(resolve => setTimeout(resolve, delay))
          
          console.log(
            `Retry ${i + 1}/${maxRetries} after ${delay}ms for lazy import`
          )
        }
      }
    }
    
    throw lastError || new Error('Failed to load component')
  }
}

/**
 * Component to lazy load images with intersection observer
 * 
 * @example
 * ```tsx
 * <LazyImage
 *   src="/large-image.jpg"
 *   alt="Description"
 *   placeholder="/thumbnail.jpg"
 * />
 * ```
 */
interface LazyImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string
  alt: string
  placeholder?: string
  threshold?: number
  rootMargin?: string
}

export const LazyImage: React.FC<LazyImageProps> = ({
  src,
  alt,
  placeholder,
  threshold = 0.01,
  rootMargin = '50px',
  className = '',
  ...props
}) => {
  const [imageSrc, setImageSrc] = React.useState(placeholder || '')
  const [isLoaded, setIsLoaded] = React.useState(false)
  const imgRef = React.useRef<HTMLImageElement>(null)

  React.useEffect(() => {
    if (!imgRef.current) return

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setImageSrc(src)
            observer.disconnect()
          }
        })
      },
      { threshold, rootMargin }
    )

    observer.observe(imgRef.current)

    return () => observer.disconnect()
  }, [src, threshold, rootMargin])

  return (
    <img
      ref={imgRef}
      src={imageSrc}
      alt={alt}
      className={`transition-opacity duration-300 ${
        isLoaded ? 'opacity-100' : 'opacity-50'
      } ${className}`}
      onLoad={() => setIsLoaded(true)}
      {...props}
    />
  )
}

export default LazyLoad
