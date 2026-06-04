import type { DragDropPreview, Program, ScheduleBlock } from "@/types/station";

export type MediaPlaybackNotice = "loop" | "truncate";

export function programTitleForBlock(
  block: ScheduleBlock | undefined,
  programs: Program[]
) {
  if (!block) {
    return;
  }

  if (block.programId) {
    const program = programs.find((item) => item.id === block.programId);

    if (program) {
      return program.title;
    }
  }

  return block.title;
}

export function mediaPlaybackNotice(
  slotSeconds: number,
  mediaSeconds: number | undefined
): MediaPlaybackNotice | null {
  if (
    mediaSeconds === undefined ||
    !Number.isFinite(mediaSeconds) ||
    mediaSeconds <= 0
  ) {
    return null;
  }

  if (mediaSeconds < slotSeconds - 1) {
    return "loop";
  }

  if (mediaSeconds > slotSeconds + 1) {
    return "truncate";
  }

  return null;
}

export function getMinutesOffsetInGrid(grid: HTMLElement, minutes: number) {
  const safeMinutes = Math.max(0, Math.min(1440, minutes));

  return (safeMinutes / 1440) * grid.clientHeight;
}

function timeRangesOverlap(
  startA: number,
  endA: number,
  startB: number,
  endB: number
) {
  return startA < endB && endA > startB;
}

function minutesFromClientY(canvas: HTMLElement, clientY: number) {
  const rect = canvas.getBoundingClientRect();
  const ratio = rect.height > 0 ? (clientY - rect.top) / rect.height : 0;

  return Math.round(Math.max(0, Math.min(1, ratio)) * 1440);
}

export function clampBlockStart(startMinutes: number, durationMinutes: number) {
  const duration = Math.max(30, durationMinutes);

  return Math.min(Math.max(0, startMinutes), 1440 - duration);
}

function canPlaceBlockAt(
  blocks: ScheduleBlock[],
  movingBlockId: string,
  startMinutes: number,
  durationMinutes: number
) {
  const duration = Math.max(30, durationMinutes);
  const endMinutes = startMinutes + duration;

  return !blocks.some((block) => {
    if (block.id === movingBlockId) {
      return false;
    }

    return timeRangesOverlap(
      startMinutes,
      endMinutes,
      block.startMinutes,
      block.endMinutes
    );
  });
}

export function blockConflictsWith(
  blocks: ScheduleBlock[],
  movingBlockId: string,
  nextBlock: Pick<ScheduleBlock, "dateKey" | "startMinutes" | "endMinutes">
) {
  return blocks.some((block) => {
    if (block.id === movingBlockId || block.dateKey !== nextBlock.dateKey) {
      return false;
    }

    return timeRangesOverlap(
      nextBlock.startMinutes,
      nextBlock.endMinutes,
      block.startMinutes,
      block.endMinutes
    );
  });
}

export function isBlockPastOrCurrent(
  block: ScheduleBlock,
  todayDateKey: string,
  nowMinutes: number
) {
  return (
    block.dateKey < todayDateKey ||
    (block.dateKey === todayDateKey && block.startMinutes <= nowMinutes)
  );
}

export function buildDragDropPreview(
  blocks: ScheduleBlock[],
  draggedBlockId: string,
  canvas: HTMLElement,
  clientY: number
): DragDropPreview | null {
  const block = blocks.find((entry) => entry.id === draggedBlockId);

  if (!block) {
    return null;
  }

  const durationMinutes = Math.max(30, block.endMinutes - block.startMinutes);
  const startMinutes = clampBlockStart(
    minutesFromClientY(canvas, clientY),
    durationMinutes
  );
  const canDrop = canPlaceBlockAt(
    blocks,
    draggedBlockId,
    startMinutes,
    durationMinutes
  );

  return { startMinutes, durationMinutes, canDrop };
}

export function loadAudioDuration(src: string): Promise<number> {
  return new Promise((resolve, reject) => {
    const audio = new Audio();
    audio.onloadedmetadata = () => resolve(audio.duration);
    audio.onerror = () => reject(new Error("Could not load audio"));
    audio.src = src;
  });
}
