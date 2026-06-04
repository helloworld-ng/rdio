import {
  auth,
  authHeaders,
  changeTemporaryPassword,
  isSetupComplete,
} from "@rdio/auth/server";
import { env } from "@rdio/env/server";
import type { FastifyInstance } from "fastify";
import { requestSession } from "../lib/auth.js";
import { validateJsonBody } from "../lib/validation.js";
import { changePasswordBodySchema } from "../schemas/api.js";

/** Serializes Fastify bodies for the Better Auth handler (global parser uses buffers). */
function serializeAuthBody(body: unknown) {
  if (body === undefined) {
    return undefined;
  }

  if (Buffer.isBuffer(body)) {
    return body.toString("utf8");
  }

  if (typeof body === "string") {
    return body;
  }

  return JSON.stringify(body);
}

export function authRoutes(server: FastifyInstance) {
  server.route({
    method: ["GET", "POST"],
    url: "/api/auth/*",
    async handler(request, reply) {
      try {
        const url = new URL(request.url, env.BETTER_AUTH_URL);
        const body = serializeAuthBody(request.body);
        const authRequest = new Request(url.toString(), {
          method: request.method,
          headers: authHeaders(request.headers),
          ...(body ? { body } : {}),
        });
        const response = await auth.handler(authRequest);

        reply.status(response.status);
        response.headers.forEach((value, key) => {
          reply.header(key, value);
        });
        return reply.send(response.body ? await response.text() : null);
      } catch (error) {
        server.log.error(error);
        return reply.status(500).send({
          error: "Internal authentication error",
          code: "AUTH_FAILURE",
        });
      }
    },
  });

  server.get("/auth/setup-status", async () => ({
    setupRequired: !(await isSetupComplete()),
  }));

  server.get("/auth/me", async (request, reply) => {
    const session = await requestSession(request);
    if (!session) {
      return reply.status(401).send({ error: "Unauthorized" });
    }

    return session;
  });

  server.post("/auth/change-password", async (request, reply) => {
    const session = await requestSession(request);
    if (!session) {
      return reply.status(401).send({ error: "Unauthorized" });
    }

    const body = validateJsonBody(
      reply,
      changePasswordBodySchema,
      request.body
    );
    if (!body) {
      return;
    }

    await changeTemporaryPassword(
      request.headers,
      session.user.id,
      body.currentPassword,
      body.newPassword
    );

    return reply.status(204).send();
  });
}
