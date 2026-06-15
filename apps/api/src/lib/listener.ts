import type { FastifyRequest } from "fastify";
import type { ScheduleBlock } from "./station-store.js";

/** Schedule block shape expected by the radio.16by16.co listener app. */
export interface ListenerScheduleBlock {
  dateKey: string;
  description: string;
  endMinutes: number;
  hosts: string[];
  id: string;
  kind: "live" | "recording";
  startMinutes: number;
  title: string;
}

const listenerOriginPattern = /^https:\/\/radio\.16by16\.co\/?$/;

function firstHeaderValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function requestOrigin(request: FastifyRequest) {
  const origin = firstHeaderValue(request.headers.origin)?.trim();
  if (origin) {
    return origin;
  }

  const referer = firstHeaderValue(request.headers.referer)?.trim();
  if (!referer) {
    return;
  }

  try {
    return new URL(referer).origin;
  } catch {
    return;
  }
}

/** True when the request comes from the public listener site (not the admin app). */
export function isListenerRequest(request: FastifyRequest) {
  const origin = requestOrigin(request);
  return origin ? listenerOriginPattern.test(origin) : false;
}

/** Maps admin schedule blocks to the listener app's expected shape. */
export function listenerScheduleBlocks(
  blocks: ScheduleBlock[]
): ListenerScheduleBlock[] {
  return blocks
    .filter((block) => block.kind === "broadcast" || block.kind === "recording")
    .map((block) => ({
      id: block.id,
      kind:
        block.kind === "broadcast" ? ("live" as const) : ("recording" as const),
      title: block.title,
      description: block.description,
      dateKey: block.dateKey,
      startMinutes: block.startMinutes,
      endMinutes: block.endMinutes,
      hosts: block.hosts,
    }));
}
