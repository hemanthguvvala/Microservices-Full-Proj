import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { Provider } from 'react-redux'
import { I18nextProvider } from 'react-i18next'

// Production feature imports
import { initSentry } from './config/sentry'
import i18n from './config/i18n'
import performanceMonitor from './utils/performance'
import config from './config'
import ErrorBoundary from './components/ErrorBoundary'

// App imports
import App from './App'
import { store } from './store/store'
import { queryClient } from './config/queryClient'
import { AuthProvider } from './contexts/AuthContext'
import { NotificationProvider } from './contexts/NotificationContext'

// Styles
import './index.css'

/**
 * Initialize production features
 */
const initializeProduction = () => {
  // 1. Initialize Sentry error tracking
  if (config.isProduction()) {
    initSentry()
    console.log('✅ Sentry initialized')
  }

  // 2. Initialize performance monitoring
  performanceMonitor.init()
  console.log('✅ Web Vitals monitoring initialized')

  // 3. Log configuration in development
  if (config.isDevelopment()) {
    config.logConfig()
  }
}

// Initialize all production features
initializeProduction()

/**
 * Root component with all providers
 */
const Root: React.FC = () => {
  return (
    <React.StrictMode>
      <ErrorBoundary>
        <I18nextProvider i18n={i18n}>
          <Provider store={store}>
            <QueryClientProvider client={queryClient}>
              <BrowserRouter>
                <AuthProvider>
                  <NotificationProvider>
                    <App />
                  </NotificationProvider>
                </AuthProvider>
              </BrowserRouter>
              
              {/* React Query devtools (only in development) */}
              {config.isDevelopment() && (
                <ReactQueryDevtools initialIsOpen={false} />
              )}
            </QueryClientProvider>
          </Provider>
        </I18nextProvider>
      </ErrorBoundary>
    </React.StrictMode>
  )
}

// Render app
const container = document.getElementById('root')
if (!container) {
  throw new Error('Root element not found')
}

const root = ReactDOM.createRoot(container)
root.render(<Root />)

/**
 * Service worker registration for PWA (optional)
 * Uncomment when service worker is implemented
 */
// if ('serviceWorker' in navigator && config.isProduction()) {
//   window.addEventListener('load', () => {
//     navigator.serviceWorker
//       .register('/service-worker.js')
//       .then((registration) => {
//         console.log('✅ Service Worker registered:', registration)
//       })
//       .catch((error) => {
//         console.error('❌ Service Worker registration failed:', error)
//       })
//   })
// }

/**
 * Hot Module Replacement (HMR) for Vite
 */
if (import.meta.hot) {
  import.meta.hot.accept()
}

/**
 * Log production features status
 */
console.log(`
🚀 Application Started

Environment: ${config.get().environment}
Version: ${config.get().appVersion}

Features:
- Sentry: ${config.isProduction() ? '✅' : '⚠️ (disabled in dev)'}
- Performance Monitoring: ✅
- Internationalization: ✅
- Redux: ${config.isFeatureEnabled('redux') ? '✅' : '❌'}
- React Query: ${config.isFeatureEnabled('reactQuery') ? '✅' : '❌'}
- Dark Mode: ${config.isFeatureEnabled('darkMode') ? '✅' : '❌'}
- File Upload: ${config.isFeatureEnabled('fileUpload') ? '✅' : '❌'}
`)
