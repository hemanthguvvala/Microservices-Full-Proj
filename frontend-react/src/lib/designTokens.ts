/**
 * Design Tokens System
 * 
 * Used by: Shopify (Polaris), IBM (Carbon), Google (Material), Salesforce (Lightning),
 *          Adobe (Spectrum), Microsoft (Fluent UI), Atlassian Design System
 * 
 * What are design tokens?
 * - Single source of truth for ALL visual values (colors, spacing, typography)
 * - Shared between designers (Figma) and developers (code)
 * - Platform-agnostic: compile to CSS vars, SCSS vars, JS objects, iOS/Android
 * 
 * Why MNCs use tokens instead of raw values:
 * - CONSISTENCY: 500 engineers can't all pick their own blue
 * - THEMING: Dark mode, high contrast, brand themes — change one variable
 * - DESIGN SYSTEM UPDATES: Designer changes primary blue, propagates everywhere
 * - A/B TESTING: Swap entire visual themes without code changes
 * - ACCESSIBILITY: Enforce contrast ratios at the token level
 * - MULTI-BRAND: Same app, different visual identity per client
 * 
 * Real tools: Style Dictionary (Amazon), Theo (Salesforce), Figma Tokens
 * 
 * This file defines tokens as CSS custom properties (the industry standard).
 * Tailwind theme extends from these tokens for utility class consistency.
 */

// ─── Primitive Tokens (raw values) ────────────────────────────────────────
// These are NEVER used directly in components. Think of these as the palette.

export const primitives = {
  // Color palette (based on OKLCH for perceptual uniformity — modern approach)
  colors: {
    blue: {
      50: '#eff6ff',
      100: '#dbeafe',
      200: '#bfdbfe',
      300: '#93c5fd',
      400: '#60a5fa',
      500: '#3b82f6',
      600: '#2563eb',
      700: '#1d4ed8',
      800: '#1e40af',
      900: '#1e3a8a',
      950: '#172554',
    },
    gray: {
      50: '#f9fafb',
      100: '#f3f4f6',
      200: '#e5e7eb',
      300: '#d1d5db',
      400: '#9ca3af',
      500: '#6b7280',
      600: '#4b5563',
      700: '#374151',
      800: '#1f2937',
      900: '#111827',
      950: '#030712',
    },
    red: {
      50: '#fef2f2',
      100: '#fee2e2',
      300: '#fca5a5',
      500: '#ef4444',
      700: '#b91c1c',
      900: '#7f1d1d',
    },
    green: {
      50: '#f0fdf4',
      100: '#dcfce7',
      300: '#86efac',
      500: '#22c55e',
      700: '#15803d',
      900: '#14532d',
    },
    amber: {
      50: '#fffbeb',
      100: '#fef3c7',
      300: '#fcd34d',
      500: '#f59e0b',
      700: '#b45309',
      900: '#78350f',
    },
    white: '#ffffff',
    black: '#000000',
  },

  // Spacing scale (4px base — industry standard)
  spacing: {
    0: '0px',
    1: '4px',
    2: '8px',
    3: '12px',
    4: '16px',
    5: '20px',
    6: '24px',
    8: '32px',
    10: '40px',
    12: '48px',
    16: '64px',
    20: '80px',
    24: '96px',
  },

  // Typography scale (using rem for accessibility — respects user font size)
  fontSize: {
    xs: '0.75rem',     // 12px
    sm: '0.875rem',    // 14px
    base: '1rem',      // 16px
    lg: '1.125rem',    // 18px
    xl: '1.25rem',     // 20px
    '2xl': '1.5rem',   // 24px
    '3xl': '1.875rem', // 30px
    '4xl': '2.25rem',  // 36px
  },

  fontWeight: {
    normal: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
  },

  lineHeight: {
    tight: '1.25',
    normal: '1.5',
    relaxed: '1.75',
  },

  // Border radius
  borderRadius: {
    none: '0',
    sm: '4px',
    md: '6px',
    lg: '8px',
    xl: '12px',
    '2xl': '16px',
    full: '9999px',
  },

  // Shadows (elevation system like Material Design)
  shadow: {
    sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
    md: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
    lg: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
    xl: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
  },

  // Animation durations
  duration: {
    instant: '0ms',
    fast: '150ms',
    normal: '300ms',
    slow: '500ms',
  },

  // Z-index scale (prevents z-index wars)
  zIndex: {
    dropdown: '1000',
    sticky: '1100',
    modal: '1300',
    popover: '1400',
    tooltip: '1500',
    toast: '1600',
  },
} as const

// ─── Semantic Tokens (role-based aliases) ─────────────────────────────────
// These ARE what components use. They map intentions to primitives.
// When switching themes (light → dark), only these change.

export const lightTheme = {
  // Surface colors
  'color-bg-primary': primitives.colors.white,
  'color-bg-secondary': primitives.colors.gray[50],
  'color-bg-tertiary': primitives.colors.gray[100],
  'color-bg-inverse': primitives.colors.gray[900],

  // Text colors
  'color-text-primary': primitives.colors.gray[900],
  'color-text-secondary': primitives.colors.gray[600],
  'color-text-tertiary': primitives.colors.gray[400],
  'color-text-inverse': primitives.colors.white,
  'color-text-link': primitives.colors.blue[600],
  'color-text-link-hover': primitives.colors.blue[800],

  // Interactive colors
  'color-action-primary': primitives.colors.blue[600],
  'color-action-primary-hover': primitives.colors.blue[700],
  'color-action-primary-active': primitives.colors.blue[800],
  'color-action-secondary': primitives.colors.gray[200],
  'color-action-secondary-hover': primitives.colors.gray[300],
  'color-action-disabled': primitives.colors.gray[300],

  // Feedback colors
  'color-success': primitives.colors.green[500],
  'color-success-bg': primitives.colors.green[50],
  'color-warning': primitives.colors.amber[500],
  'color-warning-bg': primitives.colors.amber[50],
  'color-error': primitives.colors.red[500],
  'color-error-bg': primitives.colors.red[50],
  'color-info': primitives.colors.blue[500],
  'color-info-bg': primitives.colors.blue[50],

  // Border colors
  'color-border-primary': primitives.colors.gray[200],
  'color-border-secondary': primitives.colors.gray[300],
  'color-border-focus': primitives.colors.blue[500],
  'color-border-error': primitives.colors.red[500],

  // Focus ring
  'color-focus-ring': `${primitives.colors.blue[500]}40`, // 25% opacity
} as const

export const darkTheme: typeof lightTheme = {
  'color-bg-primary': primitives.colors.gray[900],
  'color-bg-secondary': primitives.colors.gray[800],
  'color-bg-tertiary': primitives.colors.gray[700],
  'color-bg-inverse': primitives.colors.gray[50],

  'color-text-primary': primitives.colors.gray[50],
  'color-text-secondary': primitives.colors.gray[400],
  'color-text-tertiary': primitives.colors.gray[500],
  'color-text-inverse': primitives.colors.gray[900],
  'color-text-link': primitives.colors.blue[400],
  'color-text-link-hover': primitives.colors.blue[300],

  'color-action-primary': primitives.colors.blue[500],
  'color-action-primary-hover': primitives.colors.blue[400],
  'color-action-primary-active': primitives.colors.blue[300],
  'color-action-secondary': primitives.colors.gray[700],
  'color-action-secondary-hover': primitives.colors.gray[600],
  'color-action-disabled': primitives.colors.gray[600],

  'color-success': primitives.colors.green[500],
  'color-success-bg': `${primitives.colors.green[900]}80`,
  'color-warning': primitives.colors.amber[500],
  'color-warning-bg': `${primitives.colors.amber[900]}80`,
  'color-error': primitives.colors.red[500],
  'color-error-bg': `${primitives.colors.red[900]}80`,
  'color-info': primitives.colors.blue[400],
  'color-info-bg': `${primitives.colors.blue[900]}80`,

  'color-border-primary': primitives.colors.gray[700],
  'color-border-secondary': primitives.colors.gray[600],
  'color-border-focus': primitives.colors.blue[400],
  'color-border-error': primitives.colors.red[400],

  'color-focus-ring': `${primitives.colors.blue[400]}40`,
}

// ─── CSS Custom Properties Generator ──────────────────────────────────────

/**
 * Apply design tokens as CSS custom properties on the document root.
 * This is how Shopify Polaris, Atlassian, and Salesforce do it.
 * 
 * Result: --color-bg-primary: #ffffff;
 * Usage in CSS/Tailwind: bg-[var(--color-bg-primary)]
 */
export function applyTheme(theme: typeof lightTheme): void {
  const root = document.documentElement

  Object.entries(theme).forEach(([key, value]) => {
    root.style.setProperty(`--${key}`, value)
  })

  // Apply non-theme tokens (spacing, typography, etc.)
  Object.entries(primitives.spacing).forEach(([key, value]) => {
    root.style.setProperty(`--spacing-${key}`, value)
  })

  Object.entries(primitives.fontSize).forEach(([key, value]) => {
    root.style.setProperty(`--font-size-${key}`, value)
  })

  Object.entries(primitives.borderRadius).forEach(([key, value]) => {
    root.style.setProperty(`--radius-${key}`, value)
  })

  Object.entries(primitives.shadow).forEach(([key, value]) => {
    root.style.setProperty(`--shadow-${key}`, value)
  })

  Object.entries(primitives.zIndex).forEach(([key, value]) => {
    root.style.setProperty(`--z-${key}`, value)
  })

  Object.entries(primitives.duration).forEach(([key, value]) => {
    root.style.setProperty(`--duration-${key}`, value)
  })
}

// ─── Tailwind Theme Extension ─────────────────────────────────────────────

/**
 * Use in tailwind.config.js to extend Tailwind with design token values.
 * This way, Tailwind utilities like `bg-primary`, `text-secondary` use tokens.
 * 
 * tailwind.config.js:
 *   import { tailwindTokens } from './src/lib/designTokens'
 *   export default {
 *     theme: { extend: tailwindTokens }
 *   }
 */
export const tailwindTokens = {
  colors: {
    primary: 'var(--color-action-primary)',
    'primary-hover': 'var(--color-action-primary-hover)',
    secondary: 'var(--color-action-secondary)',
    success: 'var(--color-success)',
    warning: 'var(--color-warning)',
    error: 'var(--color-error)',
    info: 'var(--color-info)',
  },
  backgroundColor: {
    surface: 'var(--color-bg-primary)',
    'surface-secondary': 'var(--color-bg-secondary)',
    'surface-tertiary': 'var(--color-bg-tertiary)',
    'surface-inverse': 'var(--color-bg-inverse)',
  },
  textColor: {
    primary: 'var(--color-text-primary)',
    secondary: 'var(--color-text-secondary)',
    tertiary: 'var(--color-text-tertiary)',
    inverse: 'var(--color-text-inverse)',
    link: 'var(--color-text-link)',
  },
  borderColor: {
    primary: 'var(--color-border-primary)',
    secondary: 'var(--color-border-secondary)',
    focus: 'var(--color-border-focus)',
    error: 'var(--color-border-error)',
  },
  ringColor: {
    focus: 'var(--color-focus-ring)',
  },
}
