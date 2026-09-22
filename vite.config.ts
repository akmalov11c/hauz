import { defineConfig, loadEnv } from 'vite'

import { tanstackStart } from '@tanstack/react-start/plugin/vite'

import viteReact from '@vitejs/plugin-react'

const config = defineConfig(({ mode }) => {
  // Load .env (all keys, no prefix filter) into process.env so server-only code
  // — SSR and server functions — can read the Appwrite secrets. Nothing here
  // leaks to the browser: only VITE_-prefixed vars reach the client bundle, and
  // these are deliberately left unprefixed.
  Object.assign(process.env, loadEnv(mode, process.cwd(), ''))

  return {
    resolve: { tsconfigPaths: true },
    plugins: [tanstackStart(), viteReact()],
  }
})

export default config
