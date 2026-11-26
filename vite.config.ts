import { defineConfig } from 'vite'
import { svelte } from '@sveltejs/vite-plugin-svelte'
import tailwindcss from '@tailwindcss/vite'

import { execSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const file = fileURLToPath(new URL('package.json', import.meta.url))
const json = readFileSync(file, 'utf8')
const pkg = JSON.parse(json)

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [tailwindcss(), svelte()],
  resolve: process.env.VITEST ? { conditions: ['browser'] } : undefined,
  define: {
    __VERSION__: JSON.stringify(pkg.version),
    __SUPPORT_DF_VERSION__: JSON.stringify(pkg.supportDFVersion),
    __COMMIT_HASH__: JSON.stringify(execSync('git rev-parse --short HEAD').toString()),
  },
})
