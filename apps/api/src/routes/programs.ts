import { randomUUID } from "node:crypto";
import type { FastifyInstance } from "fastify";
import {
  isRecord,
  type Program,
  parseJsonBody,
  readAllScheduleBlocks,
  readPrograms,
  scheduleVersion,
  writeAllScheduleBlocks,
  writePrograms,
} from "../lib/station-store.js";

export function programRoutes(server: FastifyInstance) {
  server.get("/", async () => ({ programs: await readPrograms() }));

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
    const program: Program = {
      id: randomUUID(),
      title: body.title,
      description: body.description,
      host: body.host,
    };
    const programs = await readPrograms();
    await writePrograms([...programs, program]);
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
    const programs = await readPrograms();
    const index = programs.findIndex((program) => program.id === id);
    if (index === -1) {
      return reply.status(404).send({ error: "Program not found" });
    }
    const program: Program = {
      id,
      title: body.title,
      description: body.description,
      host: body.host,
    };
    programs[index] = program;
    await writePrograms(programs);
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
    const programs = await readPrograms();
    await writePrograms(programs.filter((program) => program.id !== id));
    const blocks = await readAllScheduleBlocks();
    const updatedBlocks = blocks.map((block) =>
      block.programId === id ? { ...block, programId: undefined } : block
    );
    await writeAllScheduleBlocks(updatedBlocks);
    return { blocks: updatedBlocks, version: await scheduleVersion() };
  });
}
