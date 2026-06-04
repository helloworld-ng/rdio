import { useQuery } from "@tanstack/react-query";
import {
  ChevronDown,
  ChevronUp,
  ListMusic,
  Mic2,
  Pause,
  Play,
  Share2,
} from "lucide-react";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { programsQueryOptions } from "@/lib/queries/programs";
import { scheduleBlocksQueryOptions } from "@/lib/queries/schedule-blocks";
import { stationQueryOptions } from "@/lib/queries/station";
import { programTitleForBlock } from "@/utils/schedule";
import {
  defaultTimeZone,
  formatDateKeyInTimeZone,
  getNowMinutes,
} from "@/utils/time";

interface PlayerBarProps {
  channelName: string;
  programKind: "broadcast" | "recording";
  programName?: string;
  streamUrl: string;
}

type ShareStatus = "idle" | "copied" | "failed";

const playerVisibleStorageKey = "rdio.player.visible";

function playerStatusText({
  channelName,
  isConnecting,
  isPlaying,
  playbackError,
  programName,
}: {
  channelName: string;
  isConnecting: boolean;
  isPlaying: boolean;
  playbackError: string;
  programName?: string;
}) {
  if (playbackError) {
    return playbackError;
  }

  if (isConnecting) {
    return "Connecting…";
  }

  if (isPlaying && programName) {
    return `${channelName} – ${programName}`;
  }

  return channelName;
}

function readInitialPlayerVisible() {
  if (typeof window === "undefined") {
    return true;
  }

  try {
    const savedValue = window.localStorage.getItem(playerVisibleStorageKey);

    if (savedValue === "true") {
      return true;
    }

    if (savedValue === "false") {
      return false;
    }
  } catch {
    // Storage can be unavailable in private contexts; keep the player visible.
  }

  return true;
}

function freshStreamUrl(streamUrl: string) {
  const separator = streamUrl.includes("?") ? "&" : "?";
  return `${streamUrl}${separator}_=${Date.now()}`;
}

export function PlayerBar() {
  const stationQuery = useQuery(stationQueryOptions());
  const programsQuery = useQuery(programsQueryOptions());
  const scheduleBlocksQuery = useQuery(scheduleBlocksQueryOptions());
  const [, setNowTick] = useState(0);

  useEffect(() => {
    const interval = window.setInterval(
      () => setNowTick((tick) => tick + 1),
      60_000
    );

    return () => window.clearInterval(interval);
  }, []);

  const station = stationQuery.data;
  const programs = programsQuery.data ?? [];
  const blocks = scheduleBlocksQuery.data?.blocks ?? [];
  const stationTimeZone = station?.timezone ?? defaultTimeZone;
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

  return (
    <PlayerBarView
      channelName={station?.name ?? "16 Radio"}
      programKind={currentOnAirBlock?.kind ?? "broadcast"}
      programName={programTitleForBlock(currentOnAirBlock, programs) ?? ""}
      streamUrl={station?.streamUrl ?? ""}
    />
  );
}

function PlayerBarView({
  channelName,
  programKind,
  programName,
  streamUrl,
}: PlayerBarProps) {
  const ProgramIcon = programKind === "broadcast" ? Mic2 : ListMusic;
  const dockRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isBarVisible, setIsBarVisible] = useState(readInitialPlayerVisible);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [playbackError, setPlaybackError] = useState("");
  const [shareStatus, setShareStatus] = useState<ShareStatus>("idle");
  const shareResetTimerRef = useRef<number | null>(null);
  const nowPlayingText = playerStatusText({
    channelName,
    isConnecting,
    isPlaying,
    playbackError,
    programName,
  });

  useLayoutEffect(() => {
    const shell = dockRef.current?.closest(".app-shell");
    shell?.classList.toggle("is-player-collapsed", !isBarVisible);
    return () => shell?.classList.remove("is-player-collapsed");
  }, [isBarVisible]);

  useEffect(() => {
    try {
      window.localStorage.setItem(
        playerVisibleStorageKey,
        String(isBarVisible)
      );
    } catch {
      // Ignore unavailable local storage.
    }
  }, [isBarVisible]);

  useEffect(
    () => () => {
      if (shareResetTimerRef.current !== null) {
        window.clearTimeout(shareResetTimerRef.current);
      }
    },
    []
  );

  const copyStreamUrl = async () => {
    if (!streamUrl) {
      return;
    }

    try {
      await navigator.clipboard.writeText(streamUrl);
      setShareStatus("copied");
    } catch {
      setShareStatus("failed");
    }

    if (shareResetTimerRef.current !== null) {
      window.clearTimeout(shareResetTimerRef.current);
    }

    shareResetTimerRef.current = window.setTimeout(() => {
      setShareStatus("idle");
      shareResetTimerRef.current = null;
    }, 2000);
  };

  const shareLabel = shareButtonLabel(shareStatus);
  const shareStatusMessage = shareStatusCopy(shareStatus);

  const togglePlayback = () => {
    const audio = audioRef.current;
    if (!audio) {
      return;
    }

    if (isPlaying || isConnecting) {
      audio.pause();
      setIsPlaying(false);
      setIsConnecting(false);
    } else {
      if (!streamUrl) {
        setPlaybackError("Stream unavailable");
        return;
      }

      setPlaybackError("");
      setIsConnecting(true);
      audio.loop = false;
      audio.preload = "none";
      audio.src = freshStreamUrl(streamUrl);
      audio.load();
      audio.play().catch(() => {
        setIsConnecting(false);
        setIsPlaying(false);
        setPlaybackError("Could not start stream");
      });
    }
  };

  return (
    <div
      className={isBarVisible ? "player-dock" : "player-dock is-collapsed"}
      ref={dockRef}
    >
      <div className="player-dock-actions">
        <span aria-live="polite" className="player-share-status" role="status">
          {shareStatusMessage}
        </span>
        <button
          aria-label={shareLabel}
          className="player-share-button"
          disabled={!streamUrl}
          onClick={() => {
            copyStreamUrl().catch(() => undefined);
          }}
          title={shareLabel}
          type="button"
        >
          <Share2 aria-hidden="true" size={16} strokeWidth={2} />
        </button>
        <button
          aria-controls="player-bar-panel"
          aria-expanded={isBarVisible}
          aria-label={isBarVisible ? "Hide player" : "Show player"}
          className="player-bar-toggle player-bar-toggle--inline"
          onClick={() => setIsBarVisible((visible) => !visible)}
          title={isBarVisible ? "Hide player" : "Show player"}
          type="button"
        >
          {isBarVisible ? (
            <ChevronDown aria-hidden="true" size={16} strokeWidth={2} />
          ) : (
            <ChevronUp aria-hidden="true" size={16} strokeWidth={2} />
          )}
        </button>
      </div>
      <section aria-label="Player" className="player-bar" id="player-bar-panel">
        <audio
          onError={() => {
            setIsConnecting(false);
            setIsPlaying(false);
            setPlaybackError("Stream unavailable");
          }}
          onPause={() => {
            setIsConnecting(false);
            setIsPlaying(false);
          }}
          onPlaying={() => {
            setIsConnecting(false);
            setIsPlaying(true);
            setPlaybackError("");
          }}
          preload="none"
          ref={audioRef}
        />
        <div className="now-playing">
          {!(playbackError || isConnecting) && (
            <ProgramIcon
              aria-label={
                programKind === "broadcast" ? "Live broadcast" : "Recording"
              }
              className="now-playing-icon"
              size={14}
              strokeWidth={1.8}
            />
          )}
          <span>{nowPlayingText}</span>
        </div>
        <div className="transport-controls">
          <button
            aria-label={isPlaying ? "Pause" : "Play"}
            className="play-toggle"
            onClick={togglePlayback}
            title={isPlaying ? "Pause" : "Play"}
            type="button"
          >
            {isPlaying ? (
              <Pause
                aria-hidden="true"
                fill="currentColor"
                size={22}
                strokeWidth={2}
              />
            ) : (
              <Play
                aria-hidden="true"
                fill="currentColor"
                size={22}
                strokeWidth={2}
              />
            )}
          </button>
        </div>
      </section>
    </div>
  );
}

function shareButtonLabel(shareStatus: ShareStatus) {
  if (shareStatus === "copied") {
    return "Stream link copied";
  }

  if (shareStatus === "failed") {
    return "Could not copy stream link";
  }

  return "Copy stream link";
}

function shareStatusCopy(shareStatus: ShareStatus) {
  if (shareStatus === "copied") {
    return "Stream link copied to clipboard";
  }

  if (shareStatus === "failed") {
    return "Could not copy stream link";
  }

  return "";
}
