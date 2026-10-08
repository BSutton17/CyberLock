import { fileURLToPath, URL } from 'node:url'
import { defineConfig, searchForWorkspaceRoot } from 'vite'
import react from '@vitejs/plugin-react'

// Game rules shared with the server (abilities, effects, character and enemy data).
const sharedDir = fileURLToPath(new URL('../shared', import.meta.url))

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { '@shared': sharedDir },
  },
  server: {
    host: '0.0.0.0',
    port: 5180,
    strictPort: true,
    fs: {
      allow: [searchForWorkspaceRoot(process.cwd()), sharedDir],
    },
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.{js,jsx}'],
  },
})
