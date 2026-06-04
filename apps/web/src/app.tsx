import { Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import type React from "react";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { PlayerBar } from "@/components/PlayerBar";
import { AppSidebar, PageHeader } from "@/components/ui/app-chrome";
import { Modal } from "@/components/ui/modal";
import { StationLoading } from "@/components/ui/station-loading";
import { mockAnchorDate } from "@/data/mockStation";
import { apiBaseUrl, apiFetch } from "@/lib/api";
import { useAuthenticatedUser } from "@/providers/auth-provider";
import "@/styles/styles.css";
import type { HostRecord } from "@/types/host";
import type { ViewName } from "@/types/navigation";
import type {
  CreationRequest,
  DragDropPreview,
  MediaItem,
  MediaResponse,
  Program,
  ScheduleBlock,
  ScheduleBlockDraft,
  ScheduleBlocksResponse,
  ScheduleMutationResponse,
  StationResponse,
  StationSummary,
} from "@/types/station";
import { addHostByName, getHostNames } from "@/utils/hosts";
import {
  blockConflictsWith,
  clampBlockStart,
  programTitleForBlock,
} from "@/utils/schedule";
import {
  addDays,
  dateInTimeZone,
  defaultTimeZone,
  formatDateKey,
  formatDateKeyInTimeZone,
  getNowMinutes,
} from "@/utils/time";

const viewPathPattern = /^\/([^/]+)\/?$/;

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

function readViewName(pathname: string): ViewName {
  const match = pathname.match(viewPathPattern);
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

function pathForView(view: ViewName) {
  return `/${view}` as const;
}

function useResponsiveSidebar() {
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

  return { isMobileSidebar, isSidebarVisible, setIsSidebarVisible };
}

interface AppLayoutContextValue {
  canViewMembers: boolean;
  currentStation: StationSummary | null;
  hostsPage: {
    hosts: HostRecord[];
    onAddHost: (host: HostRecord) => Promise<void>;
    onRemoveHost: (hostName: string) => Promise<void>;
    onUpdateHost: (hostName: string, host: HostRecord) => Promise<void>;
  };
  mediaPage: {
    filter: "all" | MediaItem["type"];
    mediaItems: MediaItem[];
    onChangeFilter: React.Dispatch<
      React.SetStateAction<"all" | MediaItem["type"]>
    >;
    onDeleteMedia: (mediaId: string) => Promise<void>;
    onUploadMedia: (file: File) => Promise<MediaItem>;
  };
  programsPage: {
    hosts: HostRecord[];
    onAddHost: (hostName: string) => Promise<void>;
    onCreateProgram: (program: Omit<Program, "id">) => Promise<void>;
    onDeleteProgram: (programId: string) => Promise<void>;
    onUpdateProgram: (
      programId: string,
      program: Omit<Program, "id">
    ) => Promise<void>;
    programs: Program[];
  };
  schedule: {
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
    onAddHost: (hostName: string) => Promise<void>;
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
    onSetDragDropPreview: React.Dispatch<
      React.SetStateAction<DragDropPreview | null>
    >;
    onSetDraggedBlockId: React.Dispatch<React.SetStateAction<string | null>>;
    onToggleDatePicker: () => void;
    onUpdateBlock: (blockId: string, block: ScheduleBlockDraft) => void;
    onUploadMedia: (file: File) => Promise<MediaItem>;
    programs: Program[];
    selectedBlockId: string | null;
    selectedDate: Date;
    selectedDateKey: string;
    stationTimeZone: string;
    todayDateKey: string;
  };
  stationLoadFailed: boolean;
}

const AppLayoutContext = createContext<AppLayoutContextValue | null>(null);

export function useAppLayout() {
  const context = useContext(AppLayoutContext);
  if (!context) {
    throw new Error("useAppLayout must be used inside AppLayout.");
  }

  return context;
}

export function useCurrentStation() {
  const { currentStation } = useAppLayout();
  if (!currentStation) {
    throw new Error("This page requires a loaded station.");
  }

  return currentStation;
}

export function AppLayout() {
  const user = useAuthenticatedUser();
  const pathname = useRouterState({
    select: (state) => state.location.pathname,
  });
  const navigate = useNavigate();
  const activeView = readViewName(pathname);
  const previousViewRef = useRef(activeView);
  const [stations, setStations] = useState<StationSummary[]>([]);
  const [stationLoadFailed, setStationLoadFailed] = useState(false);
  const { isMobileSidebar, isSidebarVisible, setIsSidebarVisible } =
    useResponsiveSidebar();

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
  const isScheduleInitializedRef = useRef(false);
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
    if (previousViewRef.current === activeView) {
      return;
    }

    previousViewRef.current = activeView;

    if (activeView === "schedule") {
      focusScheduleNow();
      return;
    }

    setCreationRequest(null);
    setSelectedBlockId(null);
  }, [activeView, focusScheduleNow]);

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

    if (!isScheduleInitializedRef.current) {
      isScheduleInitializedRef.current = true;
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
          window.setTimeout(() => setScheduleSaveState("idle"), 2000);
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
    navigate({ to: pathForView(nextView) }).catch(() => undefined);

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

  const createHostByName = async (hostName: string) => {
    const host = addHostByName(hosts, hostName).at(hosts.length);
    if (!host) {
      return;
    }

    const response = await apiFetch(`${apiBaseUrl}/hosts`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(host),
    });

    if (response.ok) {
      setHosts((current) => addHostByName(current, hostName));
    }
  };

  const createProgram = async (program: Omit<Program, "id">) => {
    const response = await apiFetch(`${apiBaseUrl}/programs`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(program),
    });

    if (response.ok) {
      const data = (await response.json()) as { program: Program };
      setPrograms((current) => [...current, data.program]);
    }
  };

  const deleteProgram = async (programId: string) => {
    const response = await apiFetch(`${apiBaseUrl}/programs/${programId}`, {
      method: "DELETE",
    });

    if (response.ok) {
      const data = (await response.json()) as ScheduleMutationResponse;
      setPrograms((current) => current.filter((item) => item.id !== programId));
      applyScheduleMutation(data);
    }
  };

  const updateProgram = async (
    programId: string,
    program: Omit<Program, "id">
  ) => {
    const response = await apiFetch(`${apiBaseUrl}/programs/${programId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(program),
    });

    if (response.ok) {
      const data = (await response.json()) as {
        program: Program;
      } & ScheduleMutationResponse;
      setPrograms((current) =>
        current.map((item) => (item.id === programId ? data.program : item))
      );
      applyScheduleMutation(data);
    }
  };

  const createHost = async (host: HostRecord) => {
    const response = await apiFetch(`${apiBaseUrl}/hosts`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(host),
    });

    if (response.ok) {
      setHosts((current) =>
        current.some((item) => item.name === host.name)
          ? current
          : [...current, host]
      );
    }
  };

  const removeHost = async (hostName: string) => {
    const response = await apiFetch(
      `${apiBaseUrl}/hosts/${encodeURIComponent(hostName)}`,
      { method: "DELETE" }
    );

    if (response.ok) {
      setHosts((current) => current.filter((item) => item.name !== hostName));
    }
  };

  const updateHost = async (hostName: string, host: HostRecord) => {
    const response = await apiFetch(
      `${apiBaseUrl}/hosts/${encodeURIComponent(hostName)}`,
      {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(host),
      }
    );

    if (response.ok) {
      const data = (await response.json()) as {
        host: HostRecord;
      } & ScheduleMutationResponse;
      setHosts((current) =>
        current.map((item) => (item.name === hostName ? host : item))
      );
      if (hostName !== host.name) {
        setPrograms((current) =>
          current.map((item) =>
            item.host === hostName ? { ...item, host: host.name } : item
          )
        );
        applyScheduleMutation(data);
      }
    }
  };

  const deleteMediaFromPage = async (mediaId: string) => {
    const scheduledUseCount = blocks.filter(
      (block) => block.mediaId === mediaId
    ).length;

    if (scheduledUseCount > 0) {
      setPendingMediaDeleteId(mediaId);
      return;
    }

    await deleteMedia(mediaId);
  };
  const pendingMediaUseCount = pendingMediaDeleteId
    ? blocks.filter((block) => block.mediaId === pendingMediaDeleteId).length
    : 0;

  const confirmPendingMediaDelete = () => {
    if (!pendingMediaDeleteId) {
      return;
    }

    const mediaId = pendingMediaDeleteId;
    setPendingMediaDeleteId(null);
    deleteMedia(mediaId).catch(() => undefined);
  };

  const appLayoutContext: AppLayoutContextValue = {
    currentStation,
    stationLoadFailed,
    canViewMembers: user.role?.split(",").includes("admin") ?? false,
    schedule: {
      blocks: dayBlocks,
      creationRequest,
      datePickerMonth,
      dragDropPreview,
      draggedBlockId,
      focusNowToken: scheduleFocusToken,
      hosts: getHostNames(hosts),
      isDatePickerOpen,
      isMobileLayout: isMobileSidebar,
      mediaItems,
      onAddHost: createHostByName,
      onBeginCreate: beginCreate,
      onChangeCreationKind: (kind) =>
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
      onUploadMedia: uploadMedia,
      programs,
      selectedBlockId,
      selectedDate,
      selectedDateKey,
      stationTimeZone,
      todayDateKey,
    },
    programsPage: {
      hosts,
      onAddHost: createHostByName,
      onCreateProgram: createProgram,
      onDeleteProgram: deleteProgram,
      onUpdateProgram: updateProgram,
      programs,
    },
    hostsPage: {
      hosts,
      onAddHost: createHost,
      onRemoveHost: removeHost,
      onUpdateHost: updateHost,
    },
    mediaPage: {
      filter: mediaFilter,
      mediaItems,
      onChangeFilter: setMediaFilter,
      onDeleteMedia: deleteMediaFromPage,
      onUploadMedia: uploadMedia,
    },
  };

  return (
    <AppLayoutContext.Provider value={appLayoutContext}>
      <AppLayoutShell
        activeView={activeView}
        currentStation={currentStation}
        isMobileSidebar={isMobileSidebar}
        isSidebarVisible={isSidebarVisible}
        onCancelPendingMediaDelete={() => setPendingMediaDeleteId(null)}
        onChangeView={changeView}
        onCloseMobileSidebar={() => setIsSidebarVisible(false)}
        onConfirmPendingMediaDelete={confirmPendingMediaDelete}
        onToggleSidebar={() => setIsSidebarVisible((current) => !current)}
        pendingMediaDeleteId={pendingMediaDeleteId}
        pendingMediaUseCount={pendingMediaUseCount}
        playerProgramKind={currentOnAirBlock?.kind ?? "broadcast"}
        playerProgramName={playerProgramName ?? ""}
        scheduleSaveMessage={scheduleSaveMessage}
        stationLoadFailed={stationLoadFailed}
        stationName={stationName}
      />
    </AppLayoutContext.Provider>
  );
}

function AppLayoutShell({
  activeView,
  currentStation,
  isMobileSidebar,
  isSidebarVisible,
  onCancelPendingMediaDelete,
  onChangeView,
  onCloseMobileSidebar,
  onConfirmPendingMediaDelete,
  onToggleSidebar,
  pendingMediaDeleteId,
  pendingMediaUseCount,
  playerProgramKind,
  playerProgramName,
  scheduleSaveMessage,
  stationLoadFailed,
  stationName,
}: {
  activeView: ViewName;
  currentStation: StationSummary | null;
  isMobileSidebar: boolean;
  isSidebarVisible: boolean;
  onCancelPendingMediaDelete: () => void;
  onChangeView: (view: ViewName) => void;
  onCloseMobileSidebar: () => void;
  onConfirmPendingMediaDelete: () => void;
  onToggleSidebar: () => void;
  pendingMediaDeleteId: string | null;
  pendingMediaUseCount: number;
  playerProgramKind: ScheduleBlock["kind"];
  playerProgramName: string;
  scheduleSaveMessage: string;
  stationLoadFailed: boolean;
  stationName: string;
}) {
  const hasStation = currentStation !== null;
  const hasDesktopSidebar = isSidebarVisible && hasStation && !isMobileSidebar;

  return (
    <main className="app-page">
      <section
        aria-label="Rdio scheduler"
        className={hasStation ? "app-shell" : "app-shell is-station-loading"}
      >
        <PageHeader
          alignWithSidebar={hasDesktopSidebar}
          isSidebarOpen={isSidebarVisible}
          onToggleSidebar={onToggleSidebar}
        />
        {activeView === "schedule" && scheduleSaveMessage ? (
          <p aria-live="polite" className="schedule-save-status">
            {scheduleSaveMessage}
          </p>
        ) : null}
        <div
          className={hasDesktopSidebar ? "app-body has-sidebar" : "app-body"}
        >
          {hasStation && isSidebarVisible && isMobileSidebar ? (
            <button
              aria-label="Close menu"
              className="sidebar-backdrop"
              onClick={onCloseMobileSidebar}
              type="button"
            />
          ) : null}
          {hasStation && isSidebarVisible ? (
            <AppSidebar
              activeView={activeView}
              isMobileOverlay={isMobileSidebar}
              onChangeView={onChangeView}
            />
          ) : null}
          <div className={hasStation ? "shell station-shell" : "shell"}>
            {hasStation ? (
              <Outlet />
            ) : (
              <StationLoading failed={stationLoadFailed} />
            )}
          </div>
        </div>
        <PlayerBar
          channelName={stationName}
          programKind={playerProgramKind}
          programName={playerProgramName}
          streamUrl={currentStation?.streamUrl ?? ""}
        />
      </section>
      {pendingMediaDeleteId ? (
        <Modal
          onClose={onCancelPendingMediaDelete}
          title="Delete scheduled media?"
        >
          <div className="confirm-dialog">
            <p>
              This media file is used by {pendingMediaUseCount} schedule slot
              {pendingMediaUseCount === 1 ? "" : "s"}. Delete it and clear those
              slots?
            </p>
            <div className="form-actions">
              <button onClick={onCancelPendingMediaDelete} type="button">
                Cancel
              </button>
              <button
                className="primary-action"
                onClick={onConfirmPendingMediaDelete}
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
