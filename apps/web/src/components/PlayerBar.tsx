import React, { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { ChevronDown, ChevronUp, ListMusic, Mic2, Pause, Play, Share2 } from 'lucide-react'

interface PlayerBarProps {
  channelName: string
  programKind: 'broadcast' | 'recording'
  programName?: string
  streamUrl: string
}

const playerVisibleStorageKey = 'rdio.player.visible'

function readInitialPlayerVisible() {
  if (typeof window === 'undefined') {
    return true
  }

  try {
    const savedValue = window.localStorage.getItem(playerVisibleStorageKey)

    if (savedValue === 'true') {
      return true
    }

    if (savedValue === 'false') {
      return false
    }
  } catch {
    // Storage can be unavailable in private contexts; keep the player visible.
  }

  return true
}

export function PlayerBar({ channelName, programKind, programName, streamUrl }: PlayerBarProps) {
  const ProgramIcon = programKind === 'broadcast' ? Mic2 : ListMusic
  const dockRef = useRef<HTMLDivElement>(null)
  const audioRef = useRef<HTMLAudioElement>(null)
  const [isBarVisible, setIsBarVisible] = useState(readInitialPlayerVisible)
  const [isPlaying, setIsPlaying] = useState(false)
  const [isConnecting, setIsConnecting] = useState(false)
  const [playbackError, setPlaybackError] = useState('')
  const [shareStatus, setShareStatus] = useState<'idle' | 'copied' | 'failed'>('idle')
  const shareResetTimerRef = useRef<number | null>(null)
  const nowPlayingText = playbackError
    ? playbackError
    : isConnecting
      ? 'Connecting…'
      : isPlaying && programName
        ? `${channelName} – ${programName}`
        : channelName

  useLayoutEffect(() => {
    const shell = dockRef.current?.closest('.app-shell')
    shell?.classList.toggle('is-player-collapsed', !isBarVisible)
    return () => shell?.classList.remove('is-player-collapsed')
  }, [isBarVisible])

  useEffect(() => {
    try {
      window.localStorage.setItem(playerVisibleStorageKey, String(isBarVisible))
    } catch {
      // Ignore unavailable local storage.
    }
  }, [isBarVisible])

  useEffect(() => {
    const audio = audioRef.current

    if (!audio) {
      return
    }

    audio.pause()
    audio.src = streamUrl
    audio.load()
    setIsPlaying(false)
    setIsConnecting(false)
    setPlaybackError('')
  }, [streamUrl])

  useEffect(() => {
    return () => {
      if (shareResetTimerRef.current !== null) {
        window.clearTimeout(shareResetTimerRef.current)
      }
    }
  }, [])

  const copyStreamUrl = async () => {
    if (!streamUrl) {
      return
    }

    try {
      await navigator.clipboard.writeText(streamUrl)
      setShareStatus('copied')
    } catch {
      setShareStatus('failed')
    }

    if (shareResetTimerRef.current !== null) {
      window.clearTimeout(shareResetTimerRef.current)
    }

    shareResetTimerRef.current = window.setTimeout(() => {
      setShareStatus('idle')
      shareResetTimerRef.current = null
    }, 2000)
  }

  const shareLabel =
    shareStatus === 'copied'
      ? 'Stream link copied'
      : shareStatus === 'failed'
        ? 'Could not copy stream link'
        : 'Copy stream link'

  const togglePlayback = () => {
    const audio = audioRef.current
    if (!audio) return

    if (isPlaying || isConnecting) {
      audio.pause()
      setIsPlaying(false)
      setIsConnecting(false)
    } else {
      if (!streamUrl) {
        setPlaybackError('Stream unavailable')
        return
      }

      setPlaybackError('')
      setIsConnecting(true)
      audio.loop = false
      audio.src = streamUrl
      audio.load()
      audio.play().catch(() => {
        setIsConnecting(false)
        setIsPlaying(false)
        setPlaybackError('Could not start stream')
      })
    }
  }

  return (
    <div
      ref={dockRef}
      className={isBarVisible ? 'player-dock' : 'player-dock is-collapsed'}
    >
      <div className="player-dock-actions">
        <span className="player-share-status" role="status" aria-live="polite">
          {shareStatus === 'copied'
            ? 'Stream link copied to clipboard'
            : shareStatus === 'failed'
              ? 'Could not copy stream link'
              : ''}
        </span>
        <button
          className="player-share-button"
          type="button"
          aria-label={shareLabel}
          disabled={!streamUrl}
          title={shareLabel}
          onClick={() => {
            void copyStreamUrl()
          }}
        >
          <Share2 aria-hidden="true" size={16} strokeWidth={2} />
        </button>
        <button
          className="player-bar-toggle player-bar-toggle--inline"
          type="button"
          aria-controls="player-bar-panel"
          aria-expanded={isBarVisible}
          aria-label={isBarVisible ? 'Hide player' : 'Show player'}
          title={isBarVisible ? 'Hide player' : 'Show player'}
          onClick={() => setIsBarVisible((visible) => !visible)}
        >
          {isBarVisible ? (
            <ChevronDown aria-hidden="true" size={16} strokeWidth={2} />
          ) : (
            <ChevronUp aria-hidden="true" size={16} strokeWidth={2} />
          )}
        </button>
      </div>
      <footer id="player-bar-panel" className="player-bar" aria-label="Player">
      {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
      <audio
        ref={audioRef}
        onError={() => {
          setIsConnecting(false)
          setIsPlaying(false)
          setPlaybackError('Stream unavailable')
        }}
        onPause={() => {
          setIsConnecting(false)
          setIsPlaying(false)
        }}
        onPlaying={() => {
          setIsConnecting(false)
          setIsPlaying(true)
          setPlaybackError('')
        }}
      />
      <div className="now-playing">
        {!playbackError && !isConnecting && (
          <ProgramIcon
            aria-label={programKind === 'broadcast' ? 'Live broadcast' : 'Recording'}
            className="now-playing-icon"
            size={14}
            strokeWidth={1.8}
          />
        )}
        <span>{nowPlayingText}</span>
      </div>
      <div className="transport-controls">
        <button
          className="play-toggle"
          type="button"
          aria-label={isPlaying ? 'Pause' : 'Play'}
          title={isPlaying ? 'Pause' : 'Play'}
          onClick={togglePlayback}
        >
          {isPlaying
            ? <Pause aria-hidden="true" size={22} fill="currentColor" strokeWidth={2} />
            : <Play aria-hidden="true" size={22} fill="currentColor" strokeWidth={2} />
          }
        </button>
      </div>
      </footer>
    </div>
  )
}
