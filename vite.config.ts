import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { resolveDevApiTarget } from './scripts/dev-proxy-config.ts'

export default defineConfig(({ mode }) => {
  const environment = loadEnv(mode, '.', 'MUSIYO_')
  const apiTarget = resolveDevApiTarget(environment)
  return {
    plugins: [react()],
    server: {
      proxy: {
        '/api': apiTarget,
      },
    },
  }
})
