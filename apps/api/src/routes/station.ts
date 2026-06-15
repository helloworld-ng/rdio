import path from "node:path";
import type { FastifyInstance } from "fastify";
import { isListenerRequest, listenerScheduleBlocks } from "../lib/listener.js";
import { readRecentPlayoutLog } from "../lib/playout-log.js";
import { readPlayoutState } from "../lib/playout-state.js";
import { openMediaObjectBody } from "../lib/r2.js";
import {
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
          : response.currentProgram?.kind === "recording"
            ? { ...response.currentProgram, kind: "recording" as const }
            : null,
      upcomingPrograms: listenerScheduleBlocks(response.upcomingPrograms),
    };
  });

  server.get("/playout/current", async () => {
    await refreshCurrentPlayout("manual");

    const state = await readPlayoutState();

    return {
      path: state?.target ?? "",
      revision: state?.revision ?? 0,
      mode: state?.mode ?? "fallback",
    };
  });

  server.get("/playout/log", async (_request, reply) => {
    const entries = await readRecentPlayoutLog(200);
    return reply.send({ entries });
  });

  server.get<{ Params: { "*": string } }>(
    "/playout/track/*",
    async (request, reply) => {
      const mediaId = path.basename(
        decodeURIComponent(request.params["*"] ?? "")
      );

      if (!mediaId) {
        return reply.status(404).send({ error: "Media not found" });
      }

      try {
        const object = await openMediaObjectBody(mediaId);

        if (!object.Body) {
          return reply.status(404).send({ error: "Media not found" });
        }

        reply.header(
          "Content-Type",
          object.ContentType ?? "application/octet-stream"
        );

        if (object.ContentLength !== undefined) {
          reply.header("Content-Length", object.ContentLength);
        }

        return reply.send(object.Body);
      } catch {
        return reply.status(404).send({ error: "Media not found" });
      }
    }
  );

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
        : response.currentProgram?.kind === "recording"
          ? { ...response.currentProgram, kind: "recording" as const }
          : null;

    return {
      ...response,
      currentProgram,
      upcomingPrograms: listenerScheduleBlocks(response.upcomingPrograms),
      source:
        currentProgram?.kind === "live"
          ? { kind: "live" as const, inputId: "broadcast" }
          : response.source,
    };
  });
}
