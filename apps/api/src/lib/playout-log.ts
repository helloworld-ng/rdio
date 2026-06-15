import { appendFile, mkdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../../.."
);
export const playoutLogFile = path.join(repoRoot, "media/schedule/playout.log");

const maxLoggedTargetLength = 160;

function summarizeTarget(target: string) {
  const trimmed = target.trim();
  if (trimmed.length <= maxLoggedTargetLength) {
    return trimmed;
  }

  return `${trimmed.slice(0, maxLoggedTargetLength)}…`;
}

/** Append a structured playout event for debugging delete/restart races. */
export async function logPlayoutEvent(
  event: string,
  data: Record<string, unknown> = {}
) {
  const entry = {
    at: new Date().toISOString(),
    event,
    ...data,
  };

  console.info("[playout]", JSON.stringify(entry));

  try {
    await mkdir(path.dirname(playoutLogFile), { recursive: true });
    await appendFile(playoutLogFile, `${JSON.stringify(entry)}\n`);
  } catch (error: unknown) {
    console.error("[playout] failed to write playout.log", error);
  }
}

export function summarizePlayoutTarget(target: string) {
  return summarizeTarget(target);
}

/** Returns the most recent playout log lines (newest last). */
export async function readRecentPlayoutLog(limit = 100) {
  try {
    const raw = await readFile(playoutLogFile, "utf8");
    const lines = raw
      .trim()
      .split("\n")
      .filter((line) => line.length > 0);

    return lines.slice(-limit).map((line) => JSON.parse(line) as unknown);
  } catch {
    return [];
  }
}
