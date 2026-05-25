import React, { useEffect, useRef, useState } from 'react'
import { ListMusic, Mic2, Pause, Play, SkipBack, SkipForward, Volume2 } from 'lucide-react'

interface PlayerBarProps {
  channelName: string
  programKind: 'broadcast' | 'recording'
  programName?: string
  streamUrl: string
}

export function PlayerBar({ channelName, programKind, programName, streamUrl }: PlayerBarProps) {
  const ProgramIcon = programKind === 'broadcast' ? Mic2 : ListMusic
  const audioRef = useRef<HTMLAudioElement>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [isConnecting, setIsConnecting] = useState(false)
  const [playbackError, setPlaybackError] = useState('')
  const nowPlayingTitle = programName ? `${channelName} - ${programName}` : channelName
  const nowPlayingText = isConnecting
    ? 'Connecting'
    : playbackError
      ? `${nowPlayingTitle} - ${playbackError}`
      : nowPlayingTitle

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
    <footer className="player-bar" aria-label="Player">
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
      <div className="transport-controls">
        <button type="button" aria-label="Previous" disabled>
          <SkipBack aria-hidden="true" size={16} fill="currentColor" strokeWidth={2} />
        </button>
        <button className="play-toggle" type="button" aria-label={isPlaying ? 'Pause' : 'Play'} onClick={togglePlayback}>
          {isPlaying
            ? <Pause aria-hidden="true" size={22} fill="currentColor" strokeWidth={2} />
            : <Play aria-hidden="true" size={22} fill="currentColor" strokeWidth={2} />
          }
        </button>
        <button type="button" aria-label="Next" disabled>
          <SkipForward aria-hidden="true" size={16} fill="currentColor" strokeWidth={2} />
        </button>
      </div>
      <div className="now-playing">
        <ProgramIcon
          aria-label={programKind === 'broadcast' ? 'Live broadcast' : 'Recording'}
          className="now-playing-icon"
          size={14}
          strokeWidth={1.8}
        />
        <span>{nowPlayingText}</span>
      </div>
      <div className="volume-controls">
        <Volume2 aria-hidden="true" size={15} fill="currentColor" strokeWidth={2} />
      </div>
    </footer>
  )
}
