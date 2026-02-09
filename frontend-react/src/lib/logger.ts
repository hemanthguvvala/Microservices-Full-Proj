/**
 * Structured Logging Service
 * 
 * Used by: Every MNC (Netflix, Amazon, Google, Uber, Stripe)
 * Shipped to: DataDog, Splunk, New Relic, ELK Stack, CloudWatch
 * 
 * Why not console.log:
 * - No log levels (can't filter debug vs error in production)
 * - No structure (can't query/aggregate unstructured text)
 * - No correlation IDs (can't trace a user's journey)
 * - No redaction (accidentally logging PII = GDPR violation = $millions fine)
 * - No remote shipping (console.log dies with the browser tab)
 * - No sampling (logging everything in prod = expensive and slow)
 * 
 * At MNCs:
 * - Frontend logs are shipped to DataDog/Splunk via HTTP
 * - Every log has: timestamp, level, correlationId, userId, sessionId
 * - PII (email, SSN, credit card) is automatically redacted
 * - Error logs trigger PagerDuty alerts
 * - Log volume is sampled in production (1-10% of debug, 100% of errors)
 */

// ─── Types ────────────────────────────────────────────────────────────────

type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'fatal'

interface LogEntry {
  timestamp: string
  level: LogLevel
  message: string
  context?: Record<string, any>
  correlationId?: string
  sessionId?: string
  userId?: string
  userAgent?: string
  url?: string
  environment?: string
  appVersion?: string
  buildId?: string
}

interface LoggerConfig {
  level: LogLevel
  enableConsole: boolean
  enableRemote: boolean
  remoteEndpoint?: string
  sampleRate: number        // 0-1, 1 = log everything
  batchSize: number         // Buffer logs and send in batches
  flushInterval: number     // ms between batch sends
  redactPatterns: RegExp[]  // PII patterns to redact
}

// ─── Log Level Hierarchy ──────────────────────────────────────────────────

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
  fatal: 4,
}

// ─── PII Redaction Patterns ───────────────────────────────────────────────

const DEFAULT_REDACT_PATTERNS: RegExp[] = [
  // Email addresses
  /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,
  // Credit card numbers
  /\b\d{4}[- ]?\d{4}[- ]?\d{4}[- ]?\d{4}\b/g,
  // SSN
  /\b\d{3}-?\d{2}-?\d{4}\b/g,
  // Phone numbers
  /\b\+?1?\s?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/g,
  // JWT tokens
  /eyJ[a-zA-Z0-9_-]+\.eyJ[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+/g,
  // API keys (common patterns)
  /(?:api[_-]?key|apikey|token|secret)[=:]\s*["']?[a-zA-Z0-9_-]{20,}["']?/gi,
]

// ─── Logger Class ─────────────────────────────────────────────────────────

class Logger {
  private config: LoggerConfig
  private buffer: LogEntry[] = []
  private flushTimer: ReturnType<typeof setInterval> | null = null
  private sessionId: string

  constructor(config?: Partial<LoggerConfig>) {
    const isProduction = import.meta.env.PROD

    this.config = {
      level: isProduction ? 'warn' : 'debug',
      enableConsole: !isProduction,
      enableRemote: isProduction,
      remoteEndpoint: import.meta.env.VITE_LOG_ENDPOINT,
      sampleRate: isProduction ? 0.1 : 1, // 10% sampling in prod
      batchSize: 10,
      flushInterval: 5000,
      redactPatterns: DEFAULT_REDACT_PATTERNS,
      ...config,
    }

    this.sessionId = this.generateSessionId()

    // Start batch flush timer
    if (this.config.enableRemote) {
      this.flushTimer = setInterval(() => this.flush(), this.config.flushInterval)

      // Flush on page unload
      window.addEventListener('beforeunload', () => this.flush())

      // Flush on visibility change (tab switch)
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'hidden') this.flush()
      })
    }
  }

  // ── Public API ──────────────────────────────────────────────────────

  debug(message: string, context?: Record<string, any>): void {
    this.log('debug', message, context)
  }

  info(message: string, context?: Record<string, any>): void {
    this.log('info', message, context)
  }

  warn(message: string, context?: Record<string, any>): void {
    this.log('warn', message, context)
  }

  error(message: string, context?: Record<string, any>): void {
    this.log('error', message, context)
  }

  fatal(message: string, context?: Record<string, any>): void {
    this.log('fatal', message, context)
    // Fatal logs are always flushed immediately
    this.flush()
  }

  // ── Child Logger (with persistent context) ─────────────────────────

  /**
   * Create a child logger with pre-set context.
   * Used for module-specific logging:
   *   const authLogger = logger.child({ module: 'auth' })
   *   authLogger.info('Login successful') // automatically includes module: 'auth'
   */
  child(defaultContext: Record<string, any>): {
    debug: (msg: string, ctx?: Record<string, any>) => void
    info: (msg: string, ctx?: Record<string, any>) => void
    warn: (msg: string, ctx?: Record<string, any>) => void
    error: (msg: string, ctx?: Record<string, any>) => void
    fatal: (msg: string, ctx?: Record<string, any>) => void
  } {
    return {
      debug: (msg, ctx) => this.log('debug', msg, { ...defaultContext, ...ctx }),
      info: (msg, ctx) => this.log('info', msg, { ...defaultContext, ...ctx }),
      warn: (msg, ctx) => this.log('warn', msg, { ...defaultContext, ...ctx }),
      error: (msg, ctx) => this.log('error', msg, { ...defaultContext, ...ctx }),
      fatal: (msg, ctx) => this.log('fatal', msg, { ...defaultContext, ...ctx }),
    }
  }

  // ── Core Log Method ─────────────────────────────────────────────────

  private log(level: LogLevel, message: string, context?: Record<string, any>): void {
    // Check log level
    if (LOG_LEVELS[level] < LOG_LEVELS[this.config.level]) return

    // Sampling (don't sample errors/fatals)
    if (level === 'debug' || level === 'info') {
      if (Math.random() > this.config.sampleRate) return
    }

    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message: this.redact(message),
      context: context ? this.redactObject(context) : undefined,
      correlationId: context?.correlationId,
      sessionId: this.sessionId,
      userId: this.getUserId(),
      userAgent: navigator.userAgent,
      url: window.location.href,
      environment: import.meta.env.MODE,
      appVersion: import.meta.env.VITE_APP_VERSION || 'unknown',
    }

    // Console output (development)
    if (this.config.enableConsole) {
      this.logToConsole(entry)
    }

    // Remote output (production)
    if (this.config.enableRemote) {
      this.buffer.push(entry)
      if (this.buffer.length >= this.config.batchSize) {
        this.flush()
      }
    }
  }

  // ── Console Formatting ──────────────────────────────────────────────

  private logToConsole(entry: LogEntry): void {
    const colors: Record<LogLevel, string> = {
      debug: '#6c757d',
      info: '#0d6efd',
      warn: '#ffc107',
      error: '#dc3545',
      fatal: '#721c24',
    }

    const method = {
      debug: console.debug,
      info: console.info,
      warn: console.warn,
      error: console.error,
      fatal: console.error,
    }[entry.level]

    method(
      `%c[${entry.level.toUpperCase()}]%c ${entry.message}`,
      `color: ${colors[entry.level]}; font-weight: bold`,
      'color: inherit',
      entry.context || ''
    )
  }

  // ── Remote Shipping (Batch) ─────────────────────────────────────────

  private async flush(): Promise<void> {
    if (this.buffer.length === 0) return
    if (!this.config.remoteEndpoint) return

    const entries = [...this.buffer]
    this.buffer = []

    try {
      // Use sendBeacon for reliability (works even when tab closes)
      const blob = new Blob([JSON.stringify(entries)], {
        type: 'application/json',
      })

      if (navigator.sendBeacon) {
        navigator.sendBeacon(this.config.remoteEndpoint, blob)
      } else {
        // Fallback to fetch with keepalive
        await fetch(this.config.remoteEndpoint, {
          method: 'POST',
          body: JSON.stringify(entries),
          headers: { 'Content-Type': 'application/json' },
          keepalive: true,
        })
      }
    } catch {
      // Re-add to buffer on failure (will retry on next flush)
      this.buffer.unshift(...entries)
    }
  }

  // ── PII Redaction ───────────────────────────────────────────────────

  private redact(text: string): string {
    let redacted = text
    for (const pattern of this.config.redactPatterns) {
      redacted = redacted.replace(pattern, '[REDACTED]')
    }
    return redacted
  }

  private redactObject(obj: Record<string, any>): Record<string, any> {
    const redacted: Record<string, any> = {}
    const sensitiveKeys = ['password', 'token', 'secret', 'authorization', 'cookie', 'ssn', 'creditCard']

    for (const [key, value] of Object.entries(obj)) {
      if (sensitiveKeys.some((k) => key.toLowerCase().includes(k))) {
        redacted[key] = '[REDACTED]'
      } else if (typeof value === 'string') {
        redacted[key] = this.redact(value)
      } else if (typeof value === 'object' && value !== null) {
        redacted[key] = this.redactObject(value)
      } else {
        redacted[key] = value
      }
    }

    return redacted
  }

  // ── Helpers ─────────────────────────────────────────────────────────

  private generateSessionId(): string {
    const stored = sessionStorage.getItem('log_session_id')
    if (stored) return stored

    const id = `ses-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
    sessionStorage.setItem('log_session_id', id)
    return id
  }

  private getUserId(): string | undefined {
    try {
      const token = localStorage.getItem('auth_token')
      if (!token) return undefined

      const payload = JSON.parse(atob(token.split('.')[1]))
      return payload.sub || payload.userId
    } catch {
      return undefined
    }
  }

  // ── Cleanup ─────────────────────────────────────────────────────────

  destroy(): void {
    this.flush()
    if (this.flushTimer) {
      clearInterval(this.flushTimer)
    }
  }
}

// ─── Singleton Export ─────────────────────────────────────────────────────
export const logger = new Logger()
