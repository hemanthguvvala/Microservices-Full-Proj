import React from 'react'
import config from '../config'
import { trackMessage } from '../config/sentry'

/**
 * Analytics event types
 */
export type AnalyticsEvent = {
  // User events
  'user_login': { method: string; userId?: string }
  'user_logout': { userId?: string }
  'user_signup': { method: string }
  
  // Page events
  'page_view': { path: string; title: string }
  'page_leave': { path: string; duration: number }
  
  // Employee events
  'employee_create': { employeeId: string }
  'employee_update': { employeeId: string; fields: string[] }
  'employee_delete': { employeeId: string }
  'employee_view': { employeeId: string }
  'employee_export': { format: 'csv' | 'excel' | 'pdf'; count: number }
  'employee_import': { format: 'csv' | 'excel'; count: number; errors: number }
  
  // Saga events
  'saga_start': { sagaType: string }
  'saga_complete': { sagaType: string; duration: number }
  'saga_compensate': { sagaType: string; reason: string }
  
  // Search events
  'search': { query: string; resultsCount: number; filters?: Record<string, any> }
  
  // Error events
  'error_occurred': { error: string; component?: string; severity: 'low' | 'medium' | 'high' }
  
  // File events
  'file_upload': { fileType: string; fileSize: number; success: boolean }
  'file_download': { fileName: string; fileType: string }
  
  // Performance events
  'performance_issue': { metric: string; value: number; threshold: number }
  
  // Feature usage
  'feature_used': { feature: string; context?: Record<string, any> }
}

/**
 * Analytics properties
 */
interface AnalyticsProperties {
  [key: string]: string | number | boolean | Record<string, any> | undefined
}

/**
 * User properties for analytics
 */
interface UserProperties {
  userId?: string
  email?: string
  name?: string
  role?: string
  plan?: string
  [key: string]: string | number | boolean | undefined
}

/**
 * Analytics class for tracking events
 */
class Analytics {
  private initialized = false

  /**
   * Initialize analytics
   */
  init() {
    if (this.initialized) return

    // Initialize Google Analytics
    if (config.get().analytics.googleAnalyticsId) {
      this.initGoogleAnalytics()
    }

    // Initialize Mixpanel
    if (config.get().analytics.mixpanelToken) {
      this.initMixpanel()
    }

    this.initialized = true
    console.log('✅ Analytics initialized')
  }

  /**
   * Initialize Google Analytics (gtag.js)
   */
  private initGoogleAnalytics() {
    const gaId = config.get().analytics.googleAnalyticsId
    if (!gaId) return

    // Load gtag.js script
    const script = document.createElement('script')
    script.async = true
    script.src = `https://www.googletagmanager.com/gtag/js?id=${gaId}`
    document.head.appendChild(script)

    // Initialize dataLayer
    window.dataLayer = window.dataLayer || []
    window.gtag = function gtag(...args: any[]) {
      window.dataLayer.push(args)
    }
    window.gtag('js', new Date())
    window.gtag('config', gaId, {
      send_page_view: false, // We'll send manually
    })

    console.log('✅ Google Analytics loaded:', gaId)
  }

  /**
   * Initialize Mixpanel
   */
  private initMixpanel() {
    const token = config.get().analytics.mixpanelToken
    if (!token || typeof window === 'undefined') return

    // Load Mixpanel SDK
    const script = document.createElement('script')
    script.type = 'text/javascript'
    script.async = true
    script.src = 'https://cdn.mxpnl.com/libs/mixpanel-2-latest.min.js'
    
    script.onload = () => {
      if (window.mixpanel) {
        window.mixpanel.init(token, {
          debug: config.isDevelopment(),
          track_pageview: false, // We'll track manually
          persistence: 'localStorage',
        })
        console.log('✅ Mixpanel loaded:', token)
      }
    }

    document.head.appendChild(script)
  }

  /**
   * Track an event
   */
  track<K extends keyof AnalyticsEvent>(
    event: K,
    properties?: AnalyticsEvent[K] & AnalyticsProperties
  ) {
    // Log in development
    if (config.isDevelopment()) {
      console.log('📊 Analytics:', event, properties)
    }

    // Send to Google Analytics
    if (window.gtag) {
      window.gtag('event', event, properties)
    }

    // Send to Mixpanel
    if (window.mixpanel) {
      window.mixpanel.track(event, properties)
    }

    // Send to Sentry breadcrumb
    trackMessage(`Analytics: ${event}`, 'info')
  }

  /**
   * Track page view
   */
  pageView(path: string, title?: string) {
    this.track('page_view', {
      path,
      title: title || document.title,
    })

    // Google Analytics page view
    if (window.gtag) {
      window.gtag('config', config.get().analytics.googleAnalyticsId!, {
        page_path: path,
        page_title: title,
      })
    }
  }

  /**
   * Set user properties
   */
  identify(userId: string, properties?: UserProperties) {

    // Google Analytics
    if (window.gtag) {
      window.gtag('set', { user_id: userId })
      if (properties) {
        window.gtag('set', 'user_properties', properties)
      }
    }

    // Mixpanel
    if (window.mixpanel) {
      window.mixpanel.identify(userId)
      if (properties) {
        window.mixpanel.people.set(properties)
      }
    }

    console.log('👤 User identified:', userId)
  }

  /**
   * Reset user (on logout)
   */
  reset() {

    // Mixpanel
    if (window.mixpanel) {
      window.mixpanel.reset()
    }

    console.log('👤 User reset')
  }

  /**
   * Set user properties
   */
  setUserProperties(properties: UserProperties) {
    // Mixpanel
    if (window.mixpanel) {
      window.mixpanel.people.set(properties)
    }
  }

  /**
   * Increment a user property
   */
  incrementUserProperty(property: string, value = 1) {
    // Mixpanel
    if (window.mixpanel) {
      window.mixpanel.people.increment(property, value)
    }
  }

  /**
   * Track timing (for performance metrics)
   */
  timing(category: string, variable: string, value: number, label?: string) {
    if (window.gtag) {
      window.gtag('event', 'timing_complete', {
        name: variable,
        value: value,
        event_category: category,
        event_label: label,
      })
    }
  }
}

// Singleton instance
const analytics = new Analytics()

/**
 * React hook for analytics
 */
export const useAnalytics = () => {
  const trackEvent = <K extends keyof AnalyticsEvent>(
    event: K,
    properties?: AnalyticsEvent[K] & AnalyticsProperties
  ) => {
    analytics.track(event, properties)
  }

  return {
    track: trackEvent,
    pageView: analytics.pageView.bind(analytics),
    identify: analytics.identify.bind(analytics),
    reset: analytics.reset.bind(analytics),
    setUserProperties: analytics.setUserProperties.bind(analytics),
    incrementUserProperty: analytics.incrementUserProperty.bind(analytics),
  }
}

/**
 * HOC to track page views
 */
export const withPageTracking = <P extends object>(
  Component: React.ComponentType<P>,
  pageName?: string
) => {
  return (props: P) => {
    React.useEffect(() => {
      analytics.pageView(
        window.location.pathname,
        pageName || document.title
      )
    }, [])

    return <Component {...props} />
  }
}

/**
 * Track component mount/unmount
 */
export const useComponentTracking = (componentName: string) => {
  const mountTime = React.useRef(Date.now())

  React.useEffect(() => {
    // Track mount
    analytics.track('feature_used', {
      feature: componentName,
      context: { action: 'mount' },
    })

    return () => {
      // Track unmount with duration
      const duration = Date.now() - mountTime.current
      analytics.track('page_leave', {
        path: componentName,
        duration,
      })
    }
  }, [componentName])
}

/**
 * TypeScript declarations for analytics globals
 */
declare global {
  interface Window {
    dataLayer: any[]
    gtag?: (...args: any[]) => void
    mixpanel: any
  }
}

export default analytics
