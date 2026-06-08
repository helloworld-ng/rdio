import { Pause, Play } from "lucide-react";
import { useRef, useState } from "react";

const trailingSlashPattern = /\/$/;

export function resolveMediaUrl(url: string, apiBaseUrl: string) {
  if (url.startsWith("blob:") || url.startsWith("http")) {
    return url;
  }

  const base = apiBaseUrl.replace(trailingSlashPattern, "");
  return `${base}${url.startsWith("/") ? url : `/${url}`}`;
}

export function MediaPreviewThumb({
  type,
  url,
  name,
  apiBaseUrl,
}: {
  type: "audio" | "image";
  url: string;
  name: string;
  apiBaseUrl?: string;
}) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackError, setPlaybackError] = useState("");
  const src = apiBaseUrl ? resolveMediaUrl(url, apiBaseUrl) : url;

  if (type === "image") {
    return (
      <div className="file-preview-thumb">
        <img alt="" height={40} src={src} width={40} />
      </div>
    );
  }

  const togglePlay = () => {
    const audio = audioRef.current;

    if (!audio) {
      return;
    }

    if (audio.paused) {
      setPlaybackError("");
      audio.play().catch(() => {
        setPlaybackError("Could not play this file.");
        setIsPlaying(false);
      });
      return;
    }

    audio.pause();
  };

  return (
    <div className="file-preview-thumb is-audio">
      <audio
        onEnded={() => setIsPlaying(false)}
        onError={() => {
          setPlaybackError("Could not load this file.");
          setIsPlaying(false);
        }}
        onPause={() => setIsPlaying(false)}
        onPlay={() => {
          setPlaybackError("");
          setIsPlaying(true);
        }}
        preload="metadata"
        ref={audioRef}
        src={src}
      />
      {playbackError ? (
        <span className="file-preview-error" title={playbackError}>
          !
        </span>
      ) : null}
      <button
        aria-label={isPlaying ? `Pause ${name}` : `Play ${name}`}
        className="file-preview-play"
        onClick={togglePlay}
        type="button"
      >
        {isPlaying ? (
          <Pause aria-hidden="true" size={16} />
        ) : (
          <Play aria-hidden="true" fill="currentColor" size={16} />
        )}
      </button>
    </div>
  );
}
