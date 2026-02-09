/**
 * commitlint Configuration — Conventional Commits
 * 
 * Enforces standardized commit messages:
 *   type(scope): description
 * 
 * Types: feat, fix, docs, style, refactor, perf, test, build, ci, chore, revert
 * 
 * Used by: Angular (Google), Vue.js, Lerna, semantic-release, Nx
 * Why: Automates CHANGELOG generation, enables semantic versioning,
 *      makes git history readable at scale (1000+ devs)
 * 
 * Examples:
 *   ✅ feat(employees): add CSV bulk import
 *   ✅ fix(auth): handle expired refresh tokens
 *   ✅ perf(list): virtualize employee table for 10k+ rows
 *   ✅ docs: update API documentation
 *   ❌ updated stuff
 *   ❌ fix bug
 *   ❌ WIP
 */
module.exports = {
  extends: ['@commitlint/config-conventional'],
  rules: {
    // Type must be one of these
    'type-enum': [
      2,
      'always',
      [
        'feat',     // New feature
        'fix',      // Bug fix
        'docs',     // Documentation
        'style',    // Formatting (no logic change)
        'refactor', // Code restructuring
        'perf',     // Performance improvement
        'test',     // Adding/updating tests
        'build',    // Build system changes
        'ci',       // CI/CD changes
        'chore',    // Maintenance
        'revert',   // Revert a commit
      ],
    ],
    // Type must be lowercase
    'type-case': [2, 'always', 'lower-case'],
    // Subject must not be empty
    'subject-empty': [2, 'never'],
    // Subject must not end with period
    'subject-full-stop': [2, 'never', '.'],
    // Subject max length
    'subject-max-length': [2, 'always', 100],
    // Body max line length
    'body-max-line-length': [1, 'always', 200],
  },
}
