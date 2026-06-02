import { auth, authHeaders } from "@rdio/auth/server";
import type { FastifyInstance } from "fastify";
import { requireAdminSession } from "../lib/auth.js";
import { isRecord, parseJsonBody } from "../lib/station-store.js";

export function memberRoutes(server: FastifyInstance) {
  server.get("/", async (request, reply) => {
    if (!(await requireAdminSession(request, reply))) {
      return;
    }

    return auth.api.listUsers({
      query: {
        limit: 100,
        sortBy: "createdAt",
        sortDirection: "asc",
      },
      headers: authHeaders(request.headers),
    });
  });

  server.post("/", async (request, reply) => {
    if (!(await requireAdminSession(request, reply))) {
      return;
    }

    const body = parseJsonBody(request.body);
    if (
      !isRecord(body) ||
      typeof body.name !== "string" ||
      typeof body.email !== "string" ||
      typeof body.password !== "string"
    ) {
      return reply
        .status(400)
        .send({ error: "name, email, and password are required" });
    }

    const member = await auth.api.createUser({
      body: {
        name: body.name.trim(),
        email: body.email.trim(),
        password: body.password,
        role: "user",
        data: {
          mustChangePassword: true,
        },
      },
    });

    return reply.status(201).send({ member });
  });
}
