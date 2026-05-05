import React, { useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'
import type { FallbackSource } from '@rdio/rdio-core'
import {
  Bell,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  GripVertical,
  ListMusic,
  Plus,
  Search,
  Settings,
  UploadCloud,
  Users,
} from 'lucide-react'
import { PlayerBar } from './components/PlayerBar'
import './styles.css'

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3001'

interface StationSummary {
  id: string
  name: string
  slug: string
  timezone: string
  mount: string
  streamUrl: string
  fallbackSource: FallbackSource
}

interface StationsResponse {
  stations: StationSummary[]
}

interface ProgramBlock {
  id: string
  title: string
}

type ViewName = 'calendar' | 'programs' | 'hosts' | 'media' | 'settings'

function formatMonthLabel(date: Date) {
  return new Intl.DateTimeFormat(undefined, {
    month: 'long',
    year: 'numeric',
  }).format(date)
}

function formatWeekday(date: Date) {
  return new Intl.DateTimeFormat(undefined, {
    weekday: 'long',
  }).format(date)
}

function formatDateKey(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')

  return `${year}-${month}-${day}`
}

function formatDayLabel(date: Date) {
  return new Intl.DateTimeFormat(undefined, {
    month: 'long',
    day: 'numeric',
  }).format(date)
}

function buildMonthDays(date: Date) {
  const daysInMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate()

  return Array.from({ length: daysInMonth }, (_, index) => new Date(date.getFullYear(), date.getMonth(), index + 1))
}

function readViewName(): ViewName {
  const match = window.location.pathname.match(/^\/([^/]+)\/?$/)
  const view = match?.[1]

  return view === 'programs' || view === 'hosts' || view === 'media' || view === 'settings' ? view : 'calendar'
}

function App() {
  const [stations, setStations] = useState<StationSummary[]>([])
  const [selectedDay, setSelectedDay] = useState<string | null>(null)
  const [programsByDay, setProgramsByDay] = useState<Record<string, ProgramBlock[]>>({})
  const [selectedProgramId, setSelectedProgramId] = useState<string | null>(null)
  const [draggedProgramId, setDraggedProgramId] = useState<string | null>(null)
  const [dragOverProgramId, setDragOverProgramId] = useState<string | null>(null)
  const [activeView, setActiveView] = useState<ViewName>(readViewName)
  const [visibleMonth, setVisibleMonth] = useState(() => {
    const today = new Date()
    return new Date(today.getFullYear(), today.getMonth(), 1)
  })

  useEffect(() => {
    const handlePopState = () => {
      setActiveView(readViewName())
    }

    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [])

  useEffect(() => {
    let ignore = false

    async function loadStations() {
      try {
        const response = await fetch(`${apiBaseUrl}/stations`)

        if (!response.ok) {
          throw new Error(`Stations request failed with ${response.status}`)
        }

        const data = (await response.json()) as StationsResponse

        if (!ignore) {
          setStations(data.stations)
        }
      } catch {
        if (!ignore) {
          setStations([])
        }
      }
    }

    void loadStations()

    return () => {
      ignore = true
    }
  }, [])

  const currentStation = stations[0] ?? null

  const stationName = currentStation?.name ?? 'Station'
  const days = buildMonthDays(visibleMonth)

  const moveMonth = (offset: number) => {
    setVisibleMonth((current) => new Date(current.getFullYear(), current.getMonth() + offset, 1))
  }

  const changeView = (nextView: ViewName) => {
    window.history.pushState({}, '', nextView === 'calendar' ? '/calendar' : `/${nextView}`)
    setActiveView(nextView)
  }

  const addProgram = (dayKey: string) => {
    const nextProgram = {
      id: crypto.randomUUID(),
      title: 'Untitled program',
    }

    setProgramsByDay((current) => ({
      ...current,
      [dayKey]: [...(current[dayKey] ?? []), nextProgram],
    }))
    setSelectedProgramId(nextProgram.id)
  }

  const reorderProgram = (dayKey: string, targetProgramId: string | null) => {
    if (!draggedProgramId) {
      return
    }

    setProgramsByDay((current) => {
      const programs = current[dayKey] ?? []
      const draggedProgram = programs.find((program) => program.id === draggedProgramId)

      if (!draggedProgram) {
        return current
      }

      const withoutDragged = programs.filter((program) => program.id !== draggedProgramId)
      const targetIndex = targetProgramId ? withoutDragged.findIndex((program) => program.id === targetProgramId) : withoutDragged.length
      const insertIndex = targetIndex >= 0 ? targetIndex : withoutDragged.length
      const nextPrograms = [...withoutDragged]

      nextPrograms.splice(insertIndex, 0, draggedProgram)

      return {
        ...current,
        [dayKey]: nextPrograms,
      }
    })

    setDraggedProgramId(null)
    setDragOverProgramId(null)
  }

  return (
    <main className="app-page">
      <section className="app-shell" aria-label="Rdio scheduler">
        <PageHeader />
        <div className="app-body">
          {currentStation ? (
            <AppSidebar activeView={activeView} stationName={stationName} onChangeView={changeView} />
          ) : null}
          <div className={currentStation ? 'shell station-shell' : 'shell'}>
            {!currentStation ? (
              <StationLoading />
            ) : activeView === 'calendar' ? (
              <section className="calendar-view" aria-label={`${stationName} calendar`}>
                <div className="calendar-sticky">
                  <div className="section-title">
                    <span>Station</span>
                    <strong>{stationName}</strong>
                  </div>
                  <div className="month-toggle" aria-label="Calendar month">
                    <button type="button" onClick={() => moveMonth(-1)} aria-label="Previous month">
                      <ChevronLeft aria-hidden="true" size={18} strokeWidth={1.8} />
                    </button>
                    <span>{formatMonthLabel(visibleMonth)}</span>
                    <button type="button" onClick={() => moveMonth(1)} aria-label="Next month">
                      <ChevronRight aria-hidden="true" size={18} strokeWidth={1.8} />
                    </button>
                  </div>
                </div>
                <div className="day-list">
                  {days.map((day) => {
                    const dayKey = formatDateKey(day)
                    const dayPrograms = programsByDay[dayKey] ?? []

                    return (
                      <React.Fragment key={dayKey}>
                        <LineCard
                          className={selectedDay === dayKey ? 'day-line is-selected' : 'day-line'}
                          onClick={() => setSelectedDay((current) => (current === dayKey ? null : dayKey))}
                        >
                          <span className="day-number">{day.getDate()}</span>
                          <span className="day-name">{formatWeekday(day)}</span>
                          <span className="day-balance" aria-hidden={dayPrograms.length === 0}>
                            {dayPrograms.length > 0 ? `${dayPrograms.length}` : null}
                          </span>
                        </LineCard>
                        {selectedDay === dayKey ? (
                          <DayPrograms
                            day={day}
                            programs={dayPrograms}
                            selectedProgramId={selectedProgramId}
                            dragOverProgramId={dragOverProgramId}
                            onAddProgram={() => addProgram(dayKey)}
                            onSelectProgram={setSelectedProgramId}
                            onDragProgram={setDraggedProgramId}
                            onDragOverProgram={setDragOverProgramId}
                            onDropProgram={(targetProgramId) => reorderProgram(dayKey, targetProgramId)}
                            onEndDrag={() => {
                              setDraggedProgramId(null)
                              setDragOverProgramId(null)
                            }}
                          />
                        ) : null}
                      </React.Fragment>
                    )
                  })}
                </div>
              </section>
            ) : activeView === 'settings' ? (
              <StationSettings station={currentStation} />
            ) : (
              <EmptyPage label={activeView} />
            )}
          </div>
        </div>
        <PlayerBar stationName={stationName} />
      </section>
    </main>
  )
}

function LineCard({
  children,
  className,
  onClick,
}: {
  children: React.ReactNode
  className: string
  onClick: () => void
}) {
  return (
    <button className={`line-card ${className}`} type="button" onClick={onClick}>
      {children}
    </button>
  )
}

function PageHeader() {
  return (
    <header className="page-header">
      <div className="brand-mark">rdio</div>
      <label className="search-field">
        <span className="sr-only">Search</span>
        <input aria-label="Search" />
        <button type="button" aria-label="Submit search">
          <Search aria-hidden="true" size={16} strokeWidth={2.3} />
        </button>
      </label>
      <div className="account-menu">
        <span>Bryan Clark</span>
        <Bell aria-hidden="true" size={16} strokeWidth={1.8} />
      </div>
    </header>
  )
}

function AppSidebar({
  activeView,
  stationName,
  onChangeView,
}: {
  activeView: ViewName
  stationName: string
  onChangeView: (view: ViewName) => void
}) {
  return (
    <aside className="sidebar" aria-label="Library">
      <nav className="sidebar-group" aria-label="Station views">
        <button className={activeView === 'calendar' ? 'is-active' : ''} type="button" onClick={() => onChangeView('calendar')}>
          <CalendarDays aria-hidden="true" size={14} strokeWidth={1.8} />
          Calendar
        </button>
        <button className={activeView === 'programs' ? 'is-active' : ''} type="button" onClick={() => onChangeView('programs')}>
          <ListMusic aria-hidden="true" size={14} strokeWidth={1.8} />
          Programs
        </button>
        <button className={activeView === 'hosts' ? 'is-active' : ''} type="button" onClick={() => onChangeView('hosts')}>
          <Users aria-hidden="true" size={14} strokeWidth={1.8} />
          Hosts
        </button>
        <button className={activeView === 'media' ? 'is-active' : ''} type="button" onClick={() => onChangeView('media')}>
          <UploadCloud aria-hidden="true" size={14} strokeWidth={1.8} />
          Media
        </button>
        <button className={activeView === 'settings' ? 'is-active' : ''} type="button" onClick={() => onChangeView('settings')}>
          <Settings aria-hidden="true" size={14} strokeWidth={1.8} />
          Settings
        </button>
      </nav>
      <div className="sidebar-section">
        <span>Collection</span>
        <a href={apiBaseUrl}>API</a>
        <a href="http://localhost:8000">Icecast</a>
      </div>
      <div className="sidebar-section">
        <span>Station</span>
        <p>{stationName}</p>
      </div>
    </aside>
  )
}

function StationLoading() {
  return (
    <section className="empty-page" aria-label="Station loading">
      <p>Loading station</p>
    </section>
  )
}

function EmptyPage({ label }: { label: Exclude<ViewName, 'calendar' | 'settings'> }) {
  return (
    <section className="empty-page" aria-label={label}>
      <p>{label}</p>
    </section>
  )
}

function StationSettings({ station }: { station: StationSummary }) {
  const fallbackDetail =
    station.fallbackSource.kind === 'playlist'
      ? station.fallbackSource.playlistId
      : station.fallbackSource.kind === 'track'
        ? station.fallbackSource.trackId
        : station.fallbackSource.kind === 'live'
          ? station.fallbackSource.inputId
          : 'default'

  return (
    <section className="settings-view" aria-label={`${station.name} settings`}>
      <div className="section-title settings-title">
        <span>Station</span>
        <strong>Settings</strong>
      </div>
      <form className="settings-form">
        <label>
          <span>Name</span>
          <input readOnly value={station.name} />
        </label>
        <label>
          <span>Station ID</span>
          <input readOnly value={station.id} />
        </label>
        <label>
          <span>Slug</span>
          <input readOnly value={station.slug} />
        </label>
        <label>
          <span>Timezone</span>
          <input readOnly value={station.timezone} />
        </label>
        <label>
          <span>Mount</span>
          <input readOnly value={station.mount} />
        </label>
        <label>
          <span>Stream URL</span>
          <input readOnly value={station.streamUrl} />
        </label>
        <label>
          <span>Fallback type</span>
          <input readOnly value={station.fallbackSource.kind} />
        </label>
        <label>
          <span>Fallback source</span>
          <input readOnly value={fallbackDetail} />
        </label>
      </form>
    </section>
  )
}

function DayPrograms({
  day,
  programs,
  selectedProgramId,
  dragOverProgramId,
  onAddProgram,
  onSelectProgram,
  onDragProgram,
  onDragOverProgram,
  onDropProgram,
  onEndDrag,
}: {
  day: Date
  programs: ProgramBlock[]
  selectedProgramId: string | null
  dragOverProgramId: string | null
  onAddProgram: () => void
  onSelectProgram: (programId: string) => void
  onDragProgram: (programId: string) => void
  onDragOverProgram: (programId: string | null) => void
  onDropProgram: (programId: string | null) => void
  onEndDrag: () => void
}) {
  return (
    <section
      className="program-panel"
      aria-label={`${formatDayLabel(day)} programs`}
      onDragOver={(event) => {
        event.preventDefault()
        onDragOverProgram(null)
      }}
      onDrop={() => onDropProgram(null)}
    >
      {programs.length === 0 ? <p className="program-empty">No programs scheduled</p> : null}

      {programs.map((program) => (
        <article
          className={[
            'program-block',
            selectedProgramId === program.id ? 'is-active' : '',
            dragOverProgramId === program.id ? 'is-drop-target' : '',
          ]
            .filter(Boolean)
            .join(' ')}
          draggable
          key={program.id}
          onClick={() => onSelectProgram(program.id)}
          onDragStart={(event) => {
            event.dataTransfer.effectAllowed = 'move'
            onDragProgram(program.id)
          }}
          onDragOver={(event) => {
            event.preventDefault()
            event.stopPropagation()
            onDragOverProgram(program.id)
          }}
          onDrop={(event) => {
            event.stopPropagation()
            onDropProgram(program.id)
          }}
          onDragEnd={onEndDrag}
        >
          <button className="program-handle" type="button" aria-label="Drag program">
            <GripVertical aria-hidden="true" size={16} strokeWidth={1.8} />
          </button>
          <span>{program.title}</span>
        </article>
      ))}

      <button className="add-program" type="button" onClick={onAddProgram}>
        <Plus aria-hidden="true" size={15} strokeWidth={1.8} />
        <span>Add program</span>
      </button>
    </section>
  )
}

createRoot(document.getElementById('root')!).render(<App />)
