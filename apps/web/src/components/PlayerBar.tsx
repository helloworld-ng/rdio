import { Clock3, Pause, Play, SkipBack, SkipForward, Volume2 } from 'lucide-react'

interface PlayerBarProps {
  stationName: string
}

export function PlayerBar({ stationName }: PlayerBarProps) {
  return (
    <footer className="player-bar" aria-label="Player">
      <div className="transport-controls">
        <button type="button" aria-label="Previous">
          <SkipBack aria-hidden="true" size={18} fill="currentColor" strokeWidth={2} />
        </button>
        <button className="play-toggle" type="button" aria-label="Pause">
          <Pause aria-hidden="true" size={25} fill="currentColor" strokeWidth={2} />
        </button>
        <button type="button" aria-label="Next">
          <SkipForward aria-hidden="true" size={18} fill="currentColor" strokeWidth={2} />
        </button>
      </div>
      <div className="now-playing">
        <span>{stationName} — Window Blues</span>
        <div className="timeline" aria-hidden="true">
          <Clock3 size={12} strokeWidth={2} />
          <span>0:30</span>
          <div className="progress">
            <span />
          </div>
          <span>4:01</span>
        </div>
      </div>
      <div className="volume-controls">
        <Volume2 aria-hidden="true" size={17} fill="currentColor" strokeWidth={2} />
        <button type="button" aria-label="Start station">
          <Play aria-hidden="true" size={13} fill="currentColor" strokeWidth={2} />
        </button>
      </div>
    </footer>
  )
}
