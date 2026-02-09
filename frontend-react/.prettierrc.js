/**
 * Prettier Configuration
 * 
 * Enforces consistent code formatting across the entire team.
 * When 500+ engineers work on the same codebase, formatting
 * debates waste time. Prettier eliminates them.
 * 
 * Used by: Facebook, Shopify, Stripe, Airbnb, every major company
 */
module.exports = {
  semi: false,                    // No semicolons (common in modern codebases)
  singleQuote: true,              // Single quotes
  trailingComma: 'es5',           // Trailing commas (cleaner git diffs)
  tabWidth: 2,                    // 2 spaces
  printWidth: 100,                // Line width
  bracketSpacing: true,           // { x } not {x}
  arrowParens: 'always',          // (x) => not x =>
  endOfLine: 'lf',                // Unix line endings (critical for cross-platform teams)
  jsxSingleQuote: false,          // Double quotes in JSX
  plugins: ['prettier-plugin-tailwindcss'], // Sort Tailwind classes automatically
}
