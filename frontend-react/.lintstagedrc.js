/**
 * lint-staged Configuration
 *
 * Runs linters/formatters ONLY on staged files (git add'd files).
 * This keeps commits fast — even in 10,000+ file monorepos.
 * 
 * Used by: Next.js, Vercel, Shopify, Microsoft, open source projects
 */
module.exports = {
  // TypeScript/JavaScript files: lint + format
  '*.{ts,tsx}': [
    'eslint --fix --max-warnings 0',
    'prettier --write',
  ],

  // JavaScript files
  '*.{js,jsx}': [
    'eslint --fix --max-warnings 0',
    'prettier --write',
  ],

  // CSS files: format only
  '*.css': ['prettier --write'],

  // JSON files: format
  '*.json': ['prettier --write'],

  // Markdown: format
  '*.md': ['prettier --write'],

  // Run type-check on the whole project if any TS file changes
  // (because type errors can cascade across files)
  '**/*.ts?(x)': () => 'tsc --noEmit',
}
