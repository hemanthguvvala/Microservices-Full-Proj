import React from 'react'
import { Sun, Moon, Monitor } from 'lucide-react'
import { useTheme } from '../contexts/ThemeContext'

interface ThemeToggleProps {
  className?: string
  showLabel?: boolean
}

/**
 * Theme toggle button component
 * Cycles through light -> dark -> system
 * 
 * @example
 * ```tsx
 * // Simple icon button
 * <ThemeToggle />
 * 
 * // With label
 * <ThemeToggle showLabel />
 * ```
 */
export const ThemeToggle: React.FC<ThemeToggleProps> = ({
  className = '',
  showLabel = false,
}) => {
  const { theme, effectiveTheme, toggleTheme } = useTheme()

  const getIcon = () => {
    switch (theme) {
      case 'light':
        return <Sun className="h-5 w-5" />
      case 'dark':
        return <Moon className="h-5 w-5" />
      case 'system':
        return <Monitor className="h-5 w-5" />
    }
  }

  const getLabel = () => {
    switch (theme) {
      case 'light':
        return 'Light'
      case 'dark':
        return 'Dark'
      case 'system':
        return 'System'
    }
  }

  return (
    <button
      onClick={toggleTheme}
      className={`
        inline-flex items-center gap-2 px-3 py-2 rounded-lg
        bg-gray-200 dark:bg-gray-700
        hover:bg-gray-300 dark:hover:bg-gray-600
        text-gray-700 dark:text-gray-200
        transition-colors duration-200
        ${className}
      `}
      title={`Current theme: ${theme} (${effectiveTheme})`}
      aria-label="Toggle theme"
    >
      {getIcon()}
      {showLabel && <span className="text-sm font-medium">{getLabel()}</span>}
    </button>
  )
}

interface ThemeSelectProps {
  className?: string
}

/**
 * Theme select dropdown component
 * Allows direct selection of theme
 * 
 * @example
 * ```tsx
 * <ThemeSelect />
 * ```
 */
export const ThemeSelect: React.FC<ThemeSelectProps> = ({ className = '' }) => {
  const { theme, setTheme } = useTheme()

  return (
    <div className={`inline-flex items-center gap-2 ${className}`}>
      <label htmlFor="theme-select" className="text-sm font-medium text-gray-700 dark:text-gray-300">
        Theme:
      </label>
      <select
        id="theme-select"
        value={theme}
        onChange={(e) => setTheme(e.target.value as 'light' | 'dark' | 'system')}
        className="
          px-3 py-2 rounded-lg border
          bg-white dark:bg-gray-800
          border-gray-300 dark:border-gray-600
          text-gray-900 dark:text-gray-100
          focus:outline-none focus:ring-2 focus:ring-primary-500
          text-sm
        "
      >
        <option value="light">☀️ Light</option>
        <option value="dark">🌙 Dark</option>
        <option value="system">💻 System</option>
      </select>
    </div>
  )
}

interface ThemeRadioGroupProps {
  className?: string
  orientation?: 'horizontal' | 'vertical'
}

/**
 * Theme radio group component
 * Radio buttons for theme selection
 * 
 * @example
 * ```tsx
 * <ThemeRadioGroup orientation="horizontal" />
 * ```
 */
export const ThemeRadioGroup: React.FC<ThemeRadioGroupProps> = ({
  className = '',
  orientation = 'horizontal',
}) => {
  const { theme, setTheme } = useTheme()

  const options = [
    { value: 'light', label: 'Light', icon: Sun },
    { value: 'dark', label: 'Dark', icon: Moon },
    { value: 'system', label: 'System', icon: Monitor },
  ] as const

  return (
    <div
      className={`
        flex gap-2
        ${orientation === 'vertical' ? 'flex-col' : 'flex-row'}
        ${className}
      `}
    >
      {options.map(({ value, label, icon: Icon }) => (
        <label
          key={value}
          className={`
            flex items-center gap-2 px-4 py-2 rounded-lg cursor-pointer
            border-2 transition-all duration-200
            ${
              theme === value
                ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'
            }
          `}
        >
          <input
            type="radio"
            name="theme"
            value={value}
            checked={theme === value}
            onChange={(e) => setTheme(e.target.value as 'light' | 'dark' | 'system')}
            className="sr-only"
          />
          <Icon className="h-5 w-5" />
          <span className="text-sm font-medium">{label}</span>
        </label>
      ))}
    </div>
  )
}

export default ThemeToggle
