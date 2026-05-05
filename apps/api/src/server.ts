import Fastify from 'fastify'
import { findStation, getStationScheduleSnapshot, type RadioStation } from '@rdio/rdio-core'
import { defaultStationId, stations } from './stations'

const server = Fastify({ logger: true })

server.addHook('onRequest', async (_request, reply) => {
  reply.header('Access-Control-Allow-Origin', '*')
})

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

const port = Number(process.env.API_PORT ?? 3001)
await server.listen({ port, host: '0.0.0.0' })
