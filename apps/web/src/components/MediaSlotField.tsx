import { useMemo } from 'react'
import { FileUploadField } from './FileUploadField'
import { MediaPreviewThumb } from './MediaPreviewThumb'

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3001'

interface MediaLibraryItem {
  id: string
  name: string
  size: number
  type: 'audio' | 'image'
  url: string
}

type MediaSource = 'library' | 'upload'

function formatFileSize(bytes: number) {
  if (bytes < 1024) {
    return `${bytes} B`
  }

  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`
  }

  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function MediaSlotField({
  mediaItems,
  selectedMediaId,
  source,
  uploadFile,
  onChangeSource,
  onSelectMedia,
  onChangeUploadFile,
}: {
  mediaItems: MediaLibraryItem[]
  selectedMediaId: string | null
  source: MediaSource
  uploadFile: File | null
  onChangeSource: (source: MediaSource) => void
  onSelectMedia: (mediaId: string | null) => void
  onChangeUploadFile: (file: File | null) => void
}) {
  const selectedItem = useMemo(
    () => mediaItems.find((item) => item.id === selectedMediaId),
    [mediaItems, selectedMediaId],
  )

  return (
    <fieldset className="media-slot-field">
      <legend>Media file</legend>
      <div className="media-slot-source" role="tablist" aria-label="Media source">
        <button
          className={source === 'library' ? 'is-active' : ''}
          type="button"
          role="tab"
          aria-selected={source === 'library'}
          onClick={() => onChangeSource('library')}
        >
          Existing file
        </button>
        <button
          className={source === 'upload' ? 'is-active' : ''}
          type="button"
          role="tab"
          aria-selected={source === 'upload'}
          onClick={() => onChangeSource('upload')}
        >
          Upload new
        </button>
      </div>
      {source === 'library' ? (
        <div className="media-slot-library">
          <label>
            <span>File</span>
            <select
              value={selectedMediaId ?? ''}
              onChange={(event) => onSelectMedia(event.target.value || null)}
            >
              <option value="">Select a file</option>
              {mediaItems.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name} ({item.type})
                </option>
              ))}
            </select>
          </label>
          {mediaItems.length === 0 ? (
            <p className="media-slot-hint">No media in the library yet. Upload a new file instead.</p>
          ) : null}
          {selectedItem ? (
            <div className="file-control-preview">
              <MediaPreviewThumb apiBaseUrl={apiBaseUrl} name={selectedItem.name} type={selectedItem.type} url={selectedItem.url} />
              <div className="file-control-info">
                <strong>{selectedItem.name}</strong>
                <span>
                  {selectedItem.type} · {formatFileSize(selectedItem.size)}
                </span>
              </div>
            </div>
          ) : null}
        </div>
      ) : (
        <FileUploadField
          accept="audio/*,image/*"
          emptyLabel="Choose audio or image"
          file={uploadFile}
          label="Upload file"
          onChange={onChangeUploadFile}
        />
      )}
    </fieldset>
  )
}
