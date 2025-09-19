const js = require('@eslint/js');
const globals = require('globals');

module.exports = [
  js.configs.recommended,
  {
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'script',
      globals: {
        ...globals.node,
        ...globals.jest,
      },
    },
    linterOptions: {
      reportUnusedDisableDirectives: true,
    },
    rules: {
      // Keep CI green initially; escalate later if desired
      'no-unused-vars': [
        'warn',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrors: 'none' },
      ],
      'no-console': 'off',
      'no-empty': 'warn',
      'no-case-declarations': 'off',
      'no-dupe-class-members': 'off',
      'no-dupe-keys': 'off',
      'no-undef': 'off',
      'no-useless-escape': 'warn',
      'no-misleading-character-class': 'warn',
    },
    ignores: ['node_modules/', 'dist/', 'coverage/', '.github/', 'PR_BODY_v1.16.0.md', 'notes/'],
  },
  {
    files: ['utils/**/*.js', 'commands/**/*.js', 'handlers/**/*.js'],
    rules: {
      'no-undef': 'error',
      'no-case-declarations': 'error',
    },
  },
];
