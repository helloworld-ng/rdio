import { auth, authHeaders, changeTemporaryPassword, isSetupComplete } from '@rdio/auth/server'
import { env } from '@rdio/env/server'
import type { FastifyInstance } from 'fastify'
import { requestSession } from '../lib/auth.js'
import { isRecord, parseJsonBody } from '../lib/station-store.js'

export async function authRoutes(server: FastifyInstance) {
  server.route({
    method: ['GET', 'POST'],
    url: '/api/auth/*',
    async handler(request, reply) {
      try {
        const url = new URL(request.url, env.BETTER_AUTH_URL)
        const body = request.body === undefined ? undefined : JSON.stringify(request.body)
        const authRequest = new Request(url.toString(), {
          method: request.method,
          headers: authHeaders(request.headers),
          ...(body ? { body } : {}),
        })
        const response = await auth.handler(authRequest)

        reply.status(response.status)
        response.headers.forEach((value, key) => reply.header(key, value))
        return reply.send(response.body ? await response.text() : null)
      } catch (error) {
        server.log.error(error)
        return reply.status(500).send({ error: 'Internal authentication error', code: 'AUTH_FAILURE' })
      }
    },
  })

  server.get('/auth/setup-status', async () => ({
    setupRequired: !(await isSetupComplete()),
  }))

  server.get('/auth/me', async (request, reply) => {
    const session = await requestSession(request)
    if (!session) {
      return reply.status(401).send({ error: 'Unauthorized' })
    }

    return session
  })

  server.post('/auth/change-password', async (request, reply) => {
    const session = await requestSession(request)
    if (!session) {
      return reply.status(401).send({ error: 'Unauthorized' })
    }

    const body = parseJsonBody(request.body)
    if (!isRecord(body) || typeof body.currentPassword !== 'string' || typeof body.newPassword !== 'string') {
      return reply.status(400).send({ error: 'currentPassword and newPassword are required' })
    }

    await changeTemporaryPassword(request.headers, session.user.id, body.currentPassword, body.newPassword)

    return reply.status(204).send()
  })
}
