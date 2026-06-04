import { ListMusic, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { useAppLayout } from "@/app";
import { FileUploadField } from "@/components/FileUploadField";
import { MediaPreviewThumb } from "@/components/MediaPreviewThumb";
import { Modal } from "@/components/ui/modal";
import { apiBaseUrl } from "@/lib/api";
import type { MediaItem } from "@/types/station";
import { formatFileSize } from "@/utils";
import { formatUploadTime } from "@/utils/time";

interface MediaPageProps {
  filter: "all" | MediaItem["type"];
  mediaItems: MediaItem[];
  onChangeFilter: (filter: "all" | MediaItem["type"]) => void;
  onDeleteMedia: (mediaId: string) => Promise<void>;
  onUploadMedia: (file: File) => Promise<MediaItem>;
}

export function MediaPage() {
  const { mediaPage } = useAppLayout();

  return <MediaView {...mediaPage} />;
}

function MediaView({
  filter,
  mediaItems,
  onChangeFilter,
  onDeleteMedia,
  onUploadMedia,
}: MediaPageProps) {
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
