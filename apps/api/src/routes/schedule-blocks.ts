import type { FastifyInstance } from "fastify";
import {
  detectBlockConflicts,
  isRecord,
  normalizeScheduleBlocks,
  parseJsonBody,
  readAllScheduleBlocks,
  readScheduleBlocksForDay,
  refreshCurrentPlayout,
  scheduleVersion,
  writeAllScheduleBlocks,
} from "../lib/station-store.js";

const dayParamPattern = /^\d{4}-\d{2}-\d{2}$/;

export function scheduleBlockRoutes(server: FastifyInstance) {
  server.get("/", async () => ({
    blocks: await readAllScheduleBlocks(),
    version: await scheduleVersion(),
  }));

  server.get<{ Params: { day: string } }>("/:day", async (request, reply) => {
    const { day } = request.params;
    if (!dayParamPattern.test(day)) {
      return reply
        .status(400)
        .send({ error: "day must be in YYYY-MM-DD format" });
    }
    return {
      day,
      blocks: await readScheduleBlocksForDay(day),
      version: await scheduleVersion(),
    };
  });

  server.put("/", async (request, reply) => {
    const body = parseJsonBody(request.body);
    const blocks = normalizeScheduleBlocks(body);
    const expectedVersion =
      isRecord(body) && typeof body.version === "string"
        ? body.version
        : undefined;
    const currentVersion = await scheduleVersion();
    const conflicts = detectBlockConflicts(blocks);

    if (expectedVersion && expectedVersion !== currentVersion) {
      return reply.status(409).send({
        error: "Schedule changed on the server. Reload before saving.",
        blocks: await readAllScheduleBlocks(),
        version: currentVersion,
      });
    }

    if (conflicts.length > 0) {
      return reply.status(409).send({
        error: "Schedule blocks cannot overlap.",
        conflicts,
        version: currentVersion,
      });
    }

    await writeAllScheduleBlocks(blocks);
    await refreshCurrentPlayout();
    return reply.send({ blocks, version: await scheduleVersion() });
  });
}
