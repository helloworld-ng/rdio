import { createWriteStream } from "node:fs";
import { mkdir, stat } from "node:fs/promises";
import path from "node:path";
import type { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import { fileURLToPath } from "node:url";
import { headMediaObject, openMediaObjectBody } from "./r2.js";

const repoRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../../.."
);
const mediaCacheDirectory = path.join(repoRoot, "media/cache");

/** Local filesystem path for a cached copy of a media object. */
export function cachePathForMediaId(mediaId: string) {
  const safeName = mediaId.replaceAll(/[^a-zA-Z0-9._-]+/g, "_");
  return path.join(mediaCacheDirectory, safeName);
}

async function downloadMediaObjectToFile(mediaId: string, destPath: string) {
  const response = await openMediaObjectBody(mediaId);

  if (!response.Body) {
    throw new Error(`Missing R2 body for ${mediaId}`);
  }

  await pipeline(response.Body as Readable, createWriteStream(destPath));
}

/** Ensures a media file is available on disk for Liquidsoap and returns its path. */
export async function ensureMediaCached(mediaId: string) {
  await mkdir(mediaCacheDirectory, { recursive: true });

  const cachePath = cachePathForMediaId(mediaId);

  try {
    const local = await stat(cachePath);
    const remote = await headMediaObject(mediaId);

    if (local.size > 0 && local.size === remote.size) {
      return cachePath;
    }
  } catch {
    // Cache miss or stale file — download below.
  }

  await downloadMediaObjectToFile(mediaId, cachePath);
  return cachePath;
}
