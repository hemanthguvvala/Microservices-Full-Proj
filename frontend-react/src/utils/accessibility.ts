/**
 * Accessibility Testing Utilities
 * 
 * Used by: Microsoft (WAI-ARIA), Google (Material UI), Shopify (Polaris), GitHub
 * 
 * Why this matters at MNCs:
 * - LEGAL REQUIREMENT: ADA (Americans with Disabilities Act), Section 508, WCAG 2.1
 * - Companies get SUED for inaccessible websites (Target: $6M, Domino's: Supreme Court)
 * - All US government contractors MUST comply (Section 508)
 * - EU: European Accessibility Act (2025 enforcement)
 * - Automated testing catches ~30% of a11y issues; manual + automated catches ~70%
 * 
 * At MNCs like Microsoft, Google, Amazon:
 * - a11y testing runs in CI pipeline (blocks deployment)
 * - Dedicated accessibility team reviews PRs
 * - Screen reader testing is part of QA
 * - VPAT (Voluntary Product Accessibility Template) maintained for enterprise sales
 */

import type { AxeResults } from 'axe-core'

// ─── Axe-Core Integration ─────────────────────────────────────────────────

/**
 * Run axe accessibility audit on the current page or a specific element.
 * In development mode, violations are logged to the console with actionable info.
 * In CI, violations fail the test.
 */
export async function runAccessibilityAudit(
  context?: Element | string,
  options?: {
    rules?: string[]
    tags?: string[]
    disableRules?: string[]
  }
): Promise<AxeResults> {
  const axe = await import('axe-core')

  const axeOptions: any = {
    // WCAG 2.1 AA is the standard most MNCs target
    runOnly: options?.tags || ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'best-practice'],
    rules: {},
  }

  if (options?.disableRules) {
    options.disableRules.forEach((rule) => {
      axeOptions.rules[rule] = { enabled: false }
    })
  }

  const results = await axe.default.run(
    context || document,
    axeOptions
  )

  if (results.violations.length > 0 && import.meta.env.DEV) {
    logAccessibilityViolations(results.violations)
  }

  return results
}

/**
 * Format and log accessibility violations in a developer-friendly way.
 */
function logAccessibilityViolations(violations: AxeResults['violations']): void {
  console.group(
    `%c♿ Accessibility Violations (${violations.length})`,
    'color: #e74c3c; font-weight: bold; font-size: 14px'
  )

  violations.forEach((violation, index) => {
    const impactColor = {
      critical: '#e74c3c',
      serious: '#e67e22',
      moderate: '#f1c40f',
      minor: '#95a5a6',
    }[violation.impact || 'minor']

    console.group(
      `%c${index + 1}. [${violation.impact?.toUpperCase()}] ${violation.id}`,
      `color: ${impactColor}; font-weight: bold`
    )
    console.log('Description:', violation.description)
    console.log('Help:', violation.helpUrl)
    console.log('WCAG:', violation.tags.filter((t) => t.startsWith('wcag')).join(', '))
    console.log('Elements affected:', violation.nodes.length)

    violation.nodes.forEach((node) => {
      console.log('  Target:', node.target.join(', '))
      console.log('  HTML:', node.html.substring(0, 200))
      if (node.failureSummary) {
        console.log('  Fix:', node.failureSummary)
      }
    })

    console.groupEnd()
  })

  console.groupEnd()
}

// ─── React Development Overlay ────────────────────────────────────────────

/**
 * Initialize axe-core in development mode with React DevTools integration.
 * This highlights accessibility violations directly in the browser.
 * 
 * Call this once in main.tsx:
 *   if (import.meta.env.DEV) {
 *     initAccessibilityDevTools()
 *   }
 */
export async function initAccessibilityDevTools(): Promise<void> {
  if (!import.meta.env.DEV) return

  try {
    const axe = await import('@axe-core/react')
    const React = await import('react')
    const ReactDOM = await import('react-dom')

    // axe-core/react automatically runs audits on component renders
    // and logs violations to the browser console
    axe.default(React.default, ReactDOM.default, 1000) // 1s debounce
    console.log('♿ Accessibility DevTools initialized')
  } catch {
    console.warn('Install @axe-core/react for development a11y auditing')
  }
}

// ─── Custom ARIA Utilities ────────────────────────────────────────────────

/**
 * Generate unique IDs for ARIA relationships (aria-describedby, aria-labelledby, etc.)
 * Essential for forms, tooltips, dialogs, and error messages.
 */
let idCounter = 0
export function generateAriaId(prefix = 'aria'): string {
  return `${prefix}-${++idCounter}`
}

/**
 * Announce a message to screen readers using a live region.
 * Used for dynamic content updates (toast notifications, form submissions, etc.)
 * 
 * @param message - The message to announce
 * @param priority - 'polite' waits for screen reader to finish, 'assertive' interrupts
 */
export function announceToScreenReader(
  message: string,
  priority: 'polite' | 'assertive' = 'polite'
): void {
  const el = document.createElement('div')
  el.setAttribute('role', 'status')
  el.setAttribute('aria-live', priority)
  el.setAttribute('aria-atomic', 'true')
  el.className = 'sr-only' // Tailwind's screen-reader-only class

  // Must be in DOM before setting text for screen readers to detect the change
  el.style.cssText =
    'position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0,0,0,0); white-space: nowrap; border: 0;'
  document.body.appendChild(el)

  // Delay setting text so screen readers detect the DOM change
  requestAnimationFrame(() => {
    el.textContent = message
  })

  // Clean up after announcement
  setTimeout(() => {
    document.body.removeChild(el)
  }, 5000)
}

/**
 * Trap focus within a modal/dialog element.
 * Required by WCAG 2.1 for modal dialogs.
 * Used by every design system (Material UI, Chakra, Radix).
 */
export function trapFocus(container: HTMLElement): () => void {
  const focusableSelectors = [
    'a[href]',
    'button:not([disabled])',
    'input:not([disabled])',
    'select:not([disabled])',
    'textarea:not([disabled])',
    '[tabindex]:not([tabindex="-1"])',
    '[contenteditable]',
  ].join(', ')

  const focusableElements = container.querySelectorAll<HTMLElement>(focusableSelectors)
  const firstFocusable = focusableElements[0]
  const lastFocusable = focusableElements[focusableElements.length - 1]

  function handleKeyDown(e: KeyboardEvent) {
    if (e.key !== 'Tab') return

    if (e.shiftKey) {
      if (document.activeElement === firstFocusable) {
        e.preventDefault()
        lastFocusable?.focus()
      }
    } else {
      if (document.activeElement === lastFocusable) {
        e.preventDefault()
        firstFocusable?.focus()
      }
    }
  }

  container.addEventListener('keydown', handleKeyDown)
  firstFocusable?.focus()

  // Return cleanup function
  return () => {
    container.removeEventListener('keydown', handleKeyDown)
  }
}

// ─── Skip Navigation ──────────────────────────────────────────────────────

/**
 * HOW TO USE: Add <SkipLink /> as the first child inside <body> or your root layout.
 * This lets keyboard users skip past navigation to main content.
 * WCAG 2.1 Success Criterion 2.4.1 (Bypass Blocks) — Level A requirement.
 */
export const SKIP_LINK_STYLES = {
  link: 'sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:bg-white focus:p-4 focus:rounded focus:shadow-lg focus:text-blue-600 focus:underline',
  target: 'scroll-mt-16', // Add to main content element
} as const

// ─── Color Contrast Checker ───────────────────────────────────────────────

/**
 * Check WCAG color contrast ratio between foreground and background colors.
 * WCAG AA: 4.5:1 for normal text, 3:1 for large text
 * WCAG AAA: 7:1 for normal text, 4.5:1 for large text
 */
export function checkContrastRatio(
  foreground: string,
  background: string
): { ratio: number; aa: boolean; aaa: boolean; aaLarge: boolean; aaaLarge: boolean } {
  const fgLum = getRelativeLuminance(hexToRgb(foreground))
  const bgLum = getRelativeLuminance(hexToRgb(background))

  const lighter = Math.max(fgLum, bgLum)
  const darker = Math.min(fgLum, bgLum)
  const ratio = (lighter + 0.05) / (darker + 0.05)

  return {
    ratio: Math.round(ratio * 100) / 100,
    aa: ratio >= 4.5,
    aaa: ratio >= 7,
    aaLarge: ratio >= 3,
    aaaLarge: ratio >= 4.5,
  }
}

function hexToRgb(hex: string): [number, number, number] {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  return result
    ? [parseInt(result[1], 16), parseInt(result[2], 16), parseInt(result[3], 16)]
    : [0, 0, 0]
}

function getRelativeLuminance([r, g, b]: [number, number, number]): number {
  const [rs, gs, bs] = [r, g, b].map((c) => {
    const s = c / 255
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4)
  })
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs
}
