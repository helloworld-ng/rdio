import { useEffect, useMemo, useRef } from 'react'
import { RotateCcw } from 'lucide-react'
import { MediaPreviewThumb } from './MediaPreviewThumb'
import { MediaSearchSelect } from './MediaSearchSelect'
import { formatFileSize } from '../utils'

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3001'

interface MediaLibraryItem {
  id: string
  name: string
  size: number
  type: 'audio' | 'image'
  url: string
}

export interface SlotMetadata {
  programTitle: string
  description: string
  author: string
}

export type MediaPlaybackNotice = 'loop' | 'truncate'

const PLAYBACK_NOTICE_COPY: Record<MediaPlaybackNotice, string> = {
  loop: 'This track is shorter than the slot. It will loop until the slot ends.',
  truncate: 'This track is longer than the slot. It will be truncated when the slot ends.',
}

function inferUploadType(file: File): 'audio' | 'image' {
  return file.type.startsWith('image/') ? 'image' : 'audio'
}

export function MediaSlotField({
  mediaItems,
  playbackNotice,
  selectedMediaId,
  uploadFile,
  slotMetadata,
  onSelectMedia,
  onChangeUploadFile,
}: {
  mediaItems: MediaLibraryItem[]
  playbackNotice?: MediaPlaybackNotice | null
  selectedMediaId: string | null
  uploadFile: File | null
  slotMetadata?: SlotMetadata
  onSelectMedia: (mediaId: string | null) => void
  onChangeUploadFile: (file: File | null) => void
}) {
  const uploadInputRef = useRef<HTMLInputElement>(null)
  const selectedItem = useMemo(
    () => mediaItems.find((item) => item.id === selectedMediaId),
    [mediaItems, selectedMediaId],
  )
  const hasSelection = Boolean(selectedItem || uploadFile)
  const programTitle = slotMetadata?.programTitle.trim() ?? ''
  const author = slotMetadata?.author.trim() ?? ''
  const description = slotMetadata?.description.trim() ?? ''
  const hasMetadata = Boolean(programTitle || author || description)

  const clearSelection = () => {
    onSelectMedia(null)
    onChangeUploadFile(null)
  }

  const previewUrl = useMemo(() => (uploadFile ? URL.createObjectURL(uploadFile) : null), [uploadFile])

  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl)
      }
    }
  }, [previewUrl])

  return (
    <section className="media-slot-field">
      {hasMetadata ? (
        <div className="media-slot-meta">
          {programTitle ? (
            <div className="media-slot-meta-item">
              <span>Program</span>
              <p>{programTitle}</p>
            </div>
          ) : null}
          {author ? (
            <div className="media-slot-meta-item">
              <span>Host</span>
              <p>{author}</p>
            </div>
          ) : null}
          {description ? (
            <div className="media-slot-meta-item">
              <span>About</span>
              <p>{description}</p>
            </div>
          ) : null}
        </div>
      ) : null}
      {hasSelection ? (
        <div className="media-slot-selection">
          <div className="media-slot-selection-card">
            {selectedItem ? (
              <MediaPreviewThumb apiBaseUrl={apiBaseUrl} name={selectedItem.name} type={selectedItem.type} url={selectedItem.url} />
            ) : uploadFile && previewUrl ? (
              <MediaPreviewThumb name={uploadFile.name} type={inferUploadType(uploadFile)} url={previewUrl} />
            ) : null}
            <div className="file-control-info">
              <strong>{selectedItem?.name ?? uploadFile?.name}</strong>
              <span>
                {selectedItem ? `${selectedItem.type} · ${formatFileSize(selectedItem.size)}` : uploadFile ? formatFileSize(uploadFile.size) : ''}
              </span>
            </div>
          </div>
          <button className="media-slot-change" type="button" onClick={clearSelection}>
            <RotateCcw aria-hidden="true" size={14} strokeWidth={1.8} />
            Change
          </button>
          {playbackNotice ? (
            <p className="media-slot-notice" role="status">
              {PLAYBACK_NOTICE_COPY[playbackNotice]}
            </p>
          ) : null}
        </div>
      ) : (
        <MediaSearchSelect
          options={mediaItems.map((item) => ({ id: item.id, name: item.name, type: item.type }))}
          selectedId={selectedMediaId}
          onSelect={(id) => {
            onChangeUploadFile(null)
            onSelectMedia(id)
          }}
          onUploadClick={() => uploadInputRef.current?.click()}
        />
      )}
      <input
        ref={uploadInputRef}
        accept="audio/*,image/*"
        className="media-search-upload-input"
        tabIndex={-1}
        type="file"
        onChange={(event) => {
          const nextFile = event.target.files?.[0] ?? null
          event.target.value = ''

          if (nextFile) {
            onSelectMedia(null)
            onChangeUploadFile(nextFile)
          }
        }}
      />
    </section>
  )
}
