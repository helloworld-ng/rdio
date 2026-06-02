import { env } from '@rdio/env/server'
import type { FastifyInstance } from 'fastify'
import { readFile } from 'node:fs/promises'
import { request as httpRequest } from 'node:http'
import { broadcastIcecastCredentials, broadcastStatusFile } from '../lib/station-store.js'

export async function broadcastRoutes(server: FastifyInstance) {
  server.get('/broadcast/status', async () => {
    const active = await readFile(broadcastStatusFile, 'utf8')
      .then((status) => status.trim() === 'connected')
      .catch(() => false)
    return { active }
  })

  server.get('/broadcast/settings', async () => ({
    broadcastIcecast: broadcastIcecastCredentials(),
  }))

  server.get('/live.mp3', (request, reply) => {
    reply.hijack()
    reply.raw.setTimeout(0)
    reply.raw.socket?.setNoDelay(true)
    const proxyReq = httpRequest({ hostname: 'localhost', port: env.ICECAST_PORT, path: '/live.mp3' }, (proxyRes) => {
      const headers: Record<string, string> = {
        'Content-Type': proxyRes.headers['content-type'] ?? 'audio/mpeg',
        'Cache-Control': 'no-cache',
        'Access-Control-Allow-Origin': '*',
        'X-Accel-Buffering': 'no',
      }
      for (const [key, value] of Object.entries(proxyRes.headers)) {
        if (key.startsWith('icy-') && typeof value === 'string') headers[key] = value
      }
      reply.raw.writeHead(proxyRes.statusCode ?? 503, headers)
      proxyRes.pipe(reply.raw)
    })
    proxyReq.on('socket', (socket) => {
      socket.setNoDelay(true)
    })
    proxyReq.on('error', () => {
      if (!reply.raw.headersSent) reply.raw.writeHead(503)
      reply.raw.end()
    })
    proxyReq.end()
  })
}
