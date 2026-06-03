export type PlayoutSource =
  | { kind: "playlist"; playlistId: string }
  | { kind: "track"; trackId: string }
  | { kind: "live"; inputId: string };

export type FallbackSource = PlayoutSource | { kind: "fallback" };

export interface ScheduleSlot {
  endsAt: string;
  id: string;
  source: PlayoutSource;
  startsAt: string;
  stationId: string;
  title: string;
}

export interface ScheduleConflict {
  firstSlotId: string;
  reason: "overlap";
  secondSlotId: string;
}

export interface PlayoutPlan {
  currentSlot: ScheduleSlot | null;
  generatedAt: string;
  source: FallbackSource;
}

export interface RadioStation {
  fallbackSource: FallbackSource;
  id: string;
  mount: string;
  name: string;
  schedule: ScheduleSlot[];
  slug: string;
  streamUrl: string;
  timezone: string;
}

export type StationScheduleSlotInput = Omit<ScheduleSlot, "stationId"> & {
  stationId?: string;
};

export interface RadioStationInput {
  fallbackSource?: FallbackSource;
  id: string;
  mount?: string;
  name: string;
  schedule?: StationScheduleSlotInput[];
  slug?: string;
  streamUrl?: string;
  timezone?: string;
}

export interface ScheduleSnapshot {
  conflicts: ScheduleConflict[];
  currentProgram: ScheduleSlot | null;
  generatedAt: string;
  stationId: string;
  upcomingPrograms: ScheduleSlot[];
}
