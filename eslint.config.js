import js from '@eslint/js'
import { defineConfig, globalIgnores } from 'eslint/config'
import svelte from 'eslint-plugin-svelte'
import globals from 'globals'
import ts from 'typescript-eslint'

export default defineConfig(
  globalIgnores([
    'build/',
    '.svelte-kit/',
    'package/',
    'public/',
    'dist/',
    'coverage/',
    '**/*.cjs',
    '**/*.stories.svelte',
    'svelte.config.js',
    'vite.config.ts',
    'eslint.config.js',
  ]),
  {
    files: ['**/*.{js,svelte}', '**/*.svelte.ts'],
    extends: [js.configs.recommended, ts.configs.recommendedTypeChecked],
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node,
        __VERSION__: 'readonly',
        __SUPPORT_DF_VERSION__: 'readonly',
      },
      parserOptions: { project: './tsconfig.json', extraFileExtensions: ['.svelte'] },
    },
    rules: { '@typescript-eslint/no-unused-vars': 'warn' },
  },
  svelte.configs.base,
  {
    files: ['**/*.svelte', '**/*.svelte.ts'],
    languageOptions: { parserOptions: { parser: ts.parser } },
  }
)
