import path from 'node:path'
import { fileURLToPath } from 'node:url'
import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, repoRoot, '')
  const proxyTarget = env.RDIO_API_PROXY_TARGET ?? 'http://localhost:3001'

  return {
    envDir: repoRoot,
    plugins: [react()],
    server: {
      port: Number(process.env.WEB_PORT ?? 5173),
      proxy: {
        '/api': {
          target: proxyTarget,
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api/, ''),
        },
      },
    },
  }
})
