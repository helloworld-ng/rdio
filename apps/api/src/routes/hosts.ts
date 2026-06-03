import { db, hosts, programs } from "@rdio/db";
import { eq } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import {
  isRecord,
  parseJsonBody,
  readAllScheduleBlocks,
  scheduleVersion,
  writeAllScheduleBlocks,
} from "../lib/station-store.js";

export function hostRoutes(server: FastifyInstance) {
  server.get("/", async () => ({ hosts: await db.select().from(hosts) }));

  server.post("/", async (request, reply) => {
    const body = parseJsonBody(request.body);
    if (
      !isRecord(body) ||
      typeof body.name !== "string" ||
      typeof body.colorId !== "string"
    ) {
      return reply.status(400).send({ error: "name and colorId are required" });
    }
    const host = { name: body.name.trim(), colorId: body.colorId };
    const existing = await db
      .select()
      .from(hosts)
      .where(eq(hosts.name, host.name));
    if (existing.length > 0) {
      return reply.status(409).send({ error: "Host already exists" });
    }
    await db.insert(hosts).values(host);
    return reply.status(201).send({ host });
  });

  server.put<{ Params: { name: string } }>("/:name", async (request, reply) => {
    const oldName = decodeURIComponent(request.params.name);
    const body = parseJsonBody(request.body);
    if (
      !isRecord(body) ||
      typeof body.name !== "string" ||
      typeof body.colorId !== "string"
    ) {
      return reply.status(400).send({ error: "name and colorId are required" });
    }
    const newHost = { name: body.name.trim(), colorId: body.colorId };
    const existing = await db
      .select()
      .from(hosts)
      .where(eq(hosts.name, oldName));
    if (existing.length === 0) {
      return reply.status(404).send({ error: "Host not found" });
    }
    await db.update(hosts).set(newHost).where(eq(hosts.name, oldName));

    if (oldName !== newHost.name) {
      await db
        .update(programs)
        .set({ host: newHost.name })
        .where(eq(programs.host, oldName));

      const allBlocks = await readAllScheduleBlocks();
      const renamed = allBlocks.map((block) => ({
        ...block,
        hosts: block.hosts.map((host) =>
          host === oldName ? newHost.name : host
        ),
      }));
      await writeAllScheduleBlocks(renamed);
      return {
        host: newHost,
        blocks: renamed,
        version: await scheduleVersion(),
      };
    }

    return { host: newHost };
  });

  server.delete<{ Params: { name: string } }>(
    "/:name",
    async (request, reply) => {
      const name = decodeURIComponent(request.params.name);
      await db.delete(hosts).where(eq(hosts.name, name));
      return reply.status(204).send();
    }
  );
}
