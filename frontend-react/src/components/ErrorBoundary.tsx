// Production-grade Error Boundary component
import { Component, ReactNode, ErrorInfo } from 'react'
import * as Sentry from '@sentry/react'
import { AlertCircle, RefreshCw, Home } from 'lucide-react'

interface Props {
  children: ReactNode
  fallback?: ReactNode
  onReset?: () => void
}

interface State {
  hasError: boolean
  errorInfo: ErrorInfo | null
  error: Error | null
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = {
      hasError: false,
      errorInfo: null,
      error: null
    }
  }

  static getDerivedStateFromError(_error: Error): Partial<State> {
    return { hasError: true }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log error to console in development
    console.error('Error Boundary caught an error:', error, errorInfo)
    
    // Send to Sentry in production
    if (import.meta.env.PROD) {
      Sentry.captureException(error, {
        contexts: {
          react: {
            componentStack: errorInfo.componentStack,
          },
        },
      })
    }

    this.setState({
      error,
      errorInfo,
    })
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    })
    
    if (this.props.onReset) {
      this.props.onReset()
    }
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback
      }

      return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
          <div className="max-w-md w-full">
            <div className="bg-white rounded-lg shadow-lg p-8">
              {/* Icon */}
              <div className="flex justify-center mb-6">
                <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
                  <AlertCircle className="w-8 h-8 text-red-600" />
                </div>
              </div>

              {/* Title */}
              <h1 className="text-2xl font-bold text-gray-900 text-center mb-2">
                Oops! Something went wrong
              </h1>
              
              {/* Description */}
              <p className="text-gray-600 text-center mb-6">
                We're sorry for the inconvenience. The error has been logged and we'll look into it.
              </p>

              {/* Error details (only in development) */}
              {import.meta.env.DEV && this.state.error && (
                <details className="mb-6">
                  <summary className="cursor-pointer text-sm text-gray-700 font-medium mb-2">
                    Error Details (Development Only)
                  </summary>
                  <div className="bg-gray-100 p-4 rounded-md overflow-auto max-h-48">
                    <pre className="text-xs text-red-600">
                      {this.state.error.toString()}
                      {this.state.errorInfo?.componentStack}
                    </pre>
                  </div>
                </details>
              )}

              {/* Actions */}
              <div className="flex gap-3">
                <button
                  onClick={this.handleReset}
                  className="flex-1 btn-primary flex items-center justify-center gap-2"
                >
                  <RefreshCw className="w-4 h-4" />
                  Try Again
                </button>
                <a
                  href="/"
                  className="flex-1 btn-secondary flex items-center justify-center gap-2"
                >
                  <Home className="w-4 h-4" />
                  Go Home
                </a>
              </div>
            </div>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

export default ErrorBoundary

// Functional hook-based error boundary (using react-error-boundary)
export { ErrorBoundary as ReactErrorBoundary } from 'react-error-boundary'

// Custom error fallback component
export function ErrorFallback({ error, resetErrorBoundary }: any) {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-lg p-8 max-w-md">
        <div className="flex justify-center mb-4">
          <AlertCircle className="w-12 h-12 text-red-600" />
        </div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">Something went wrong</h2>
        <p className="text-gray-600 mb-4">{error.message}</p>
        <button onClick={resetErrorBoundary} className="btn-primary w-full">
          Try again
        </button>
      </div>
    </div>
  )
}
