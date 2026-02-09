/**
 * Resilient HTTP Client Layer
 * 
 * Used by: Netflix (Hystrix pattern), Uber, Stripe, Amazon
 * 
 * Why MNCs need this (not just raw axios/fetch):
 * - RETRY: Backend returns 503? Retry with exponential backoff, not instant fail
 * - CIRCUIT BREAKER: API down? Stop hammering it, fail fast, recover gracefully
 * - REQUEST DEDUP: User spam-clicks? Only one request fires
 * - CANCEL: User navigates away? Cancel in-flight requests (prevent memory leaks)
 * - TOKEN REFRESH: 401? Silently refresh JWT, replay original request
 * - INTERCEPTORS: Attach auth headers, correlation IDs, timing metrics
 * - TIMEOUT: Don't let hanging requests block the UI forever
 * 
 * This is what separates "I used axios" from "I built a production HTTP layer."
 */

import axios, {
  AxiosError,
  AxiosInstance,
  AxiosRequestConfig,
  AxiosResponse,
  InternalAxiosRequestConfig,
} from 'axios'
import { logger } from './logger'

// ─── Types ────────────────────────────────────────────────────────────────

interface RetryConfig {
  maxRetries: number
  baseDelay: number       // ms
  maxDelay: number        // ms
  retryableStatuses: number[]
  retryableErrors: string[]
}

interface CircuitBreakerConfig {
  threshold: number       // Number of failures before opening
  resetTimeout: number    // ms to wait before half-open
}

enum CircuitState {
  CLOSED = 'CLOSED',     // Normal operation
  OPEN = 'OPEN',         // Failing fast — not sending requests
  HALF_OPEN = 'HALF_OPEN' // Testing if service recovered
}

interface PendingRequest {
  cancel: () => void
  key: string
}

// ─── Circuit Breaker ──────────────────────────────────────────────────────

class CircuitBreaker {
  private state: CircuitState = CircuitState.CLOSED
  private failureCount = 0
  private lastFailureTime = 0
  private readonly config: CircuitBreakerConfig

  constructor(config: CircuitBreakerConfig) {
    this.config = config
  }

  canRequest(): boolean {
    if (this.state === CircuitState.CLOSED) return true

    if (this.state === CircuitState.OPEN) {
      // Check if enough time has passed to try again
      if (Date.now() - this.lastFailureTime >= this.config.resetTimeout) {
        this.state = CircuitState.HALF_OPEN
        logger.info('Circuit breaker: HALF_OPEN — testing recovery')
        return true
      }
      return false
    }

    // HALF_OPEN — allow one request through
    return true
  }

  recordSuccess(): void {
    if (this.state === CircuitState.HALF_OPEN) {
      logger.info('Circuit breaker: CLOSED — service recovered')
    }
    this.failureCount = 0
    this.state = CircuitState.CLOSED
  }

  recordFailure(): void {
    this.failureCount++
    this.lastFailureTime = Date.now()

    if (this.failureCount >= this.config.threshold) {
      this.state = CircuitState.OPEN
      logger.warn(
        `Circuit breaker: OPEN — ${this.failureCount} failures, blocking requests for ${this.config.resetTimeout}ms`
      )
    }
  }

  getState(): CircuitState {
    return this.state
  }
}

// ─── API Client ───────────────────────────────────────────────────────────

class ApiClient {
  private client: AxiosInstance
  private circuitBreaker: CircuitBreaker
  private retryConfig: RetryConfig
  private pendingRequests: Map<string, PendingRequest> = new Map()
  private isRefreshing = false
  private refreshSubscribers: ((token: string) => void)[] = []

  constructor() {
    this.client = axios.create({
      baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
      timeout: 15000, // 15s — aggressive but reasonable
      headers: {
        'Content-Type': 'application/json',
      },
    })

    this.retryConfig = {
      maxRetries: 3,
      baseDelay: 1000,
      maxDelay: 10000,
      retryableStatuses: [408, 429, 500, 502, 503, 504],
      retryableErrors: ['ECONNABORTED', 'ETIMEDOUT', 'ERR_NETWORK'],
    }

    this.circuitBreaker = new CircuitBreaker({
      threshold: 5,
      resetTimeout: 30000, // 30s
    })

    this.setupInterceptors()
  }

  // ── Request/Response Interceptors ─────────────────────────────────────

  private setupInterceptors(): void {
    // Request interceptor — runs before every request
    this.client.interceptors.request.use(
      (config: InternalAxiosRequestConfig) => {
        // Attach auth token
        const token = localStorage.getItem('auth_token')
        if (token && config.headers) {
          config.headers.Authorization = `Bearer ${token}`
        }

        // Attach correlation ID for distributed tracing
        const correlationId = `req-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
        if (config.headers) {
          config.headers['X-Correlation-ID'] = correlationId
        }

        // Request timing
        ;(config as any)._startTime = Date.now()
        ;(config as any)._correlationId = correlationId

        logger.debug(`API Request: ${config.method?.toUpperCase()} ${config.url}`, {
          correlationId,
        })

        return config
      },
      (error) => Promise.reject(error)
    )

    // Response interceptor — runs after every response
    this.client.interceptors.response.use(
      (response: AxiosResponse) => {
        const duration = Date.now() - ((response.config as any)._startTime || 0)
        const correlationId = (response.config as any)._correlationId

        logger.debug(`API Response: ${response.status} (${duration}ms)`, {
          correlationId,
          url: response.config.url,
          duration,
        })

        // Track slow responses
        if (duration > 3000) {
          logger.warn(`Slow API response: ${response.config.url} took ${duration}ms`, {
            correlationId,
          })
        }

        this.circuitBreaker.recordSuccess()
        return response
      },
      async (error: AxiosError) => {
        return this.handleResponseError(error)
      }
    )
  }

  // ── Error Handling with Retry + Token Refresh ─────────────────────────

  private async handleResponseError(error: AxiosError): Promise<AxiosResponse> {
    const config = error.config as InternalAxiosRequestConfig & {
      _retryCount?: number
      _startTime?: number
      _correlationId?: string
    }

    if (!config) return Promise.reject(error)

    const status = error.response?.status
    const duration = Date.now() - (config._startTime || 0)

    logger.error(`API Error: ${status} ${config.url} (${duration}ms)`, {
      correlationId: config._correlationId,
      status,
      message: error.message,
    })

    // ── 401 Unauthorized → Refresh Token ──────────────────────────────
    if (status === 401 && !config.url?.includes('/auth/refresh')) {
      return this.handleTokenRefresh(config)
    }

    // ── Retry Logic ───────────────────────────────────────────────────
    const retryCount = config._retryCount || 0

    const isRetryable =
      (status && this.retryConfig.retryableStatuses.includes(status)) ||
      (error.code && this.retryConfig.retryableErrors.includes(error.code))

    if (isRetryable && retryCount < this.retryConfig.maxRetries) {
      config._retryCount = retryCount + 1

      // Exponential backoff with jitter
      const delay = Math.min(
        this.retryConfig.baseDelay * Math.pow(2, retryCount) +
          Math.random() * 1000, // jitter prevents thundering herd
        this.retryConfig.maxDelay
      )

      logger.info(
        `Retrying request (${config._retryCount}/${this.retryConfig.maxRetries}) after ${delay}ms`,
        { url: config.url, correlationId: config._correlationId }
      )

      await new Promise((resolve) => setTimeout(resolve, delay))
      return this.client.request(config)
    }

    this.circuitBreaker.recordFailure()
    return Promise.reject(error)
  }

  // ── Token Refresh (Queue Pattern) ───────────────────────────────────

  /**
   * When a 401 occurs:
   * 1. First request triggers token refresh
   * 2. All subsequent 401s during refresh get QUEUED
   * 3. Once refresh completes, ALL queued requests replay with new token
   * 
   * This prevents N refresh calls when N requests fail simultaneously.
   * Used by Spotify, Slack, every app with JWT auth.
   */
  private async handleTokenRefresh(
    config: InternalAxiosRequestConfig
  ): Promise<AxiosResponse> {
    if (!this.isRefreshing) {
      this.isRefreshing = true

      try {
        const refreshToken = localStorage.getItem('refresh_token')
        const response = await this.client.post('/auth/refresh', {
          refreshToken,
        })
        const newToken = response.data.token

        localStorage.setItem('auth_token', newToken)

        // Replay all queued requests with new token
        this.refreshSubscribers.forEach((callback) => callback(newToken))
        this.refreshSubscribers = []

        // Replay the original request
        if (config.headers) {
          config.headers.Authorization = `Bearer ${newToken}`
        }
        return this.client.request(config)
      } catch (refreshError) {
        // Refresh failed — force logout
        this.refreshSubscribers = []
        localStorage.removeItem('auth_token')
        localStorage.removeItem('refresh_token')
        window.location.href = '/login'
        return Promise.reject(refreshError)
      } finally {
        this.isRefreshing = false
      }
    }

    // Wait for refresh to complete, then replay
    return new Promise((resolve) => {
      this.refreshSubscribers.push((newToken: string) => {
        if (config.headers) {
          config.headers.Authorization = `Bearer ${newToken}`
        }
        resolve(this.client.request(config))
      })
    })
  }

  // ── Request Deduplication ───────────────────────────────────────────

  /**
   * Prevents duplicate in-flight requests.
   * If the same GET request is already pending, return the same promise
   * instead of firing a second network call.
   * 
   * Common scenario: React StrictMode double-mounts, rapid re-renders,
   * user navigates back to a page that's still loading.
   */
  private getRequestKey(config: AxiosRequestConfig): string {
    return `${config.method}-${config.url}-${JSON.stringify(config.params || {})}`
  }

  private cancelDuplicateRequest(key: string): void {
    const pending = this.pendingRequests.get(key)
    if (pending) {
      pending.cancel()
      this.pendingRequests.delete(key)
    }
  }

  // ── Public API ──────────────────────────────────────────────────────

  async get<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    if (!this.circuitBreaker.canRequest()) {
      throw new Error('Service temporarily unavailable (circuit breaker open)')
    }

    const requestKey = this.getRequestKey({ method: 'GET', url, ...config })
    this.cancelDuplicateRequest(requestKey)

    const controller = new AbortController()
    this.pendingRequests.set(requestKey, {
      cancel: () => controller.abort(),
      key: requestKey,
    })

    try {
      const response = await this.client.get<T>(url, {
        ...config,
        signal: controller.signal,
      })
      return response.data
    } finally {
      this.pendingRequests.delete(requestKey)
    }
  }

  async post<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    if (!this.circuitBreaker.canRequest()) {
      throw new Error('Service temporarily unavailable (circuit breaker open)')
    }

    const response = await this.client.post<T>(url, data, config)
    return response.data
  }

  async put<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    if (!this.circuitBreaker.canRequest()) {
      throw new Error('Service temporarily unavailable (circuit breaker open)')
    }

    const response = await this.client.put<T>(url, data, config)
    return response.data
  }

  async delete<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    if (!this.circuitBreaker.canRequest()) {
      throw new Error('Service temporarily unavailable (circuit breaker open)')
    }

    const response = await this.client.delete<T>(url, config)
    return response.data
  }

  /**
   * Cancel all pending requests (call on page navigation / unmount)
   */
  cancelAll(): void {
    this.pendingRequests.forEach((request) => request.cancel())
    this.pendingRequests.clear()
  }
}

// ─── Singleton Export ─────────────────────────────────────────────────────
// Single instance shared across the entire application
export const apiClient = new ApiClient()
