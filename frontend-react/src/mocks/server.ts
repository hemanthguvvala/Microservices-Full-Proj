import { setupServer } from 'msw/node'
import { handlers } from './handlers'

/**
 * MSW Node Server — for test environments (Jest, Vitest)
 * 
 * Same handlers, different runtime. In tests, MSW runs in Node.js
 * (no Service Worker needed). This means your unit tests and integration
 * tests use the EXACT SAME mock data as development.
 * 
 * Usage in test setup (jest.setup.ts or vitest.setup.ts):
 * 
 *   import { server } from './mocks/server'
 *   
 *   beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
 *   afterEach(() => server.resetHandlers())
 *   afterAll(() => server.close())
 * 
 * Override handlers per test:
 *   import { http, HttpResponse } from 'msw'
 *   
 *   test('handles API error', () => {
 *     server.use(
 *       http.get('*\/api/employees', () => {
 *         return HttpResponse.json({ message: 'Server error' }, { status: 500 })
 *       })
 *     )
 *     // ... test error handling
 *   })
 */
export const server = setupServer(...handlers)
