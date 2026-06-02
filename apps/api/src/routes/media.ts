import type { FastifyInstance } from 'fastify'
import { createReadStream } from 'node:fs'
import { mkdir, rm, stat, writeFile } from 'node:fs/promises'
import path from 'node:path'
import {
  listMediaFiles,
  mediaItemFromFile,
  readAllScheduleBlocks,
  refreshCurrentPlayout,
  sanitizeFileName,
  scheduleVersion,
  storedFileNameFor,
  uploadDirectory,
  writeAllScheduleBlocks,
} from '../lib/station-store.js'

export async function mediaRoutes(server: FastifyInstance) {
  server.get('/', async () => ({
    media: await listMediaFiles(),
  }))

  server.post('/', async (request, reply) => {
    const body = request.body

    if (!Buffer.isBuffer(body) || body.length === 0) {
      return reply.status(400).send({ error: 'Expected a non-empty file body.' })
    }

    const rawFileName = request.headers['x-file-name']
    const originalName = sanitizeFileName(Array.isArray(rawFileName) ? rawFileName[0] : rawFileName ?? 'upload')
    const contentType = request.headers['content-type']
    const fileName = storedFileNameFor(originalName)

    await mkdir(uploadDirectory, { recursive: true })
    await writeFile(path.join(uploadDirectory, fileName), body)

    const media = mediaItemFromFile(fileName, body.length, new Date(), Array.isArray(contentType) ? contentType[0] : contentType)

    return reply.status(201).send({ media })
  })

  server.delete<{ Params: { mediaId: string } }>('/:mediaId', async (request) => {
    const safeMediaId = path.basename(request.params.mediaId)
    const blocks = await readAllScheduleBlocks()
    const updatedBlocks = blocks.map((block) =>
      block.mediaId === safeMediaId ? { ...block, mediaId: undefined, file: undefined } : block,
    )

    await rm(path.join(uploadDirectory, safeMediaId), { force: true })
    await writeAllScheduleBlocks(updatedBlocks)
    await refreshCurrentPlayout()
    return { blocks: updatedBlocks, version: await scheduleVersion() }
  })

  server.get<{ Params: { mediaId: string } }>('/:mediaId', async (request, reply) => {
    const safeMediaId = path.basename(request.params.mediaId)
    const filePath = path.join(uploadDirectory, safeMediaId)
    const stats = await stat(filePath)
    const media = mediaItemFromFile(safeMediaId, stats.size, stats.birthtimeMs > 0 ? stats.birthtime : stats.mtime)

    return reply.header('Content-Disposition', `inline; filename="${media.name}"`).send(createReadStream(filePath))
  })
}
