import { auth, authHeaders } from "@rdio/auth/server";
import type { FastifyInstance } from "fastify";
import { requireAdminSession } from "../lib/auth.js";
import { validateJsonBody, validateParams } from "../lib/validation.js";
import {
  createMemberBodySchema,
  idParamsSchema,
  updateMemberRoleBodySchema,
} from "../schemas/api.js";

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

    const body = validateJsonBody(reply, createMemberBodySchema, request.body);
    if (!body) {
      return;
    }

    const member = await auth.api.createUser({
      body: {
        name: body.name,
        email: body.email,
        password: body.password,
        role: "user",
        data: {
          mustChangePassword: true,
        },
      },
    });

    return reply.status(201).send({ member });
  });

  server.delete<{ Params: { id: string } }>("/:id", async (request, reply) => {
    if (!(await requireAdminSession(request, reply))) {
      return;
    }

    const params = validateParams(reply, idParamsSchema, request.params);
    if (!params) {
      return;
    }

    await auth.api.removeUser({
      body: { userId: params.id },
      headers: authHeaders(request.headers),
    });

    return reply.status(204).send();
  });

  server.patch<{ Params: { id: string } }>("/:id", async (request, reply) => {
    if (!(await requireAdminSession(request, reply))) {
      return;
    }

    const params = validateParams(reply, idParamsSchema, request.params);
    const body = validateJsonBody(
      reply,
      updateMemberRoleBodySchema,
      request.body
    );
    if (!(params && body)) {
      return;
    }

    const updated = await auth.api.setRole({
      body: { userId: params.id, role: body.role },
      headers: authHeaders(request.headers),
    });

    return reply.status(200).send(updated);
  });
}
