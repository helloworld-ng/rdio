import type { FastifyInstance } from "fastify";
import {
  type HostRecord,
  isRecord,
  parseJsonBody,
  readAllScheduleBlocks,
  readHosts,
  readPrograms,
  scheduleVersion,
  writeAllScheduleBlocks,
  writeHosts,
  writePrograms,
} from "../lib/station-store.js";

export function hostRoutes(server: FastifyInstance) {
  server.get("/", async () => ({ hosts: await readHosts() }));

  server.post("/", async (request, reply) => {
    const body = parseJsonBody(request.body);
    if (
      !isRecord(body) ||
      typeof body.name !== "string" ||
      typeof body.colorId !== "string"
    ) {
      return reply.status(400).send({ error: "name and colorId are required" });
    }
    const host: HostRecord = { name: body.name.trim(), colorId: body.colorId };
    const hosts = await readHosts();
    if (hosts.some((entry) => entry.name === host.name)) {
      return reply.status(409).send({ error: "Host already exists" });
    }
    await writeHosts([...hosts, host]);
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
    const newHost: HostRecord = {
      name: body.name.trim(),
      colorId: body.colorId,
    };
    const hosts = await readHosts();
    const index = hosts.findIndex((host) => host.name === oldName);
    if (index === -1) {
      return reply.status(404).send({ error: "Host not found" });
    }
    hosts[index] = newHost;
    await writeHosts(hosts);

    if (oldName !== newHost.name) {
      const programs = await readPrograms();
      await writePrograms(
        programs.map((program) =>
          program.host === oldName
            ? { ...program, host: newHost.name }
            : program
        )
      );

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
      const hosts = await readHosts();
      await writeHosts(hosts.filter((host) => host.name !== name));
      return reply.status(204).send();
    }
  );
}
