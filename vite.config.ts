import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'node:path'
import { playerFileGuard } from './scripts/player-file-guard.ts'
import { resolveDevApiTarget } from './scripts/dev-proxy-config.ts'

export default defineConfig(({ mode }) => {
  const environment = loadEnv(mode, '.', 'MUSIYO_')
  const apiTarget = resolveDevApiTarget(environment)
  return {
    plugins: [react(), {
      name: 'preserve-player-errors',
      configureServer(server) {
        const directory = resolve(server.config.publicDir, 'unity')
        server.middlewares.use(playerFileGuard(directory))
      },
      configurePreviewServer(server) {
        const directory = resolve(server.config.root, server.config.build.outDir, 'unity')
        server.middlewares.use(playerFileGuard(directory))
      },
    }],
    server: {
      proxy: {
        '/api': apiTarget,
      },
    },
  }
})
