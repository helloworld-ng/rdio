import { readFile } from "node:fs/promises";
import type { FastifyInstance } from "fastify";
import { isListenerRequest, listenerScheduleBlocks } from "../lib/listener.js";
import {
  currentPlayoutFile,
  defaultStation,
  nowPlayingResponse,
  refreshCurrentPlayout,
  requestBaseUrl,
  scheduleResponse,
  stationSummary,
} from "../lib/station-store.js";

export function stationRoutes(server: FastifyInstance) {
  server.get("/health", async () => ({ ok: true, service: "rdio-api" }));

  server.get("/station", async (request) => ({
    station: stationSummary(defaultStation(), requestBaseUrl(request)),
  }));

  server.get("/schedule", async (request) => {
    const response = await scheduleResponse(
      defaultStation(),
      requestBaseUrl(request)
    );

    if (!isListenerRequest(request)) {
      return response;
    }

    return {
      ...response,
      blocks: listenerScheduleBlocks(response.blocks),
      currentProgram:
        response.currentProgram?.kind === "broadcast"
          ? { ...response.currentProgram, kind: "live" as const }
          : null,
      upcomingPrograms: listenerScheduleBlocks(response.upcomingPrograms),
    };
  });

  server.get("/playout/current", async () => {
    await refreshCurrentPlayout();

    return {
      path: (await readFile(currentPlayoutFile, "utf8")).trim(),
    };
  });

  server.get("/now-playing", async (request) => {
    const response = await nowPlayingResponse(
      defaultStation(),
      requestBaseUrl(request)
    );

    if (!isListenerRequest(request)) {
      return response;
    }

    const currentProgram =
      response.currentProgram?.kind === "broadcast"
        ? { ...response.currentProgram, kind: "live" as const }
        : null;

    return {
      ...response,
      currentProgram,
      upcomingPrograms: listenerScheduleBlocks(response.upcomingPrograms),
      source:
        currentProgram == null
          ? response.station.fallbackSource
          : { kind: "live" as const, inputId: "broadcast" },
    };
  });
}
