import { detectScheduleConflicts, getCurrentProgram, getUpcomingPrograms } from './schedule'
import type { RadioStation, RadioStationInput, ScheduleSnapshot } from './types'

export function defineStation(input: RadioStationInput): RadioStation {
  const slug = input.slug ?? input.id
  const stationId = input.id
  const mount = input.mount ?? `/${slug}.mp3`

  return {
    id: stationId,
    name: input.name,
    slug,
    timezone: input.timezone ?? 'UTC',
    mount,
    streamUrl: input.streamUrl ?? mount,
    fallbackSource: input.fallbackSource ?? { kind: 'fallback' },
    schedule: (input.schedule ?? []).map((slot) => ({
      ...slot,
      stationId: slot.stationId ?? stationId,
    })),
  }
}

export function listStations(stations: RadioStation[]): RadioStation[] {
  return [...stations].sort((a, b) => a.name.localeCompare(b.name))
}

export function findStation(stations: RadioStation[], stationId: string): RadioStation | null {
  return stations.find((station) => station.id === stationId || station.slug === stationId) ?? null
}

export function getStationScheduleSnapshot(
  station: RadioStation,
  at: Date,
  options: { upcomingLimit?: number } = {},
): ScheduleSnapshot {
  const upcomingLimit = options.upcomingLimit ?? 10

  return {
    stationId: station.id,
    generatedAt: at.toISOString(),
    currentProgram: getCurrentProgram(station.schedule, at),
    upcomingPrograms: getUpcomingPrograms(station.schedule, at, upcomingLimit),
    conflicts: detectScheduleConflicts(station.schedule),
  }
}
