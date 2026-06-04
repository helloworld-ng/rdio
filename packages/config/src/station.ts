import type { RadioStationInput } from "@rdio/rdio-core";

export const stationConfig: RadioStationInput = {
  id: "16rdio",
  name: "16 Radio",
  timezone: "Africa/Lagos",
  mount: "/live.mp3",
  fallbackSource: { kind: "playlist", playlistId: "fallback" },
  schedule: [
    {
      id: "morning-signal",
      title: "Morning Signal",
      startsAt: "2026-05-03T13:00:00.000Z",
      endsAt: "2026-05-03T15:00:00.000Z",
      source: { kind: "playlist", playlistId: "fallback" },
    },
  ],
};

export const defaultStationId = stationConfig.id;
