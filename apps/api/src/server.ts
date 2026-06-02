import cors from '@fastify/cors'
import { env, webOrigins } from '@rdio/env/server'
import Fastify from 'fastify'
import { addAuthGuard } from './lib/auth.js'
import { initializePlayout, refreshCurrentPlayout } from './lib/station-store.js'
import { authRoutes } from './routes/auth.js'
import { broadcastRoutes } from './routes/broadcast.js'
import { hostRoutes } from './routes/hosts.js'
import { mediaRoutes } from './routes/media.js'
import { memberRoutes } from './routes/members.js'
import { programRoutes } from './routes/programs.js'
import { scheduleBlockRoutes } from './routes/schedule-blocks.js'
import { stationRoutes } from './routes/station.js'

const server = Fastify({ bodyLimit: 100 * 1024 * 1024, logger: true })

await server.register(cors, {
  origin: webOrigins,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'X-File-Name'],
  credentials: true,
})

addAuthGuard(server)

server.addContentTypeParser('*', { parseAs: 'buffer' }, (_request, body, done) => {
  done(null, body)
})

await server.register(authRoutes)
await server.register(memberRoutes, { prefix: '/members' })
await server.register(broadcastRoutes)
await server.register(stationRoutes)
await server.register(scheduleBlockRoutes, { prefix: '/schedule-blocks' })
await server.register(programRoutes, { prefix: '/programs' })
await server.register(hostRoutes, { prefix: '/hosts' })
await server.register(mediaRoutes, { prefix: '/media' })

await server.listen({ port: env.API_PORT, host: '0.0.0.0' })
await initializePlayout(server.log)

setInterval(() => {
  refreshCurrentPlayout().catch((error: unknown) => {
    server.log.error(error)
  })
}, 15_000)
