import js from '@eslint/js'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import globals from 'globals'
import tseslint from 'typescript-eslint'

const purityMessage =
  'The simulation must stay framework-free: packages/engine and src/content may not import React or reach into src/features or src/store.'

const enginePurityMessage =
  'packages/engine is the framework-free simulation the whole site builds on: it may not import React, Zustand or anything from src/.'

export default tseslint.config(
  { ignores: ['dist', 'coverage', 'node_modules', 'playwright-report', 'test-results'] },

  {
    files: ['**/*.{ts,tsx}'],
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    languageOptions: {
      ecmaVersion: 2022,
      globals: globals.browser,
    },
  },

  {
    files: ['src/features/**/*.{ts,tsx}'],
    extends: [reactHooks.configs.flat['recommended-latest'], reactRefresh.configs.vite],
  },

  {
    files: ['packages/engine/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [
            { name: 'react', message: enginePurityMessage },
            { name: 'react-dom', message: enginePurityMessage },
            { name: 'react-dom/client', message: enginePurityMessage },
            { name: 'zustand', message: enginePurityMessage },
          ],
          patterns: [
            {
              group: ['**/src/**', '**/features/**', '**/store/**', '**/content/**'],
              message: enginePurityMessage,
            },
          ],
        },
      ],
    },
  },

  {
    files: ['src/content/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [
            { name: 'react', message: purityMessage },
            { name: 'react-dom', message: purityMessage },
            { name: 'react-dom/client', message: purityMessage },
            { name: 'zustand', message: purityMessage },
          ],
          patterns: [{ group: ['**/features/**', '**/store/**'], message: purityMessage }],
        },
      ],
    },
  },

  {
    files: ['vite.config.ts', 'e2e/**/*.ts'],
    languageOptions: { globals: globals.node },
  }
)
