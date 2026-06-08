import { useQuery } from "@tanstack/react-query";
import { ListMusic, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { UploadMediaDialog } from "@/components/media/upload-media-dialog";
import { MediaPreviewThumb } from "@/components/schedule/media-preview-thumb";
import { DeleteConfirmationDialog } from "@/components/ui/delete-confirmation-dialog";
import { API_BASE_URL } from "@/lib/constants";
import {
  mediaQueryOptions,
  useDeleteMedia,
  useUploadMedia,
} from "@/lib/queries/media";
import { scheduleBlocksQueryOptions } from "@/lib/queries/schedule-blocks";
import type { MediaItem } from "@/types/station";
import { formatFileSize } from "@/utils/media";
import { formatUploadTime } from "@/utils/time";

interface MediaPageProps {
  error: string;
  filter: "all" | MediaItem["type"];
  mediaItems: MediaItem[];
  onChangeFilter: (filter: "all" | MediaItem["type"]) => void;
  onClearError: () => void;
  onDeleteMedia: (media: MediaItem) => void;
  onUploadMedia: (file: File) => Promise<MediaItem>;
}

export function MediaPage() {
  const mediaQuery = useQuery(mediaQueryOptions());
  const scheduleBlocksQuery = useQuery(scheduleBlocksQueryOptions());
  const uploadMediaMutation = useUploadMedia();
  const deleteMediaMutation = useDeleteMedia();
  const [filter, setFilter] = useState<"all" | MediaItem["type"]>("all");
  const [error, setError] = useState("");
  const [pendingDeleteMedia, setPendingDeleteMedia] =
    useState<MediaItem | null>(null);
  const blocks = scheduleBlocksQuery.data?.blocks ?? [];
  const pendingMediaUseCount = pendingDeleteMedia
    ? blocks.filter((block) => block.mediaId === pendingDeleteMedia.id).length
    : 0;

  return (
    <>
      <MediaView
        error={error}
        filter={filter}
        mediaItems={mediaQuery.data ?? []}
        onChangeFilter={setFilter}
        onClearError={() => setError("")}
        onDeleteMedia={setPendingDeleteMedia}
        onUploadMedia={uploadMediaMutation.mutateAsync}
      />
      <DeleteConfirmationDialog
        confirmLabel="Delete media"
        description={
          pendingMediaUseCount > 0 ? (
            <>
              Permanently delete{" "}
              <strong className="font-semibold text-[#30363a]">
                {pendingDeleteMedia?.name ?? "this media file"}
              </strong>
              ? This file is used by {pendingMediaUseCount} schedule slot
              {pendingMediaUseCount === 1 ? "" : "s"}. Deleting it will clear
              those slots and cannot be undone.
            </>
          ) : undefined
        }
        entityName={pendingDeleteMedia?.name}
        onConfirm={async () => {
          if (!pendingDeleteMedia) {
            return;
          }

          try {
            await deleteMediaMutation.mutateAsync(pendingDeleteMedia.id);
          } catch {
            setError("Delete failed. Please try again.");
            throw new Error("Delete failed. Please try again.");
          }
        }}
        onOpenChange={(open) => {
          if (!open) {
            setPendingDeleteMedia(null);
          }
        }}
        open={Boolean(pendingDeleteMedia)}
        title={
          pendingMediaUseCount > 0 ? "Delete scheduled media?" : "Delete media?"
        }
      />
    </>
  );
}

function MediaView({
  error,
  filter,
  mediaItems,
  onChangeFilter,
  onClearError,
  onDeleteMedia,
  onUploadMedia,
}: MediaPageProps) {
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const visibleItems = mediaItems.filter(
    (item) => filter === "all" || item.type === filter
  );

  return (
    <section aria-label="Media" className="library-view">
      <div className="library-header">
        <div>
          <ListMusic aria-hidden="true" size={18} strokeWidth={1.8} />
          <strong>Media</strong>
        </div>
        <button onClick={() => setIsUploadOpen(true)} type="button">
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
      {error ? <p className="form-error">{error}</p> : null}
      <UploadMediaDialog
        onOpenChange={setIsUploadOpen}
        onSubmit={onUploadMedia}
        open={isUploadOpen}
      />
      <div className="library-list">
        {visibleItems.length === 0 ? (
          <p className="library-empty">No media uploaded</p>
        ) : null}
        {visibleItems.map((item) => (
          <article className="library-row media-row" key={item.id}>
            <div className="media-row-body">
              <MediaPreviewThumb
                apiBaseUrl={API_BASE_URL}
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
                  onClearError();
                  onDeleteMedia(item);
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
