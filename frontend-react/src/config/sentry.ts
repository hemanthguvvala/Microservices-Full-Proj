// Sentry configuration for production error tracking
import * as Sentry from '@sentry/react'

export function initSentry() {
  // Only initialize in production
  if (import.meta.env.PROD && import.meta.env.VITE_SENTRY_DSN) {
    Sentry.init({
      dsn: import.meta.env.VITE_SENTRY_DSN,
      
      // Performance Monitoring & Replay integrations
      integrations: [
        Sentry.browserTracingIntegration({
          // Set tracing origins to match your backend
        }),
        Sentry.replayIntegration({
          maskAllText: true,
          blockAllMedia: true,
        }),
      ],

      // Set sample rate for performance monitoring
      // 1.0 = 100% of transactions, 0.1 = 10%
      tracesSampleRate: 0.1,

      // Set sample rate for profiling
      // This is relative to tracesSampleRate
      profilesSampleRate: 0.1,

      // Environment
      environment: import.meta.env.MODE,

      // Release tracking (useful for identifying which version has issues)
      release: import.meta.env.VITE_APP_VERSION || '1.0.0',

      // Ignore certain errors
      ignoreErrors: [
        // Browser extensions
        'top.GLOBALS',
        // Network errors that are user-side issues
        'NetworkError',
        'Network request failed',
        // Random plugins/extensions
        'Non-Error promise rejection captured',
      ],

      // Before sending events, filter or modify them
      beforeSend(event, hint) {
        // Don't send events in development
        if (import.meta.env.DEV) {
          return null
        }

        // Filter out non-error events
        if (event.exception) {
          const _error = hint.originalException
          
          // Log to console in development
          console.error('Sentry Event:', event, _error)
        }

        return event
      },

      // Session Replay for debugging
      replaysSessionSampleRate: 0.1, // 10% of sessions
      replaysOnErrorSampleRate: 1.0, // 100% of sessions with errors
    })

    console.log('✅ Sentry initialized for error tracking')
  } else {
    console.log('ℹ️ Sentry not initialized (development mode or no DSN)')
  }
}

// Custom error tracking functions
export const trackError = (error: Error, context?: Record<string, any>) => {
  Sentry.captureException(error, {
    extra: context,
  })
}

export const trackMessage = (message: string, level: Sentry.SeverityLevel = 'info') => {
  Sentry.captureMessage(message, level)
}

// Set user context for better debugging
export const setUserContext = (user: { id: string; email?: string; username?: string }) => {
  Sentry.setUser({
    id: user.id,
    email: user.email,
    username: user.username,
  })
}

// Clear user context on logout
export const clearUserContext = () => {
  Sentry.setUser(null)
}

// Add custom breadcrumbs for debugging
export const addBreadcrumb = (message: string, data?: Record<string, any>) => {
  Sentry.addBreadcrumb({
    message,
    data,
    level: 'info',
  })
}
