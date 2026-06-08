import path from "node:path";
import type { FastifyInstance } from "fastify";
import {
  createPresignedMediaUpload,
  deleteMediaObject,
  headMediaObject,
  mediaPublicUrl,
} from "../lib/r2.js";
import {
  buildMediaItem,
  listMediaFiles,
  readAllScheduleBlocks,
  refreshCurrentPlayout,
  sanitizeFileName,
  scheduleVersion,
  storedFileNameFor,
  writeAllScheduleBlocks,
} from "../lib/station-store.js";
import { validateJsonBody, validateParams } from "../lib/validation.js";
import {
  mediaCompleteBodySchema,
  mediaParamsSchema,
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

  server.delete<{ Params: { mediaId: string } }>(
    "/:mediaId",
    async (request, reply) => {
      const params = validateParams(reply, mediaParamsSchema, request.params);
      if (!params) {
        return;
      }

      const safeMediaId = path.basename(params.mediaId);
      const blocks = await readAllScheduleBlocks();
      const updatedBlocks = blocks.map((block) =>
        block.mediaId === safeMediaId
          ? { ...block, mediaId: undefined, file: undefined }
          : block
      );

      await deleteMediaObject(safeMediaId);
      await writeAllScheduleBlocks(updatedBlocks);
      await refreshCurrentPlayout();
      return { blocks: updatedBlocks, version: await scheduleVersion() };
    }
  );

  server.get<{ Params: { mediaId: string } }>(
    "/:mediaId",
    async (request, reply) => {
      const params = validateParams(reply, mediaParamsSchema, request.params);
      if (!params) {
        return;
      }

      const safeMediaId = path.basename(params.mediaId);

      try {
        await headMediaObject(safeMediaId);
      } catch {
        return reply.status(404).send({ error: "Media not found" });
      }

      return reply.redirect(mediaPublicUrl(safeMediaId), 302);
    }
  );
}
