// Web Vitals monitoring for performance tracking
import { onCLS, onFID, onFCP, onLCP, onTTFB, Metric } from 'web-vitals'
import * as Sentry from '@sentry/react'

interface PerformanceMetrics {
  CLS: number | null // Cumulative Layout Shift
  FID: number | null // First Input Delay
  FCP: number | null // First Contentful Paint
  LCP: number | null // Largest Contentful Paint
  TTFB: number | null // Time to First Byte
}

class PerformanceMonitor {
  private metrics: PerformanceMetrics = {
    CLS: null,
    FID: null,
    FCP: null,
    LCP: null,
    TTFB: null,
  }

  private reportMetric = (metric: Metric) => {
    // Store metric
    this.metrics[metric.name as keyof PerformanceMetrics] = metric.value

    // Log in development
    if (import.meta.env.DEV) {
      console.log(`📊 ${metric.name}:`, metric.value, metric)
    }

    // Send to analytics in production
    if (import.meta.env.PROD) {
      // Send to Google Analytics
      if (window.gtag) {
        window.gtag('event', metric.name, {
          value: Math.round(metric.name === 'CLS' ? metric.value * 1000 : metric.value),
          event_category: 'Web Vitals',
          event_label: metric.id,
          non_interaction: true,
        })
      }

      // Send to Sentry as measurement
      Sentry.setMeasurement(metric.name, metric.value, metric.name === 'CLS' ? '' : 'millisecond')

      // Custom analytics endpoint
      this.sendToAnalytics(metric)
    }

    // Check if metric is good, needs improvement, or poor
    this.evaluateMetric(metric)
  }

  private evaluateMetric(metric: Metric) {
    const thresholds: Record<string, { good: number; poor: number }> = {
      CLS: { good: 0.1, poor: 0.25 },
      FID: { good: 100, poor: 300 },
      FCP: { good: 1800, poor: 3000 },
      LCP: { good: 2500, poor: 4000 },
      TTFB: { good: 800, poor: 1800 },
    }

    const threshold = thresholds[metric.name]
    if (!threshold) return

    let rating: 'good' | 'needs-improvement' | 'poor'
    if (metric.value <= threshold.good) {
      rating = 'good'
    } else if (metric.value <= threshold.poor) {
      rating = 'needs-improvement'
    } else {
      rating = 'poor'
    }

    if (import.meta.env.DEV) {
      const emoji = rating === 'good' ? '✅' : rating === 'needs-improvement' ? '⚠️' : '❌'
      console.log(`${emoji} ${metric.name}: ${rating}`)
    }

    // Alert if performance is poor
    if (rating === 'poor' && import.meta.env.PROD) {
      Sentry.captureMessage(`Poor performance metric: ${metric.name}`, {
        level: 'warning',
        extra: {
          metric: metric.name,
          value: metric.value,
          rating,
        },
      })
    }
  }

  private sendToAnalytics(metric: Metric) {
    // Send to custom analytics endpoint
    fetch('/api/analytics/web-vitals', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        metric: metric.name,
        value: metric.value,
        id: metric.id,
        timestamp: Date.now(),
        url: window.location.href,
        userAgent: navigator.userAgent,
      }),
      keepalive: true, // Ensure request completes even if page unloads
    }).catch(err => {
      console.error('Failed to send metrics:', err)
    })
  }

  public init() {
    // Register Web Vitals observers
    onCLS(this.reportMetric)
    onFID(this.reportMetric)
    onFCP(this.reportMetric)
    onLCP(this.reportMetric)
    onTTFB(this.reportMetric)

    if (import.meta.env.DEV) {
      console.log('📊 Performance monitoring initialized')
    }
  }

  public getMetrics(): PerformanceMetrics {
    return { ...this.metrics }
  }

  public logMetricsSummary() {
    console.table(this.metrics)
  }
}

// Singleton
const performanceMonitor = new PerformanceMonitor()

export default performanceMonitor

// Custom hook to access metrics
export function usePerformanceMetrics() {
  return performanceMonitor.getMetrics()
}
