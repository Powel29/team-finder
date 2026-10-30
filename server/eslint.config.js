import js from '@eslint/js';
import globals from 'globals';

export default [
  { ignores: ['node_modules', 'coverage', 'src/generated'] },
  js.configs.recommended,
  {
    files: ['**/*.js'],
    languageOptions: {
      ecmaVersion: 2023,
      sourceType: 'module',
      globals: globals.node,
    },
    rules: {
      'no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      'no-console': ['error', { allow: ['error'] }],
    },
  },
  {
    files: ['prisma/**', 'src/tests/**'],
    languageOptions: { globals: { ...globals.node, ...globals.vitest } },
    rules: { 'no-console': 'off' },
  },
];
