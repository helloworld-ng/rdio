import type { FastifyInstance } from "fastify";
import {
  detectBlockConflicts,
  readAllScheduleBlocks,
  readScheduleBlocksForDay,
  refreshCurrentPlayout,
  scheduleVersion,
  writeAllScheduleBlocks,
} from "../lib/station-store.js";
import { validateJsonBody, validateParams } from "../lib/validation.js";
import { dayParamsSchema, scheduleBlocksBodySchema } from "../schemas/api.js";

export function scheduleBlockRoutes(server: FastifyInstance) {
  server.get("/", async () => ({
    blocks: await readAllScheduleBlocks(),
    version: await scheduleVersion(),
  }));

  server.get<{ Params: { day: string } }>("/:day", async (request, reply) => {
    const params = validateParams(reply, dayParamsSchema, request.params);
    if (!params) {
      return;
    }

    const { day } = params;
    return {
      day,
      blocks: await readScheduleBlocksForDay(day),
      version: await scheduleVersion(),
    };
  });

  server.put("/", async (request, reply) => {
    const body = validateJsonBody(
      reply,
      scheduleBlocksBodySchema,
      request.body
    );
    if (!body) {
      return;
    }

    const { blocks, version: expectedVersion } = body;
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
