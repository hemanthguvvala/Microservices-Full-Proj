import type { Preview } from '@storybook/react'
import '../src/index.css' // Load TailwindCSS

/**
 * Storybook Preview Configuration
 * Global decorators and parameters applied to all stories
 */
const preview: Preview = {
  parameters: {
    // Action handlers (log in Actions panel)
    actions: { argTypesRegex: '^on[A-Z].*' },

    // Controls configuration (auto-generate controls from props)
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },

    // Default viewport sizes (mobile-first at MNCs)
    viewport: {
      viewports: {
        mobile: {
          name: 'Mobile',
          styles: { width: '375px', height: '667px' },
        },
        tablet: {
          name: 'Tablet',
          styles: { width: '768px', height: '1024px' },
        },
        desktop: {
          name: 'Desktop',
          styles: { width: '1440px', height: '900px' },
        },
      },
    },

    // Backgrounds for light/dark mode testing
    backgrounds: {
      default: 'light',
      values: [
        { name: 'light', value: '#ffffff' },
        { name: 'dark', value: '#1f2937' },
        { name: 'gray', value: '#f3f4f6' },
      ],
    },

    // Layout options
    layout: 'centered',
  },

  // Global decorators — wrap every story
  decorators: [
    (Story) => (
      <div className="font-sans antialiased">
        <Story />
      </div>
    ),
  ],

  // Tags for autodocs
  tags: ['autodocs'],
}

export default preview
