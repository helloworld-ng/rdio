import { RotateCcw } from "lucide-react";
import type { ReactNode } from "react";
import { useEffect, useMemo, useRef } from "react";
import { MediaPreviewThumb } from "@/components/MediaPreviewThumb";
import { MediaSearchSelect } from "@/components/MediaSearchSelect";
import { API_BASE_URL } from "@/lib/constants";
import { formatFileSize } from "@/utils/media";

interface MediaLibraryItem {
  id: string;
  name: string;
  size: number;
  type: "audio" | "image";
  url: string;
}

export type MediaPlaybackNotice = "loop" | "truncate";

const PLAYBACK_NOTICE_COPY: Record<MediaPlaybackNotice, string> = {
  loop: "This track is shorter than the slot. It will loop until the slot ends.",
  truncate:
    "This track is longer than the slot. It will be truncated when the slot ends.",
};

function inferUploadType(file: File): "audio" | "image" {
  return file.type.startsWith("image/") ? "image" : "audio";
}

export function MediaSlotField({
  disabled = false,
  mediaItems,
  playbackNotice,
  selectedMediaId,
  uploadFile,
  onSelectMedia,
  onChangeUploadFile,
}: {
  disabled?: boolean;
  mediaItems: MediaLibraryItem[];
  playbackNotice?: MediaPlaybackNotice | null;
  selectedMediaId: string | null;
  uploadFile: File | null;
  onSelectMedia: (mediaId: string | null) => void;
  onChangeUploadFile: (file: File | null) => void;
}) {
  const uploadInputRef = useRef<HTMLInputElement>(null);
  const selectedItem = useMemo(
    () => mediaItems.find((item) => item.id === selectedMediaId),
    [mediaItems, selectedMediaId]
  );
  const hasSelection = Boolean(selectedItem || uploadFile);

  const clearSelection = () => {
    if (disabled) {
      return;
    }

    onSelectMedia(null);
    onChangeUploadFile(null);
  };

  const previewUrl = useMemo(
    () => (uploadFile ? URL.createObjectURL(uploadFile) : null),
    [uploadFile]
  );

  useEffect(
    () => () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    },
    [previewUrl]
  );

  let selectionPreview: ReactNode = null;
  let selectionMeta = "";

  if (selectedItem) {
    selectionPreview = (
      <MediaPreviewThumb
        apiBaseUrl={API_BASE_URL}
        name={selectedItem.name}
        type={selectedItem.type}
        url={selectedItem.url}
      />
    );
    selectionMeta = `${selectedItem.type} · ${formatFileSize(selectedItem.size)}`;
  } else if (uploadFile && previewUrl) {
    selectionPreview = (
      <MediaPreviewThumb
        name={uploadFile.name}
        type={inferUploadType(uploadFile)}
        url={previewUrl}
      />
    );
    selectionMeta = formatFileSize(uploadFile.size);
  }

  return (
    <section className="media-slot-field">
      {hasSelection ? (
        <div className="media-slot-selection">
          <div className="media-slot-selection-header">
            <span className="media-slot-label">Media</span>
            {disabled ? null : (
              <button
                className="media-slot-change"
                onClick={clearSelection}
                type="button"
              >
                <RotateCcw aria-hidden="true" size={14} strokeWidth={1.8} />
                Change
              </button>
            )}
          </div>
          <div className="media-slot-selection-card">
            {selectionPreview}
            <div className="file-control-info">
              <strong>{selectedItem?.name ?? uploadFile?.name}</strong>
              <span>{selectionMeta}</span>
            </div>
          </div>
          {playbackNotice ? (
            <p className="media-slot-notice" role="status">
              {PLAYBACK_NOTICE_COPY[playbackNotice]}
            </p>
          ) : null}
        </div>
      ) : (
        <MediaSearchSelect
          disabled={disabled}
          onSelect={(id) => {
            onChangeUploadFile(null);
            onSelectMedia(id);
          }}
          onUploadClick={() => uploadInputRef.current?.click()}
          options={mediaItems.map((item) => ({
            id: item.id,
            name: item.name,
            type: item.type,
          }))}
          selectedId={selectedMediaId}
        />
      )}
      <input
        accept="audio/*,image/*"
        className="media-search-upload-input"
        onChange={(event) => {
          const nextFile = event.target.files?.[0] ?? null;
          event.target.value = "";

          if (nextFile) {
            if (disabled) {
              return;
            }

            onSelectMedia(null);
            onChangeUploadFile(nextFile);
          }
        }}
        ref={uploadInputRef}
        tabIndex={-1}
        type="file"
      />
    </section>
  );
}
