import Fastify from 'fastify'
import { createReadStream } from 'node:fs'
import { mkdir, readFile, readdir, rm, stat, writeFile } from 'node:fs/promises'
import { request as httpRequest } from 'node:http'
import path from 'node:path'
import { randomUUID } from 'node:crypto'
import { fileURLToPath } from 'node:url'
import { findStation, getStationScheduleSnapshot, type RadioStation } from '@rdio/rdio-core'
import { defaultStationId, stations } from './stations.js'

const server = Fastify({ bodyLimit: 100 * 1024 * 1024, logger: true })
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..')
const uploadDirectory = path.join(repoRoot, 'media/uploads')
const scheduleDirectory = path.join(repoRoot, 'media/schedule')
const currentPlayoutFile = path.join(scheduleDirectory, 'current.txt')
const liquidsoapMediaRoot = '/media/uploads'
const fallbackPlayoutPath = '/media/fallback/v1-tone.mp3'
const programsFile = path.join(repoRoot, 'media/programs.json')
const hostsFile = path.join(repoRoot, 'media/hosts.json')

const allowedOrigins = (process.env.WEB_ORIGIN ?? 'http://localhost:5173')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean)
const apiKey = process.env.API_KEY

server.addHook('onRequest', async (request, reply) => {
  const origin = request.headers.origin ?? ''
  const isLocalhost = /^https?:\/\/localhost(:\d+)?$/.test(origin)
  const allowed = isLocalhost || allowedOrigins.includes(origin) ? origin : allowedOrigins[0]
  reply.header('Access-Control-Allow-Origin', allowed)
  reply.header('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS')
  reply.header('Access-Control-Allow-Headers', 'Content-Type,X-File-Name,Authorization')
})

server.addHook('preHandler', async (request, reply) => {
  if (!apiKey || request.method === 'GET' || request.method === 'OPTIONS' || request.method === 'HEAD') {
    return
  }

  const auth = request.headers.authorization
  if (auth !== `Bearer ${apiKey}`) {
    return reply.status(401).send({ error: 'Unauthorized' })
  }
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

interface UploadedFileSummary {
  name: string
  size: number
  duration?: number
}

interface ScheduleBlock {
  id: string
  kind: 'recording' | 'broadcast'
  title: string
  description: string
  dateKey: string
  startMinutes: number
  endMinutes: number
  hosts: string[]
  programId?: string
  file?: UploadedFileSummary
  mediaId?: string
}

interface Program {
  id: string
  title: string
  description: string
  host: string
}

interface HostRecord {
  name: string
  colorId: string
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

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function parseJsonBody(body: unknown) {
  if (Buffer.isBuffer(body)) {
    return JSON.parse(body.toString('utf8')) as unknown
  }

  return body
}

function normalizeUploadedFile(input: unknown): UploadedFileSummary | undefined {
  if (!isRecord(input) || typeof input.name !== 'string' || typeof input.size !== 'number') {
    return undefined
  }

  return {
    name: input.name,
    size: input.size,
    duration: typeof input.duration === 'number' ? input.duration : undefined,
  }
}

function normalizeScheduleBlock(input: unknown): ScheduleBlock | null {
  if (!isRecord(input)) {
    return null
  }

  if (
    typeof input.id !== 'string' ||
    (input.kind !== 'recording' && input.kind !== 'broadcast') ||
    typeof input.title !== 'string' ||
    typeof input.dateKey !== 'string' ||
    typeof input.startMinutes !== 'number' ||
    typeof input.endMinutes !== 'number' ||
    !Array.isArray(input.hosts)
  ) {
    return null
  }

  const startMinutes = Math.max(0, Math.min(1439, Math.round(input.startMinutes)))
  const endMinutes = Math.max(startMinutes + 1, Math.min(1440, Math.round(input.endMinutes)))

  return {
    id: input.id,
    kind: input.kind,
    title: input.title,
    description: typeof input.description === 'string' ? input.description : '',
    dateKey: input.dateKey,
    startMinutes,
    endMinutes,
    hosts: input.hosts.filter((host): host is string => typeof host === 'string'),
    programId: typeof input.programId === 'string' ? input.programId : undefined,
    file: normalizeUploadedFile(input.file),
    mediaId: typeof input.mediaId === 'string' ? input.mediaId : undefined,
  }
}

function normalizeScheduleBlocks(input: unknown): ScheduleBlock[] {
  const rawBlocks = isRecord(input) && Array.isArray(input.blocks) ? input.blocks : Array.isArray(input) ? input : []

  return rawBlocks
    .map(normalizeScheduleBlock)
    .filter((block): block is ScheduleBlock => block !== null)
}

async function readScheduleBlocksForDay(day: string): Promise<ScheduleBlock[]> {
  try {
    const raw = await readFile(path.join(scheduleDirectory, `${day}.json`), 'utf8')
    return normalizeScheduleBlocks(JSON.parse(raw))
  } catch (error) {
    if (isRecord(error) && error.code === 'ENOENT') return []
    throw error
  }
}

async function readAllScheduleBlocks(): Promise<ScheduleBlock[]> {
  await mkdir(scheduleDirectory, { recursive: true })
  const files = await readdir(scheduleDirectory)
  const days = files.filter((f) => /^\d{4}-\d{2}-\d{2}\.json$/.test(f)).map((f) => f.slice(0, 10))
  const perDay = await Promise.all(days.map(readScheduleBlocksForDay))
  return perDay.flat()
}

async function writeAllScheduleBlocks(blocks: ScheduleBlock[]) {
  await mkdir(scheduleDirectory, { recursive: true })

  const byDay = new Map<string, ScheduleBlock[]>()
  for (const block of blocks) {
    const list = byDay.get(block.dateKey) ?? []
    list.push(block)
    byDay.set(block.dateKey, list)
  }

  const existing = new Set(
    (await readdir(scheduleDirectory))
      .filter((f) => /^\d{4}-\d{2}-\d{2}\.json$/.test(f))
      .map((f) => f.slice(0, 10)),
  )

  for (const [day, dayBlocks] of byDay) {
    await writeFile(path.join(scheduleDirectory, `${day}.json`), `${JSON.stringify({ blocks: dayBlocks }, null, 2)}\n`)
    existing.delete(day)
  }

  // Remove day files that are now empty
  for (const day of existing) {
    await rm(path.join(scheduleDirectory, `${day}.json`), { force: true })
  }
}

async function readPrograms(): Promise<Program[]> {
  try {
    const raw = await readFile(programsFile, 'utf8')
    const parsed = JSON.parse(raw) as unknown
    return Array.isArray(parsed) ? (parsed as Program[]) : []
  } catch (error) {
    if (isRecord(error) && error.code === 'ENOENT') return []
    throw error
  }
}

async function writePrograms(programs: Program[]) {
  await writeFile(programsFile, `${JSON.stringify(programs, null, 2)}\n`)
}

async function readHosts(): Promise<HostRecord[]> {
  try {
    const raw = await readFile(hostsFile, 'utf8')
    const parsed = JSON.parse(raw) as unknown
    return Array.isArray(parsed) ? (parsed as HostRecord[]) : []
  } catch (error) {
    if (isRecord(error) && error.code === 'ENOENT') return []
    throw error
  }
}

async function writeHosts(hosts: HostRecord[]) {
  await writeFile(hostsFile, `${JSON.stringify(hosts, null, 2)}\n`)
}

function stationClock(station: RadioStation, at = new Date()) {
  const parts = new Intl.DateTimeFormat('en-US', {
    day: '2-digit',
    hour: '2-digit',
    hour12: false,
    minute: '2-digit',
    month: '2-digit',
    timeZone: station.timezone,
    year: 'numeric',
  }).formatToParts(at)
  const value = (type: string) => parts.find((part) => part.type === type)?.value ?? '00'

  return {
    dateKey: `${value('year')}-${value('month')}-${value('day')}`,
    minutes: Number(value('hour')) * 60 + Number(value('minute')),
  }
}

function currentMediaBlock(blocks: ScheduleBlock[], station: RadioStation) {
  const { dateKey, minutes } = stationClock(station)

  return blocks
    .filter(
      (block) =>
        block.kind === 'recording' &&
        block.mediaId &&
        block.dateKey === dateKey &&
        block.startMinutes <= minutes &&
        block.endMinutes > minutes,
    )
    .sort((a, b) => a.startMinutes - b.startMinutes)[0]
}

async function refreshCurrentPlayout() {
  const station = defaultStation()
  const { dateKey } = stationClock(station)
  const block = currentMediaBlock(await readScheduleBlocksForDay(dateKey), station)
  const mediaId = block?.mediaId ? path.basename(block.mediaId) : ''
  const hostPath = mediaId ? path.join(uploadDirectory, mediaId) : ''
  const liquidsoapPath = mediaId ? path.posix.join(liquidsoapMediaRoot, mediaId) : ''

  await mkdir(scheduleDirectory, { recursive: true })

  try {
    if (hostPath) {
      await stat(hostPath)
      await writeFile(currentPlayoutFile, `${liquidsoapPath}\n`)
      return
    }
  } catch {
    // Fall through to silence the scheduled source and let Liquidsoap use fallback.
  }

  await writeFile(currentPlayoutFile, `${fallbackPlayoutPath}\n`)
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

function icecastSettings(mount: string) {
  const streamBaseUrl = process.env.PUBLIC_STREAM_BASE_URL ?? 'http://localhost:8000'
  let host = 'localhost'
  let port = 8000

  try {
    const url = new URL(streamBaseUrl)
    host = url.hostname
    port = Number(url.port) || (url.protocol === 'https:' ? 443 : 80)
  } catch {
    // keep defaults
  }

  return {
    host,
    port,
    mount,
    sourcePassword: process.env.ICECAST_SOURCE_PASSWORD ?? 'sourcepass',
  }
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
    icecast: icecastSettings(station.mount),
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

server.get('/rdio.mp3', (request, reply) => {
  reply.hijack()
  const proxyReq = httpRequest({ hostname: 'localhost', port: 8001, path: '/rdio.mp3' }, (proxyRes) => {
    const headers: Record<string, string> = {
      'Content-Type': proxyRes.headers['content-type'] ?? 'audio/mpeg',
      'Cache-Control': 'no-cache',
      'Access-Control-Allow-Origin': '*',
    }
    for (const [k, v] of Object.entries(proxyRes.headers)) {
      if (k.startsWith('icy-') && typeof v === 'string') headers[k] = v
    }
    reply.raw.writeHead(proxyRes.statusCode ?? 503, headers)
    proxyRes.pipe(reply.raw)
  })
  proxyReq.on('error', () => { if (!reply.raw.headersSent) reply.raw.writeHead(503); reply.raw.end() })
  proxyReq.end()
})

server.get('/station', async () => ({
  station: stationSummary(defaultStation()),
}))

server.get('/schedule', async () => scheduleResponse(defaultStation()))

server.get('/schedule-blocks', async () => ({
  blocks: await readAllScheduleBlocks(),
}))

server.get<{ Params: { day: string } }>('/schedule-blocks/:day', async (request, reply) => {
  const { day } = request.params
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) {
    return reply.status(400).send({ error: 'day must be in YYYY-MM-DD format' })
  }
  return { day, blocks: await readScheduleBlocksForDay(day) }
})

server.put('/schedule-blocks', async (request, reply) => {
  const blocks = normalizeScheduleBlocks(parseJsonBody(request.body))
  await writeAllScheduleBlocks(blocks)
  await refreshCurrentPlayout()
  return reply.send({ blocks })
})

// ── Programs ──────────────────────────────────────────────────────────────────

server.get('/programs', async () => ({ programs: await readPrograms() }))

server.post('/programs', async (request, reply) => {
  const body = parseJsonBody(request.body)
  if (!isRecord(body) || typeof body.title !== 'string' || typeof body.description !== 'string' || typeof body.host !== 'string') {
    return reply.status(400).send({ error: 'title, description, and host are required' })
  }
  const program: Program = { id: randomUUID(), title: body.title, description: body.description, host: body.host }
  const programs = await readPrograms()
  await writePrograms([...programs, program])
  return reply.status(201).send({ program })
})

server.put<{ Params: { id: string } }>('/programs/:id', async (request, reply) => {
  const { id } = request.params
  const body = parseJsonBody(request.body)
  if (!isRecord(body) || typeof body.title !== 'string' || typeof body.description !== 'string' || typeof body.host !== 'string') {
    return reply.status(400).send({ error: 'title, description, and host are required' })
  }
  const programs = await readPrograms()
  const index = programs.findIndex((p) => p.id === id)
  if (index === -1) return reply.status(404).send({ error: 'Program not found' })
  const program: Program = { id, title: body.title, description: body.description, host: body.host }
  programs[index] = program
  await writePrograms(programs)
  return { program }
})

server.delete<{ Params: { id: string } }>('/programs/:id', async (request, reply) => {
  const { id } = request.params
  const programs = await readPrograms()
  await writePrograms(programs.filter((p) => p.id !== id))
  return reply.status(204).send()
})

// ── Hosts ─────────────────────────────────────────────────────────────────────

server.get('/hosts', async () => ({ hosts: await readHosts() }))

server.post('/hosts', async (request, reply) => {
  const body = parseJsonBody(request.body)
  if (!isRecord(body) || typeof body.name !== 'string' || typeof body.colorId !== 'string') {
    return reply.status(400).send({ error: 'name and colorId are required' })
  }
  const host: HostRecord = { name: body.name.trim(), colorId: body.colorId }
  const hosts = await readHosts()
  if (hosts.some((h) => h.name === host.name)) return reply.status(409).send({ error: 'Host already exists' })
  await writeHosts([...hosts, host])
  return reply.status(201).send({ host })
})

server.put<{ Params: { name: string } }>('/hosts/:name', async (request, reply) => {
  const oldName = decodeURIComponent(request.params.name)
  const body = parseJsonBody(request.body)
  if (!isRecord(body) || typeof body.name !== 'string' || typeof body.colorId !== 'string') {
    return reply.status(400).send({ error: 'name and colorId are required' })
  }
  const newHost: HostRecord = { name: body.name.trim(), colorId: body.colorId }
  const hosts = await readHosts()
  const index = hosts.findIndex((h) => h.name === oldName)
  if (index === -1) return reply.status(404).send({ error: 'Host not found' })
  hosts[index] = newHost
  await writeHosts(hosts)

  // Cascade rename to programs and schedule blocks
  if (oldName !== newHost.name) {
    const programs = await readPrograms()
    await writePrograms(programs.map((p) => (p.host === oldName ? { ...p, host: newHost.name } : p)))

    const allBlocks = await readAllScheduleBlocks()
    const renamed = allBlocks.map((b) => ({
      ...b,
      hosts: b.hosts.map((h) => (h === oldName ? newHost.name : h)),
    }))
    await writeAllScheduleBlocks(renamed)
  }

  return { host: newHost }
})

server.delete<{ Params: { name: string } }>('/hosts/:name', async (request, reply) => {
  const name = decodeURIComponent(request.params.name)
  const hosts = await readHosts()
  await writeHosts(hosts.filter((h) => h.name !== name))
  return reply.status(204).send()
})

server.get('/playout/current', async () => {
  await refreshCurrentPlayout()

  return {
    path: (await readFile(currentPlayoutFile, 'utf8')).trim(),
  }
})

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
  await refreshCurrentPlayout()
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

// Migrate legacy blocks.json → daily files
const legacyBlocksFile = path.join(scheduleDirectory, 'blocks.json')
try {
  const raw = await readFile(legacyBlocksFile, 'utf8')
  const legacy = normalizeScheduleBlocks(JSON.parse(raw))
  if (legacy.length > 0) {
    await writeAllScheduleBlocks(legacy)
    server.log.info(`Migrated ${legacy.length} blocks from blocks.json to daily files`)
  }
  await rm(legacyBlocksFile, { force: true })
} catch { /* no legacy file, skip */ }

await refreshCurrentPlayout()
setInterval(() => {
  refreshCurrentPlayout().catch((error: unknown) => {
    server.log.error(error)
  })
}, 15_000)
