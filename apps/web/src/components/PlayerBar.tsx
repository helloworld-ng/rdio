import React, { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { ChevronDown, ChevronUp, ListMusic, Mic2, Pause, Play } from 'lucide-react'

interface PlayerBarProps {
  channelName: string
  programKind: 'broadcast' | 'recording'
  programName?: string
  streamUrl: string
}

export function PlayerBar({ channelName, programKind, programName, streamUrl }: PlayerBarProps) {
  const ProgramIcon = programKind === 'broadcast' ? Mic2 : ListMusic
  const dockRef = useRef<HTMLDivElement>(null)
  const audioRef = useRef<HTMLAudioElement>(null)
  const [isBarVisible, setIsBarVisible] = useState(true)
  const [isPlaying, setIsPlaying] = useState(false)
  const [isConnecting, setIsConnecting] = useState(false)
  const [playbackError, setPlaybackError] = useState('')
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
      <button
        className="player-bar-toggle"
        type="button"
        aria-controls="player-bar-panel"
        aria-expanded={isBarVisible}
        aria-label={isBarVisible ? 'Hide player' : 'Show player'}
        onClick={() => setIsBarVisible((visible) => !visible)}
      >
        {isBarVisible ? (
          <ChevronDown aria-hidden="true" size={16} strokeWidth={2} />
        ) : (
          <ChevronUp aria-hidden="true" size={16} strokeWidth={2} />
        )}
      </button>
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
        <button className="play-toggle" type="button" aria-label={isPlaying ? 'Pause' : 'Play'} onClick={togglePlayback}>
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
