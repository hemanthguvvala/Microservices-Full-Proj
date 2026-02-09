/**
 * Feature Flag SDK (Client-Side)
 * 
 * Used by: Netflix (hundreds of flags), Atlassian, Slack, LinkedIn, Uber
 * Real tools: LaunchDarkly ($3B company), Unleash, Split.io, Optimizely, Flagsmith
 * 
 * Why every MNC uses feature flags:
 * - TRUNK-BASED DEVELOPMENT: All engineers commit to main, flags hide incomplete features
 * - GRADUAL ROLLOUT: Ship to 1% → 5% → 25% → 50% → 100% of users
 * - INSTANT ROLLBACK: Feature broken? Flip flag off. No deployment needed
 * - A/B TESTING: Show variant A to 50%, variant B to 50%, measure metrics
 * - KILL SWITCHES: Black Friday load too high? Disable non-critical features
 * - TARGETING: Enable for internal users, beta testers, specific regions
 * - DECOUPLED DEPLOY FROM RELEASE: Code ships Monday, PM enables Tuesday
 * 
 * Netflix runs ~2000+ feature flags. Everything goes through flags.
 * LinkedIn: every feature is behind a flag, no exceptions.
 * 
 * This implementation mirrors the LaunchDarkly SDK API pattern.
 */

import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react'
import { logger } from './logger'

// ─── Types ────────────────────────────────────────────────────────────────

interface FlagValue {
  value: boolean | string | number | Record<string, any>
  variant?: string
  reason?: 'DEFAULT' | 'TARGETING' | 'ROLLOUT' | 'OVERRIDE' | 'ERROR'
}

interface FlagConfig {
  [key: string]: FlagValue
}

interface UserContext {
  userId: string
  email?: string
  role?: string
  country?: string
  plan?: string
  customAttributes?: Record<string, any>
}

interface FeatureFlagProviderProps {
  children: React.ReactNode
  apiEndpoint?: string
  sdkKey?: string
  user?: UserContext
  refreshInterval?: number // ms between polling for flag updates
  defaults?: Record<string, boolean | string | number>
}

// ─── Feature Flag Client ──────────────────────────────────────────────────

class FeatureFlagClient {
  private flags: FlagConfig = {}
  private defaults: Record<string, boolean | string | number> = {}
  private user: UserContext | null = null
  private apiEndpoint: string
  private sdkKey: string
  private listeners: Set<() => void> = new Set()
  private pollingTimer: ReturnType<typeof setInterval> | null = null
  private initialized = false

  constructor(config: {
    apiEndpoint?: string
    sdkKey?: string
    defaults?: Record<string, boolean | string | number>
  }) {
    this.apiEndpoint = config.apiEndpoint || '/api/feature-flags'
    this.sdkKey = config.sdkKey || ''
    this.defaults = config.defaults || {}
  }

  async initialize(user?: UserContext): Promise<void> {
    this.user = user || null

    try {
      await this.fetchFlags()
      this.initialized = true
      logger.info('Feature flags initialized', {
        flagCount: Object.keys(this.flags).length,
      })
    } catch (error) {
      logger.warn('Failed to fetch feature flags, using defaults', { error })
      // Use defaults on failure — this is intentional resilience
      this.initializeFromDefaults()
      this.initialized = true
    }
  }

  // ── Flag Evaluation ─────────────────────────────────────────────────

  /**
   * Get a boolean flag value.
   * Always returns a value (never throws) — defaults are your safety net.
   */
  getBooleanFlag(key: string, defaultValue = false): boolean {
    const flag = this.flags[key]
    if (!flag) {
      logger.debug(`Flag "${key}" not found, using default: ${defaultValue}`)
      return this.defaults[key] !== undefined
        ? Boolean(this.defaults[key])
        : defaultValue
    }
    return Boolean(flag.value)
  }

  /**
   * Get a string flag value (for A/B tests with multiple variants).
   */
  getStringFlag(key: string, defaultValue = ''): string {
    const flag = this.flags[key]
    if (!flag) return (this.defaults[key] as string) || defaultValue
    return String(flag.value)
  }

  /**
   * Get a numeric flag value (for gradual rollout percentages, limits, etc.)
   */
  getNumberFlag(key: string, defaultValue = 0): number {
    const flag = this.flags[key]
    if (!flag) return (this.defaults[key] as number) || defaultValue
    return Number(flag.value)
  }

  /**
   * Get a JSON flag value (for complex configuration like UI layouts).
   */
  getJsonFlag<T>(key: string, defaultValue: T): T {
    const flag = this.flags[key]
    if (!flag) return defaultValue
    return flag.value as T
  }

  // ── Flag Details (for analytics/debugging) ──────────────────────────

  getFlagDetails(key: string): FlagValue | null {
    return this.flags[key] || null
  }

  getAllFlags(): FlagConfig {
    return { ...this.flags }
  }

  // ── User Context ────────────────────────────────────────────────────

  identify(user: UserContext): void {
    this.user = user
    this.fetchFlags() // Re-evaluate flags for new user
  }

  // ── Flag Updates ────────────────────────────────────────────────────

  startPolling(interval = 30000): void {
    if (this.pollingTimer) return

    this.pollingTimer = setInterval(async () => {
      try {
        const oldFlags = { ...this.flags }
        await this.fetchFlags()

        // Check for changes and notify
        const changed = Object.keys(this.flags).some(
          (key) => JSON.stringify(this.flags[key]) !== JSON.stringify(oldFlags[key])
        )

        if (changed) {
          logger.info('Feature flags updated')
          this.notifyListeners()
        }
      } catch (error) {
        logger.debug('Flag polling failed', { error })
      }
    }, interval)
  }

  stopPolling(): void {
    if (this.pollingTimer) {
      clearInterval(this.pollingTimer)
      this.pollingTimer = null
    }
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  // ── Local Overrides (for development/testing) ───────────────────────

  /**
   * Override a flag locally. Stored in localStorage.
   * Used by developers to test features without changing server config.
   * 
   * In real MNCs, there's a dev toolbar that shows all flags
   * with toggles for each one. This enables that.
   */
  setOverride(key: string, value: boolean | string | number): void {
    const overrides = this.getOverrides()
    overrides[key] = value
    localStorage.setItem('ff_overrides', JSON.stringify(overrides))
    this.flags[key] = { value, reason: 'OVERRIDE' }
    this.notifyListeners()
    logger.info(`Flag override set: ${key} = ${value}`)
  }

  clearOverride(key: string): void {
    const overrides = this.getOverrides()
    delete overrides[key]
    localStorage.setItem('ff_overrides', JSON.stringify(overrides))
    this.fetchFlags()
  }

  clearAllOverrides(): void {
    localStorage.removeItem('ff_overrides')
    this.fetchFlags()
  }

  private getOverrides(): Record<string, boolean | string | number> {
    try {
      return JSON.parse(localStorage.getItem('ff_overrides') || '{}')
    } catch {
      return {}
    }
  }

  // ── Internal ────────────────────────────────────────────────────────

  private async fetchFlags(): Promise<void> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    }

    if (this.sdkKey) {
      headers['X-SDK-Key'] = this.sdkKey
    }

    const response = await fetch(this.apiEndpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        user: this.user,
        environment: import.meta.env.MODE,
      }),
    })

    if (!response.ok) {
      throw new Error(`Flag fetch failed: ${response.status}`)
    }

    const data = await response.json()
    this.flags = data.flags || {}

    // Apply local overrides
    const overrides = this.getOverrides()
    for (const [key, value] of Object.entries(overrides)) {
      this.flags[key] = { value, reason: 'OVERRIDE' }
    }
  }

  private initializeFromDefaults(): void {
    for (const [key, value] of Object.entries(this.defaults)) {
      this.flags[key] = { value, reason: 'DEFAULT' }
    }
  }

  private notifyListeners(): void {
    this.listeners.forEach((listener) => listener())
  }

  destroy(): void {
    this.stopPolling()
    this.listeners.clear()
  }
}

// ─── React Integration ────────────────────────────────────────────────────

const FeatureFlagContext = createContext<FeatureFlagClient | null>(null)

export function FeatureFlagProvider({
  children,
  apiEndpoint,
  sdkKey,
  user,
  refreshInterval = 30000,
  defaults,
}: FeatureFlagProviderProps): React.ReactElement {
  const clientRef = useRef<FeatureFlagClient | null>(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const client = new FeatureFlagClient({
      apiEndpoint,
      sdkKey,
      defaults,
    })
    clientRef.current = client

    client.initialize(user).then(() => {
      setReady(true)
      client.startPolling(refreshInterval)
    })

    return () => {
      client.destroy()
    }
  }, [apiEndpoint, sdkKey]) // Only recreate on endpoint/key changes

  useEffect(() => {
    if (user && clientRef.current) {
      clientRef.current.identify(user)
    }
  }, [user?.userId])

  if (!ready || !clientRef.current) {
    return React.createElement(React.Fragment, null) // Render nothing until flags load
  }

  return React.createElement(
    FeatureFlagContext.Provider,
    { value: clientRef.current },
    children
  )
}

// ─── React Hooks ──────────────────────────────────────────────────────────

/**
 * Hook to check a boolean feature flag.
 * 
 * Usage:
 *   const showNewDashboard = useFeatureFlag('new-dashboard')
 *   if (showNewDashboard) return <NewDashboard />
 */
export function useFeatureFlag(key: string, defaultValue = false): boolean {
  const client = useContext(FeatureFlagContext)
  const [value, setValue] = useState(
    () => client?.getBooleanFlag(key, defaultValue) ?? defaultValue
  )

  useEffect(() => {
    if (!client) return

    // Update on flag changes
    const unsubscribe = client.subscribe(() => {
      setValue(client.getBooleanFlag(key, defaultValue))
    })

    return unsubscribe
  }, [client, key, defaultValue])

  return value
}

/**
 * Hook to check a string feature flag (A/B test variants).
 * 
 * Usage:
 *   const variant = useFeatureVariant('checkout-flow', 'control')
 *   if (variant === 'variant-a') return <CheckoutA />
 */
export function useFeatureVariant(key: string, defaultValue = ''): string {
  const client = useContext(FeatureFlagContext)
  const [value, setValue] = useState(
    () => client?.getStringFlag(key, defaultValue) ?? defaultValue
  )

  useEffect(() => {
    if (!client) return

    const unsubscribe = client.subscribe(() => {
      setValue(client.getStringFlag(key, defaultValue))
    })

    return unsubscribe
  }, [client, key, defaultValue])

  return value
}

/**
 * Hook for conditional rendering with flag check.
 * 
 * Usage:
 *   <Feature flag="new-sidebar">
 *     <NewSidebar />
 *   </Feature>
 */
export function Feature({
  flag,
  children,
  fallback,
}: {
  flag: string
  children: React.ReactNode
  fallback?: React.ReactNode
}): React.ReactElement | null {
  const enabled = useFeatureFlag(flag)
  if (enabled) return React.createElement(React.Fragment, null, children)
  if (fallback) return React.createElement(React.Fragment, null, fallback)
  return null
}

/**
 * Hook to get the feature flag client for advanced usage.
 */
export function useFeatureFlagClient(): FeatureFlagClient {
  const client = useContext(FeatureFlagContext)
  if (!client) {
    throw new Error('useFeatureFlagClient must be used within FeatureFlagProvider')
  }
  return client
}
