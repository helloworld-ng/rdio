import { createReadStream } from "node:fs";
import { mkdir, rm, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import type { FastifyInstance } from "fastify";
import {
  listMediaFiles,
  mediaItemFromFile,
  readAllScheduleBlocks,
  refreshCurrentPlayout,
  sanitizeFileName,
  scheduleVersion,
  storedFileNameFor,
  uploadDirectory,
  writeAllScheduleBlocks,
} from "../lib/station-store.js";
import {
  validateHeaders,
  validateParams,
  validateValue,
} from "../lib/validation.js";
import {
  firstHeaderValue,
  mediaParamsSchema,
  mediaUploadBodySchema,
  mediaUploadHeadersSchema,
} from "../schemas/api.js";

export function mediaRoutes(server: FastifyInstance) {
  server.get("/", async () => ({
    media: await listMediaFiles(),
  }));

  server.post("/", async (request, reply) => {
    const body = validateValue(
      reply,
      mediaUploadBodySchema,
      request.body,
      "Invalid request body"
    );
    const headers = validateHeaders(
      reply,
      mediaUploadHeadersSchema,
      request.headers
    );
    if (!(body && headers)) {
      return;
    }

    const rawFileName = headers["x-file-name"];
    const originalName = sanitizeFileName(
      firstHeaderValue(rawFileName) ?? "upload"
    );
    const contentType = firstHeaderValue(headers["content-type"]);
    const fileName = storedFileNameFor(originalName);

    await mkdir(uploadDirectory, { recursive: true });
    await writeFile(path.join(uploadDirectory, fileName), body);

    const media = mediaItemFromFile(
      fileName,
      body.length,
      new Date(),
      contentType
    );

    return reply.status(201).send({ media });
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

      await rm(path.join(uploadDirectory, safeMediaId), { force: true });
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
      const filePath = path.join(uploadDirectory, safeMediaId);
      const stats = await stat(filePath);
      const media = mediaItemFromFile(
        safeMediaId,
        stats.size,
        stats.birthtimeMs > 0 ? stats.birthtime : stats.mtime
      );

      return reply
        .header("Content-Disposition", `inline; filename="${media.name}"`)
        .send(createReadStream(filePath));
    }
  );
}
