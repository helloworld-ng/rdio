import Fastify from 'fastify'
import { createReadStream } from 'node:fs'
import { mkdir, readdir, rm, stat, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { randomUUID } from 'node:crypto'
import { fileURLToPath } from 'node:url'
import { findStation, getStationScheduleSnapshot, type RadioStation } from '@rdio/rdio-core'
import { defaultStationId, stations } from './stations'

const server = Fastify({ bodyLimit: 100 * 1024 * 1024, logger: true })
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..')
const uploadDirectory = path.join(repoRoot, 'media/uploads')

server.addHook('onRequest', async (_request, reply) => {
  reply.header('Access-Control-Allow-Origin', '*')
  reply.header('Access-Control-Allow-Methods', 'GET,POST,DELETE,OPTIONS')
  reply.header('Access-Control-Allow-Headers', 'Content-Type,X-File-Name')
})

server.addContentTypeParser('*', { parseAs: 'buffer' }, (_request, body, done) => {
  done(null, body)
})

server.options('/*', async (_request, reply) => {
  return reply.status(204).send()
})

type MediaType = 'audio' | 'image'

interface MediaFile {
  id: string
  name: string
  size: number
  type: MediaType
  uploadedAt: string
  url: string
}

function sanitizeFileName(fileName: string) {
  return path.basename(fileName).replaceAll(/[^a-zA-Z0-9._ -]/g, '_').trim() || 'upload'
}

function inferMediaType(fileName: string, contentType?: string): MediaType {
  if (contentType?.startsWith('image/')) {
    return 'image'
  }

  if (contentType?.startsWith('audio/')) {
    return 'audio'
  }

  return /\.(apng|avif|gif|jpe?g|png|svg|webp)$/i.test(fileName) ? 'image' : 'audio'
}

function storedFileNameFor(originalName: string) {
  return `${Date.now()}-${randomUUID()}__${sanitizeFileName(originalName)}`
}

function mediaItemFromFile(fileName: string, size: number, uploadedAt: Date, contentType?: string): MediaFile {
  const name = fileName.includes('__') ? fileName.split('__').slice(1).join('__') : fileName

  return {
    id: fileName,
    name,
    size,
    type: inferMediaType(name, contentType),
    uploadedAt: uploadedAt.toISOString(),
    url: `/media/${encodeURIComponent(fileName)}`,
  }
}

async function listMediaFiles(): Promise<MediaFile[]> {
  await mkdir(uploadDirectory, { recursive: true })
  const fileNames = await readdir(uploadDirectory)
  const mediaFiles = await Promise.all(
    fileNames
      .filter((fileName) => !fileName.startsWith('.'))
      .map(async (fileName) => {
        const stats = await stat(path.join(uploadDirectory, fileName))
        return mediaItemFromFile(fileName, stats.size, stats.birthtimeMs > 0 ? stats.birthtime : stats.mtime)
      }),
  )

  return mediaFiles.sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime())
}

function stationSummary(station: RadioStation) {
  return {
    id: station.id,
    name: station.name,
    slug: station.slug,
    timezone: station.timezone,
    mount: station.mount,
    streamUrl: station.streamUrl,
    fallbackSource: station.fallbackSource,
  }
}

function requireStation(stationId: string) {
  const station = findStation(stations, stationId)

  if (!station) {
    throw Object.assign(new Error(`Station "${stationId}" was not found`), { statusCode: 404 })
  }

  return station
}

function defaultStation() {
  return requireStation(defaultStationId)
}

function scheduleResponse(station: RadioStation) {
  const snapshot = getStationScheduleSnapshot(station, new Date())

  return {
    station: stationSummary(station),
    generatedAt: snapshot.generatedAt,
    programs: station.schedule,
    currentProgram: snapshot.currentProgram,
    upcomingPrograms: snapshot.upcomingPrograms,
    conflicts: snapshot.conflicts,
  }
}

function nowPlayingResponse(station: RadioStation) {
  const snapshot = getStationScheduleSnapshot(station, new Date(), { upcomingLimit: 3 })

  return {
    station: stationSummary(station),
    mount: station.mount,
    streamUrl: station.streamUrl,
    currentProgram: snapshot.currentProgram,
    upcomingPrograms: snapshot.upcomingPrograms,
    source: snapshot.currentProgram?.source ?? station.fallbackSource,
    generatedAt: snapshot.generatedAt,
  }
}

server.get('/health', async () => ({ ok: true, service: 'rdio-api' }))

server.get('/station', async () => ({
  station: stationSummary(defaultStation()),
}))

server.get('/schedule', async () => scheduleResponse(defaultStation()))

server.get('/now-playing', async () => nowPlayingResponse(defaultStation()))

server.get('/media', async () => ({
  media: await listMediaFiles(),
}))

server.post('/media', async (request, reply) => {
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

server.delete('/media/:mediaId', async (request, reply) => {
  const { mediaId } = request.params as { mediaId: string }
  const safeMediaId = path.basename(mediaId)

  await rm(path.join(uploadDirectory, safeMediaId), { force: true })
  return reply.status(204).send()
})

server.get('/media/:mediaId', async (request, reply) => {
  const { mediaId } = request.params as { mediaId: string }
  const safeMediaId = path.basename(mediaId)
  const filePath = path.join(uploadDirectory, safeMediaId)
  const stats = await stat(filePath)
  const media = mediaItemFromFile(safeMediaId, stats.size, stats.birthtimeMs > 0 ? stats.birthtime : stats.mtime)

  return reply.header('Content-Disposition', `inline; filename="${media.name}"`).send(createReadStream(filePath))
})

const port = Number(process.env.API_PORT ?? 3001)
await server.listen({ port, host: '0.0.0.0' })
