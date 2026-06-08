import { randomUUID } from "node:crypto";
import {
  mkdir,
  readdir,
  readFile,
  rm,
  stat,
  writeFile,
} from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { env } from "@rdio/env/server";
import { findStation, type RadioStation } from "@rdio/rdio-core";
import type { FastifyRequest } from "fastify";
import { defaultStationId, stations } from "../stations.js";
import { headMediaObject, listMediaObjects, mediaPublicUrl } from "./r2.js";

const imageFileNamePattern = /\.(apng|avif|gif|jpe?g|png|svg|webp)$/i;
const scheduleFileNamePattern = /^\d{4}-\d{2}-\d{2}\.json$/;
const absoluteHttpUrlPattern = /^https?:\/\//i;

const repoRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../../.."
);
export const scheduleDirectory = path.join(repoRoot, "media/schedule");
export const currentPlayoutFile = path.join(scheduleDirectory, "current.txt");
const broadcastActiveFile = path.join(scheduleDirectory, "broadcast-active");
export const broadcastStatusFile = path.join(
  scheduleDirectory,
  "broadcast-status.txt"
);
const fallbackPlayoutPath = "/media/fallback/v1-tone.mp3";

export type MediaType = "audio" | "image";

export interface MediaFile {
  id: string;
  name: string;
  size: number;
  type: MediaType;
  uploadedAt: string;
  url: string;
}

export interface UploadedFileSummary {
  duration?: number;
  name: string;
  size: number;
}

export interface ScheduleBlock {
  dateKey: string;
  description: string;
  endMinutes: number;
  file?: UploadedFileSummary;
  hosts: string[];
  id: string;
  kind: "recording" | "broadcast";
  mediaId?: string;
  programId?: string;
  startMinutes: number;
  title: string;
}

export interface ScheduleBlockConflict {
  dateKey: string;
  firstBlockId: string;
  reason: "overlap";
  secondBlockId: string;
}

/** Converts a client-provided upload name into a safe basename for local storage. */
export function sanitizeFileName(fileName: string) {
  return (
    path
      .basename(fileName)
      .replaceAll(/[^a-zA-Z0-9._ -]/g, "_")
      .trim() || "upload"
  );
}

function inferMediaType(fileName: string, contentType?: string): MediaType {
  if (contentType?.startsWith("image/")) {
    return "image";
  }

  if (contentType?.startsWith("audio/")) {
    return "audio";
  }

  return imageFileNamePattern.test(fileName) ? "image" : "audio";
}

/** Prefixes a safe upload name with enough entropy to avoid local filename collisions. */
export function storedFileNameFor(originalName: string) {
  return `${Date.now()}-${randomUUID()}__${sanitizeFileName(originalName)}`;
}

function displayNameForMediaId(mediaId: string) {
  return mediaId.includes("__")
    ? mediaId.split("__").slice(1).join("__")
    : mediaId;
}

/** Builds the public media metadata returned by the API for an R2 object. */
export function buildMediaItem(input: {
  contentType?: string;
  mediaId: string;
  size: number;
  uploadedAt: Date;
}): MediaFile {
  const name = displayNameForMediaId(input.mediaId);

  return {
    id: input.mediaId,
    name,
    size: input.size,
    type: inferMediaType(name, input.contentType),
    uploadedAt: input.uploadedAt.toISOString(),
    url: mediaPublicUrl(input.mediaId),
  };
}

/** Narrows an unknown value to a plain record suitable for defensive parsing. */
export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** Parses JSON request buffers while leaving already parsed Fastify bodies untouched. */
export function parseJsonBody(body: unknown) {
  if (Buffer.isBuffer(body)) {
    return JSON.parse(body.toString("utf8")) as unknown;
  }

  return body;
}

function normalizeUploadedFile(
  input: unknown
): UploadedFileSummary | undefined {
  if (
    !isRecord(input) ||
    typeof input.name !== "string" ||
    typeof input.size !== "number"
  ) {
    return;
  }

  return {
    name: input.name,
    size: input.size,
    duration: typeof input.duration === "number" ? input.duration : undefined,
  };
}

function normalizeScheduleBlock(input: unknown): ScheduleBlock | null {
  if (!isRecord(input)) {
    return null;
  }

  if (
    typeof input.id !== "string" ||
    (input.kind !== "recording" && input.kind !== "broadcast") ||
    typeof input.title !== "string" ||
    typeof input.dateKey !== "string" ||
    typeof input.startMinutes !== "number" ||
    typeof input.endMinutes !== "number" ||
    !Array.isArray(input.hosts)
  ) {
    return null;
  }

  const startMinutes = Math.max(
    0,
    Math.min(1439, Math.round(input.startMinutes))
  );
  const endMinutes = Math.max(
    startMinutes + 1,
    Math.min(1440, Math.round(input.endMinutes))
  );

  return {
    id: input.id,
    kind: input.kind,
    title: input.title,
    description: typeof input.description === "string" ? input.description : "",
    dateKey: input.dateKey,
    startMinutes,
    endMinutes,
    hosts: input.hosts.filter(
      (host): host is string => typeof host === "string"
    ),
    programId:
      typeof input.programId === "string" ? input.programId : undefined,
    file: normalizeUploadedFile(input.file),
    mediaId: typeof input.mediaId === "string" ? input.mediaId : undefined,
  };
}

/** Normalizes persisted schedule data and drops malformed blocks. */
export function normalizeScheduleBlocks(input: unknown): ScheduleBlock[] {
  let rawBlocks: unknown[] = [];

  if (isRecord(input) && Array.isArray(input.blocks)) {
    rawBlocks = input.blocks;
  } else if (Array.isArray(input)) {
    rawBlocks = input;
  }

  return rawBlocks
    .map(normalizeScheduleBlock)
    .filter((block): block is ScheduleBlock => block !== null);
}

/** Reads a station day's schedule blocks, returning an empty list when none exist. */
export async function readScheduleBlocksForDay(
  day: string
): Promise<ScheduleBlock[]> {
  try {
    const raw = await readFile(
      path.join(scheduleDirectory, `${day}.json`),
      "utf8"
    );
    return normalizeScheduleBlocks(JSON.parse(raw));
  } catch (error) {
    if (isRecord(error) && error.code === "ENOENT") {
      return [];
    }
    throw error;
  }
}

/** Reads and flattens every day-scoped schedule file. */
export async function readAllScheduleBlocks(): Promise<ScheduleBlock[]> {
  await mkdir(scheduleDirectory, { recursive: true });
  const files = await readdir(scheduleDirectory);
  const days = files
    .filter((file) => scheduleFileNamePattern.test(file))
    .map((f) => f.slice(0, 10));
  const perDay = await Promise.all(days.map(readScheduleBlocksForDay));
  return perDay.flat();
}

/** Returns a lightweight version token derived from the latest schedule file modification. */
export async function scheduleVersion() {
  await mkdir(scheduleDirectory, { recursive: true });
  const files = (await readdir(scheduleDirectory)).filter((f) =>
    scheduleFileNamePattern.test(f)
  );

  if (files.length === 0) {
    return "0";
  }

  const stats = await Promise.all(
    files.map((file) => stat(path.join(scheduleDirectory, file)))
  );
  return String(Math.max(...stats.map((entry) => entry.mtimeMs)));
}

/** Reports overlapping blocks within each station day. */
export function detectBlockConflicts(
  blocks: ScheduleBlock[]
): ScheduleBlockConflict[] {
  const conflicts: ScheduleBlockConflict[] = [];
  const byDay = new Map<string, ScheduleBlock[]>();

  for (const block of blocks) {
    const dayBlocks = byDay.get(block.dateKey) ?? [];
    dayBlocks.push(block);
    byDay.set(block.dateKey, dayBlocks);
  }

  for (const [dateKey, dayBlocks] of byDay) {
    const sorted = [...dayBlocks].sort(
      (a, b) => a.startMinutes - b.startMinutes
    );

    for (let index = 1; index < sorted.length; index += 1) {
      const previous = sorted[index - 1];
      const current = sorted[index];

      if (previous.endMinutes > current.startMinutes) {
        conflicts.push({
          firstBlockId: previous.id,
          secondBlockId: current.id,
          dateKey,
          reason: "overlap",
        });
      }
    }
  }

  return conflicts;
}

/** Persists blocks into day-scoped files and removes days that became empty. */
export async function writeAllScheduleBlocks(blocks: ScheduleBlock[]) {
  await mkdir(scheduleDirectory, { recursive: true });

  const byDay = new Map<string, ScheduleBlock[]>();
  for (const block of blocks) {
    const list = byDay.get(block.dateKey) ?? [];
    list.push(block);
    byDay.set(block.dateKey, list);
  }

  const existing = new Set(
    (await readdir(scheduleDirectory))
      .filter((file) => scheduleFileNamePattern.test(file))
      .map((f) => f.slice(0, 10))
  );

  for (const [day, dayBlocks] of byDay) {
    await writeFile(
      path.join(scheduleDirectory, `${day}.json`),
      `${JSON.stringify({ blocks: dayBlocks }, null, 2)}\n`
    );
    existing.delete(day);
  }

  // Remove day files that are now empty
  for (const day of existing) {
    await rm(path.join(scheduleDirectory, `${day}.json`), { force: true });
  }
}

function stationClock(station: RadioStation, at = new Date()) {
  const parts = new Intl.DateTimeFormat("en-US", {
    day: "2-digit",
    hour: "2-digit",
    hour12: false,
    hourCycle: "h23",
    minute: "2-digit",
    month: "2-digit",
    timeZone: station.timezone,
    year: "numeric",
  }).formatToParts(at);
  const value = (type: string) =>
    parts.find((part) => part.type === type)?.value ?? "00";

  return {
    dateKey: `${value("year")}-${value("month")}-${value("day")}`,
    minutes: Number(value("hour")) * 60 + Number(value("minute")),
  };
}

function currentMediaBlock(blocks: ScheduleBlock[], station: RadioStation) {
  const { dateKey, minutes } = stationClock(station);

  return blocks
    .filter(
      (block) =>
        block.kind === "recording" &&
        block.mediaId &&
        block.dateKey === dateKey &&
        block.startMinutes <= minutes &&
        block.endMinutes > minutes
    )
    .sort((a, b) => a.startMinutes - b.startMinutes)[0];
}

function currentBroadcastBlock(blocks: ScheduleBlock[], station: RadioStation) {
  const { dateKey, minutes } = stationClock(station);

  return blocks
    .filter(
      (block) =>
        block.kind === "broadcast" &&
        block.dateKey === dateKey &&
        block.startMinutes <= minutes &&
        block.endMinutes > minutes
    )
    .sort((a, b) => a.startMinutes - b.startMinutes)[0];
}

function currentScheduleBlock(
  blocks: ScheduleBlock[],
  station: RadioStation,
  at = new Date()
) {
  const { dateKey, minutes } = stationClock(station, at);

  return (
    blocks
      .filter(
        (block) =>
          block.dateKey === dateKey &&
          block.startMinutes <= minutes &&
          block.endMinutes > minutes
      )
      .sort((a, b) => a.startMinutes - b.startMinutes)[0] ?? null
  );
}

function upcomingScheduleBlocks(
  blocks: ScheduleBlock[],
  station: RadioStation,
  at = new Date(),
  limit = 10
) {
  const { dateKey, minutes } = stationClock(station, at);

  return [...blocks]
    .filter(
      (block) =>
        block.dateKey > dateKey ||
        (block.dateKey === dateKey && block.startMinutes > minutes)
    )
    .sort(
      (a, b) =>
        a.dateKey.localeCompare(b.dateKey) || a.startMinutes - b.startMinutes
    )
    .slice(0, limit);
}

/** Updates Liquidsoap's playout pointer for the currently active schedule block. */
export async function refreshCurrentPlayout() {
  const station = defaultStation();
  const { dateKey } = stationClock(station);
  const todayBlocks = await readScheduleBlocksForDay(dateKey);

  await mkdir(scheduleDirectory, { recursive: true });

  // Broadcast block takes priority — write sentinel so Liquidsoap switches to live source
  if (currentBroadcastBlock(todayBlocks, station)) {
    await writeFile(broadcastActiveFile, "1\n");
    await writeFile(currentPlayoutFile, "broadcast\n");
    return;
  }

  await rm(broadcastActiveFile, { force: true });

  // Otherwise play the scheduled recording from its public R2 URL.
  const block = currentMediaBlock(todayBlocks, station);
  const mediaId = block?.mediaId ? path.basename(block.mediaId) : "";

  try {
    if (mediaId) {
      await headMediaObject(mediaId);
      await writeFile(currentPlayoutFile, `${mediaPublicUrl(mediaId)}\n`);
      return;
    }
  } catch {
    // Fall through to silence the scheduled source and let Liquidsoap use fallback.
  }

  await writeFile(currentPlayoutFile, `${fallbackPlayoutPath}\n`);
}

/** Lists uploaded media objects from R2 in newest-first order. */
export async function listMediaFiles(): Promise<MediaFile[]> {
  const objects = await listMediaObjects();

  return objects
    .map((object) =>
      buildMediaItem({
        mediaId: object.mediaId,
        size: object.size,
        uploadedAt: object.uploadedAt,
        contentType: object.contentType,
      })
    )
    .sort(
      (a, b) =>
        new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime()
    );
}

function icecastSettings(mount: string) {
  const streamBaseUrl = env.PUBLIC_STREAM_BASE_URL;
  let host = "localhost";
  let port = 8000;

  try {
    const url = new URL(streamBaseUrl);
    host = url.hostname;
    port = Number(url.port) || (url.protocol === "https:" ? 443 : 80);
  } catch {
    // keep defaults
  }

  return {
    host,
    port,
    mount,
  };
}

function broadcastIcecastSettings() {
  const mount = "/broadcast.mp3";

  if (env.BROADCAST_HOST) {
    return {
      host: env.BROADCAST_HOST,
      port: env.HARBOR_PORT,
      tlsPort: env.HARBOR_TLS_PORT,
      mount,
    };
  }

  const streamBaseUrl = env.PUBLIC_STREAM_BASE_URL;
  let host = "localhost";

  try {
    host = new URL(streamBaseUrl).hostname;
  } catch {
    // keep default
  }

  return {
    host,
    port: env.HARBOR_PORT,
    tlsPort: env.HARBOR_TLS_PORT,
    mount,
  };
}

/** Returns the Icecast credentials a broadcaster enters into a live source client. */
export function broadcastIcecastCredentials() {
  return {
    ...broadcastIcecastSettings(),
    sourcePassword: env.ICECAST_SOURCE_PASSWORD,
  };
}

function firstHeaderValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

/** Reconstructs the public request origin, respecting common reverse-proxy headers. */
export function requestBaseUrl(request: FastifyRequest) {
  const forwardedProto = firstHeaderValue(request.headers["x-forwarded-proto"])
    ?.split(",")[0]
    ?.trim();
  const forwardedHost = firstHeaderValue(request.headers["x-forwarded-host"])
    ?.split(",")[0]
    ?.trim();
  const host = forwardedHost || request.headers.host;

  if (!host) {
    return;
  }

  return `${forwardedProto || request.protocol}://${host}`;
}

function publicUrl(url: string, baseUrl?: string) {
  if (absoluteHttpUrlPattern.test(url) || !baseUrl) {
    return url;
  }

  return new URL(url, baseUrl).toString();
}

/** Builds the public station payload shared by listener-facing API responses. */
export function stationSummary(station: RadioStation, baseUrl?: string) {
  return {
    id: station.id,
    name: station.name,
    slug: station.slug,
    timezone: station.timezone,
    mount: station.mount,
    streamUrl: publicUrl(station.streamUrl, baseUrl),
    fallbackSource: station.fallbackSource,
    icecast: icecastSettings(station.mount),
    broadcastIcecast: broadcastIcecastSettings(),
  };
}

function requireStation(stationId: string) {
  const station = findStation(stations, stationId);

  if (!station) {
    throw Object.assign(new Error(`Station "${stationId}" was not found`), {
      statusCode: 404,
    });
  }

  return station;
}

/** Returns the configured single station or throws when its configuration is invalid. */
export function defaultStation() {
  return requireStation(defaultStationId);
}

/** Builds the listener-facing schedule response for a station. */
export async function scheduleResponse(
  station: RadioStation,
  baseUrl?: string
) {
  const blocks = await readAllScheduleBlocks();
  const at = new Date();

  return {
    station: stationSummary(station, baseUrl),
    generatedAt: at.toISOString(),
    blocks,
    currentProgram: currentScheduleBlock(blocks, station, at),
    upcomingPrograms: upcomingScheduleBlocks(blocks, station, at),
    conflicts: detectBlockConflicts(blocks),
  };
}

/** Builds the listener-facing now-playing response for a station. */
export async function nowPlayingResponse(
  station: RadioStation,
  baseUrl?: string
) {
  const blocks = await readAllScheduleBlocks();
  const at = new Date();
  const currentProgram = currentScheduleBlock(blocks, station, at);
  const source = sourceForCurrentProgram(currentProgram, station);
  const streamUrl = publicUrl(station.streamUrl, baseUrl);

  return {
    station: stationSummary(station, baseUrl),
    mount: station.mount,
    streamUrl,
    currentProgram,
    upcomingPrograms: upcomingScheduleBlocks(blocks, station, at, 3),
    source,
    generatedAt: at.toISOString(),
  };
}

function sourceForCurrentProgram(
  currentProgram: ScheduleBlock | undefined,
  station: RadioStation
) {
  if (!currentProgram) {
    return station.fallbackSource;
  }

  if (currentProgram.kind === "broadcast") {
    return { kind: "live", inputId: "broadcast" };
  }

  if (currentProgram.mediaId) {
    return { kind: "track", trackId: currentProgram.mediaId };
  }

  return station.fallbackSource;
}

/** Migrates legacy schedule storage when needed and primes Liquidsoap playout state. */
export async function initializePlayout(log: {
  info: (message: string) => void;
}) {
  const legacyBlocksFile = path.join(scheduleDirectory, "blocks.json");

  try {
    const raw = await readFile(legacyBlocksFile, "utf8");
    const legacy = normalizeScheduleBlocks(JSON.parse(raw));
    if (legacy.length > 0) {
      await writeAllScheduleBlocks(legacy);
      log.info(
        `Migrated ${legacy.length} blocks from blocks.json to daily files`
      );
    }
    await rm(legacyBlocksFile, { force: true });
  } catch {
    // No legacy file to migrate.
  }

  await refreshCurrentPlayout();
}
