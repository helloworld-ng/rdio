import type { FastifyRequest } from "fastify";
import type { ScheduleBlock } from "./station-store.js";

/** Schedule block shape expected by the radio.16by16.co listener app. */
export interface ListenerScheduleBlock {
  dateKey: string;
  description: string;
  endMinutes: number;
  hosts: string[];
  id: string;
  kind: "live";
  startMinutes: number;
  title: string;
}

const listenerOriginPattern = /^https:\/\/radio\.16by16\.co$/;

function firstHeaderValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

/** True when the request comes from the public listener site (not the admin app). */
export function isListenerRequest(request: FastifyRequest) {
  const origin = firstHeaderValue(request.headers.origin)?.trim();
  return origin ? listenerOriginPattern.test(origin) : false;
}

/** Maps admin schedule blocks to broadcast-only listener blocks (`broadcast` → `live`). */
export function listenerScheduleBlocks(
  blocks: ScheduleBlock[]
): ListenerScheduleBlock[] {
  return blocks
    .filter((block) => block.kind === "broadcast")
    .map((block) => ({
      id: block.id,
      kind: "live" as const,
      title: block.title,
      description: block.description,
      dateKey: block.dateKey,
      startMinutes: block.startMinutes,
      endMinutes: block.endMinutes,
      hosts: block.hosts,
    }));
}
