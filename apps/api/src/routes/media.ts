import path from "node:path";
import type { FastifyInstance } from "fastify";
import { invalidateMediaCache } from "../lib/media-cache.js";
import {
  createPresignedMediaUpload,
  deleteMediaObject,
  headMediaObject,
  mediaPublicUrl,
} from "../lib/r2.js";
import {
  buildMediaItem,
  commitScheduleBlocks,
  listMediaFiles,
  readAllScheduleBlocks,
  sanitizeFileName,
  scheduleVersion,
  storedFileNameFor,
} from "../lib/station-store.js";
import { validateJsonBody } from "../lib/validation.js";
import {
  mediaCompleteBodySchema,
  mediaUploadUrlBodySchema,
} from "../schemas/api.js";

export function mediaRoutes(server: FastifyInstance) {
  server.get("/", async () => ({
    media: await listMediaFiles(),
  }));

  server.post("/upload-url", async (request, reply) => {
    const body = validateJsonBody(
      reply,
      mediaUploadUrlBodySchema,
      request.body
    );
    if (!body) {
      return;
    }

    const originalName = sanitizeFileName(body.fileName);
    const mediaId = storedFileNameFor(originalName);
    const upload = await createPresignedMediaUpload(mediaId, body.contentType);

    return reply.status(201).send(upload);
  });

  server.post("/complete", async (request, reply) => {
    const body = validateJsonBody(reply, mediaCompleteBodySchema, request.body);
    if (!body) {
      return;
    }

    const mediaId = path.basename(body.mediaId);

    try {
      const object = await headMediaObject(mediaId);
      const media = buildMediaItem({
        mediaId,
        size: object.size,
        uploadedAt: object.uploadedAt,
        contentType: object.contentType,
      });

      return reply.status(201).send({ media });
    } catch {
      return reply.status(404).send({
        error: "Upload not found. Finish the R2 upload before completing.",
      });
    }
  });

  server.delete<{ Params: { "*": string } }>("/*", async (request, reply) => {
    const safeMediaId = path.basename(
      decodeURIComponent(request.params["*"] ?? "")
    );

    if (!safeMediaId) {
      return reply.status(404).send({ error: "Media not found" });
    }

    const blocks = await readAllScheduleBlocks();
    const updatedBlocks = blocks.map((block) =>
      block.mediaId === safeMediaId
        ? { ...block, mediaId: undefined, file: undefined }
        : block
    );

    await deleteMediaObject(safeMediaId);
    await invalidateMediaCache(safeMediaId);
    await commitScheduleBlocks(updatedBlocks, "media-delete");
    return { blocks: updatedBlocks, version: await scheduleVersion() };
  });

  server.get<{ Params: { "*": string } }>("/*", async (request, reply) => {
    const safeMediaId = path.basename(
      decodeURIComponent(request.params["*"] ?? "")
    );

    if (!safeMediaId) {
      return reply.status(404).send({ error: "Media not found" });
    }

    try {
      await headMediaObject(safeMediaId);
    } catch {
      return reply.status(404).send({ error: "Media not found" });
    }

    return reply.redirect(mediaPublicUrl(safeMediaId), 302);
  });
}
