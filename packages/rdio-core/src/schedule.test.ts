import { describe, expect, it } from "vitest";
import { detectScheduleConflicts, getCurrentProgram } from "./schedule";
import {
  defineStation,
  findStation,
  getStationScheduleSnapshot,
} from "./station";
import type { ScheduleSlot } from "./types";

const slots: ScheduleSlot[] = [
  {
    id: "slot-1",
    stationId: "station-1",
    title: "Breakfast",
    startsAt: "2026-05-03T08:00:00.000Z",
    endsAt: "2026-05-03T10:00:00.000Z",
    source: { kind: "playlist", playlistId: "morning" },
  },
];

describe("schedule", () => {
  it("finds the current program", () => {
    expect(
      getCurrentProgram(slots, new Date("2026-05-03T09:00:00.000Z"))?.id
    ).toBe("slot-1");
  });

  it("returns conflicts for overlapping slots", () => {
    const conflicts = detectScheduleConflicts([
      ...slots,
      {
        ...slots[0],
        id: "slot-2",
        startsAt: "2026-05-03T09:30:00.000Z",
        endsAt: "2026-05-03T11:00:00.000Z",
      },
    ]);

    expect(conflicts).toHaveLength(1);
  });

  it("defines stations with useful defaults for agents", () => {
    const station = defineStation({
      id: "station-1",
      name: "Station One",
      schedule: [
        {
          id: "slot-1",
          title: "Breakfast",
          startsAt: "2026-05-03T08:00:00.000Z",
          endsAt: "2026-05-03T10:00:00.000Z",
          source: { kind: "playlist", playlistId: "morning" },
        },
      ],
    });

    expect(station.mount).toBe("/station-1.mp3");
    expect(station.streamUrl).toBe("/station-1.mp3");
    expect(station.timezone).toBe("UTC");
    expect(station.schedule[0].stationId).toBe("station-1");
  });

  it("allows stations to expose a public stream URL", () => {
    const station = defineStation({
      id: "station-1",
      name: "Station One",
      mount: "/rdio.mp3",
      streamUrl: "https://stream.example.com/rdio.mp3",
    });

    expect(station.streamUrl).toBe("https://stream.example.com/rdio.mp3");
  });

  it("builds a schedule API snapshot for a station", () => {
    const station = defineStation({
      id: "station-1",
      name: "Station One",
      schedule: slots.map(({ stationId: _stationId, ...slot }) => slot),
    });

    const snapshot = getStationScheduleSnapshot(
      station,
      new Date("2026-05-03T09:00:00.000Z")
    );

    expect(snapshot.stationId).toBe("station-1");
    expect(snapshot.currentProgram?.id).toBe("slot-1");
    expect(snapshot.conflicts).toHaveLength(0);
  });

  it("finds stations by id or slug", () => {
    const station = defineStation({
      id: "station-1",
      name: "Station One",
      slug: "one",
    });

    expect(findStation([station], "station-1")?.id).toBe("station-1");
    expect(findStation([station], "one")?.id).toBe("station-1");
  });
});
