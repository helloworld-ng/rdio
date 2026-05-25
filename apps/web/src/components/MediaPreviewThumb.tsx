import { useRef, useState } from 'react'
import { Pause, Play } from 'lucide-react'

export function resolveMediaUrl(url: string, apiBaseUrl: string) {
  if (url.startsWith('blob:') || url.startsWith('http')) {
    return url
  }

  const base = apiBaseUrl.replace(/\/$/, '')
  return `${base}${url.startsWith('/') ? url : `/${url}`}`
}

export function MediaPreviewThumb({
  type,
  url,
  name,
  apiBaseUrl,
}: {
  type: 'audio' | 'image'
  url: string
  name: string
  apiBaseUrl?: string
}) {
  const audioRef = useRef<HTMLAudioElement>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const src = apiBaseUrl ? resolveMediaUrl(url, apiBaseUrl) : url

  if (type === 'image') {
    return (
      <div className="file-preview-thumb">
        <img alt="" src={src} />
      </div>
    )
  }

  const togglePlay = () => {
    const audio = audioRef.current

    if (!audio) {
      return
    }

    if (audio.paused) {
      void audio.play()
      return
    }

    audio.pause()
  }

  return (
    <div className="file-preview-thumb is-audio">
      <audio
        preload="metadata"
        ref={audioRef}
        src={src}
        onEnded={() => setIsPlaying(false)}
        onPause={() => setIsPlaying(false)}
        onPlay={() => setIsPlaying(true)}
      />
      <button
        aria-label={isPlaying ? `Pause ${name}` : `Play ${name}`}
        className="file-preview-play"
        type="button"
        onClick={togglePlay}
      >
        {isPlaying ? <Pause aria-hidden="true" size={16} /> : <Play aria-hidden="true" fill="currentColor" size={16} />}
      </button>
    </div>
  )
}
