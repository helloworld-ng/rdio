import {
  ChevronLeft,
  ChevronRight,
  Copy,
  GripVertical,
  ListMusic,
  Mic2,
  Trash2,
  X,
} from "lucide-react";
import type React from "react";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { HostMultiSelect } from "@/components/schedule/host-multi-select";
import { MediaSlotField } from "@/components/schedule/media-slot-field";
import { ProgramSearchSelect } from "@/components/schedule/program-search-select";
import { mediaUrl } from "@/lib/api";
import type {
  CreationRequest,
  DragDropPreview,
  MediaItem,
  Program,
  ScheduleBlock,
  ScheduleBlockDraft,
  UploadedFileSummary,
} from "@/types/station";
import {
  buildDragDropPreview,
  getMinutesOffsetInGrid,
  isBlockPastOrCurrent,
  loadAudioDuration,
  mediaPlaybackNotice,
} from "@/utils/schedule";
import {
  blockOverlapsHour,
  buildDatePickerDays,
  formatDateKey,
  formatDayTitle,
  formatHour,
  formatMonthLabel,
  formatNowClock,
  formatSlotDuration,
  getNowMinutes,
  minutesToTimeInput,
  slotDurationSeconds,
  timeInputToMinutes,
} from "@/utils/time";

const hours = Array.from({ length: 24 }, (_, hour) => hour);

function findMediaIdForFile(
  file: UploadedFileSummary | undefined,
  mediaItems: MediaItem[]
) {
  if (!file) {
    return null;
  }

  const matches = mediaItems.filter(
    (item) => item.name === file.name && item.size === file.size
  );

  if (matches.length === 1) {
    return matches[0]?.id ?? null;
  }

  return null;
}

function slotPanelTitle(editingBlock?: ScheduleBlock) {
  if (editingBlock) {
    return "Edit Slot";
  }

  return "New Slot";
}

async function resolveMediaSelection({
  editingBlock,
  kind,
  mediaDuration,
  mediaFile,
  mediaItems,
  onUploadMedia,
  selectedMediaId,
}: {
  editingBlock?: ScheduleBlock;
  kind: ScheduleBlock["kind"];
  mediaDuration?: number;
  mediaFile: File | null;
  mediaItems: MediaItem[];
  onUploadMedia: (file: File) => Promise<MediaItem>;
  selectedMediaId: string | null;
}): Promise<{
  file: ScheduleBlockDraft["file"];
  mediaId: ScheduleBlockDraft["mediaId"];
}> {
  if (kind !== "recording") {
    return { file: undefined, mediaId: undefined };
  }

  if (selectedMediaId && !mediaFile) {
    const item = mediaItems.find((entry) => entry.id === selectedMediaId);

    if (item) {
      return {
        file: { name: item.name, size: item.size, duration: mediaDuration },
        mediaId: item.id,
      };
    }
  }

  if (mediaFile) {
    const uploadedMedia = await onUploadMedia(mediaFile);

    return {
      file: {
        name: uploadedMedia.name,
        size: uploadedMedia.size,
        duration: mediaDuration,
      },
      mediaId: uploadedMedia.id,
    };
  }

  if (editingBlock?.file) {
    return {
      file: editingBlock.file,
      mediaId: editingBlock.mediaId,
    };
  }

  return { file: undefined, mediaId: undefined };
}

function ScheduleSlotPanel({
  children,
  isMobile,
  isOpen,
  onClose,
  title,
}: {
  children: React.ReactNode;
  isMobile: boolean;
  isOpen: boolean;
  onClose: () => void;
  title: string;
}) {
  const [sheetEntered, setSheetEntered] = useState(false);

  useEffect(() => {
    if (!(isMobile && isOpen)) {
      setSheetEntered(false);
      return;
    }

    const frame = requestAnimationFrame(() => setSheetEntered(true));

    return () => cancelAnimationFrame(frame);
  }, [isMobile, isOpen]);

  if (!isOpen) {
    return null;
  }

  if (isMobile) {
    return (
      <>
        <button
          aria-label="Close slot editor"
          className={["slot-sheet-backdrop", sheetEntered ? "is-visible" : ""]
            .filter(Boolean)
            .join(" ")}
          onClick={onClose}
          type="button"
        />
        <aside
          aria-label={title}
          className={["slot-editor-sheet", sheetEntered ? "is-open" : ""]
            .filter(Boolean)
            .join(" ")}
        >
          <div className="slot-editor-header">
            <strong>{title}</strong>
            <button
              aria-label="Close slot editor"
              onClick={onClose}
              type="button"
            >
              <X aria-hidden="true" size={15} strokeWidth={1.8} />
            </button>
          </div>
          <div className="slot-editor-body">{children}</div>
        </aside>
      </>
    );
  }

  return (
    <aside aria-label={title} className="slot-editor-panel">
      <div className="slot-editor-header">
        <strong>{title}</strong>
        <button aria-label="Close slot editor" onClick={onClose} type="button">
          <X aria-hidden="true" size={15} strokeWidth={1.8} />
        </button>
      </div>
      <div className="slot-editor-body">{children}</div>
    </aside>
  );
}

export function DailyCalendar({
  blocks,
  creationRequest,
  datePickerMonth,
  dragDropPreview,
  draggedBlockId,
  focusNowToken,
  hosts,
  isDatePickerOpen,
  isMobileLayout,
  mediaItems,
  programs,
  selectedBlockId,
  selectedDate,
  selectedDateKey,
  stationTimeZone,
  todayDateKey,
  onAddHost,
  onBeginCreate,
  onChangeCreationKind,
  onCloseSlotPanel,
  onDatePickerMonthChange,
  onDuplicateBlock,
  onMoveBlock,
  onMoveDay,
  onRemoveBlock,
  onSaveBlock,
  onSelectBlock,
  onSelectDate,
  onSetDragDropPreview,
  onSetDraggedBlockId,
  onToggleDatePicker,
  onUpdateBlock,
  onUploadMedia,
}: {
  blocks: ScheduleBlock[];
  creationRequest: CreationRequest | null;
  datePickerMonth: Date;
  dragDropPreview: DragDropPreview | null;
  draggedBlockId: string | null;
  focusNowToken: number;
  hosts: string[];
  isDatePickerOpen: boolean;
  isMobileLayout: boolean;
  mediaItems: MediaItem[];
  programs: Program[];
  selectedBlockId: string | null;
  selectedDate: Date;
  selectedDateKey: string;
  stationTimeZone: string;
  todayDateKey: string;
  onAddHost: (host: string) => void;
  onBeginCreate: (hour: number, kind?: ScheduleBlock["kind"] | null) => void;
  onChangeCreationKind: (kind: ScheduleBlock["kind"]) => void;
  onCloseSlotPanel: () => void;
  onDatePickerMonthChange: (date: Date) => void;
  onDuplicateBlock: (blockId: string) => void;
  onMoveBlock: (blockId: string, startMinutes: number) => void;
  onMoveDay: (offset: number) => void;
  onRemoveBlock: (blockId: string) => void;
  onSaveBlock: (block: ScheduleBlockDraft) => void;
  onSelectBlock: (blockId: string | null) => void;
  onSelectDate: (date: Date) => void;
  onSetDragDropPreview: (preview: DragDropPreview | null) => void;
  onSetDraggedBlockId: (blockId: string | null) => void;
  onToggleDatePicker: () => void;
  onUpdateBlock: (blockId: string, block: ScheduleBlockDraft) => void;
  onUploadMedia: (file: File) => Promise<MediaItem>;
}) {
  const calendarRef = useRef<HTMLElement>(null);
  const gridRef = useRef<HTMLElement>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  const lastFocusNowTokenRef = useRef(0);
  const [nowIndicator, setNowIndicator] = useState<{
    time: string;
    top: number;
  } | null>(null);
  const nowMinutes = getNowMinutes(new Date(), stationTimeZone);

  const selectedBlock = selectedBlockId
    ? blocks.find((block) => block.id === selectedBlockId)
    : undefined;
  const isSelectedBlockLocked = selectedBlock
    ? isBlockPastOrCurrent(selectedBlock, todayDateKey, nowMinutes)
    : false;
  const editingBlock = creationRequest ? undefined : selectedBlock;
  const activeRequest =
    creationRequest ??
    (selectedBlock
      ? {
          dateKey: selectedBlock.dateKey,
          hour: Math.floor(selectedBlock.startMinutes / 60),
          kind: selectedBlock.kind,
        }
      : null);
  const isSlotPanelOpen = activeRequest !== null;
  const isToday = selectedDateKey === todayDateKey;

  useLayoutEffect(() => {
    const calendar = calendarRef.current;
    const grid = gridRef.current;

    if (!(calendar && grid)) {
      return;
    }

    const scrollRoot = calendar;
    const sticky = calendar.querySelector(".calendar-sticky");
    const stickyOffset =
      sticky instanceof HTMLElement ? sticky.offsetHeight + 12 : 96;
    const gridTop = grid.offsetTop;

    if (lastFocusNowTokenRef.current !== focusNowToken) {
      lastFocusNowTokenRef.current = focusNowToken;

      if (isToday) {
        const offsetInGrid = getMinutesOffsetInGrid(
          grid,
          getNowMinutes(new Date(), stationTimeZone)
        );
        scrollRoot.scrollTop = Math.max(
          0,
          gridTop + offsetInGrid - stickyOffset - 24
        );
      } else {
        scrollRoot.scrollTop = Math.max(0, gridTop - stickyOffset);
      }

      return;
    }

    scrollRoot.scrollTop = Math.max(0, gridTop - stickyOffset);
  }, [focusNowToken, isToday, stationTimeZone]);

  useLayoutEffect(() => {
    const grid = gridRef.current;

    if (!(grid && isToday)) {
      setNowIndicator(null);
      return;
    }

    const tick = () => {
      const now = new Date();
      setNowIndicator({
        time: formatNowClock(now, stationTimeZone),
        top: getMinutesOffsetInGrid(grid, getNowMinutes(now, stationTimeZone)),
      });
    };

    tick();
    const interval = window.setInterval(tick, 1000);
    window.addEventListener("resize", tick);

    return () => {
      window.clearInterval(interval);
      window.removeEventListener("resize", tick);
    };
  }, [isToday, stationTimeZone]);

  return (
    <div
      className={
        isSlotPanelOpen && !isMobileLayout
          ? "schedule-workbench has-slot-panel"
          : "schedule-workbench"
      }
    >
      <section
        aria-label="Daily schedule"
        className="calendar-view"
        ref={calendarRef}
      >
        <div className="calendar-sticky">
          <fieldset aria-label="Schedule day" className="day-toggle">
            <button
              aria-label="Previous day"
              onClick={() => onMoveDay(-1)}
              type="button"
            >
              <ChevronLeft aria-hidden="true" size={18} strokeWidth={1.8} />
            </button>
            <div className="date-popover-anchor">
              <button
                className="date-button"
                onClick={onToggleDatePicker}
                type="button"
              >
                <span>{formatDayTitle(selectedDate)}</span>
              </button>
              {isDatePickerOpen ? (
                <DatePickerPopover
                  monthDate={datePickerMonth}
                  onChangeMonth={(offset) =>
                    onDatePickerMonthChange(
                      new Date(
                        datePickerMonth.getFullYear(),
                        datePickerMonth.getMonth() + offset,
                        1
                      )
                    )
                  }
                  onSelectDate={onSelectDate}
                  selectedDateKey={selectedDateKey}
                />
              ) : null}
            </div>
            <button
              aria-label="Next day"
              onClick={() => onMoveDay(1)}
              type="button"
            >
              <ChevronRight aria-hidden="true" size={18} strokeWidth={1.8} />
            </button>
          </fieldset>
        </div>

        <section
          aria-label={`${formatDayTitle(selectedDate)} schedule`}
          className="daily-grid"
          ref={gridRef}
        >
          <div aria-hidden="true" className="time-gutter">
            {hours.map((hour) => (
              <time
                className="hour-label"
                dateTime={`${String(hour).padStart(2, "0")}:00`}
                key={hour}
                style={{ top: `${(hour / 24) * 100}%` }}
              >
                {formatHour(hour)}
              </time>
            ))}
          </div>
          <div className="schedule-canvas" ref={canvasRef} role="application">
            <div aria-hidden="true" className="schedule-lines" />
            {hours.map((hour) => {
              const hourHasBlock = blocks.some((block) =>
                blockOverlapsHour(block, hour)
              );
              const isActiveHour =
                activeRequest?.dateKey === selectedDateKey &&
                (creationRequest || editingBlock) &&
                (editingBlock
                  ? blockOverlapsHour(editingBlock, hour)
                  : activeRequest.hour === hour);

              return (
                <button
                  aria-label={`Add at ${formatHour(hour)}`}
                  className={[
                    "hour-drop-zone",
                    isActiveHour ? "is-active-hour" : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  data-hour={hour}
                  key={hour}
                  onClick={() => onBeginCreate(hour)}
                  onDragOver={(event) => {
                    if (!(draggedBlockId && canvasRef.current)) {
                      return;
                    }

                    event.preventDefault();
                    event.dataTransfer.dropEffect = dragDropPreview?.canDrop
                      ? "move"
                      : "none";

                    const preview = buildDragDropPreview(
                      blocks,
                      draggedBlockId,
                      canvasRef.current,
                      event.clientY
                    );

                    if (preview) {
                      onSetDragDropPreview(preview);
                    }
                  }}
                  onDrop={(event) => {
                    event.preventDefault();

                    if (!(draggedBlockId && canvasRef.current)) {
                      return;
                    }

                    const preview = buildDragDropPreview(
                      blocks,
                      draggedBlockId,
                      canvasRef.current,
                      event.clientY
                    );

                    if (preview?.canDrop) {
                      onMoveBlock(draggedBlockId, preview.startMinutes);
                    }

                    onSetDraggedBlockId(null);
                    onSetDragDropPreview(null);
                  }}
                  style={{
                    top: `${(hour / 24) * 100}%`,
                    height: `${100 / 24}%`,
                  }}
                  type="button"
                >
                  {hourHasBlock ? null : (
                    <span className="slot-hint">Click to add</span>
                  )}
                </button>
              );
            })}
            {dragDropPreview && draggedBlockId ? (
              <div
                aria-hidden="true"
                className={[
                  "schedule-drag-preview",
                  dragDropPreview.canDrop ? "can-drop" : "cannot-drop",
                ].join(" ")}
                style={{
                  top: `${(dragDropPreview.startMinutes / 1440) * 100}%`,
                  height: `${(dragDropPreview.durationMinutes / 1440) * 100}%`,
                }}
              />
            ) : null}
            <ScheduleBlocksLayer
              blocks={blocks}
              draggedBlockId={draggedBlockId}
              onDuplicateBlock={onDuplicateBlock}
              onRemoveBlock={onRemoveBlock}
              onSelectBlock={onSelectBlock}
              onSetDragDropPreview={onSetDragDropPreview}
              onSetDraggedBlockId={onSetDraggedBlockId}
              selectedBlockId={selectedBlockId}
            />
          </div>
          {isToday && nowIndicator ? (
            <div
              aria-hidden="true"
              className="calendar-now-indicator"
              style={{ top: `${nowIndicator.top}px` }}
            >
              <time className="calendar-now-label">{nowIndicator.time}</time>
              <div className="calendar-now-line" />
            </div>
          ) : null}
        </section>
      </section>

      <ScheduleSlotPanel
        isMobile={isMobileLayout}
        isOpen={isSlotPanelOpen}
        onClose={onCloseSlotPanel}
        title={slotPanelTitle(editingBlock)}
      >
        {activeRequest ? (
          <CreationPanel
            className="creation-panel"
            editingBlock={editingBlock}
            hosts={hosts}
            isLocked={isSelectedBlockLocked}
            key={
              editingBlock?.id ??
              `${activeRequest.dateKey}-${activeRequest.hour}-${activeRequest.kind ?? "pick"}`
            }
            mediaItems={mediaItems}
            onAddHost={onAddHost}
            onChangeKind={onChangeCreationKind}
            onDelete={
              editingBlock
                ? () => {
                    onRemoveBlock(editingBlock.id);
                    onCloseSlotPanel();
                  }
                : undefined
            }
            onSave={(blockInput) => {
              if (editingBlock) {
                onUpdateBlock(editingBlock.id, blockInput);
                return;
              }

              onSaveBlock(blockInput);
            }}
            onUploadMedia={onUploadMedia}
            programs={programs}
            request={activeRequest}
          />
        ) : null}
      </ScheduleSlotPanel>
    </div>
  );
}

function DatePickerPopover({
  monthDate,
  selectedDateKey,
  onChangeMonth,
  onSelectDate,
}: {
  monthDate: Date;
  selectedDateKey: string;
  onChangeMonth: (offset: number) => void;
  onSelectDate: (date: Date) => void;
}) {
  const days = buildDatePickerDays(monthDate);

  return (
    <div className="date-picker-popover">
      <div className="date-picker-header">
        <button
          aria-label="Previous month"
          onClick={() => onChangeMonth(-1)}
          type="button"
        >
          <ChevronLeft aria-hidden="true" size={15} strokeWidth={1.8} />
        </button>
        <strong>{formatMonthLabel(monthDate)}</strong>
        <button
          aria-label="Next month"
          onClick={() => onChangeMonth(1)}
          type="button"
        >
          <ChevronRight aria-hidden="true" size={15} strokeWidth={1.8} />
        </button>
      </div>
      <div aria-hidden="true" className="date-picker-weekdays">
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
          <span key={day}>{day.slice(0, 1)}</span>
        ))}
      </div>
      <div className="date-picker-grid">
        {days.map((day) => {
          const dayKey = formatDateKey(day);
          const isSelected = dayKey === selectedDateKey;
          const isOutsideMonth = day.getMonth() !== monthDate.getMonth();

          return (
            <button
              className={[
                isSelected ? "is-selected" : "",
                isOutsideMonth ? "is-muted" : "",
              ]
                .filter(Boolean)
                .join(" ")}
              key={dayKey}
              onClick={() => onSelectDate(day)}
              type="button"
            >
              {day.getDate()}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function CreationPanel({
  className,
  editingBlock,
  hosts,
  isLocked,
  mediaItems,
  programs,
  request,
  onAddHost,
  onChangeKind,
  onDelete,
  onSave,
  onUploadMedia,
}: {
  className?: string;
  editingBlock?: ScheduleBlock;
  hosts: string[];
  isLocked: boolean;
  mediaItems: MediaItem[];
  programs: Program[];
  request: CreationRequest;
  onAddHost: (host: string) => void;
  onChangeKind: (kind: ScheduleBlock["kind"]) => void;
  onDelete?: () => void;
  onSave: (block: ScheduleBlockDraft) => void;
  onUploadMedia: (file: File) => Promise<MediaItem>;
}) {
  const defaultStartMinutes = request.hour * 60;
  const defaultEndMinutes = Math.min(1439, defaultStartMinutes + 60);
  const initialKind = editingBlock?.kind ?? request.kind ?? "recording";
  const initialMediaId =
    editingBlock?.mediaId ?? findMediaIdForFile(editingBlock?.file, mediaItems);
  const [slotKind, setSlotKind] = useState<ScheduleBlock["kind"]>(initialKind);
  const [title, setTitle] = useState(
    editingBlock?.title ??
      (initialKind === "broadcast" ? "Live Broadcast" : "New Recording")
  );
  const [description, setDescription] = useState(
    editingBlock?.description ?? ""
  );
  const [startTime, setStartTime] = useState(
    minutesToTimeInput(editingBlock?.startMinutes ?? defaultStartMinutes)
  );
  const [endTime, setEndTime] = useState(
    minutesToTimeInput(editingBlock?.endMinutes ?? defaultEndMinutes)
  );
  const [selectedHosts, setSelectedHosts] = useState<string[]>(
    editingBlock?.hosts ?? []
  );
  const [selectedProgramId, setSelectedProgramId] = useState(
    editingBlock?.programId ?? ""
  );
  const [selectedMediaId, setSelectedMediaId] = useState<string | null>(
    initialMediaId
  );
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [mediaDuration, setMediaDuration] = useState<number | undefined>(
    editingBlock?.file?.duration
  );
  const [saveError, setSaveError] = useState("");
  const selectedProgram = programs.find(
    (program) => program.id === selectedProgramId
  );
  const appliedProgramIdRef = useRef(editingBlock?.programId ?? "");

  // Load duration from library item URL when selection changes
  useEffect(() => {
    if (!selectedMediaId || mediaFile) {
      return;
    }

    const item = mediaItems.find((entry) => entry.id === selectedMediaId);

    if (!item || item.type !== "audio") {
      setMediaDuration(undefined);
      return;
    }

    let cancelled = false;
    loadAudioDuration(mediaUrl(item.url))
      .then((d) => {
        if (!cancelled) {
          setMediaDuration(d);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setMediaDuration(undefined);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [selectedMediaId, mediaFile, mediaItems]);

  // Load duration from local file when upload selection changes
  useEffect(() => {
    if (!mediaFile) {
      return;
    }

    if (!mediaFile.type.startsWith("audio/")) {
      setMediaDuration(undefined);
      return;
    }

    const objectUrl = URL.createObjectURL(mediaFile);
    let cancelled = false;

    loadAudioDuration(objectUrl)
      .then((d) => {
        if (!cancelled) {
          setMediaDuration(d);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setMediaDuration(undefined);
        }
      })
      .finally(() => URL.revokeObjectURL(objectUrl));

    return () => {
      cancelled = true;
    };
  }, [mediaFile]);

  useEffect(() => {
    if (editingBlock) {
      return;
    }

    setSlotKind(request.kind ?? "recording");
  }, [editingBlock, request.kind]);

  useEffect(() => {
    if (editingBlock) {
      return;
    }

    setTitle((currentTitle) => {
      if (
        currentTitle !== "Live Broadcast" &&
        currentTitle !== "New Recording" &&
        currentTitle.trim() !== ""
      ) {
        return currentTitle;
      }

      return slotKind === "broadcast" ? "Live Broadcast" : "New Recording";
    });
  }, [editingBlock, slotKind]);

  useEffect(() => {
    if (!selectedProgram) {
      appliedProgramIdRef.current = "";
      return;
    }

    if (isLocked || appliedProgramIdRef.current === selectedProgram.id) {
      return;
    }

    appliedProgramIdRef.current = selectedProgram.id;
    setTitle(selectedProgram.title);
    setDescription(selectedProgram.description);
    setSelectedHosts([selectedProgram.host]);
  }, [isLocked, selectedProgram]);

  const kind = slotKind;
  const selectedAudioItem = selectedMediaId
    ? mediaItems.find((entry) => entry.id === selectedMediaId)
    : undefined;
  const hasAudioSelection =
    kind === "recording" &&
    ((mediaFile?.type.startsWith("audio/") ?? false) ||
      selectedAudioItem?.type === "audio" ||
      Boolean(
        editingBlock?.mediaId &&
          editingBlock.file &&
          !mediaFile &&
          !selectedMediaId
      ));
  const playbackNotice = hasAudioSelection
    ? mediaPlaybackNotice(
        slotDurationSeconds(startTime, endTime),
        mediaDuration
      )
    : null;

  const isEditing = Boolean(editingBlock);

  return (
    <form
      className={[className, "creation-form"].filter(Boolean).join(" ")}
      onSubmit={(event) => {
        event.preventDefault();
        setSaveError("");

        const saveSlot = async () => {
          try {
            const startMinutes = timeInputToMinutes(startTime);
            const rawEndMinutes = timeInputToMinutes(endTime);
            const endMinutes =
              rawEndMinutes > startMinutes
                ? rawEndMinutes
                : Math.min(1439, startMinutes + 30);
            if (isLocked) {
              setSaveError("Past and current events can only be deleted.");
              return;
            }

            const nextHosts = selectedHosts
              .map((host) => host.trim())
              .filter(Boolean);

            if (nextHosts.length === 0) {
              setSaveError("Choose at least one host.");
              return;
            }

            const mediaSelection = await resolveMediaSelection({
              editingBlock,
              kind,
              mediaDuration,
              mediaFile,
              mediaItems,
              onUploadMedia,
              selectedMediaId,
            });

            onSave({
              kind,
              title:
                title.trim() ||
                (kind === "broadcast" ? "Live Broadcast" : "New Recording"),
              description: description.trim(),
              startMinutes,
              endMinutes,
              hosts: nextHosts,
              programId: selectedProgramId || undefined,
              file: mediaSelection.file,
              mediaId: mediaSelection.mediaId,
            });
          } catch {
            setSaveError("Could not save slot. Please try again.");
          }
        };

        saveSlot().catch(() => undefined);
      }}
    >
      <CreationPanelFields
        description={description}
        endTime={endTime}
        hosts={hosts}
        isLocked={isLocked}
        kind={kind}
        mediaFile={mediaFile}
        mediaItems={mediaItems}
        onAddHost={onAddHost}
        onChangeDescription={setDescription}
        onChangeEndTime={setEndTime}
        onChangeKind={onChangeKind}
        onChangeMediaFile={setMediaFile}
        onChangeSelectedHosts={setSelectedHosts}
        onChangeSelectedMediaId={setSelectedMediaId}
        onChangeSelectedProgramId={setSelectedProgramId}
        onChangeSlotKind={setSlotKind}
        onChangeStartTime={setStartTime}
        onChangeTitle={setTitle}
        playbackNotice={playbackNotice}
        programs={programs}
        selectedHosts={selectedHosts}
        selectedMediaId={selectedMediaId}
        selectedProgram={selectedProgram}
        selectedProgramId={selectedProgramId}
        startTime={startTime}
        title={title}
      />
      {saveError ? <p className="form-error">{saveError}</p> : null}
      <CreationPanelActions
        isEditing={isEditing}
        isLocked={isLocked}
        onDelete={onDelete}
      />
    </form>
  );
}

function CreationPanelFields({
  description,
  endTime,
  hosts,
  isLocked,
  kind,
  mediaFile,
  mediaItems,
  onAddHost,
  onChangeDescription,
  onChangeEndTime,
  onChangeKind,
  onChangeMediaFile,
  onChangeSelectedHosts,
  onChangeSelectedMediaId,
  onChangeSelectedProgramId,
  onChangeSlotKind,
  onChangeStartTime,
  onChangeTitle,
  playbackNotice,
  programs,
  selectedHosts,
  selectedMediaId,
  selectedProgram,
  selectedProgramId,
  startTime,
  title,
}: {
  description: string;
  endTime: string;
  hosts: string[];
  isLocked: boolean;
  kind: ScheduleBlock["kind"];
  mediaFile: File | null;
  mediaItems: MediaItem[];
  onAddHost: (host: string) => void;
  onChangeDescription: (description: string) => void;
  onChangeEndTime: (endTime: string) => void;
  onChangeKind: (kind: ScheduleBlock["kind"]) => void;
  onChangeMediaFile: (file: File | null) => void;
  onChangeSelectedHosts: (hosts: string[]) => void;
  onChangeSelectedMediaId: (mediaId: string | null) => void;
  onChangeSelectedProgramId: (programId: string) => void;
  onChangeSlotKind: (kind: ScheduleBlock["kind"]) => void;
  onChangeStartTime: (startTime: string) => void;
  onChangeTitle: (title: string) => void;
  playbackNotice: ReturnType<typeof mediaPlaybackNotice> | null;
  programs: Program[];
  selectedHosts: string[];
  selectedMediaId: string | null;
  selectedProgram: Program | undefined;
  selectedProgramId: string;
  startTime: string;
  title: string;
}) {
  return (
    <div className="creation-form-body">
      <fieldset className="slot-kind-field">
        <legend>Type</legend>
        <div className="slot-kind-toggle">
          <button
            className={kind === "recording" ? "is-selected" : ""}
            disabled={isLocked}
            onClick={() => {
              onChangeSlotKind("recording");
              onChangeKind("recording");
            }}
            type="button"
          >
            <ListMusic aria-hidden="true" size={14} strokeWidth={1.8} />
            Recording
          </button>
          <button
            className={kind === "broadcast" ? "is-selected" : ""}
            disabled={isLocked}
            onClick={() => {
              onChangeSlotKind("broadcast");
              onChangeKind("broadcast");
            }}
            type="button"
          >
            <Mic2 aria-hidden="true" size={14} strokeWidth={1.8} />
            Broadcast
          </button>
        </div>
      </fieldset>
      {selectedProgramId ? null : (
        <label>
          <span>Title</span>
          <input
            disabled={isLocked}
            onChange={(event) => onChangeTitle(event.target.value)}
            value={title}
          />
        </label>
      )}
      <div className="creation-form-times">
        <label>
          <span>Start time</span>
          <input
            disabled={isLocked}
            onChange={(event) => onChangeStartTime(event.target.value)}
            type="time"
            value={startTime}
          />
        </label>
        <label>
          <span>End time</span>
          <input
            disabled={isLocked}
            onChange={(event) => onChangeEndTime(event.target.value)}
            type="time"
            value={endTime}
          />
        </label>
      </div>
      {kind === "recording" ? (
        <MediaSlotField
          disabled={isLocked}
          mediaItems={mediaItems}
          onChangeUploadFile={(nextFile) => {
            onChangeMediaFile(nextFile);

            if (
              nextFile &&
              !selectedProgram &&
              (title === "New Recording" || title.trim() === "")
            ) {
              onChangeTitle(nextFile.name);
            }
          }}
          onSelectMedia={onChangeSelectedMediaId}
          playbackNotice={playbackNotice}
          selectedMediaId={selectedMediaId}
          uploadFile={mediaFile}
        />
      ) : null}
      <hr className="creation-form-divider" />
      <ProgramSearchSelect
        disabled={isLocked}
        onSelect={onChangeSelectedProgramId}
        options={programs.map((program) => ({
          id: program.id,
          title: program.title,
        }))}
        selectedId={selectedProgramId}
      />
      <HostMultiSelect
        createPlaceholder="New host name"
        disabled={isLocked}
        label="Host"
        onChange={onChangeSelectedHosts}
        onCreateOption={isLocked ? undefined : onAddHost}
        options={hosts}
        placeholder="Select hosts"
        value={selectedHosts}
      />
      <label>
        <span>Description</span>
        <textarea
          disabled={isLocked}
          onChange={(event) => onChangeDescription(event.target.value)}
          value={description}
        />
      </label>
    </div>
  );
}

function CreationPanelActions({
  isEditing,
  isLocked,
  onDelete,
}: {
  isEditing: boolean;
  isLocked: boolean;
  onDelete?: () => void;
}) {
  return (
    <div
      className={["form-actions", isEditing ? "form-actions--split" : ""]
        .filter(Boolean)
        .join(" ")}
    >
      {isEditing && onDelete ? (
        <button
          className="form-actions-delete"
          onClick={onDelete}
          type="button"
        >
          Delete
        </button>
      ) : null}
      {isLocked ? null : (
        <div className="form-actions-end">
          <button className="primary-action" type="submit">
            {isEditing ? "Update" : "Save"}
          </button>
        </div>
      )}
    </div>
  );
}

function ScheduleBlocksLayer({
  blocks,
  draggedBlockId,
  selectedBlockId,
  onDuplicateBlock,
  onRemoveBlock,
  onSelectBlock,
  onSetDragDropPreview,
  onSetDraggedBlockId,
}: {
  blocks: ScheduleBlock[];
  draggedBlockId: string | null;
  selectedBlockId: string | null;
  onDuplicateBlock: (blockId: string) => void;
  onRemoveBlock: (blockId: string) => void;
  onSelectBlock: (blockId: string | null) => void;
  onSetDragDropPreview: (preview: DragDropPreview | null) => void;
  onSetDraggedBlockId: (blockId: string | null) => void;
}) {
  return (
    <div
      aria-hidden={blocks.length === 0}
      className={[
        "schedule-blocks-layer",
        draggedBlockId ? "is-reordering" : "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <div className="schedule-blocks-lane">
        {blocks.map((block) => {
          const top =
            (Math.max(0, Math.min(1440, block.startMinutes)) / 1440) * 100;
          const height =
            (Math.max(
              1,
              Math.min(1440, block.endMinutes) - Math.max(0, block.startMinutes)
            ) /
              1440) *
            100;

          return (
            <ScheduleBlockCard
              block={block}
              isDragging={draggedBlockId === block.id}
              isSelected={selectedBlockId === block.id}
              key={block.id}
              layout={{ top: `${top}%`, height: `${height}%` }}
              onDragEnd={() => {
                onSetDraggedBlockId(null);
                onSetDragDropPreview(null);
              }}
              onDragStart={() => onSetDraggedBlockId(block.id)}
              onDuplicate={() => onDuplicateBlock(block.id)}
              onRemove={() => onRemoveBlock(block.id)}
              onSelect={() => onSelectBlock(block.id)}
            />
          );
        })}
      </div>
    </div>
  );
}

function ScheduleBlockCard({
  block,
  isDragging,
  isSelected,
  layout,
  onDragEnd,
  onDragStart,
  onDuplicate,
  onRemove,
  onSelect,
}: {
  block: ScheduleBlock;
  isDragging: boolean;
  isSelected: boolean;
  layout: { top: string; height: string };
  onDragEnd: () => void;
  onDragStart: () => void;
  onDuplicate: () => void;
  onRemove: () => void;
  onSelect: () => void;
}) {
  const Icon = block.kind === "broadcast" ? Mic2 : ListMusic;
  const durationMinutes = Math.max(30, block.endMinutes - block.startMinutes);
  const metaParts = [
    block.hosts.length > 0 ? block.hosts.join(", ") : "",
    formatSlotDuration(durationMinutes),
  ].filter(Boolean);

  return (
    <article
      className={[
        "schedule-block",
        block.kind === "broadcast" ? "is-broadcast" : "is-media",
        isSelected ? "is-selected" : "",
        isDragging ? "is-dragging" : "",
      ]
        .filter(Boolean)
        .join(" ")}
      style={layout}
    >
      <button
        aria-label={`Select ${block.title}`}
        className="schedule-block-select"
        draggable
        onClick={(event) => {
          event.stopPropagation();
          onSelect();
        }}
        onDoubleClick={(event) => {
          event.stopPropagation();
          onSelect();
        }}
        onDragEnd={onDragEnd}
        onDragStart={(event) => {
          event.dataTransfer.effectAllowed = "move";
          onDragStart();
        }}
        type="button"
      >
        <span aria-hidden="true" className="block-handle">
          <GripVertical aria-hidden="true" size={16} strokeWidth={1.8} />
        </span>
        <span className="block-copy">
          <strong>
            <Icon aria-hidden="true" size={12} strokeWidth={1.8} />
            {block.title}
          </strong>
          {metaParts.length > 0 ? <span>{metaParts.join(" · ")}</span> : null}
        </span>
      </button>
      {isSelected ? (
        <div className="block-actions">
          <button
            aria-label="Duplicate block"
            onClick={(event) => {
              event.stopPropagation();
              onDuplicate();
            }}
            type="button"
          >
            <Copy aria-hidden="true" size={14} strokeWidth={1.8} />
          </button>
          <button
            aria-label="Remove block"
            onClick={(event) => {
              event.stopPropagation();
              onRemove();
            }}
            type="button"
          >
            <Trash2 aria-hidden="true" size={14} strokeWidth={1.8} />
          </button>
        </div>
      ) : null}
    </article>
  );
}
