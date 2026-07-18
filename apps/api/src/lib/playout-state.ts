import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { logPlayoutEvent, summarizePlayoutTarget } from "./playout-log.js";

const repoRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../../.."
);
const scheduleDirectory = path.join(repoRoot, "media/schedule");

export const playoutStateFile = path.join(
  scheduleDirectory,
  "playout-state.tsv"
);
export const currentPlayoutFile = path.join(scheduleDirectory, "current.txt");

export type PlayoutMode = "broadcast" | "recording" | "fallback";

export interface PlayoutState {
  blockId?: string;
  mediaId?: string;
  mode: PlayoutMode;
  revision: number;
  target: string;
}

function encodePlayoutState(state: PlayoutState) {
  return `${state.revision}\t${state.mode}\t${state.target.trim()}\n`;
}

function parsePlayoutState(raw: string): PlayoutState | null {
  const line = raw.trim();
  if (!line) {
    return null;
  }

  const [revisionRaw, modeRaw, ...targetParts] = line.split("\t");
  const target = targetParts.join("\t").trim();
  const mode = modeRaw as PlayoutMode;

  if (
    !target ||
    (mode !== "broadcast" && mode !== "recording" && mode !== "fallback")
  ) {
    return null;
  }

  return {
    revision: Number.parseInt(revisionRaw ?? "0", 10) || 0,
    mode,
    target,
  };
}

export async function readPlayoutState(): Promise<PlayoutState | null> {
  try {
    return parsePlayoutState(await readFile(playoutStateFile, "utf8"));
  } catch {
    return null;
  }
}

/** Atomically updates Liquidsoap playout state in a single TSV file. */
export async function writePlayoutState(
  input: {
    blockId?: string;
    force?: boolean;
    mediaId?: string;
    mode: PlayoutMode;
    target: string;
  },
  context: { source: string }
) {
  await mkdir(scheduleDirectory, { recursive: true });

  const current = await readPlayoutState();
  const next: PlayoutState = {
    revision: (current?.revision ?? 0) + 1,
    mode: input.mode,
    target: input.target.trim(),
    mediaId: input.mediaId,
    blockId: input.blockId,
  };

  // Only compare fields persisted in playout-state.tsv (mode + target).
  // blockId/mediaId are log metadata; comparing them caused a spurious revision
  // bump on every interval poll while a recording was playing.
  // force=true bumps revision anyway so Liquidsoap re-cues after a schedule save.
  if (
    !input.force &&
    current &&
    current.mode === next.mode &&
    current.target === next.target
  ) {
    await logPlayoutEvent("playout_write_skipped", {
      source: context.source,
      revision: current.revision,
      mode: current.mode,
      target: summarizePlayoutTarget(current.target),
    });
    return current;
  }

  const encoded = encodePlayoutState(next);
  const stateTmp = `${playoutStateFile}.tmp`;
  const currentTmp = `${currentPlayoutFile}.tmp`;
  await writeFile(stateTmp, encoded);
  await writeFile(currentTmp, `${next.target}\n`);
  await rename(stateTmp, playoutStateFile);
  await rename(currentTmp, currentPlayoutFile);
  await logPlayoutEvent("playout_write", {
    source: context.source,
    revision: next.revision,
    mode: next.mode,
    mediaId: next.mediaId ?? null,
    blockId: next.blockId ?? null,
    previous: current
      ? {
          revision: current.revision,
          mode: current.mode,
          target: summarizePlayoutTarget(current.target),
        }
      : null,
    next: summarizePlayoutTarget(next.target),
  });

  return next;
}
