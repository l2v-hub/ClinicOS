import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';
import { defineConfig, globalIgnores } from 'eslint/config';

// Backend (Node + Express + Prisma) flat ESLint config — mirrors the frontend setup
// (typescript-eslint recommended) but with Node globals and no React plugins.
export default defineConfig([
  globalIgnores(['dist', 'node_modules']),
  {
    files: ['**/*.ts'],
    extends: [js.configs.recommended, tseslint.configs.recommended],
    languageOptions: {
      globals: { ...globals.node },
    },
    rules: {
      // Pragmatic baseline for an established backend adopting ESLint for the first time:
      // surface pre-existing nits as warnings (visible, non-blocking) rather than failing the
      // whole suite on day one. Allow `any` where the AI/OCR runtime legitimately needs it.
      // Tighten these back to 'error' per-module as the code is cleaned up.
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unused-vars': [
        'warn',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      'no-useless-escape': 'warn',
    },
  },
]);
