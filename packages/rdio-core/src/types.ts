export type PlayoutSource =
  | { kind: 'playlist'; playlistId: string }
  | { kind: 'track'; trackId: string }
  | { kind: 'live'; inputId: string }

export type FallbackSource = PlayoutSource | { kind: 'fallback' }

export interface ScheduleSlot {
  id: string
  stationId: string
  title: string
  startsAt: string
  endsAt: string
  source: PlayoutSource
}

export interface ScheduleConflict {
  firstSlotId: string
  secondSlotId: string
  reason: 'overlap'
}

export interface PlayoutPlan {
  generatedAt: string
  currentSlot: ScheduleSlot | null
  source: FallbackSource
}

export interface RadioStation {
  id: string
  name: string
  slug: string
  timezone: string
  mount: string
  streamUrl: string
  fallbackSource: FallbackSource
  schedule: ScheduleSlot[]
}

export type StationScheduleSlotInput = Omit<ScheduleSlot, 'stationId'> & {
  stationId?: string
}

export interface RadioStationInput {
  id: string
  name: string
  slug?: string
  timezone?: string
  mount?: string
  streamUrl?: string
  fallbackSource?: FallbackSource
  schedule?: StationScheduleSlotInput[]
}

export interface ScheduleSnapshot {
  stationId: string
  generatedAt: string
  currentProgram: ScheduleSlot | null
  upcomingPrograms: ScheduleSlot[]
  conflicts: ScheduleConflict[]
}
