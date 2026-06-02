import type { FallbackSource } from "@rdio/rdio-core";
import {
  BookOpen,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Copy,
  GripVertical,
  ListMusic,
  Mic2,
  PanelLeftClose,
  PanelLeftOpen,
  Plus,
  Radio,
  Settings,
  Trash2,
  UserPlus,
  Users,
  X,
} from "lucide-react";
import type React from "react";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { createRoot } from "react-dom/client";
import { AuthGate, useAuth } from "./components/AuthGate";
import { FileUploadField } from "./components/FileUploadField";
import { HostAvatar, hostPalette } from "./components/HostAvatar";
import type { HostRecord } from "./components/HostsPage";
import { HostsPage } from "./components/HostsPage";
import { MediaPreviewThumb } from "./components/MediaPreviewThumb";
import { MediaSlotField } from "./components/MediaSlotField";
import { MembersPage } from "./components/MembersPage";
import { MultiSelect } from "./components/MultiSelect";
import { PlayerBar } from "./components/PlayerBar";
import { ProgramSearchSelect } from "./components/ProgramSearchSelect";
import { UserAccountMenu } from "./components/UserAccountMenu";
import { mockAnchorDate } from "./data/mockStation";
import { apiBaseUrl, apiFetch, mediaUrl } from "./lib/api";
import { formatFileSize } from "./utils";
import "./styles.css";

const hours = Array.from({ length: 24 }, (_, hour) => hour);
const defaultTimeZone = "UTC";
const viewPathPattern = /^\/([^/]+)\/?$/;

interface IcecastSettings {
  host: string;
  mount: string;
  port: number;
}

interface BroadcastIcecastSettings extends IcecastSettings {
  sourcePassword: string;
}

interface StationSummary {
  broadcastIcecast: IcecastSettings & { sourcePassword?: string };
  fallbackSource: FallbackSource;
  icecast: IcecastSettings;
  id: string;
  mount: string;
  name: string;
  slug: string;
  streamUrl: string;
  timezone: string;
}

function broadcastCredentialsFromStation(
  station: StationSummary
): BroadcastIcecastSettings | null {
  const { sourcePassword, host, port, mount } = station.broadcastIcecast;
  if (!sourcePassword) {
    return null;
  }

  return { host, port, mount, sourcePassword };
}

interface StationResponse {
  station: StationSummary;
}

interface UploadedFileSummary {
  duration?: number; // seconds
  name: string;
  size: number;
}

interface MediaItem {
  id: string;
  name: string;
  size: number;
  type: "audio" | "image";
  uploadedAt: string;
  url: string;
}

interface MediaResponse {
  media: MediaItem[];
}

interface ScheduleBlocksResponse {
  blocks: ScheduleBlock[];
  version: string;
}

interface ScheduleMutationResponse {
  blocks?: ScheduleBlock[];
  version?: string;
}

interface Program {
  description: string;
  host: string;
  id: string;
  title: string;
}

interface ScheduleBlock {
  dateKey: string;
  description: string;
  endMinutes: number;
  file?: UploadedFileSummary;
  hosts: string[];
  id: string;
  kind: "recording" | "broadcast";
  mediaId?: string;
  programId?: string;
  startMinutes: number;
  title: string;
}

type ScheduleBlockDraft = Omit<ScheduleBlock, "id" | "dateKey">;

interface DragDropPreview {
  canDrop: boolean;
  durationMinutes: number;
  startMinutes: number;
}

interface CreationRequest {
  dateKey: string;
  hour: number;
  kind: ScheduleBlock["kind"] | null;
}

type ViewName =
  | "schedule"
  | "programs"
  | "hosts"
  | "media"
  | "broadcast"
  | "members"
  | "settings";

const MOBILE_SIDEBAR_QUERY = "(max-width: 620px)";
const sidebarStorageKey = "rdio.sidebar.visible";

function readInitialSidebarVisible() {
  if (typeof window === "undefined") {
    return true;
  }

  try {
    const savedValue = window.localStorage.getItem(sidebarStorageKey);

    if (savedValue === "true") {
      return true;
    }

    if (savedValue === "false") {
      return false;
    }
  } catch {
    // Storage can be unavailable in private contexts; fall back to viewport defaults.
  }

  return !window.matchMedia(MOBILE_SIDEBAR_QUERY).matches;
}

function getHostNames(hosts: HostRecord[]): string[] {
  return hosts.map((host) => host.name);
}

function findHost(hosts: HostRecord[], name: string): HostRecord | undefined {
  return hosts.find((host) => host.name === name);
}

function addHostByName(hosts: HostRecord[], name: string): HostRecord[] {
  const normalized = name.trim();

  if (!normalized || hosts.some((host) => host.name === normalized)) {
    return hosts;
  }

  const colorId = hostPalette[hosts.length % hostPalette.length].id;

  return [...hosts, { name: normalized, colorId }];
}

function formatDateKey(date: Date) {
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

function formatDateKeyInTimeZone(date: Date, timeZone: string) {
  const parts = stationClockParts(date, timeZone);
  return `${parts.year}-${parts.month}-${parts.day}`;
}

function programTitleForBlock(
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

function dateFromKey(dateKey: string) {
  const [year, month, day] = dateKey.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function dateInTimeZone(date: Date, timeZone: string) {
  return dateFromKey(formatDateKeyInTimeZone(date, timeZone));
}

function formatDayTitle(date: Date) {
  return new Intl.DateTimeFormat(undefined, {
    weekday: "short",
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

function formatMonthLabel(date: Date) {
  return new Intl.DateTimeFormat(undefined, {
    month: "long",
    year: "numeric",
  }).format(date);
}

function formatHour(hour: number) {
  return new Intl.DateTimeFormat(undefined, {
    hour: "numeric",
  }).format(new Date(2026, 0, 1, hour));
}

function minutesToTimeInput(minutes: number) {
  const safeMinutes = Math.min(1439, Math.max(0, minutes));
  const hour = Math.floor(safeMinutes / 60);
  const minute = safeMinutes % 60;

  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

function timeInputToMinutes(value: string) {
  const [hour = "0", minute = "0"] = value.split(":");

  return Number(hour) * 60 + Number(minute);
}

function slotDurationSeconds(startTime: string, endTime: string) {
  const startMinutes = timeInputToMinutes(startTime);
  const rawEndMinutes = timeInputToMinutes(endTime);
  const endMinutes =
    rawEndMinutes > startMinutes
      ? rawEndMinutes
      : Math.min(1439, startMinutes + 30);

  return Math.max(0, endMinutes - startMinutes) * 60;
}

type MediaPlaybackNotice = "loop" | "truncate";

function mediaPlaybackNotice(
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

function formatUploadTime(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

function addDays(date: Date, offset: number) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + offset);
}

function formatNowClock(date = new Date(), timeZone = defaultTimeZone) {
  return new Intl.DateTimeFormat(undefined, {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    timeZone,
  }).format(date);
}

function getNowMinutes(date = new Date(), timeZone = defaultTimeZone) {
  const parts = stationClockParts(date, timeZone);
  return (
    Number(parts.hour) * 60 + Number(parts.minute) + Number(parts.second) / 60
  );
}

function getMinutesOffsetInGrid(grid: HTMLElement, minutes: number) {
  const safeMinutes = Math.max(0, Math.min(1440, minutes));

  return (safeMinutes / 1440) * grid.clientHeight;
}

function blockOverlapsHour(block: ScheduleBlock, hour: number) {
  const hourStart = hour * 60;
  const hourEnd = (hour + 1) * 60;

  return block.startMinutes < hourEnd && block.endMinutes > hourStart;
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

function clampBlockStart(startMinutes: number, durationMinutes: number) {
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

function blockConflictsWith(
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

function isBlockPastOrCurrent(
  block: ScheduleBlock,
  todayDateKey: string,
  nowMinutes: number
) {
  return (
    block.dateKey < todayDateKey ||
    (block.dateKey === todayDateKey && block.startMinutes <= nowMinutes)
  );
}

function buildDragDropPreview(
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

function loadAudioDuration(src: string): Promise<number> {
  return new Promise((resolve, reject) => {
    const audio = new Audio();
    audio.onloadedmetadata = () => resolve(audio.duration);
    audio.onerror = () => reject(new Error("Could not load audio"));
    audio.src = src;
  });
}

function formatSlotDuration(minutes: number): string {
  if (minutes < 60) {
    return `${minutes}min`;
  }
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m === 0 ? `${h}h` : `${h}h ${m}min`;
}

function buildDatePickerDays(monthDate: Date) {
  const firstOfMonth = new Date(
    monthDate.getFullYear(),
    monthDate.getMonth(),
    1
  );
  const gridStart = addDays(firstOfMonth, -firstOfMonth.getDay());

  return Array.from({ length: 42 }, (_, index) => addDays(gridStart, index));
}

function readViewName(): ViewName {
  const match = window.location.pathname.match(viewPathPattern);
  const view = match?.[1];

  return view === "programs" ||
    view === "hosts" ||
    view === "media" ||
    view === "broadcast" ||
    view === "members" ||
    view === "settings" ||
    view === "schedule"
    ? view
    : "schedule";
}

function App() {
  const { user } = useAuth();
  const [stations, setStations] = useState<StationSummary[]>([]);
  const [stationLoadFailed, setStationLoadFailed] = useState(false);
  const [activeView, setActiveView] = useState<ViewName>(readViewName);
  const [isSidebarVisible, setIsSidebarVisible] = useState(
    readInitialSidebarVisible
  );
  const [isMobileSidebar, setIsMobileSidebar] = useState(
    () =>
      typeof window !== "undefined" &&
      window.matchMedia(MOBILE_SIDEBAR_QUERY).matches
  );

  useEffect(() => {
    const media = window.matchMedia(MOBILE_SIDEBAR_QUERY);
    const syncMobileSidebar = () => setIsMobileSidebar(media.matches);

    syncMobileSidebar();
    media.addEventListener("change", syncMobileSidebar);

    return () => media.removeEventListener("change", syncMobileSidebar);
  }, []);

  useEffect(() => {
    try {
      window.localStorage.setItem(sidebarStorageKey, String(isSidebarVisible));
    } catch {
      // Ignore unavailable local storage.
    }
  }, [isSidebarVisible]);

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
  const scheduleVersionRef = useRef<string | null>(null);
  const [mediaItems, setMediaItems] = useState<MediaItem[]>([]);
  const [mediaFilter, setMediaFilter] = useState<"all" | MediaItem["type"]>(
    "all"
  );
  const [pendingMediaDeleteId, setPendingMediaDeleteId] = useState<
    string | null
  >(null);
  const [hosts, setHosts] = useState<HostRecord[]>([]);
  const [programs, setPrograms] = useState<Program[]>([]);
  const [creationRequest, setCreationRequest] =
    useState<CreationRequest | null>(null);
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);
  const [draggedBlockId, setDraggedBlockId] = useState<string | null>(null);
  const [dragDropPreview, setDragDropPreview] =
    useState<DragDropPreview | null>(null);
  const [scheduleFocusToken, setScheduleFocusToken] = useState(1);
  const [, setNowTick] = useState(0);
  const currentStation = stations[0] ?? null;
  const stationTimeZone = currentStation?.timezone ?? defaultTimeZone;

  useEffect(() => {
    const interval = window.setInterval(
      () => setNowTick((tick) => tick + 1),
      60_000
    );

    return () => window.clearInterval(interval);
  }, []);

  const focusScheduleNow = useCallback(() => {
    const today = dateInTimeZone(new Date(), stationTimeZone);
    setSelectedDate(today);
    setDatePickerMonth(new Date(today.getFullYear(), today.getMonth(), 1));
    setScheduleFocusToken((token) => token + 1);
    setCreationRequest(null);
    setSelectedBlockId(null);
  }, [stationTimeZone]);

  useEffect(() => {
    const handlePopState = () => {
      const nextView = readViewName();
      setActiveView(nextView);

      if (nextView === "schedule") {
        focusScheduleNow();
      }
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [focusScheduleNow]);

  useEffect(() => {
    let ignore = false;

    async function loadStation() {
      try {
        const response = await apiFetch(`${apiBaseUrl}/station`);

        if (!response.ok) {
          throw new Error(`Station request failed with ${response.status}`);
        }

        const data = (await response.json()) as StationResponse;

        if (!ignore) {
          setStations([data.station]);
          const stationToday = dateInTimeZone(
            new Date(),
            data.station.timezone
          );
          setSelectedDate(stationToday);
          setDatePickerMonth(
            new Date(stationToday.getFullYear(), stationToday.getMonth(), 1)
          );
          setStationLoadFailed(false);
        }
      } catch {
        if (!ignore) {
          setStations([]);
          setStationLoadFailed(true);
        }
      }
    }

    loadStation().catch(() => undefined);

    return () => {
      ignore = true;
    };
  }, []);

  useEffect(() => {
    let ignore = false;

    async function loadScheduleBlocks() {
      try {
        const response = await apiFetch(`${apiBaseUrl}/schedule-blocks`);

        if (!response.ok) {
          throw new Error(`Schedule request failed with ${response.status}`);
        }

        const data = (await response.json()) as ScheduleBlocksResponse;

        if (!ignore) {
          setBlocks(data.blocks);
          scheduleVersionRef.current = data.version;
          setIsScheduleLoaded(true);
          setScheduleSaveError("");
        }
      } catch {
        if (!ignore) {
          setBlocks([]);
          setIsScheduleLoaded(false);
        }
      }
    }

    loadScheduleBlocks().catch(() => undefined);

    return () => {
      ignore = true;
    };
  }, []);

  useEffect(() => {
    let ignore = false;
    async function load() {
      try {
        const res = await apiFetch(`${apiBaseUrl}/programs`);
        if (!res.ok) {
          return;
        }
        const data = (await res.json()) as { programs: Program[] };
        if (!ignore) {
          setPrograms(data.programs);
        }
      } catch {
        /* ignore */
      }
    }
    load().catch(() => undefined);
    return () => {
      ignore = true;
    };
  }, []);

  useEffect(() => {
    let ignore = false;
    async function load() {
      try {
        const res = await apiFetch(`${apiBaseUrl}/hosts`);
        if (!res.ok) {
          return;
        }
        const data = (await res.json()) as { hosts: HostRecord[] };
        if (!ignore) {
          setHosts(data.hosts);
        }
      } catch {
        /* ignore */
      }
    }
    load().catch(() => undefined);
    return () => {
      ignore = true;
    };
  }, []);

  useEffect(() => {
    if (!isScheduleLoaded) {
      return;
    }

    const timeout = window.setTimeout(() => {
      setScheduleSaveState("saving");
      const saveSchedule = async () => {
        try {
          const response = await apiFetch(`${apiBaseUrl}/schedule-blocks`, {
            body: JSON.stringify({
              blocks,
              version: scheduleVersionRef.current,
            }),
            headers: {
              "Content-Type": "application/json",
            },
            method: "PUT",
          });
          const data =
            (await response.json()) as Partial<ScheduleBlocksResponse> & {
              error?: string;
            };

          if (!response.ok) {
            if (
              response.status === 409 &&
              Array.isArray(data.blocks) &&
              typeof data.version === "string"
            ) {
              setBlocks(data.blocks);
              scheduleVersionRef.current = data.version;
            }

            setScheduleSaveState("idle");
            setScheduleSaveError(
              data.error ?? "Could not save schedule changes."
            );
            return;
          }

          if (typeof data.version === "string") {
            scheduleVersionRef.current = data.version;
          }

          setScheduleSaveState("saved");
          setScheduleSaveError("");
        } catch {
          setScheduleSaveState("idle");
          setScheduleSaveError("Could not save schedule changes.");
        }
      };

      saveSchedule().catch(() => undefined);
    }, 250);

    return () => window.clearTimeout(timeout);
  }, [blocks, isScheduleLoaded]);

  useEffect(() => {
    let ignore = false;

    async function loadMedia() {
      try {
        const response = await apiFetch(`${apiBaseUrl}/media`);

        if (!response.ok) {
          throw new Error(`Media request failed with ${response.status}`);
        }

        const data = (await response.json()) as MediaResponse;

        if (!ignore) {
          setMediaItems(data.media);
        }
      } catch {
        if (!ignore) {
          setMediaItems([]);
        }
      }
    }

    loadMedia().catch(() => undefined);

    return () => {
      ignore = true;
    };
  }, []);

  const stationName = currentStation?.name ?? "16 Radio";
  const selectedDateKey = formatDateKey(selectedDate);
  const dayBlocks = useMemo(
    () =>
      blocks
        .filter((block) => block.dateKey === selectedDateKey)
        .sort((a, b) => a.startMinutes - b.startMinutes),
    [blocks, selectedDateKey]
  );
  const todayDateKey = formatDateKeyInTimeZone(new Date(), stationTimeZone);
  const todayBlocks = useMemo(
    () =>
      blocks
        .filter((block) => block.dateKey === todayDateKey)
        .sort((a, b) => a.startMinutes - b.startMinutes),
    [blocks, todayDateKey]
  );
  const currentOnAirBlock = useMemo(() => {
    const nowMinutes = getNowMinutes(new Date(), stationTimeZone);

    return todayBlocks.find(
      (block) =>
        block.startMinutes <= nowMinutes && block.endMinutes > nowMinutes
    );
  }, [stationTimeZone, todayBlocks]);
  const playerProgramName = programTitleForBlock(currentOnAirBlock, programs);
  const scheduleSaveMessage =
    scheduleSaveError || scheduleSaveStateMessage(scheduleSaveState);
  const changeView = (nextView: ViewName) => {
    window.history.pushState(
      {},
      "",
      nextView === "schedule" ? "/schedule" : `/${nextView}`
    );
    setActiveView(nextView);

    if (nextView === "schedule") {
      focusScheduleNow();
    } else {
      setCreationRequest(null);
      setSelectedBlockId(null);
    }

    if (window.matchMedia(MOBILE_SIDEBAR_QUERY).matches) {
      setIsSidebarVisible(false);
    }
  };

  const moveDay = (offset: number) => {
    setSelectedDate((current) => {
      const nextDate = addDays(current, offset);
      setDatePickerMonth(
        new Date(nextDate.getFullYear(), nextDate.getMonth(), 1)
      );
      return nextDate;
    });
    setCreationRequest(null);
    setSelectedBlockId(null);
  };

  const selectDate = (nextDate: Date) => {
    setSelectedDate(nextDate);
    setDatePickerMonth(
      new Date(nextDate.getFullYear(), nextDate.getMonth(), 1)
    );
    setIsDatePickerOpen(false);
    setCreationRequest(null);
    setSelectedBlockId(null);
  };

  const saveBlock = (blockInput: ScheduleBlockDraft) => {
    const request = creationRequest;

    if (!request) {
      return;
    }

    const nextBlock: ScheduleBlock = {
      ...blockInput,
      id: crypto.randomUUID(),
      dateKey: request.dateKey,
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
        id: crypto.randomUUID(),
        title: `${block.title} copy`,
        startMinutes,
        endMinutes: startMinutes + duration,
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
          startMinutes: nextStartMinutes,
          endMinutes: nextStartMinutes + duration,
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
          startMinutes: nextStartMinutes,
          endMinutes: nextStartMinutes + duration,
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
    setCreationRequest(null);
    setSelectedBlockId(null);
  };

  const selectBlock = (blockId: string | null) => {
    if (blockId === null) {
      closeSlotPanel();
      return;
    }

    setCreationRequest(null);
    setSelectedBlockId((current) => (current === blockId ? null : blockId));
  };

  const uploadMedia = async (file: File): Promise<MediaItem> => {
    const response = await apiFetch(`${apiBaseUrl}/media`, {
      body: file,
      headers: {
        "Content-Type": file.type || "application/octet-stream",
        "X-File-Name": file.name,
      },
      method: "POST",
    });

    if (!response.ok) {
      throw new Error(`Upload failed with ${response.status}`);
    }

    const data = (await response.json()) as { media: MediaItem };
    setMediaItems((current) => [
      data.media,
      ...current.filter((item) => item.id !== data.media.id),
    ]);
    return data.media;
  };

  const applyScheduleMutation = (data: ScheduleMutationResponse) => {
    if (Array.isArray(data.blocks)) {
      setBlocks(data.blocks);
    }

    if (typeof data.version === "string") {
      scheduleVersionRef.current = data.version;
    }

    setScheduleSaveError("");
  };

  const deleteMedia = async (mediaId: string) => {
    const response = await apiFetch(
      `${apiBaseUrl}/media/${encodeURIComponent(mediaId)}`,
      {
        method: "DELETE",
      }
    );

    if (!response.ok) {
      throw new Error(`Delete failed with ${response.status}`);
    }

    const data = (await response.json()) as ScheduleMutationResponse;
    setMediaItems((current) => current.filter((item) => item.id !== mediaId));
    applyScheduleMutation(data);
  };

  return (
    <main className="app-page">
      <section
        aria-label="Rdio scheduler"
        className={
          currentStation ? "app-shell" : "app-shell is-station-loading"
        }
      >
        <PageHeader
          alignWithSidebar={
            isSidebarVisible && currentStation !== null && !isMobileSidebar
          }
          isSidebarOpen={isSidebarVisible}
          onToggleSidebar={() => setIsSidebarVisible((current) => !current)}
        />
        {activeView === "schedule" && scheduleSaveMessage ? (
          <p aria-live="polite" className="schedule-save-status">
            {scheduleSaveMessage}
          </p>
        ) : null}
        <div
          className={
            isSidebarVisible && currentStation && !isMobileSidebar
              ? "app-body has-sidebar"
              : "app-body"
          }
        >
          {currentStation && isSidebarVisible && isMobileSidebar ? (
            <button
              aria-label="Close menu"
              className="sidebar-backdrop"
              onClick={() => setIsSidebarVisible(false)}
              type="button"
            />
          ) : null}
          {currentStation && isSidebarVisible ? (
            <AppSidebar
              activeView={activeView}
              isMobileOverlay={isMobileSidebar}
              onChangeView={changeView}
            />
          ) : null}
          <div className={currentStation ? "shell station-shell" : "shell"}>
            {currentStation ? (
              activeView === "schedule" ? (
                <DailyCalendar
                  blocks={dayBlocks}
                  creationRequest={creationRequest}
                  datePickerMonth={datePickerMonth}
                  dragDropPreview={dragDropPreview}
                  draggedBlockId={draggedBlockId}
                  focusNowToken={scheduleFocusToken}
                  hosts={getHostNames(hosts)}
                  isDatePickerOpen={isDatePickerOpen}
                  isMobileLayout={isMobileSidebar}
                  mediaItems={mediaItems}
                  onAddHost={async (hostName) => {
                    const host = addHostByName(hosts, hostName).at(
                      hosts.length
                    );
                    if (!host) {
                      return;
                    }
                    const res = await apiFetch(`${apiBaseUrl}/hosts`, {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify(host),
                    });
                    if (res.ok) {
                      setHosts((current) => addHostByName(current, hostName));
                    }
                  }}
                  onBeginCreate={beginCreate}
                  onChangeCreationKind={(kind) =>
                    setCreationRequest((current) =>
                      current ? { ...current, kind } : current
                    )
                  }
                  onCloseSlotPanel={closeSlotPanel}
                  onDatePickerMonthChange={setDatePickerMonth}
                  onDuplicateBlock={duplicateBlock}
                  onMoveBlock={moveBlock}
                  onMoveDay={moveDay}
                  onRemoveBlock={removeBlock}
                  onSaveBlock={saveBlock}
                  onSelectBlock={selectBlock}
                  onSelectDate={selectDate}
                  onSetDragDropPreview={setDragDropPreview}
                  onSetDraggedBlockId={setDraggedBlockId}
                  onToggleDatePicker={() =>
                    setIsDatePickerOpen((current) => !current)
                  }
                  onUpdateBlock={updateBlock}
                  onUploadMedia={uploadMedia}
                  programs={programs}
                  selectedBlockId={selectedBlockId}
                  selectedDate={selectedDate}
                  selectedDateKey={selectedDateKey}
                  stationTimeZone={stationTimeZone}
                  todayDateKey={todayDateKey}
                />
              ) : activeView === "programs" ? (
                <ProgramsPage
                  hosts={hosts}
                  onAddHost={async (hostName) => {
                    const host = addHostByName(hosts, hostName).at(
                      hosts.length
                    );
                    if (!host) {
                      return;
                    }
                    const res = await apiFetch(`${apiBaseUrl}/hosts`, {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify(host),
                    });
                    if (res.ok) {
                      setHosts((current) => addHostByName(current, hostName));
                    }
                  }}
                  onCreateProgram={async (program) => {
                    const res = await apiFetch(`${apiBaseUrl}/programs`, {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify(program),
                    });
                    if (res.ok) {
                      const data = (await res.json()) as { program: Program };
                      setPrograms((current) => [...current, data.program]);
                    }
                  }}
                  onDeleteProgram={async (programId) => {
                    const res = await apiFetch(
                      `${apiBaseUrl}/programs/${programId}`,
                      { method: "DELETE" }
                    );
                    if (res.ok) {
                      const data =
                        (await res.json()) as ScheduleMutationResponse;
                      setPrograms((current) =>
                        current.filter((item) => item.id !== programId)
                      );
                      applyScheduleMutation(data);
                    }
                  }}
                  onUpdateProgram={async (programId, program) => {
                    const res = await apiFetch(
                      `${apiBaseUrl}/programs/${programId}`,
                      {
                        method: "PUT",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify(program),
                      }
                    );
                    if (res.ok) {
                      const data = (await res.json()) as {
                        program: Program;
                      } & ScheduleMutationResponse;
                      setPrograms((current) =>
                        current.map((item) =>
                          item.id === programId ? data.program : item
                        )
                      );
                      applyScheduleMutation(data);
                    }
                  }}
                  programs={programs}
                />
              ) : activeView === "hosts" ? (
                <HostsPage
                  hosts={hosts}
                  onAddHost={async (host) => {
                    const res = await apiFetch(`${apiBaseUrl}/hosts`, {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify(host),
                    });
                    if (res.ok) {
                      setHosts((current) =>
                        current.some((item) => item.name === host.name)
                          ? current
                          : [...current, host]
                      );
                    }
                  }}
                  onRemoveHost={async (hostName) => {
                    const res = await apiFetch(
                      `${apiBaseUrl}/hosts/${encodeURIComponent(hostName)}`,
                      { method: "DELETE" }
                    );
                    if (res.ok) {
                      setHosts((current) =>
                        current.filter((item) => item.name !== hostName)
                      );
                    }
                  }}
                  onUpdateHost={async (hostName, host) => {
                    const res = await apiFetch(
                      `${apiBaseUrl}/hosts/${encodeURIComponent(hostName)}`,
                      {
                        method: "PUT",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify(host),
                      }
                    );
                    if (res.ok) {
                      const data = (await res.json()) as {
                        host: HostRecord;
                      } & ScheduleMutationResponse;
                      setHosts((current) =>
                        current.map((item) =>
                          item.name === hostName ? host : item
                        )
                      );
                      if (hostName !== host.name) {
                        setPrograms((current) =>
                          current.map((item) =>
                            item.host === hostName
                              ? { ...item, host: host.name }
                              : item
                          )
                        );
                        applyScheduleMutation(data);
                      }
                    }
                  }}
                />
              ) : activeView === "media" ? (
                <MediaPage
                  filter={mediaFilter}
                  mediaItems={mediaItems}
                  onChangeFilter={setMediaFilter}
                  onDeleteMedia={async (mediaId) => {
                    const scheduledUseCount = blocks.filter(
                      (block) => block.mediaId === mediaId
                    ).length;

                    if (scheduledUseCount > 0) {
                      setPendingMediaDeleteId(mediaId);
                      return;
                    }

                    await deleteMedia(mediaId);
                  }}
                  onUploadMedia={uploadMedia}
                />
              ) : activeView === "broadcast" ? (
                <BroadcastPage station={currentStation} />
              ) : activeView === "members" &&
                user.role?.split(",").includes("admin") ? (
                <MembersPage />
              ) : (
                <StationSettings station={currentStation} />
              )
            ) : (
              <StationLoading failed={stationLoadFailed} />
            )}
          </div>
        </div>
        <PlayerBar
          channelName={stationName}
          programKind={currentOnAirBlock?.kind ?? "broadcast"}
          programName={playerProgramName}
          streamUrl={currentStation?.streamUrl ?? ""}
        />
      </section>
      {pendingMediaDeleteId ? (
        <Modal
          onClose={() => setPendingMediaDeleteId(null)}
          title="Delete scheduled media?"
        >
          <div className="confirm-dialog">
            <p>
              This media file is used by{" "}
              {
                blocks.filter((block) => block.mediaId === pendingMediaDeleteId)
                  .length
              }{" "}
              schedule slot
              {blocks.filter((block) => block.mediaId === pendingMediaDeleteId)
                .length === 1
                ? ""
                : "s"}
              . Delete it and clear those slots?
            </p>
            <div className="form-actions">
              <button
                onClick={() => setPendingMediaDeleteId(null)}
                type="button"
              >
                Cancel
              </button>
              <button
                className="primary-action"
                onClick={() => {
                  const mediaId = pendingMediaDeleteId;
                  setPendingMediaDeleteId(null);
                  deleteMedia(mediaId).catch(() => undefined);
                }}
                type="button"
              >
                Delete media
              </button>
            </div>
          </div>
        </Modal>
      ) : null}
    </main>
  );
}

function PageHeader({
  alignWithSidebar,
  isSidebarOpen,
  onToggleSidebar,
}: {
  alignWithSidebar: boolean;
  isSidebarOpen: boolean;
  onToggleSidebar: () => void;
}) {
  const { logout, user } = useAuth();
  const SidebarIcon = isSidebarOpen ? PanelLeftClose : PanelLeftOpen;

  return (
    <header
      className={alignWithSidebar ? "page-header has-sidebar" : "page-header"}
    >
      <div className="page-header-lead">
        <button
          aria-expanded={isSidebarOpen}
          aria-label="Toggle sidebar"
          className="sidebar-toggle"
          onClick={onToggleSidebar}
          type="button"
        >
          <SidebarIcon aria-hidden="true" size={14} strokeWidth={1.8} />
        </button>
      </div>
      <div className="page-header-main">
        <UserAccountMenu
          firstName={user.name.split(" ")[0] ?? user.name}
          onLogout={() => {
            logout().catch(() => undefined);
          }}
        />
      </div>
      <div className="brand-mark">rdio</div>
    </header>
  );
}

function AppSidebar({
  activeView,
  isMobileOverlay,
  onChangeView,
}: {
  activeView: ViewName;
  isMobileOverlay: boolean;
  onChangeView: (view: ViewName) => void;
}) {
  const { user } = useAuth();

  return (
    <aside
      aria-label="Library"
      className={isMobileOverlay ? "sidebar is-mobile-overlay" : "sidebar"}
    >
      <nav aria-label="Station views" className="sidebar-nav">
        <SidebarButton
          active={activeView === "schedule"}
          icon={CalendarDays}
          label="Schedule"
          onClick={() => onChangeView("schedule")}
        />
        <SidebarButton
          active={activeView === "broadcast"}
          icon={Radio}
          label="Broadcast"
          onClick={() => onChangeView("broadcast")}
        />
        <SidebarButton
          active={activeView === "programs"}
          icon={BookOpen}
          label="Programs"
          onClick={() => onChangeView("programs")}
        />
        <SidebarButton
          active={activeView === "hosts"}
          icon={Users}
          label="Hosts"
          onClick={() => onChangeView("hosts")}
        />
        <SidebarButton
          active={activeView === "media"}
          icon={ListMusic}
          label="Media"
          onClick={() => onChangeView("media")}
        />
        {user.role?.split(",").includes("admin") ? (
          <SidebarButton
            active={activeView === "members"}
            icon={UserPlus}
            label="Members"
            onClick={() => onChangeView("members")}
          />
        ) : null}
        <SidebarButton
          active={activeView === "settings"}
          icon={Settings}
          label="Settings"
          onClick={() => onChangeView("settings")}
        />
      </nav>
      <div className="sidebar-footer">
        <span className="sidebar-studio-name">rdio</span>
        <span className="sidebar-copyright">© {new Date().getFullYear()}</span>
      </div>
    </aside>
  );
}

function SidebarButton({
  active,
  icon: Icon,
  label,
  onClick,
}: {
  active: boolean;
  icon: React.ComponentType<
    React.SVGProps<SVGSVGElement> & { size?: number; strokeWidth?: number }
  >;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      className={active ? "is-active" : ""}
      onClick={onClick}
      type="button"
    >
      <Icon aria-hidden={true} size={14} strokeWidth={1.8} />
      {label}
    </button>
  );
}

function StationLoading({ failed }: { failed: boolean }) {
  return (
    <section aria-label="Station loading" className="empty-page">
      <p>
        {failed
          ? "Could not connect to the API. Check that the API server is running."
          : "Loading station…"}
      </p>
    </section>
  );
}

function Modal({
  children,
  onClose,
  title,
}: {
  children: React.ReactNode;
  onClose: () => void;
  title: string;
}) {
  return (
    <div className="modal-backdrop">
      <button
        aria-label="Close modal"
        className="modal-backdrop-close"
        onClick={onClose}
        type="button"
      />
      <section
        aria-label={title}
        aria-modal="true"
        className="modal-panel"
        role="dialog"
      >
        <div className="modal-header">
          <strong>{title}</strong>
          <button aria-label="Close modal" onClick={onClose} type="button">
            <X aria-hidden="true" size={15} strokeWidth={1.8} />
          </button>
        </div>
        {children}
      </section>
    </div>
  );
}

function findMediaIdForFile(
  file: UploadedFileSummary | undefined,
  mediaItems: MediaItem[]
) {
  if (!file) {
    return null;
  }

  const match = mediaItems.find(
    (item) => item.name === file.name && item.size === file.size
  );
  return match?.id ?? null;
}

function slotPanelTitle(editingBlock?: ScheduleBlock) {
  if (editingBlock) {
    return "Edit Slot";
  }

  return "New Slot";
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

function DailyCalendar({
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

  const resolveMediaSelection = async () => {
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
  };

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

            const mediaSelection = await resolveMediaSelection();

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
      <div className="creation-form-body">
        <fieldset className="slot-kind-field">
          <legend>Type</legend>
          <div className="slot-kind-toggle">
            <button
              className={kind === "recording" ? "is-selected" : ""}
              disabled={isLocked}
              onClick={() => {
                setSlotKind("recording");
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
                setSlotKind("broadcast");
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
              onChange={(event) => setTitle(event.target.value)}
              value={title}
            />
          </label>
        )}
        <div className="creation-form-times">
          <label>
            <span>Start time</span>
            <input
              disabled={isLocked}
              onChange={(event) => setStartTime(event.target.value)}
              type="time"
              value={startTime}
            />
          </label>
          <label>
            <span>End time</span>
            <input
              disabled={isLocked}
              onChange={(event) => setEndTime(event.target.value)}
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
              setMediaFile(nextFile);

              if (
                nextFile &&
                !selectedProgram &&
                (title === "New Recording" || title.trim() === "")
              ) {
                setTitle(nextFile.name);
              }
            }}
            onSelectMedia={setSelectedMediaId}
            playbackNotice={playbackNotice}
            selectedMediaId={selectedMediaId}
            uploadFile={mediaFile}
          />
        ) : null}
        <hr className="creation-form-divider" />
        <ProgramSearchSelect
          disabled={isLocked}
          onSelect={setSelectedProgramId}
          options={programs.map((program) => ({
            id: program.id,
            title: program.title,
          }))}
          selectedId={selectedProgramId}
        />
        <MultiSelect
          createPlaceholder="New host name"
          disabled={isLocked}
          label="Host"
          onChange={setSelectedHosts}
          onCreateOption={isLocked ? undefined : onAddHost}
          options={hosts}
          placeholder="Select hosts"
          value={selectedHosts}
        />
        <label>
          <span>Description</span>
          <textarea
            disabled={isLocked}
            onChange={(event) => setDescription(event.target.value)}
            value={description}
          />
        </label>
      </div>
      {saveError ? <p className="form-error">{saveError}</p> : null}
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
              {editingBlock ? "Update" : "Save"}
            </button>
          </div>
        )}
      </div>
    </form>
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

function ProgramsPage({
  hosts,
  programs,
  onAddHost,
  onCreateProgram,
  onUpdateProgram,
  onDeleteProgram,
}: {
  hosts: HostRecord[];
  programs: Program[];
  onAddHost: (hostName: string) => void;
  onCreateProgram: (program: Omit<Program, "id">) => void;
  onUpdateProgram: (programId: string, program: Omit<Program, "id">) => void;
  onDeleteProgram: (programId: string) => void;
}) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProgramId, setEditingProgramId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const hostNames = getHostNames(hosts);
  const [host, setHost] = useState<string[]>(
    hostNames[0] ? [hostNames[0]] : []
  );

  const openCreateModal = () => {
    setEditingProgramId(null);
    setTitle("");
    setDescription("");
    setHost(hostNames[0] ? [hostNames[0]] : []);
    setIsModalOpen(true);
  };

  const openEditModal = (program: Program) => {
    setEditingProgramId(program.id);
    setTitle(program.title);
    setDescription(program.description);
    setHost([program.host]);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingProgramId(null);
    setTitle("");
    setDescription("");
    setHost(hostNames[0] ? [hostNames[0]] : []);
  };

  useEffect(() => {
    if (isModalOpen || host.length > 0) {
      return;
    }

    if (hostNames[0]) {
      setHost([hostNames[0]]);
    }
  }, [host.length, hostNames, isModalOpen]);

  const saveProgram = () => {
    const normalizedTitle = title.trim();
    const normalizedDescription = description.trim();
    const selectedHost = host[0]?.trim();

    if (!(normalizedTitle && selectedHost)) {
      return;
    }

    const programInput = {
      title: normalizedTitle,
      description: normalizedDescription,
      host: selectedHost,
    };

    if (editingProgramId) {
      onUpdateProgram(editingProgramId, programInput);
    } else {
      onCreateProgram(programInput);
    }

    closeModal();
  };

  return (
    <section aria-label="Programs" className="library-view">
      <div className="library-header">
        <div>
          <BookOpen aria-hidden="true" size={18} strokeWidth={1.8} />
          <strong>Programs</strong>
        </div>
        <button onClick={openCreateModal} type="button">
          <Plus aria-hidden="true" size={15} strokeWidth={1.8} />
          New program
        </button>
      </div>
      {isModalOpen ? (
        <Modal
          onClose={closeModal}
          title={editingProgramId ? "Edit program" : "New program"}
        >
          <form
            className="program-create-form"
            onSubmit={(event) => {
              event.preventDefault();
              saveProgram();
            }}
          >
            <label>
              <span>Program</span>
              <input
                onChange={(event) => setTitle(event.target.value)}
                value={title}
              />
            </label>
            <label>
              <span>Description</span>
              <textarea
                onChange={(event) => setDescription(event.target.value)}
                value={description}
              />
            </label>
            <MultiSelect
              createPlaceholder="New host name"
              label="Host"
              multiple={false}
              onChange={setHost}
              onCreateOption={onAddHost}
              options={hostNames}
              placeholder="Select host"
              value={host}
            />
            <div className="form-actions">
              <button className="primary-action" type="submit">
                {editingProgramId ? "Update program" : "Save program"}
              </button>
            </div>
          </form>
        </Modal>
      ) : null}
      <div className="library-list">
        {programs.map((program) => {
          const hostRecord = findHost(hosts, program.host);

          return (
            <article className="library-row program-row" key={program.id}>
              <div className="program-row-body">
                <HostAvatar
                  colorId={hostRecord?.colorId}
                  name={program.host}
                  title={program.host}
                />
                <div className="program-row-copy">
                  <strong>{program.title}</strong>
                  <p className="program-row-meta">
                    <span className="program-row-host">{program.host}</span>
                    {program.description ? (
                      <>
                        <span
                          aria-hidden="true"
                          className="program-row-meta-sep"
                        >
                          ·
                        </span>
                        <span className="program-row-description">
                          {program.description}
                        </span>
                      </>
                    ) : null}
                  </p>
                </div>
              </div>
              <div className="library-actions">
                <button
                  aria-label={`Edit ${program.title}`}
                  onClick={() => openEditModal(program)}
                  type="button"
                >
                  <Settings aria-hidden="true" size={14} strokeWidth={1.8} />
                </button>
                <button
                  aria-label={`Delete ${program.title}`}
                  onClick={() => onDeleteProgram(program.id)}
                  type="button"
                >
                  <Trash2 aria-hidden="true" size={14} strokeWidth={1.8} />
                </button>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}

function MediaPage({
  filter,
  mediaItems,
  onChangeFilter,
  onDeleteMedia,
  onUploadMedia,
}: {
  filter: "all" | MediaItem["type"];
  mediaItems: MediaItem[];
  onChangeFilter: (filter: "all" | MediaItem["type"]) => void;
  onDeleteMedia: (mediaId: string) => Promise<void>;
  onUploadMedia: (file: File) => Promise<MediaItem>;
}) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [error, setError] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const visibleItems = mediaItems.filter(
    (item) => filter === "all" || item.type === filter
  );

  const uploadMedia = async () => {
    if (!selectedFile) {
      return;
    }

    setError("");
    setIsUploading(true);

    try {
      await onUploadMedia(selectedFile);
      setSelectedFile(null);
      setIsModalOpen(false);
    } catch {
      setError("Upload failed. Please try again.");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <section aria-label="Media" className="library-view">
      <div className="library-header">
        <div>
          <ListMusic aria-hidden="true" size={18} strokeWidth={1.8} />
          <strong>Media</strong>
        </div>
        <button onClick={() => setIsModalOpen(true)} type="button">
          <Plus aria-hidden="true" size={15} strokeWidth={1.8} />
          Upload media
        </button>
      </div>
      <fieldset aria-label="Media type" className="library-tabs">
        <button
          className={filter === "all" ? "is-active" : ""}
          onClick={() => onChangeFilter("all")}
          type="button"
        >
          All
        </button>
        <button
          className={filter === "audio" ? "is-active" : ""}
          onClick={() => onChangeFilter("audio")}
          type="button"
        >
          Audio
        </button>
        <button
          className={filter === "image" ? "is-active" : ""}
          onClick={() => onChangeFilter("image")}
          type="button"
        >
          Images
        </button>
      </fieldset>
      {!isModalOpen && error ? <p className="form-error">{error}</p> : null}
      {isModalOpen ? (
        <Modal
          onClose={() => {
            setIsModalOpen(false);
            setSelectedFile(null);
            setError("");
          }}
          title="Upload media"
        >
          <form
            className="media-upload-form"
            onSubmit={(event) => {
              event.preventDefault();
              uploadMedia();
            }}
          >
            <FileUploadField
              accept="audio/*,image/*"
              emptyLabel="Choose audio or image"
              file={selectedFile}
              label="Media file"
              onChange={(nextFile) => {
                setError("");
                setSelectedFile(nextFile);
              }}
            />
            {error ? <p className="form-error">{error}</p> : null}
            <div className="form-actions">
              <button
                className="primary-action"
                disabled={!selectedFile || isUploading}
                type="submit"
              >
                {isUploading ? "Uploading" : "Upload"}
              </button>
            </div>
          </form>
        </Modal>
      ) : null}
      <div className="library-list">
        {visibleItems.length === 0 ? (
          <p className="library-empty">No media uploaded</p>
        ) : null}
        {visibleItems.map((item) => (
          <article className="library-row media-row" key={item.id}>
            <div className="media-row-body">
              <MediaPreviewThumb
                apiBaseUrl={apiBaseUrl}
                name={item.name}
                type={item.type}
                url={item.url}
              />
              <div className="media-row-copy">
                <strong>{item.name}</strong>
                <span>
                  {item.type} · {formatUploadTime(item.uploadedAt)} ·{" "}
                  {formatFileSize(item.size)}
                </span>
              </div>
            </div>
            <div className="library-actions">
              <button
                aria-label={`Delete ${item.name}`}
                onClick={() => {
                  setError("");
                  onDeleteMedia(item.id).catch(() =>
                    setError("Delete failed. Please try again.")
                  );
                }}
                type="button"
              >
                <Trash2 aria-hidden="true" size={14} strokeWidth={1.8} />
              </button>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function BroadcastPage({ station }: { station: StationSummary }) {
  const [isConnected, setIsConnected] = useState(false);
  const [broadcastSettings, setBroadcastSettings] =
    useState<BroadcastIcecastSettings | null>(() =>
      broadcastCredentialsFromStation(station)
    );
  const [settingsError, setSettingsError] = useState("");
  const icecast = broadcastSettings ?? station.broadcastIcecast;
  const mount = icecast.mount.replace(/^\//, "");
  const sourcePassword = broadcastSettings?.sourcePassword;

  useEffect(() => {
    let cancelled = false;
    async function poll() {
      try {
        const res = await fetch(`${apiBaseUrl}/broadcast/status`);
        if (!cancelled && res.ok) {
          const data = (await res.json()) as { active: boolean };
          setIsConnected(data.active);
        }
      } catch {
        /* ignore */
      }
      if (!cancelled) {
        setTimeout(poll, 3000);
      }
    }
    poll().catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadBroadcastSettings() {
      try {
        const res = await apiFetch(`${apiBaseUrl}/broadcast/settings`);
        if (res.status === 404) {
          if (!(cancelled || broadcastCredentialsFromStation(station))) {
            setSettingsError(
              "Broadcast credentials are unavailable. Redeploy the API."
            );
          }
          return;
        }
        if (!res.ok) {
          throw new Error(
            `Broadcast settings request failed with ${res.status}`
          );
        }
        const data = (await res.json()) as {
          broadcastIcecast: BroadcastIcecastSettings;
        };

        if (!cancelled) {
          setBroadcastSettings(data.broadcastIcecast);
          setSettingsError("");
        }
      } catch {
        if (!(cancelled || broadcastCredentialsFromStation(station))) {
          setSettingsError(
            "Broadcast credentials are unavailable. Sign in again or check the API deployment."
          );
        }
      }
    }

    loadBroadcastSettings().catch(() => undefined);

    return () => {
      cancelled = true;
    };
  }, [station]);

  return (
    <section aria-label="Broadcast" className="broadcast-view">
      <div className="library-header">
        <div>
          <Radio aria-hidden="true" size={18} strokeWidth={1.8} />
          <strong>Broadcast</strong>
        </div>
      </div>
      <div className="broadcast-console">
        <section
          aria-label="Broadcast source status"
          className="broadcast-status-panel"
        >
          <div
            aria-hidden="true"
            className={isConnected ? "source-light is-on" : "source-light"}
          />
          <div>
            <strong>
              {isConnected ? "Source connected" : "Waiting for source"}
            </strong>
            <span>
              {isConnected
                ? "BUTT is connected to the station input."
                : "Connect BUTT with the settings below."}
            </span>
          </div>
        </section>
        <section aria-label="BUTT settings" className="broadcast-settings">
          {settingsError ? <p className="form-error">{settingsError}</p> : null}
          <div className="settings-list">
            <SettingsRow label="Application" value="BUTT" />
            <SettingsRow
              label="Server type"
              value="Icecast / Liquidsoap Harbor"
            />
            <SettingsRow label="Address" value={icecast.host} />
            <SettingsRow label="Port" value={String(icecast.port)} />
            <SettingsRow label="User" value="source" />
            <SettingsRow
              label="Password"
              value={sourcePassword ?? "Unavailable"}
            />
            <SettingsRow label="Mount" value={mount} />
          </div>
        </section>
      </div>
    </section>
  );
}

function StationSettings({ station }: { station: StationSummary }) {
  const fallbackDetail = fallbackSourceDetail(station.fallbackSource);

  return (
    <section aria-label={`${station.name} settings`} className="settings-view">
      <div className="settings-list">
        <SettingsRow label="Name" value={station.name} />
        <SettingsRow label="Station ID" value={station.id} />
        <SettingsRow label="Slug" value={station.slug} />
        <SettingsRow label="Timezone" value={station.timezone} />
        <SettingsRow label="Mount" value={station.mount} />
        <SettingsRow label="Stream URL" value={station.streamUrl} />
        <SettingsRow
          label="Fallback type"
          value={station.fallbackSource.kind}
        />
        <SettingsRow label="Fallback source" value={fallbackDetail} />
        <SettingsLink href={apiBaseUrl} label="API" />
        <SettingsLink
          href={`http://${station.icecast.host}:${station.icecast.port}`}
          label="Icecast"
        />
      </div>
    </section>
  );
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

function fallbackSourceDetail(
  fallbackSource: StationSummary["fallbackSource"]
) {
  if (fallbackSource.kind === "playlist") {
    return fallbackSource.playlistId;
  }

  if (fallbackSource.kind === "track") {
    return fallbackSource.trackId;
  }

  if (fallbackSource.kind === "live") {
    return fallbackSource.inputId;
  }

  return "default";
}

function SettingsRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="settings-row">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function SettingsLink({ href, label }: { href: string; label: string }) {
  return (
    <a className="settings-row settings-link" href={href}>
      <span>{label}</span>
      <strong>{href}</strong>
    </a>
  );
}

const rootElement = document.getElementById("root");

if (!rootElement) {
  throw new Error("Root element was not found.");
}

createRoot(rootElement).render(
  <AuthGate>
    <App />
  </AuthGate>
);
