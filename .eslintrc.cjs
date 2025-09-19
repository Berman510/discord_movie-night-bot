module.exports = {
  root: true,
  env: {
    node: true,
    es2022: true,
    jest: true
  },
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'script'
  },
  extends: [
    'eslint:recommended',
    'plugin:prettier/recommended'
  ],
  rules: {
    // Keep CI green initially; escalate later if desired
    'no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrors: 'none' }],
    'no-console': 'off'
  },
  ignorePatterns: [
    'node_modules/',
    'dist/',
    'coverage/',
    '.github/',
    'PR_BODY_v1.16.0.md'
  ]
};

