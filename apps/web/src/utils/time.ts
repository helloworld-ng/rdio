import type { ScheduleBlock } from "@/types/station";

export const defaultTimeZone = "UTC";

export function formatDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function stationClockParts(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-US", {
    day: "2-digit",
    hour: "2-digit",
    hour12: false,
    hourCycle: "h23",
    minute: "2-digit",
    month: "2-digit",
    second: "2-digit",
    timeZone,
    year: "numeric",
  }).formatToParts(date);
  const value = (type: string) =>
    parts.find((part) => part.type === type)?.value ?? "00";

  return {
    day: value("day"),
    hour: value("hour"),
    minute: value("minute"),
    month: value("month"),
    second: value("second"),
    year: value("year"),
  };
}

export function formatDateKeyInTimeZone(date: Date, timeZone: string) {
  const parts = stationClockParts(date, timeZone);
  return `${parts.year}-${parts.month}-${parts.day}`;
}

export function dateFromKey(dateKey: string) {
  const [year, month, day] = dateKey.split("-").map(Number);
  return new Date(year, (month ?? 1) - 1, day ?? 1);
}

export function dateInTimeZone(date: Date, timeZone: string) {
  const parts = stationClockParts(date, timeZone);
  return new Date(
    Number(parts.year),
    Number(parts.month) - 1,
    Number(parts.day),
    Number(parts.hour),
    Number(parts.minute),
    Number(parts.second)
  );
}

export function formatDayTitle(date: Date) {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  }).format(date);
}

export function formatMonthLabel(date: Date) {
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    year: "numeric",
  }).format(date);
}

export function formatHour(hour: number) {
  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    hour12: true,
  }).format(new Date(2024, 0, 1, hour));
}

export function minutesToTimeInput(minutes: number) {
  const hour = Math.floor(minutes / 60);
  const minute = minutes % 60;
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

export function timeInputToMinutes(value: string) {
  const [hour, minute] = value.split(":").map(Number);
  return (hour ?? 0) * 60 + (minute ?? 0);
}

export function slotDurationSeconds(startTime: string, endTime: string) {
  return (
    Math.max(0, timeInputToMinutes(endTime) - timeInputToMinutes(startTime)) *
    60
  );
}

export function formatUploadTime(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export function addDays(date: Date, offset: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + offset);
  return next;
}

export function formatNowClock(date = new Date(), timeZone = defaultTimeZone) {
  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
    timeZone,
  }).format(date);
}

export function getNowMinutes(date = new Date(), timeZone = defaultTimeZone) {
  const parts = stationClockParts(date, timeZone);
  return Number(parts.hour) * 60 + Number(parts.minute);
}

export function blockOverlapsHour(block: ScheduleBlock, hour: number) {
  const hourStart = hour * 60;
  const hourEnd = (hour + 1) * 60;
  return block.startMinutes < hourEnd && block.endMinutes > hourStart;
}

export function formatSlotDuration(minutes: number): string {
  if (minutes < 60) {
    return `${minutes}min`;
  }
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  return remainder === 0 ? `${hours}h` : `${hours}h ${remainder}min`;
}

export function buildDatePickerDays(monthDate: Date) {
  const firstOfMonth = new Date(
    monthDate.getFullYear(),
    monthDate.getMonth(),
    1
  );
  const gridStart = addDays(firstOfMonth, -firstOfMonth.getDay());

  return Array.from({ length: 42 }, (_, index) => addDays(gridStart, index));
}
