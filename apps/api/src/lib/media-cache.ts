import { createWriteStream } from "node:fs";
import { mkdir, rename, rm, stat } from "node:fs/promises";
import path from "node:path";
import type { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import { fileURLToPath } from "node:url";
import { headMediaObject, openMediaObjectBody } from "./r2.js";

const repoRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../../.."
);

/**
 * Cache directory shared with Liquidsoap.
 * Prefer MEDIA_CACHE_DIR=/media/cache in production so the API and Liquidsoap
 * always agree on paths (Fly volume mounts at /media).
 */
const mediaCacheDirectory =
  process.env.MEDIA_CACHE_DIR?.trim() || path.join(repoRoot, "media/cache");

/** Stable filename for a media id inside the cache directory. */
export function cacheFileNameForMediaId(mediaId: string) {
  return mediaId.replaceAll(/[^a-zA-Z0-9._-]+/g, "_");
}

/** Where the API writes the cached file on this machine. */
export function localCachePathForMediaId(mediaId: string) {
  return path.join(mediaCacheDirectory, cacheFileNameForMediaId(mediaId));
}

/** Path Liquidsoap reads from playout-state (always under /media). */
export function playoutCachePathForMediaId(mediaId: string) {
  return `/media/cache/${cacheFileNameForMediaId(mediaId)}`;
}

/** @deprecated Use localCachePathForMediaId or playoutCachePathForMediaId. */
export function cachePathForMediaId(mediaId: string) {
  return localCachePathForMediaId(mediaId);
}

async function downloadMediaObjectToFile(mediaId: string, destPath: string) {
  const response = await openMediaObjectBody(mediaId);

  if (!response.Body) {
    throw new Error(`Missing R2 body for ${mediaId}`);
  }

  // Atomic write: never leave Liquidsoap reading a half-downloaded file.
  const tempPath = `${destPath}.${process.pid}.${Date.now()}.tmp`;
  try {
    await pipeline(response.Body as Readable, createWriteStream(tempPath));
    await rename(tempPath, destPath);
  } catch (error) {
    await rm(tempPath, { force: true }).catch(() => undefined);
    throw error;
  }
}

function cacheLooksFresh(localMtimeMs: number, remoteUploadedAt: Date) {
  return localMtimeMs >= remoteUploadedAt.getTime() - 1000;
}

/** Ensures a media file is cached locally and returns the Liquidsoap playout path. */
export async function ensureMediaCached(mediaId: string) {
  await mkdir(mediaCacheDirectory, { recursive: true });

  const localPath = localCachePathForMediaId(mediaId);
  const playoutPath = playoutCachePathForMediaId(mediaId);

  try {
    const local = await stat(localPath);
    const remote = await headMediaObject(mediaId);

    if (
      local.size > 0 &&
      local.size === remote.size &&
      cacheLooksFresh(local.mtimeMs, remote.uploadedAt)
    ) {
      return playoutPath;
    }
  } catch {
    // Cache miss or stale file — download below.
  }

  await downloadMediaObjectToFile(mediaId, localPath);
  return playoutPath;
}

/** Removes a cached copy after media is deleted from storage. */
export async function invalidateMediaCache(mediaId: string) {
  await rm(localCachePathForMediaId(mediaId), { force: true });
}
