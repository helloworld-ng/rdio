import { useEffect, useId, useMemo } from "react";
import { MediaPreviewThumb } from "@/components/schedule/media-preview-thumb";

function inferFilePreviewType(file: File): "audio" | "image" {
  return file.type.startsWith("image/") ? "image" : "audio";
}

function formatFileSize(bytes: number) {
  if (bytes < 1024) {
    return `${bytes} B`;
  }

  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function FileUploadField({
  accept,
  emptyLabel,
  file,
  label,
  onChange,
}: {
  accept: string;
  emptyLabel: string;
  file: File | null;
  label: string;
  onChange: (file: File | null) => void;
}) {
  const inputId = useId();
  const previewUrl = useMemo(
    () => (file ? URL.createObjectURL(file) : null),
    [file]
  );

  useEffect(
    () => () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    },
    [previewUrl]
  );

  return (
    <label htmlFor={inputId}>
      <span>{label}</span>
      {file && previewUrl ? (
        <div className="file-control-preview">
          <MediaPreviewThumb
            name={file.name}
            type={inferFilePreviewType(file)}
            url={previewUrl}
          />
          <div className="file-control-info">
            <strong>{file.name}</strong>
            <span>{formatFileSize(file.size)}</span>
          </div>
          <input
            accept={accept}
            id={inputId}
            onChange={(event) => {
              onChange(event.target.files?.[0] ?? null);
              event.target.value = "";
            }}
            type="file"
          />
        </div>
      ) : (
        <div className="file-control">
          <em>{emptyLabel}</em>
          <input
            accept={accept}
            id={inputId}
            onChange={(event) => {
              onChange(event.target.files?.[0] ?? null);
              event.target.value = "";
            }}
            type="file"
          />
        </div>
      )}
    </label>
  );
}
