import type { StorybookConfig } from '@storybook/react-vite'

/**
 * Storybook Configuration
 * 
 * Used by: Shopify (Polaris), Airbnb, IBM (Carbon), Microsoft (Fluent UI),
 *          GitLab, GitHub Primer, Atlassian, Stripe
 * 
 * Why MNCs use Storybook:
 * - Design system documentation
 * - Visual regression testing
 * - Component isolation during development
 * - Cross-team component sharing
 * - Interactive API documentation for components
 * - Accessibility auditing (a11y addon)
 * - Stakeholder review without running the app
 */
const config: StorybookConfig = {
  stories: [
    '../src/**/*.mdx',
    '../src/**/*.stories.@(js|jsx|mjs|ts|tsx)',
  ],
  addons: [
    '@storybook/addon-onboarding',
    '@storybook/addon-essentials',      // Docs, Controls, Actions, Viewport, Backgrounds
    '@chromatic-com/storybook',          // Visual regression testing (used by Shopify, Monday.com)
    '@storybook/addon-interactions',     // Interaction testing
    '@storybook/addon-a11y',             // Accessibility auditing (WCAG compliance)
    '@storybook/addon-links',            // Link between stories
    '@storybook/addon-themes',           // Theme switching (light/dark)
  ],
  framework: {
    name: '@storybook/react-vite',
    options: {},
  },
  typescript: {
    reactDocgen: 'react-docgen-typescript',
    reactDocgenTypescriptOptions: {
      // Speed up docgen by skipping node_modules
      shouldExtractLiteralValuesFromEnum: true,
      propFilter: (prop) =>
        prop.parent ? !/node_modules/.test(prop.parent.fileName) : true,
    },
  },
  docs: {
    autodocs: 'tag',
  },
  // Static files directory
  staticDirs: ['../public'],
}

export default config
