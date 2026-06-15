import { getSession } from "@rdio/auth/server";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";

const apiPrefixPattern = /^\/api(?=\/|$)/;
const scheduleDayPathPattern = /^\/schedule-blocks\/\d{4}-\d{2}-\d{2}$/;
const mediaItemPathPattern = /^\/media\/.+/;

function stripApiPrefix(pathname: string) {
  return pathname.replace(apiPrefixPattern, "") || "/";
}

function isPublicRequest(method: string, url: string) {
  if (method === "OPTIONS" || method === "HEAD") {
    return true;
  }

  if (method !== "GET") {
    return false;
  }

  const pathname = stripApiPrefix(url.split("?")[0]);

  return (
    pathname === "/health" ||
    pathname === "/station" ||
    pathname === "/schedule" ||
    pathname === "/now-playing" ||
    pathname.startsWith("/playout/track/") ||
    pathname === "/live.mp3" ||
    pathname === "/broadcast/status" ||
    scheduleDayPathPattern.test(pathname) ||
    mediaItemPathPattern.test(pathname)
  );
}

/** Resolves the authenticated session associated with a Fastify request. */
export function requestSession(request: FastifyRequest) {
  return getSession(request.headers);
}

/** Requires an authenticated administrator before an admin-only route continues. */
export async function requireAdminSession(
  request: FastifyRequest,
  reply: FastifyReply
) {
  const session = await requestSession(request);
  if (!session) {
    reply.status(401).send({ error: "Unauthorized" });
    return false;
  }

  if (
    !(
      typeof session.user.role === "string" &&
      session.user.role.split(",").includes("admin")
    )
  ) {
    reply.status(403).send({ error: "Administrator access is required." });
    return false;
  }

  return true;
}

/** Protects private API routes while preserving the listener and Better Auth endpoints. */
export function addAuthGuard(server: FastifyInstance) {
  server.addHook("preHandler", async (request, reply) => {
    const pathname = request.url.split("?")[0];
    const unprefixedPathname = stripApiPrefix(pathname);

    if (
      isPublicRequest(request.method, request.url) ||
      pathname === "/api/setup-status" ||
      pathname.startsWith("/api/auth/")
    ) {
      return;
    }

    const session = await requestSession(request);
    if (!session) {
      return reply.status(401).send({ error: "Unauthorized" });
    }

    if (
      session.user.mustChangePassword &&
      unprefixedPathname !== "/session/change-password" &&
      unprefixedPathname !== "/session"
    ) {
      return reply.status(403).send({
        error: "Change your temporary password before continuing.",
        code: "PASSWORD_CHANGE_REQUIRED",
      });
    }
  });
}
