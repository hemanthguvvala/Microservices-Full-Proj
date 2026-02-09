// Centralized configuration management
interface AppConfig {
  // API
  apiBaseUrl: string
  wsBaseUrl: string
  
  // App Info
  appName: string
  appVersion: string
  environment: 'development' | 'production' | 'staging'
  
  // Feature Flags
  features: {
    redux: boolean
    reactQuery: boolean
    darkMode: boolean
    i18n: boolean
    fileUpload: boolean
  }
  
  // Pagination
  defaultPageSize: number
  maxPageSize: number
  
  // File Upload
  maxFileSize: number
  allowedFileTypes: string[]
  
  // Session
  sessionTimeout: number
  
  // External Services
  sentry: {
    dsn: string | null
    enabled: boolean
  }
  analytics: {
    googleAnalyticsId: string | null
    mixpanelToken: string | null
  }
}

class Config {
  private static instance: Config
  private config: AppConfig

  private constructor() {
    this.config = this.loadConfig()
  }

  public static getInstance(): Config {
    if (!Config.instance) {
      Config.instance = new Config()
    }
    return Config.instance
  }

  private loadConfig(): AppConfig {
    return {
      // API Configuration
      apiBaseUrl: import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080',
      wsBaseUrl: import.meta.env.VITE_WS_BASE_URL || 'http://localhost:8081',
      
      // App Information
      appName: import.meta.env.VITE_APP_NAME || 'Employee Management System',
      appVersion: import.meta.env.VITE_APP_VERSION || '1.0.0',
      environment: (import.meta.env.VITE_APP_ENVIRONMENT || 'development') as any,
      
      // Feature Flags
      features: {
        redux: this.parseBoolean(import.meta.env.VITE_FEATURE_REDUX, true),
        reactQuery: this.parseBoolean(import.meta.env.VITE_FEATURE_REACT_QUERY, true),
        darkMode: this.parseBoolean(import.meta.env.VITE_FEATURE_DARK_MODE, true),
        i18n: this.parseBoolean(import.meta.env.VITE_FEATURE_I18N, true),
        fileUpload: this.parseBoolean(import.meta.env.VITE_FEATURE_FILE_UPLOAD, true),
      },
      
      // Pagination
      defaultPageSize: parseInt(import.meta.env.VITE_DEFAULT_PAGE_SIZE || '10', 10),
      maxPageSize: parseInt(import.meta.env.VITE_MAX_PAGE_SIZE || '100', 10),
      
      // File Upload
      maxFileSize: parseInt(import.meta.env.VITE_MAX_FILE_SIZE || '5242880', 10), // 5MB default
      allowedFileTypes: this.parseArray(
        import.meta.env.VITE_ALLOWED_FILE_TYPES,
        ['image/jpeg', 'image/png', 'application/pdf']
      ),
      
      // Session
      sessionTimeout: parseInt(import.meta.env.VITE_SESSION_TIMEOUT || '3600000', 10), // 1 hour
      
      // External Services
      sentry: {
        dsn: import.meta.env.VITE_SENTRY_DSN || null,
        enabled: !!import.meta.env.VITE_SENTRY_DSN,
      },
      analytics: {
        googleAnalyticsId: import.meta.env.VITE_GOOGLE_ANALYTICS_ID || null,
        mixpanelToken: import.meta.env.VITE_MIXPANEL_TOKEN || null,
      },
    }
  }

  private parseBoolean(value: string | undefined, defaultValue: boolean): boolean {
    if (value === undefined) return defaultValue
    return value === 'true' || value === '1'
  }

  private parseArray(value: string | undefined, defaultValue: string[]): string[] {
    if (!value) return defaultValue
    return value.split(',').map(item => item.trim())
  }

  // Getters
  public get(): AppConfig {
    return this.config
  }

  public isProduction(): boolean {
    return this.config.environment === 'production'
  }

  public isDevelopment(): boolean {
    return this.config.environment === 'development'
  }

  public isFeatureEnabled(feature: keyof AppConfig['features']): boolean {
    return this.config.features[feature]
  }

  // Log configuration (for debugging)
  public logConfig() {
    if (this.isDevelopment()) {
      console.group('🔧 Application Configuration')
      console.table({
        'App Name': this.config.appName,
        'Version': this.config.appVersion,
        'Environment': this.config.environment,
        'API URL': this.config.apiBaseUrl,
      })
      console.groupEnd()
    }
  }
}

// Export singleton instance
export const config = Config.getInstance()
export default config
