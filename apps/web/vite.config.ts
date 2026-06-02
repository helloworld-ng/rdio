import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const proxyTarget = env.RDIO_API_PROXY_TARGET ?? 'http://localhost:3001'

  return {
    plugins: [react()],
    server: {
      port: Number(env.WEB_PORT ?? 5173),
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
