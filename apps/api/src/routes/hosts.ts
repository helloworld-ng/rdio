import { db, hosts, programs } from "@rdio/db";
import { eq } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import {
  readAllScheduleBlocks,
  scheduleVersion,
  writeAllScheduleBlocks,
} from "../lib/station-store.js";
import { validateJsonBody, validateParams } from "../lib/validation.js";
import { hostBodySchema, hostNameParamsSchema } from "../schemas/api.js";

export function hostRoutes(server: FastifyInstance) {
  server.get("/", async () => ({ hosts: await db.select().from(hosts) }));

  server.post("/", async (request, reply) => {
    const body = validateJsonBody(reply, hostBodySchema, request.body);
    if (!body) {
      return;
    }

    const host = { name: body.name, colorId: body.colorId };
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
    const params = validateParams(reply, hostNameParamsSchema, request.params);
    const body = validateJsonBody(reply, hostBodySchema, request.body);
    if (!(params && body)) {
      return;
    }

    const oldName = params.name;
    const newHost = { name: body.name, colorId: body.colorId };

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
      const params = validateParams(
        reply,
        hostNameParamsSchema,
        request.params
      );
      if (!params) {
        return;
      }

      const { name } = params;
      await db.delete(hosts).where(eq(hosts.name, name));
      return reply.status(204).send();
    }
  );
}
