import Fastify from 'fastify'
import { findStation, getStationScheduleSnapshot, listStations, type RadioStation } from '@rdio/rdio-core'
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

server.get('/health', async () => ({ ok: true, service: 'rdio-api' }))

server.get('/stations', async () => ({
  stations: listStations(stations).map(stationSummary),
}))

server.get<{ Params: { stationId: string } }>('/stations/:stationId', async (request) => ({
  station: stationSummary(requireStation(request.params.stationId)),
}))

server.get<{ Params: { stationId: string } }>('/stations/:stationId/schedule', async (request) => {
  const station = requireStation(request.params.stationId)
  const snapshot = getStationScheduleSnapshot(station, new Date())

  return {
    station: stationSummary(station),
    schedule: station.schedule,
    ...snapshot,
  }
})

server.get<{ Params: { stationId: string } }>('/stations/:stationId/now-playing', async (request) => {
  const station = requireStation(request.params.stationId)
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
})

server.get('/now-playing', async () => {
  const station = requireStation(defaultStationId)
  const snapshot = getStationScheduleSnapshot(station, new Date(), { upcomingLimit: 3 })

  return {
    station: stationSummary(station),
    stationId: station.id,
    mount: station.mount,
    streamUrl: station.streamUrl,
    currentProgram: snapshot.currentProgram,
    upcomingPrograms: snapshot.upcomingPrograms,
    source: snapshot.currentProgram?.source ?? station.fallbackSource,
    generatedAt: snapshot.generatedAt,
  }
})

const port = Number(process.env.API_PORT ?? 3001)
await server.listen({ port, host: '0.0.0.0' })
