import {
  auth,
  authHeaders,
  changeTemporaryPassword,
  isSetupComplete,
} from "@rdio/auth/server";
import type { FastifyInstance } from "fastify";
import { requestSession } from "../lib/auth.js";
import { validateJsonBody } from "../lib/validation.js";
import { changePasswordBodySchema } from "../schemas/api.js";
import {
  resolveAuthBaseUrl,
  serializeAuthBody,
} from "../utils/auth-request.js";

export function authRoutes(server: FastifyInstance) {
  server.get("/api/setup-status", async () => ({
    setupRequired: !(await isSetupComplete()),
  }));

  server.get("/api/session", async (request, reply) => {
    const session = await requestSession(request);
    if (!session) {
      return reply.status(401).send({ error: "Unauthorized" });
    }

    return session;
  });

  server.post("/api/session/change-password", async (request, reply) => {
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

  // Better Auth owns the /api/auth/* namespace for its internal session endpoints.
  server.route({
    method: ["GET", "POST"],
    url: "/api/auth/*",
    async handler(request, reply) {
      try {
        const url = new URL(request.url, resolveAuthBaseUrl(request));
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
}
