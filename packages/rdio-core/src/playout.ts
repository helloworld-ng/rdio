import { getCurrentProgram } from "./schedule.js";
import type { PlayoutPlan, ScheduleSlot } from "./types.js";

export function generatePlayoutPlan(
  slots: ScheduleSlot[],
  at: Date
): PlayoutPlan {
  const currentSlot = getCurrentProgram(slots, at);

  return {
    generatedAt: at.toISOString(),
    currentSlot,
    source: currentSlot?.source ?? { kind: "fallback" },
  };
}
