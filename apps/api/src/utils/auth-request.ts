import { env } from "@rdio/env/server";
import type { FastifyRequest } from "fastify";

/** Resolves the browser-facing origin used by Better Auth when requests pass through a proxy. */
export function resolveAuthBaseUrl(request: FastifyRequest) {
  const forwardedHost = request.headers["x-forwarded-host"];
  const forwardedProto = request.headers["x-forwarded-proto"] ?? "https";

  if (typeof forwardedHost === "string" && forwardedHost.length > 0) {
    return `${forwardedProto}://${forwardedHost}`;
  }

  return env.BETTER_AUTH_URL;
}

/** Converts Fastify request bodies into the Web Request body shape Better Auth expects. */
export function serializeAuthBody(body: unknown) {
  if (body === undefined) {
    return;
  }

  if (Buffer.isBuffer(body)) {
    return body.toString("utf8");
  }

  if (typeof body === "string") {
    return body;
  }

  return JSON.stringify(body);
}
