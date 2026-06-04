import { readFile } from "node:fs/promises";
import type { FastifyInstance } from "fastify";
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

  server.get("/schedule", async (request) =>
    scheduleResponse(defaultStation(), requestBaseUrl(request))
  );

  server.get("/playout/current", async () => {
    await refreshCurrentPlayout();

    return {
      path: (await readFile(currentPlayoutFile, "utf8")).trim(),
    };
  });

  server.get("/now-playing", async (request) =>
    nowPlayingResponse(defaultStation(), requestBaseUrl(request))
  );
}
