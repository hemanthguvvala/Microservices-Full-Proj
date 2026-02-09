import { setupWorker } from 'msw/browser'
import { handlers } from './handlers'

/**
 * MSW Browser Worker — for development mode
 * 
 * This starts a Service Worker that intercepts ALL HTTP requests
 * from your app and returns mock responses defined in handlers.ts.
 * 
 * Your actual fetch/axios calls work unchanged — MSW intercepts at the network level.
 * 
 * How MNCs use this:
 * - Frontend team starts building UI on Day 1, before any API exists
 * - Backend and frontend develop in parallel using agreed-upon API contracts
 * - Designers can prototype with realistic data
 * - QA can test against deterministic data
 * - Demo environments always work (no backend needed)
 * 
 * Activated in main.tsx with:
 *   if (import.meta.env.DEV) {
 *     const { worker } = await import('./mocks/browser')
 *     await worker.start({ onUnhandledRequest: 'bypass' })
 *   }
 */
export const worker = setupWorker(...handlers)
