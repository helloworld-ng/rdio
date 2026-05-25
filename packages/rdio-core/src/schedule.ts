import type { ScheduleConflict, ScheduleSlot } from './types.js'

export function getCurrentProgram(slots: ScheduleSlot[], at: Date): ScheduleSlot | null {
  const time = at.getTime()

  return slots.find((slot) => {
    const startsAt = new Date(slot.startsAt).getTime()
    const endsAt = new Date(slot.endsAt).getTime()
    return Number.isFinite(startsAt) && Number.isFinite(endsAt) && startsAt <= time && time < endsAt
  }) ?? null
}

export function getUpcomingPrograms(slots: ScheduleSlot[], from: Date, limit = 10): ScheduleSlot[] {
  const time = from.getTime()

  return [...slots]
    .filter((slot) => new Date(slot.startsAt).getTime() > time)
    .sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime())
    .slice(0, limit)
}

export function detectScheduleConflicts(slots: ScheduleSlot[]): ScheduleConflict[] {
  const sorted = [...slots].sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime())
  const conflicts: ScheduleConflict[] = []

  for (let index = 1; index < sorted.length; index += 1) {
    const previous = sorted[index - 1]
    const current = sorted[index]

    if (new Date(previous.endsAt).getTime() > new Date(current.startsAt).getTime()) {
      conflicts.push({
        firstSlotId: previous.id,
        secondSlotId: current.id,
        reason: 'overlap',
      })
    }
  }

  return conflicts
}
