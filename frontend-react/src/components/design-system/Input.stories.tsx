// @ts-ignore - @storybook/react may not be installed
import type { Meta, StoryObj } from '@storybook/react'
import React from 'react'

/**
 * Input Component — Design System
 * 
 * Text input with label, validation, helper text, and states.
 * This mirrors how Stripe, Atlassian, and Shopify build their inputs.
 */

export interface InputProps {
  /** Input label */
  label: string
  /** Input name (for forms) */
  name: string
  /** Input type */
  type?: 'text' | 'email' | 'password' | 'number' | 'tel' | 'url' | 'search'
  /** Placeholder text */
  placeholder?: string
  /** Current value */
  value?: string
  /** Change handler */
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void
  /** Blur handler */
  onBlur?: (e: React.FocusEvent<HTMLInputElement>) => void
  /** Helper text below input */
  helperText?: string
  /** Error message (shows error state) */
  error?: string
  /** Is field required? */
  required?: boolean
  /** Is field disabled? */
  disabled?: boolean
  /** Is field read-only? */
  readOnly?: boolean
  /** Size variant */
  size?: 'sm' | 'md' | 'lg'
  /** Icon on the left */
  leftIcon?: React.ReactNode
  /** Character limit */
  maxLength?: number
  /** Auto-generated aria attributes */
  'aria-describedby'?: string
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  (
    {
      label,
      name,
      type = 'text',
      placeholder,
      value,
      onChange,
      onBlur,
      helperText,
      error,
      required = false,
      disabled = false,
      readOnly = false,
      size = 'md',
      leftIcon,
      maxLength,
      ...rest
    },
    ref
  ) => {
    const inputId = `input-${name}`
    const helperId = `helper-${name}`
    const errorId = `error-${name}`

    const sizeClasses = {
      sm: 'px-3 py-1.5 text-sm',
      md: 'px-3 py-2 text-sm',
      lg: 'px-4 py-3 text-base',
    }

    return (
      <div className="w-full">
        {/* Label */}
        <label
          htmlFor={inputId}
          className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
        >
          {label}
          {required && (
            <span className="text-red-500 ml-1" aria-hidden="true">*</span>
          )}
        </label>

        {/* Input wrapper */}
        <div className="relative">
          {leftIcon && (
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
              {leftIcon}
            </div>
          )}

          <input
            ref={ref}
            id={inputId}
            name={name}
            type={type}
            value={value}
            onChange={onChange}
            onBlur={onBlur}
            placeholder={placeholder}
            required={required}
            disabled={disabled}
            readOnly={readOnly}
            maxLength={maxLength}
            aria-invalid={!!error}
            aria-describedby={
              error ? errorId : helperText ? helperId : undefined
            }
            aria-required={required}
            className={`
              block w-full rounded-md border shadow-sm
              transition-colors duration-150
              focus:outline-none focus:ring-2 focus:ring-offset-0
              disabled:bg-gray-50 disabled:cursor-not-allowed
              dark:bg-gray-800 dark:text-gray-100
              ${leftIcon ? 'pl-10' : ''}
              ${sizeClasses[size]}
              ${
                error
                  ? 'border-red-500 focus:ring-red-500 focus:border-red-500'
                  : 'border-gray-300 dark:border-gray-600 focus:ring-blue-500 focus:border-blue-500'
              }
            `}
            {...rest}
          />
        </div>

        {/* Error or helper text */}
        {error ? (
          <p id={errorId} className="mt-1 text-sm text-red-600" role="alert">
            {error}
          </p>
        ) : helperText ? (
          <p id={helperId} className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {helperText}
          </p>
        ) : null}

        {/* Character count */}
        {maxLength && value !== undefined && (
          <p className="mt-1 text-xs text-gray-400 text-right">
            {value.length}/{maxLength}
          </p>
        )}
      </div>
    )
  }
)

Input.displayName = 'Input'

// ─── Stories ───────────────────────────────────────────────────────────────

const meta = {
  title: 'Design System/Input',
  component: Input,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component:
          'Text input component with full accessibility support. Includes label, validation, helper text, and character limits.',
      },
    },
  },
  tags: ['autodocs'],
  decorators: [
    (Story: any) => (
      <div style={{ width: '360px' }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof Input>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: {
    label: 'Email Address',
    name: 'email',
    type: 'email',
    placeholder: 'john@company.com',
  },
}

export const Required: Story = {
  args: {
    label: 'Full Name',
    name: 'fullName',
    placeholder: 'John Doe',
    required: true,
  },
}

export const WithHelperText: Story = {
  args: {
    label: 'Employee ID',
    name: 'employeeId',
    placeholder: 'EMP-001',
    helperText: 'Unique identifier assigned to the employee.',
  },
}

export const WithError: Story = {
  args: {
    label: 'Email Address',
    name: 'email',
    type: 'email',
    value: 'invalid-email',
    error: 'Please enter a valid email address.',
    required: true,
  },
}

export const Disabled: Story = {
  args: {
    label: 'Department',
    name: 'department',
    value: 'Engineering',
    disabled: true,
  },
}

export const WithCharacterLimit: Story = {
  args: {
    label: 'Bio',
    name: 'bio',
    placeholder: 'Tell us about yourself...',
    maxLength: 200,
    value: 'Software engineer with 5 years of experience',
  },
}

export const AllSizes: Story = {
  render: () => (
    <div className="space-y-4">
      <Input label="Small" name="sm" size="sm" placeholder="Small input" />
      <Input label="Medium" name="md" size="md" placeholder="Medium input" />
      <Input label="Large" name="lg" size="lg" placeholder="Large input" />
    </div>
  ),
}
