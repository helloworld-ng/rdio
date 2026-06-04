import { randomUUID } from "node:crypto";
import { db, programs } from "@rdio/db";
import { eq } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import {
  readAllScheduleBlocks,
  scheduleVersion,
  writeAllScheduleBlocks,
} from "../lib/station-store.js";
import { validateJsonBody, validateParams } from "../lib/validation.js";
import { idParamsSchema, programBodySchema } from "../schemas/api.js";

export function programRoutes(server: FastifyInstance) {
  server.get("/", async () => ({ programs: await db.select().from(programs) }));

  server.post("/", async (request, reply) => {
    const body = validateJsonBody(reply, programBodySchema, request.body);
    if (!body) {
      return;
    }

    const program = {
      id: randomUUID(),
      title: body.title,
      description: body.description,
      host: body.host,
    };
    await db.insert(programs).values(program);
    return reply.status(201).send({ program });
  });

  server.put<{ Params: { id: string } }>("/:id", async (request, reply) => {
    const params = validateParams(reply, idParamsSchema, request.params);
    const body = validateJsonBody(reply, programBodySchema, request.body);
    if (!(params && body)) {
      return;
    }

    const { id } = params;
    const existing = await db
      .select()
      .from(programs)
      .where(eq(programs.id, id));
    if (existing.length === 0) {
      return reply.status(404).send({ error: "Program not found" });
    }
    const program = {
      id,
      title: body.title,
      description: body.description,
      host: body.host,
    };
    await db.update(programs).set(program).where(eq(programs.id, id));
    const blocks = await readAllScheduleBlocks();
    const updatedBlocks = blocks.map((block) =>
      block.programId === id
        ? {
            ...block,
            title: program.title,
            description: program.description,
            hosts: [program.host],
          }
        : block
    );
    await writeAllScheduleBlocks(updatedBlocks);
    return { program, blocks: updatedBlocks, version: await scheduleVersion() };
  });

  server.delete<{ Params: { id: string } }>("/:id", async (request, reply) => {
    const params = validateParams(reply, idParamsSchema, request.params);
    if (!params) {
      return;
    }

    const { id } = params;
    await db.delete(programs).where(eq(programs.id, id));
    const blocks = await readAllScheduleBlocks();
    const updatedBlocks = blocks.map((block) =>
      block.programId === id ? { ...block, programId: undefined } : block
    );
    await writeAllScheduleBlocks(updatedBlocks);
    return { blocks: updatedBlocks, version: await scheduleVersion() };
  });
}
