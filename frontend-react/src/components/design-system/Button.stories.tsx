// @ts-ignore - @storybook/react may not be installed
import type { Meta, StoryObj } from '@storybook/react'
// @ts-ignore - @storybook/test may not be installed
import { fn } from '@storybook/test'

/**
 * Button Component — Part of the Design System
 * 
 * This is the foundational Button used across the entire application.
 * At MNCs, every design system starts with Button, Input, Modal.
 * 
 * Design tokens are consumed here for consistent theming.
 */

// ─── Component ────────────────────────────────────────────────────────────

export interface ButtonProps {
  /** What variant to use */
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'outline'
  /** How large should the button be? */
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
  /** Button contents */
  children: React.ReactNode
  /** Optional icon on the left */
  leftIcon?: React.ReactNode
  /** Optional icon on the right */
  rightIcon?: React.ReactNode
  /** Is the button in a loading state? */
  loading?: boolean
  /** Is the button disabled? */
  disabled?: boolean
  /** Full width button? */
  fullWidth?: boolean
  /** Click handler */
  onClick?: () => void
  /** Button type */
  type?: 'button' | 'submit' | 'reset'
  /** Accessible label when button has no text */
  'aria-label'?: string
}

const variantStyles: Record<string, string> = {
  primary:
    'bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500 active:bg-blue-800',
  secondary:
    'bg-gray-100 text-gray-900 hover:bg-gray-200 focus:ring-gray-500 active:bg-gray-300 dark:bg-gray-700 dark:text-gray-100',
  danger:
    'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500 active:bg-red-800',
  ghost:
    'bg-transparent text-gray-700 hover:bg-gray-100 focus:ring-gray-500 dark:text-gray-300 dark:hover:bg-gray-800',
  outline:
    'bg-transparent text-blue-600 border-2 border-blue-600 hover:bg-blue-50 focus:ring-blue-500 dark:text-blue-400 dark:border-blue-400',
}

const sizeStyles: Record<string, string> = {
  xs: 'px-2 py-1 text-xs rounded',
  sm: 'px-3 py-1.5 text-sm rounded-md',
  md: 'px-4 py-2 text-sm rounded-md',
  lg: 'px-5 py-2.5 text-base rounded-lg',
  xl: 'px-6 py-3 text-lg rounded-lg',
}

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  children,
  leftIcon,
  rightIcon,
  loading = false,
  disabled = false,
  fullWidth = false,
  onClick,
  type = 'button',
  'aria-label': ariaLabel,
}) => {
  const isDisabled = disabled || loading

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={isDisabled}
      aria-label={ariaLabel}
      aria-busy={loading}
      className={`
        inline-flex items-center justify-center gap-2
        font-medium transition-all duration-150
        focus:outline-none focus:ring-2 focus:ring-offset-2
        disabled:opacity-50 disabled:cursor-not-allowed
        ${variantStyles[variant]}
        ${sizeStyles[size]}
        ${fullWidth ? 'w-full' : ''}
      `}
    >
      {loading ? (
        <svg
          className="animate-spin h-4 w-4"
          viewBox="0 0 24 24"
          fill="none"
          aria-hidden="true"
        >
          <circle
            className="opacity-25"
            cx="12" cy="12" r="10"
            stroke="currentColor" strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
          />
        </svg>
      ) : leftIcon ? (
        <span className="shrink-0" aria-hidden="true">{leftIcon}</span>
      ) : null}

      {children}

      {rightIcon && !loading && (
        <span className="shrink-0" aria-hidden="true">{rightIcon}</span>
      )}
    </button>
  )
}

// ─── Stories ───────────────────────────────────────────────────────────────

const meta = {
  title: 'Design System/Button',
  component: Button,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component:
          'Primary UI button component. Follows the design system tokens for consistent look and feel across all pages.',
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: 'select',
      options: ['primary', 'secondary', 'danger', 'ghost', 'outline'],
      description: 'Visual style variant',
      table: { defaultValue: { summary: 'primary' } },
    },
    size: {
      control: 'select',
      options: ['xs', 'sm', 'md', 'lg', 'xl'],
      description: 'Size variant',
      table: { defaultValue: { summary: 'md' } },
    },
    loading: { control: 'boolean' },
    disabled: { control: 'boolean' },
    fullWidth: { control: 'boolean' },
    onClick: { action: 'clicked' },
  },
  args: {
    onClick: fn(),
  },
} satisfies Meta<typeof Button>

export default meta
type Story = StoryObj<typeof meta>

/** Default primary button */
export const Primary: Story = {
  args: {
    variant: 'primary',
    children: 'Create Employee',
  },
}

/** Secondary action button */
export const Secondary: Story = {
  args: {
    variant: 'secondary',
    children: 'Cancel',
  },
}

/** Danger / destructive button */
export const Danger: Story = {
  args: {
    variant: 'danger',
    children: 'Delete Employee',
  },
}

/** Ghost button for tertiary actions */
export const Ghost: Story = {
  args: {
    variant: 'ghost',
    children: 'Learn More',
  },
}

/** Outline button */
export const Outline: Story = {
  args: {
    variant: 'outline',
    children: 'Export Data',
  },
}

/** Loading state */
export const Loading: Story = {
  args: {
    variant: 'primary',
    children: 'Saving...',
    loading: true,
  },
}

/** Disabled state */
export const Disabled: Story = {
  args: {
    variant: 'primary',
    children: 'Submit',
    disabled: true,
  },
}

/** All sizes comparison */
export const Sizes: Story = {
  render: () => (
    <div className="flex items-end gap-4">
      <Button size="xs">Extra Small</Button>
      <Button size="sm">Small</Button>
      <Button size="md">Medium</Button>
      <Button size="lg">Large</Button>
      <Button size="xl">Extra Large</Button>
    </div>
  ),
}

/** All variants comparison */
export const AllVariants: Story = {
  render: () => (
    <div className="flex flex-wrap gap-4">
      <Button variant="primary">Primary</Button>
      <Button variant="secondary">Secondary</Button>
      <Button variant="danger">Danger</Button>
      <Button variant="ghost">Ghost</Button>
      <Button variant="outline">Outline</Button>
    </div>
  ),
}

/** Full width button (used in modals and forms) */
export const FullWidth: Story = {
  args: {
    variant: 'primary',
    children: 'Sign In',
    fullWidth: true,
  },
  decorators: [
    (Story: any) => (
      <div style={{ width: '320px' }}>
        <Story />
      </div>
    ),
  ],
}
