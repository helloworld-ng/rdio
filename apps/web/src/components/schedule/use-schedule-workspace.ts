import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";
import { mockAnchorDate } from "@/data/mockStation";
import { useMediaQuery } from "@/hooks/use-media-query";
import { MOBILE_SIDEBAR_QUERY } from "@/lib/constants";
import { hostsQueryOptions, useCreateHost } from "@/lib/queries/hosts";
import { mediaQueryOptions, useUploadMedia } from "@/lib/queries/media";
import { programsQueryOptions } from "@/lib/queries/programs";
import {
  scheduleBlocksQueryOptions,
  useSaveScheduleBlocks,
} from "@/lib/queries/schedule-blocks";
import { stationQueryOptions } from "@/lib/queries/station";
import type { ScheduleBlocksResponse } from "@/types/api";
import type {
  CreationRequest,
  DragDropPreview,
  ScheduleBlock,
  ScheduleBlockDraft,
} from "@/types/station";
import { addHostByName, getHostNames } from "@/utils/hosts";
import { blockConflictsWith, clampBlockStart } from "@/utils/schedule";
import {
  addDays,
  dateInTimeZone,
  defaultTimeZone,
  formatDateKey,
  formatDateKeyInTimeZone,
} from "@/utils/time";

/**
 * Owns the schedule editor's local draft state and its server synchronization.
 *
 * Pages read canonical server state through React Query, but the calendar needs
 * local edits for drag/drop, conflict handling, autosave, and date navigation.
 */
export function useScheduleWorkspace() {
  const stationQuery = useQuery(stationQueryOptions());
  const scheduleBlocksQuery = useQuery(scheduleBlocksQueryOptions());
  const hostsQuery = useQuery(hostsQueryOptions());
  const mediaQuery = useQuery(mediaQueryOptions());
  const programsQuery = useQuery(programsQueryOptions());
  const createHostMutation = useCreateHost();
  const uploadMediaMutation = useUploadMedia();
  const { mutateAsync: saveScheduleBlocks } = useSaveScheduleBlocks();
  const isMobileLayout = useMediaQuery(MOBILE_SIDEBAR_QUERY);

  const [selectedDate, setSelectedDate] = useState(
    () => new Date(mockAnchorDate)
  );
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const [datePickerMonth, setDatePickerMonth] = useState(
    () => new Date(mockAnchorDate.getFullYear(), mockAnchorDate.getMonth(), 1)
  );
  const [blocks, setBlocks] = useState<ScheduleBlock[]>([]);
  const [isScheduleLoaded, setIsScheduleLoaded] = useState(false);
  const [scheduleSaveError, setScheduleSaveError] = useState("");
  const [scheduleSaveState, setScheduleSaveState] = useState<
    "idle" | "saving" | "saved"
  >("idle");
  const [creationRequest, setCreationRequest] =
    useState<CreationRequest | null>(null);
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);
  const [draggedBlockId, setDraggedBlockId] = useState<string | null>(null);
  const [dragDropPreview, setDragDropPreview] =
    useState<DragDropPreview | null>(null);
  const scheduleFocusToken = 1;
  const scheduleVersionRef = useRef<string | null>(null);
  const isScheduleInitializedRef = useRef(false);
  const isApplyingRemoteScheduleRef = useRef(false);
  const hasInitializedStationDateRef = useRef(false);

  const currentStation = stationQuery.data;
  const hosts = hostsQuery.data ?? [];
  const mediaItems = mediaQuery.data ?? [];
  const programs = programsQuery.data ?? [];
  const stationTimeZone = currentStation?.timezone ?? defaultTimeZone;

  useEffect(() => {
    if (!(currentStation && !hasInitializedStationDateRef.current)) {
      return;
    }

    hasInitializedStationDateRef.current = true;
    const stationToday = dateInTimeZone(new Date(), currentStation.timezone);
    setSelectedDate(stationToday);
    setDatePickerMonth(
      new Date(stationToday.getFullYear(), stationToday.getMonth(), 1)
    );
  }, [currentStation]);

  useEffect(() => {
    if (scheduleBlocksQuery.isError) {
      setBlocks([]);
      setIsScheduleLoaded(false);
      return;
    }

    if (!scheduleBlocksQuery.data) {
      return;
    }

    isApplyingRemoteScheduleRef.current = true;
    setBlocks(scheduleBlocksQuery.data.blocks);
    scheduleVersionRef.current = scheduleBlocksQuery.data.version;
    setIsScheduleLoaded(true);
    setScheduleSaveError("");
  }, [scheduleBlocksQuery.data, scheduleBlocksQuery.isError]);

  useEffect(() => {
    if (!isScheduleLoaded) {
      return;
    }

    if (isApplyingRemoteScheduleRef.current) {
      isApplyingRemoteScheduleRef.current = false;
      isScheduleInitializedRef.current = true;
      return;
    }

    if (!isScheduleInitializedRef.current) {
      isScheduleInitializedRef.current = true;
      return;
    }

    const timeout = window.setTimeout(() => {
      setScheduleSaveState("saving");
      const saveSchedule = async () => {
        try {
          const data = await saveScheduleBlocks({
            blocks,
            version: scheduleVersionRef.current,
          });

          if (typeof data.version === "string") {
            scheduleVersionRef.current = data.version;
          }

          setScheduleSaveState("saved");
          setScheduleSaveError("");
          window.setTimeout(() => setScheduleSaveState("idle"), 2000);
        } catch (error) {
          if (isScheduleSaveConflict(error)) {
            isApplyingRemoteScheduleRef.current = true;
            setBlocks(error.data.blocks);
            scheduleVersionRef.current = error.data.version;
          }

          setScheduleSaveState("idle");
          setScheduleSaveError(
            getScheduleSaveErrorMessage(error) ??
              "Could not save schedule changes."
          );
        }
      };

      saveSchedule().catch(() => undefined);
    }, 250);

    return () => window.clearTimeout(timeout);
  }, [blocks, isScheduleLoaded, saveScheduleBlocks]);

  const selectedDateKey = formatDateKey(selectedDate);
  const dayBlocks = useMemo(
    () =>
      blocks
        .filter((block) => block.dateKey === selectedDateKey)
        .sort((a, b) => a.startMinutes - b.startMinutes),
    [blocks, selectedDateKey]
  );
  const todayDateKey = formatDateKeyInTimeZone(new Date(), stationTimeZone);

  const resetScheduleSelection = () => {
    setCreationRequest(null);
    setSelectedBlockId(null);
  };

  const moveDay = (offset: number) => {
    setSelectedDate((current) => {
      const nextDate = addDays(current, offset);
      setDatePickerMonth(
        new Date(nextDate.getFullYear(), nextDate.getMonth(), 1)
      );
      return nextDate;
    });
    resetScheduleSelection();
  };

  const selectDate = (nextDate: Date) => {
    setSelectedDate(nextDate);
    setDatePickerMonth(
      new Date(nextDate.getFullYear(), nextDate.getMonth(), 1)
    );
    setIsDatePickerOpen(false);
    resetScheduleSelection();
  };

  const saveBlock = (blockInput: ScheduleBlockDraft) => {
    const request = creationRequest;

    if (!request) {
      return;
    }

    const nextBlock: ScheduleBlock = {
      ...blockInput,
      dateKey: request.dateKey,
      id: crypto.randomUUID(),
    };

    let didSave = false;
    setBlocks((current) => {
      if (blockConflictsWith(current, nextBlock.id, nextBlock)) {
        setScheduleSaveError("Schedule blocks cannot overlap.");
        return current;
      }

      setScheduleSaveError("");
      setScheduleSaveState("idle");
      didSave = true;
      return [...current, nextBlock];
    });

    if (didSave) {
      setSelectedBlockId(nextBlock.id);
      setCreationRequest(null);
    }
  };

  const updateBlock = (blockId: string, blockInput: ScheduleBlockDraft) => {
    setBlocks((current) =>
      current.map((block) => {
        if (block.id !== blockId) {
          return block;
        }

        const nextBlock = { ...block, ...blockInput };
        if (blockConflictsWith(current, blockId, nextBlock)) {
          setScheduleSaveError("Schedule blocks cannot overlap.");
          return block;
        }

        setScheduleSaveError("");
        setScheduleSaveState("idle");
        return nextBlock;
      })
    );
    setSelectedBlockId(blockId);
  };

  const duplicateBlock = (blockId: string) => {
    setBlocks((current) => {
      const block = current.find((item) => item.id === blockId);

      if (!block) {
        return current;
      }

      const duration = Math.max(30, block.endMinutes - block.startMinutes);
      const startMinutes = Math.min(1440 - duration, block.endMinutes);
      const nextBlock = {
        ...block,
        endMinutes: startMinutes + duration,
        id: crypto.randomUUID(),
        startMinutes,
        title: `${block.title} copy`,
      };

      if (blockConflictsWith(current, nextBlock.id, nextBlock)) {
        setScheduleSaveError("The duplicate overlaps another schedule block.");
        return current;
      }

      setScheduleSaveError("");
      setScheduleSaveState("idle");
      return [...current, nextBlock];
    });
  };

  const removeBlock = (blockId: string) => {
    setBlocks((current) => {
      setScheduleSaveError("");
      setScheduleSaveState("idle");
      return current.filter((block) => block.id !== blockId);
    });
    setSelectedBlockId((current) => (current === blockId ? null : current));
  };

  const moveBlock = (blockId: string, startMinutes: number) => {
    setBlocks((current) => {
      const movingBlock = current.find((block) => block.id === blockId);

      if (!movingBlock) {
        return current;
      }

      const duration = Math.max(
        30,
        movingBlock.endMinutes - movingBlock.startMinutes
      );
      const nextStartMinutes = clampBlockStart(startMinutes, duration);

      if (
        blockConflictsWith(current, blockId, {
          dateKey: selectedDateKey,
          endMinutes: nextStartMinutes + duration,
          startMinutes: nextStartMinutes,
        })
      ) {
        setScheduleSaveError("Schedule blocks cannot overlap.");
        return current;
      }

      setScheduleSaveError("");
      setScheduleSaveState("idle");
      return current.map((block) => {
        if (block.id !== blockId) {
          return block;
        }

        return {
          ...block,
          dateKey: selectedDateKey,
          endMinutes: nextStartMinutes + duration,
          startMinutes: nextStartMinutes,
        };
      });
    });
    setDragDropPreview(null);
  };

  const beginCreate = (
    hour: number,
    kind: ScheduleBlock["kind"] | null = "recording"
  ) => {
    setCreationRequest({ dateKey: selectedDateKey, hour, kind });
    setSelectedBlockId(null);
  };

  const closeSlotPanel = () => {
    resetScheduleSelection();
  };

  const selectBlock = (blockId: string | null) => {
    if (blockId === null) {
      closeSlotPanel();
      return;
    }

    setCreationRequest(null);
    setSelectedBlockId((current) => (current === blockId ? null : blockId));
  };

  const createHostByName = async (hostName: string) => {
    const host = addHostByName(hosts, hostName).at(hosts.length);
    if (!host) {
      return;
    }

    await createHostMutation.mutateAsync(host);
  };

  return {
    saveMessage:
      scheduleSaveError || scheduleSaveStateMessage(scheduleSaveState),
    schedule: {
      blocks: dayBlocks,
      creationRequest,
      datePickerMonth,
      dragDropPreview,
      draggedBlockId,
      focusNowToken: scheduleFocusToken,
      hosts: getHostNames(hosts),
      isDatePickerOpen,
      isMobileLayout,
      mediaItems,
      onAddHost: createHostByName,
      onBeginCreate: beginCreate,
      onChangeCreationKind: (kind: ScheduleBlock["kind"]) =>
        setCreationRequest((current) =>
          current ? { ...current, kind } : current
        ),
      onCloseSlotPanel: closeSlotPanel,
      onDatePickerMonthChange: setDatePickerMonth,
      onDuplicateBlock: duplicateBlock,
      onMoveBlock: moveBlock,
      onMoveDay: moveDay,
      onRemoveBlock: removeBlock,
      onSaveBlock: saveBlock,
      onSelectBlock: selectBlock,
      onSelectDate: selectDate,
      onSetDragDropPreview: setDragDropPreview,
      onSetDraggedBlockId: setDraggedBlockId,
      onToggleDatePicker: () => setIsDatePickerOpen((current) => !current),
      onUpdateBlock: updateBlock,
      onUploadMedia: uploadMediaMutation.mutateAsync,
      programs,
      selectedBlockId,
      selectedDate,
      selectedDateKey,
      stationTimeZone,
      todayDateKey,
    },
  };
}

function scheduleSaveStateMessage(
  scheduleSaveState: "idle" | "saving" | "saved"
) {
  if (scheduleSaveState === "saving") {
    return "Saving schedule...";
  }

  if (scheduleSaveState === "saved") {
    return "Schedule saved";
  }

  return "";
}

interface ScheduleSaveError extends Error {
  data?: Partial<ScheduleBlocksResponse> & { error?: string };
}

function isScheduleSaveConflict(error: unknown): error is ScheduleSaveError & {
  data: ScheduleBlocksResponse;
} {
  const data =
    error instanceof Error ? (error as ScheduleSaveError).data : undefined;

  return (
    Array.isArray(data?.blocks) &&
    typeof data.version === "string" &&
    data.blocks.every((block) => typeof block.id === "string")
  );
}

function getScheduleSaveErrorMessage(error: unknown) {
  if (!(error instanceof Error)) {
    return null;
  }

  return (error as ScheduleSaveError).data?.error ?? error.message;
}
