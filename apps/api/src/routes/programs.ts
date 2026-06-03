import { randomUUID } from "node:crypto";
import { db, programs } from "@rdio/db";
import { eq } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import {
  isRecord,
  parseJsonBody,
  readAllScheduleBlocks,
  scheduleVersion,
  writeAllScheduleBlocks,
} from "../lib/station-store.js";

export function programRoutes(server: FastifyInstance) {
  server.get("/", async () => ({ programs: await db.select().from(programs) }));

  server.post("/", async (request, reply) => {
    const body = parseJsonBody(request.body);
    if (
      !isRecord(body) ||
      typeof body.title !== "string" ||
      typeof body.description !== "string" ||
      typeof body.host !== "string"
    ) {
      return reply
        .status(400)
        .send({ error: "title, description, and host are required" });
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
    const { id } = request.params;
    const body = parseJsonBody(request.body);
    if (
      !isRecord(body) ||
      typeof body.title !== "string" ||
      typeof body.description !== "string" ||
      typeof body.host !== "string"
    ) {
      return reply
        .status(400)
        .send({ error: "title, description, and host are required" });
    }
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

  server.delete<{ Params: { id: string } }>("/:id", async (request) => {
    const { id } = request.params;
    await db.delete(programs).where(eq(programs.id, id));
    const blocks = await readAllScheduleBlocks();
    const updatedBlocks = blocks.map((block) =>
      block.programId === id ? { ...block, programId: undefined } : block
    );
    await writeAllScheduleBlocks(updatedBlocks);
    return { blocks: updatedBlocks, version: await scheduleVersion() };
  });
}
