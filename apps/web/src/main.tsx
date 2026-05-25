import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { createRoot } from 'react-dom/client'
import type { FallbackSource } from '@rdio/rdio-core'
import {
  BookOpen,
  CalendarClock,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Copy,
  GripVertical,
  ListMusic,
  Mic2,
  PanelLeftClose,
  PanelLeftOpen,
  Plus,
  Radio,
  Settings,
  Trash2,
  Users,
  X,
} from 'lucide-react'
import { FileUploadField } from './components/FileUploadField'
import { MediaSlotField } from './components/MediaSlotField'
import { MediaPreviewThumb } from './components/MediaPreviewThumb'
import { HostAvatar, hostPalette } from './components/HostAvatar'
import type { HostRecord } from './components/HostsPage'
import { HostsPage } from './components/HostsPage'
import { MultiSelect } from './components/MultiSelect'
import { PlayerBar } from './components/PlayerBar'
import { mockAnchorDate } from './data/mockStation'
import { formatFileSize } from './utils'
import './styles.css'

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3001'
const apiKey = import.meta.env.VITE_API_KEY as string | undefined
const hours = Array.from({ length: 24 }, (_, hour) => hour)

async function apiFetch(url: string, init?: RequestInit): Promise<Response> {
  const headers = new Headers(init?.headers as HeadersInit)
  if (apiKey) {
    headers.set('Authorization', `Bearer ${apiKey}`)
  }
  return fetch(url, { ...init, headers })
}

interface IcecastSettings {
  host: string
  port: number
  mount: string
  sourcePassword: string
}

interface StationSummary {
  id: string
  name: string
  slug: string
  timezone: string
  mount: string
  streamUrl: string
  fallbackSource: FallbackSource
  icecast: IcecastSettings
  broadcastIcecast: IcecastSettings
}

interface StationResponse {
  station: StationSummary
}

interface UploadedFileSummary {
  name: string
  size: number
  duration?: number // seconds
}

interface MediaItem {
  id: string
  name: string
  size: number
  type: 'audio' | 'image'
  uploadedAt: string
  url: string
}

interface MediaResponse {
  media: MediaItem[]
}

interface ScheduleBlocksResponse {
  blocks: ScheduleBlock[]
}

interface Program {
  id: string
  title: string
  description: string
  host: string
}

interface ScheduleBlock {
  id: string
  kind: 'recording' | 'broadcast'
  title: string
  description: string
  dateKey: string
  startMinutes: number
  endMinutes: number
  hosts: string[]
  programId?: string
  file?: UploadedFileSummary
  mediaId?: string
}

type ScheduleBlockDraft = Omit<ScheduleBlock, 'id' | 'dateKey'>

interface DragDropPreview {
  startMinutes: number
  durationMinutes: number
  canDrop: boolean
}

interface CreationRequest {
  dateKey: string
  hour: number
  kind: ScheduleBlock['kind'] | null
}

type ViewName = 'schedule' | 'programs' | 'hosts' | 'media' | 'broadcast' | 'settings'

const MOBILE_SIDEBAR_QUERY = '(max-width: 620px)'

function mediaUrl(url: string) {
  return url.startsWith('http') ? url : `${apiBaseUrl}${url}`
}

function readInitialSidebarVisible() {
  if (typeof window === 'undefined') {
    return true
  }

  return !window.matchMedia(MOBILE_SIDEBAR_QUERY).matches
}

function getHostNames(hosts: HostRecord[]): string[] {
  return hosts.map((host) => host.name)
}

function findHost(hosts: HostRecord[], name: string): HostRecord | undefined {
  return hosts.find((host) => host.name === name)
}

function addHostByName(hosts: HostRecord[], name: string): HostRecord[] {
  const normalized = name.trim()

  if (!normalized || hosts.some((host) => host.name === normalized)) {
    return hosts
  }

  const colorId = hostPalette[hosts.length % hostPalette.length].id

  return [...hosts, { name: normalized, colorId }]
}

function formatDateKey(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')

  return `${year}-${month}-${day}`
}

function programTitleForBlock(block: ScheduleBlock | undefined, programs: Program[]) {
  if (!block) {
    return undefined
  }

  if (block.programId) {
    const program = programs.find((item) => item.id === block.programId)

    if (program) {
      return program.title
    }
  }

  return block.title
}

function dateFromKey(dateKey: string) {
  const [year, month, day] = dateKey.split('-').map(Number)
  return new Date(year, month - 1, day)
}

function formatDayTitle(date: Date) {
  return new Intl.DateTimeFormat(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  }).format(date)
}

function formatShortDate(date: Date) {
  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
  }).format(date)
}

function formatMonthLabel(date: Date) {
  return new Intl.DateTimeFormat(undefined, {
    month: 'long',
    year: 'numeric',
  }).format(date)
}

function formatHour(hour: number) {
  return new Intl.DateTimeFormat(undefined, {
    hour: 'numeric',
  }).format(new Date(2026, 0, 1, hour))
}

function minutesToTimeInput(minutes: number) {
  const safeMinutes = Math.min(1439, Math.max(0, minutes))
  const hour = Math.floor(safeMinutes / 60)
  const minute = safeMinutes % 60

  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`
}

function timeInputToMinutes(value: string) {
  const [hour = '0', minute = '0'] = value.split(':')

  return Number(hour) * 60 + Number(minute)
}

function formatUploadTime(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(value))
}

function addDays(date: Date, offset: number) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + offset)
}

function isSameCalendarDay(left: Date, right: Date) {
  return (
    left.getFullYear() === right.getFullYear() &&
    left.getMonth() === right.getMonth() &&
    left.getDate() === right.getDate()
  )
}

function formatNowClock(date = new Date()) {
  return new Intl.DateTimeFormat(undefined, {
    hour: 'numeric',
    minute: '2-digit',
    second: '2-digit',
  }).format(date)
}

function getNowMinutes(date = new Date()) {
  return date.getHours() * 60 + date.getMinutes() + date.getSeconds() / 60
}

function getMinutesOffsetInGrid(grid: HTMLElement, minutes: number) {
  const safeMinutes = Math.max(0, Math.min(1440, minutes))

  return (safeMinutes / 1440) * grid.clientHeight
}

function blockOverlapsHour(block: ScheduleBlock, hour: number) {
  const hourStart = hour * 60
  const hourEnd = (hour + 1) * 60

  return block.startMinutes < hourEnd && block.endMinutes > hourStart
}

function timeRangesOverlap(startA: number, endA: number, startB: number, endB: number) {
  return startA < endB && endA > startB
}

function minutesFromClientY(canvas: HTMLElement, clientY: number) {
  const rect = canvas.getBoundingClientRect()
  const ratio = rect.height > 0 ? (clientY - rect.top) / rect.height : 0

  return Math.round(Math.max(0, Math.min(1, ratio)) * 1440)
}

function clampBlockStart(startMinutes: number, durationMinutes: number) {
  const duration = Math.max(30, durationMinutes)

  return Math.min(Math.max(0, startMinutes), 1440 - duration)
}

function canPlaceBlockAt(
  blocks: ScheduleBlock[],
  movingBlockId: string,
  startMinutes: number,
  durationMinutes: number,
) {
  const duration = Math.max(30, durationMinutes)
  const endMinutes = startMinutes + duration

  return !blocks.some((block) => {
    if (block.id === movingBlockId) {
      return false
    }

    return timeRangesOverlap(startMinutes, endMinutes, block.startMinutes, block.endMinutes)
  })
}

function buildDragDropPreview(
  blocks: ScheduleBlock[],
  draggedBlockId: string,
  canvas: HTMLElement,
  clientY: number,
): DragDropPreview | null {
  const block = blocks.find((entry) => entry.id === draggedBlockId)

  if (!block) {
    return null
  }

  const durationMinutes = Math.max(30, block.endMinutes - block.startMinutes)
  const startMinutes = clampBlockStart(minutesFromClientY(canvas, clientY), durationMinutes)
  const canDrop = canPlaceBlockAt(blocks, draggedBlockId, startMinutes, durationMinutes)

  return { startMinutes, durationMinutes, canDrop }
}

function loadAudioDuration(src: string): Promise<number> {
  return new Promise((resolve, reject) => {
    const audio = new Audio()
    audio.onloadedmetadata = () => resolve(audio.duration)
    audio.onerror = () => reject(new Error('Could not load audio'))
    audio.src = src
  })
}

function formatSlotDuration(minutes: number): string {
  if (minutes < 60) return `${minutes}min`
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return m === 0 ? `${h}h` : `${h}h ${m}min`
}

function buildDatePickerDays(monthDate: Date) {
  const firstOfMonth = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1)
  const gridStart = addDays(firstOfMonth, -firstOfMonth.getDay())

  return Array.from({ length: 42 }, (_, index) => addDays(gridStart, index))
}

function readViewName(): ViewName {
  const match = window.location.pathname.match(/^\/([^/]+)\/?$/)
  const view = match?.[1]

  return view === 'programs' || view === 'hosts' || view === 'media' || view === 'broadcast' || view === 'settings' || view === 'schedule'
    ? view
    : 'schedule'
}

function App() {
  const [stations, setStations] = useState<StationSummary[]>([])
  const [stationLoadFailed, setStationLoadFailed] = useState(false)
  const [activeView, setActiveView] = useState<ViewName>(readViewName)
  const [isSidebarVisible, setIsSidebarVisible] = useState(readInitialSidebarVisible)
  const [isMobileSidebar, setIsMobileSidebar] = useState(
    () => typeof window !== 'undefined' && window.matchMedia(MOBILE_SIDEBAR_QUERY).matches,
  )

  useEffect(() => {
    const media = window.matchMedia(MOBILE_SIDEBAR_QUERY)
    const syncMobileSidebar = () => setIsMobileSidebar(media.matches)

    syncMobileSidebar()
    media.addEventListener('change', syncMobileSidebar)

    return () => media.removeEventListener('change', syncMobileSidebar)
  }, [])
  const [selectedDate, setSelectedDate] = useState(() => new Date(mockAnchorDate))
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false)
  const [datePickerMonth, setDatePickerMonth] = useState(
    () => new Date(mockAnchorDate.getFullYear(), mockAnchorDate.getMonth(), 1),
  )
  const [blocks, setBlocks] = useState<ScheduleBlock[]>([])
  const [isScheduleLoaded, setIsScheduleLoaded] = useState(false)
  const [mediaItems, setMediaItems] = useState<MediaItem[]>([])
  const [mediaFilter, setMediaFilter] = useState<'all' | MediaItem['type']>('all')
  const [hosts, setHosts] = useState<HostRecord[]>([])
  const [programs, setPrograms] = useState<Program[]>([])
  const [creationRequest, setCreationRequest] = useState<CreationRequest | null>(null)
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null)
  const [draggedBlockId, setDraggedBlockId] = useState<string | null>(null)
  const [dragDropPreview, setDragDropPreview] = useState<DragDropPreview | null>(null)
  const [scheduleFocusToken, setScheduleFocusToken] = useState(1)
  const [nowTick, setNowTick] = useState(0)

  useEffect(() => {
    const interval = window.setInterval(() => setNowTick((tick) => tick + 1), 60_000)

    return () => window.clearInterval(interval)
  }, [])

  const focusScheduleNow = useCallback(() => {
    const today = new Date()
    setSelectedDate(today)
    setDatePickerMonth(new Date(today.getFullYear(), today.getMonth(), 1))
    setScheduleFocusToken((token) => token + 1)
    setCreationRequest(null)
    setSelectedBlockId(null)
  }, [])

  useEffect(() => {
    const handlePopState = () => {
      const nextView = readViewName()
      setActiveView(nextView)

      if (nextView === 'schedule') {
        focusScheduleNow()
      }
    }

    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [focusScheduleNow])

  useEffect(() => {
    let ignore = false

    async function loadStation() {
      try {
        const response = await apiFetch(`${apiBaseUrl}/station`)

        if (!response.ok) {
          throw new Error(`Station request failed with ${response.status}`)
        }

        const data = (await response.json()) as StationResponse

        if (!ignore) {
          setStations([data.station])
          setStationLoadFailed(false)
        }
      } catch {
        if (!ignore) {
          setStations([])
          setStationLoadFailed(true)
        }
      }
    }

    void loadStation()

    return () => {
      ignore = true
    }
  }, [])

  useEffect(() => {
    let ignore = false

    async function loadScheduleBlocks() {
      try {
        const response = await apiFetch(`${apiBaseUrl}/schedule-blocks`)

        if (!response.ok) {
          throw new Error(`Schedule request failed with ${response.status}`)
        }

        const data = (await response.json()) as ScheduleBlocksResponse

        if (!ignore) {
          setBlocks(data.blocks)
          setIsScheduleLoaded(true)
        }
      } catch {
        if (!ignore) {
          setBlocks([])
          setIsScheduleLoaded(false)
        }
      }
    }

    void loadScheduleBlocks()

    return () => {
      ignore = true
    }
  }, [])

  useEffect(() => {
    let ignore = false
    async function load() {
      try {
        const res = await apiFetch(`${apiBaseUrl}/programs`)
        if (!res.ok) return
        const data = (await res.json()) as { programs: Program[] }
        if (!ignore) setPrograms(data.programs)
      } catch { /* ignore */ }
    }
    void load()
    return () => { ignore = true }
  }, [])

  useEffect(() => {
    let ignore = false
    async function load() {
      try {
        const res = await apiFetch(`${apiBaseUrl}/hosts`)
        if (!res.ok) return
        const data = (await res.json()) as { hosts: HostRecord[] }
        if (!ignore) setHosts(data.hosts)
      } catch { /* ignore */ }
    }
    void load()
    return () => { ignore = true }
  }, [])

  useEffect(() => {
    if (!isScheduleLoaded) {
      return
    }

    const timeout = window.setTimeout(() => {
      void apiFetch(`${apiBaseUrl}/schedule-blocks`, {
        body: JSON.stringify({ blocks }),
        headers: {
          'Content-Type': 'application/json',
        },
        method: 'PUT',
      })
    }, 250)

    return () => window.clearTimeout(timeout)
  }, [blocks, isScheduleLoaded])

  useEffect(() => {
    let ignore = false

    async function loadMedia() {
      try {
        const response = await apiFetch(`${apiBaseUrl}/media`)

        if (!response.ok) {
          throw new Error(`Media request failed with ${response.status}`)
        }

        const data = (await response.json()) as MediaResponse

        if (!ignore) {
          setMediaItems(data.media)
        }
      } catch {
        if (!ignore) {
          setMediaItems([])
        }
      }
    }

    void loadMedia()

    return () => {
      ignore = true
    }
  }, [])

  const currentStation = stations[0] ?? null
  const stationName = currentStation?.name ?? '16 Radio'
  const selectedDateKey = formatDateKey(selectedDate)
  const dayBlocks = useMemo(
    () => blocks.filter((block) => block.dateKey === selectedDateKey).sort((a, b) => a.startMinutes - b.startMinutes),
    [blocks, selectedDateKey],
  )
  const todayDateKey = formatDateKey(new Date())
  const todayBlocks = useMemo(
    () => blocks.filter((block) => block.dateKey === todayDateKey).sort((a, b) => a.startMinutes - b.startMinutes),
    [blocks, todayDateKey],
  )
  const currentOnAirBlock = useMemo(() => {
    const nowMinutes = getNowMinutes()

    return todayBlocks.find((block) => block.startMinutes <= nowMinutes && block.endMinutes > nowMinutes)
  }, [todayBlocks, nowTick])
  const playerProgramName = programTitleForBlock(currentOnAirBlock, programs)
  const changeView = (nextView: ViewName) => {
    window.history.pushState({}, '', nextView === 'schedule' ? '/schedule' : `/${nextView}`)
    setActiveView(nextView)

    if (nextView === 'schedule') {
      focusScheduleNow()
    } else {
      setCreationRequest(null)
      setSelectedBlockId(null)
    }

    if (window.matchMedia(MOBILE_SIDEBAR_QUERY).matches) {
      setIsSidebarVisible(false)
    }
  }

  const moveDay = (offset: number) => {
    setSelectedDate((current) => {
      const nextDate = addDays(current, offset)
      setDatePickerMonth(new Date(nextDate.getFullYear(), nextDate.getMonth(), 1))
      return nextDate
    })
    setCreationRequest(null)
    setSelectedBlockId(null)
  }

  const selectDate = (nextDate: Date) => {
    setSelectedDate(nextDate)
    setDatePickerMonth(new Date(nextDate.getFullYear(), nextDate.getMonth(), 1))
    setIsDatePickerOpen(false)
    setCreationRequest(null)
    setSelectedBlockId(null)
  }

  const saveBlock = (blockInput: ScheduleBlockDraft) => {
    const request = creationRequest

    if (!request) {
      return
    }

    const nextBlock: ScheduleBlock = {
      ...blockInput,
      id: crypto.randomUUID(),
      dateKey: request.dateKey,
    }

    setBlocks((current) => [...current, nextBlock])
    setSelectedBlockId(nextBlock.id)
    setCreationRequest(null)
  }

  const updateBlock = (blockId: string, blockInput: ScheduleBlockDraft) => {
    setBlocks((current) => current.map((block) => (block.id === blockId ? { ...block, ...blockInput } : block)))
    setSelectedBlockId(blockId)
  }

  const duplicateBlock = (blockId: string) => {
    setBlocks((current) => {
      const block = current.find((item) => item.id === blockId)

      if (!block) {
        return current
      }

      const duration = Math.max(30, block.endMinutes - block.startMinutes)
      const startMinutes = Math.min(1440 - duration, block.endMinutes)
      const nextBlock = {
        ...block,
        id: crypto.randomUUID(),
        title: `${block.title} copy`,
        startMinutes,
        endMinutes: startMinutes + duration,
      }

      return [...current, nextBlock]
    })
  }

  const removeBlock = (blockId: string) => {
    setBlocks((current) => current.filter((block) => block.id !== blockId))
    setSelectedBlockId((current) => (current === blockId ? null : current))
  }

  const moveBlock = (blockId: string, startMinutes: number) => {
    setBlocks((current) => {
      const movingBlock = current.find((block) => block.id === blockId)

      if (!movingBlock) {
        return current
      }

      const duration = Math.max(30, movingBlock.endMinutes - movingBlock.startMinutes)
      const nextStartMinutes = clampBlockStart(startMinutes, duration)

      if (!canPlaceBlockAt(current, blockId, nextStartMinutes, duration)) {
        return current
      }

      return current.map((block) => {
        if (block.id !== blockId) {
          return block
        }

        return {
          ...block,
          dateKey: selectedDateKey,
          startMinutes: nextStartMinutes,
          endMinutes: nextStartMinutes + duration,
        }
      })
    })
    setDragDropPreview(null)
  }

  const beginCreate = (hour: number, kind: ScheduleBlock['kind'] | null = null) => {
    setCreationRequest({ dateKey: selectedDateKey, hour, kind })
    setSelectedBlockId(null)
  }

  const closeSlotPanel = () => {
    setCreationRequest(null)
    setSelectedBlockId(null)
  }

  const selectBlock = (blockId: string | null) => {
    if (blockId === null) {
      closeSlotPanel()
      return
    }

    setCreationRequest(null)
    setSelectedBlockId((current) => (current === blockId ? null : blockId))
  }

  const uploadMedia = async (file: File): Promise<MediaItem> => {
    const response = await apiFetch(`${apiBaseUrl}/media`, {
      body: file,
      headers: {
        'Content-Type': file.type || 'application/octet-stream',
        'X-File-Name': file.name,
      },
      method: 'POST',
    })

    if (!response.ok) {
      throw new Error(`Upload failed with ${response.status}`)
    }

    const data = (await response.json()) as { media: MediaItem }
    setMediaItems((current) => [data.media, ...current.filter((item) => item.id !== data.media.id)])
    return data.media
  }

  const deleteMedia = async (mediaId: string) => {
    const response = await apiFetch(`${apiBaseUrl}/media/${encodeURIComponent(mediaId)}`, {
      method: 'DELETE',
    })

    if (!response.ok) {
      throw new Error(`Delete failed with ${response.status}`)
    }

    setMediaItems((current) => current.filter((item) => item.id !== mediaId))
  }

  return (
    <main className="app-page">
      <section
        className={currentStation ? 'app-shell' : 'app-shell is-station-loading'}
        aria-label="Rdio scheduler"
      >
        <PageHeader
          alignWithSidebar={isSidebarVisible && currentStation !== null && !isMobileSidebar}
          isSidebarOpen={isSidebarVisible}
          onToggleSidebar={() => setIsSidebarVisible((current) => !current)}
        />
        <div
          className={
            isSidebarVisible && currentStation && !isMobileSidebar ? 'app-body has-sidebar' : 'app-body'
          }
        >
          {currentStation && isSidebarVisible && isMobileSidebar ? (
            <button
              className="sidebar-backdrop"
              type="button"
              aria-label="Close menu"
              onClick={() => setIsSidebarVisible(false)}
            />
          ) : null}
          {currentStation && isSidebarVisible ? (
            <AppSidebar
              activeView={activeView}
              isMobileOverlay={isMobileSidebar}
              onChangeView={changeView}
            />
          ) : null}
          <div className={currentStation ? 'shell station-shell' : 'shell'}>
            {!currentStation ? (
              <StationLoading failed={stationLoadFailed} />
            ) : activeView === 'schedule' ? (
              <DailyCalendar
                blocks={dayBlocks}
                creationRequest={creationRequest}
                datePickerMonth={datePickerMonth}
                dragDropPreview={dragDropPreview}
                draggedBlockId={draggedBlockId}
                focusNowToken={scheduleFocusToken}
                isMobileLayout={isMobileSidebar}
                hosts={getHostNames(hosts)}
                isDatePickerOpen={isDatePickerOpen}
                mediaItems={mediaItems}
                programs={programs}
                selectedBlockId={selectedBlockId}
                selectedDate={selectedDate}
                selectedDateKey={selectedDateKey}
                onAddHost={async (hostName) => {
                  const host = addHostByName(hosts, hostName)[hosts.length]
                  if (!host) return
                  const res = await apiFetch(`${apiBaseUrl}/hosts`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(host) })
                  if (res.ok) setHosts((current) => addHostByName(current, hostName))
                }}
                onBeginCreate={beginCreate}
                onChangeCreationKind={(kind) => setCreationRequest((current) => (current ? { ...current, kind } : current))}
                onDatePickerMonthChange={setDatePickerMonth}
                onCloseSlotPanel={closeSlotPanel}
                onDuplicateBlock={duplicateBlock}
                onMoveBlock={moveBlock}
                onMoveDay={moveDay}
                onRemoveBlock={removeBlock}
                onSaveBlock={saveBlock}
                onSelectBlock={selectBlock}
                onSelectDate={selectDate}
                onSetDragDropPreview={setDragDropPreview}
                onSetDraggedBlockId={setDraggedBlockId}
                onToggleDatePicker={() => setIsDatePickerOpen((current) => !current)}
                onUpdateBlock={updateBlock}
                onUploadMedia={uploadMedia}
              />
            ) : activeView === 'programs' ? (
              <ProgramsPage
                hosts={hosts}
                programs={programs}
                onAddHost={async (hostName) => {
                  const host = addHostByName(hosts, hostName)[hosts.length]
                  if (!host) return
                  const res = await apiFetch(`${apiBaseUrl}/hosts`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(host) })
                  if (res.ok) setHosts((current) => addHostByName(current, hostName))
                }}
                onCreateProgram={async (program) => {
                  const res = await apiFetch(`${apiBaseUrl}/programs`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(program) })
                  if (res.ok) { const data = (await res.json()) as { program: Program }; setPrograms((current) => [...current, data.program]) }
                }}
                onUpdateProgram={async (programId, program) => {
                  const res = await apiFetch(`${apiBaseUrl}/programs/${programId}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(program) })
                  if (res.ok) setPrograms((current) => current.map((item) => (item.id === programId ? { ...item, ...program } : item)))
                }}
                onDeleteProgram={async (programId) => {
                  const res = await apiFetch(`${apiBaseUrl}/programs/${programId}`, { method: 'DELETE' })
                  if (res.ok) setPrograms((current) => current.filter((item) => item.id !== programId))
                }}
              />
            ) : activeView === 'hosts' ? (
              <HostsPage
                hosts={hosts}
                onAddHost={async (host) => {
                  const res = await apiFetch(`${apiBaseUrl}/hosts`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(host) })
                  if (res.ok) setHosts((current) => current.some((item) => item.name === host.name) ? current : [...current, host])
                }}
                onRemoveHost={async (hostName) => {
                  const res = await apiFetch(`${apiBaseUrl}/hosts/${encodeURIComponent(hostName)}`, { method: 'DELETE' })
                  if (res.ok) setHosts((current) => current.filter((item) => item.name !== hostName))
                }}
                onUpdateHost={async (hostName, host) => {
                  const res = await apiFetch(`${apiBaseUrl}/hosts/${encodeURIComponent(hostName)}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(host) })
                  if (res.ok) {
                    setHosts((current) => current.map((item) => (item.name === hostName ? host : item)))
                    if (hostName !== host.name) {
                      setPrograms((current) => current.map((item) => (item.host === hostName ? { ...item, host: host.name } : item)))
                      setBlocks((current) => current.map((item) => ({ ...item, hosts: item.hosts.map((entry) => (entry === hostName ? host.name : entry)) })))
                    }
                  }
                }}
              />
            ) : activeView === 'media' ? (
              <MediaPage
                filter={mediaFilter}
                mediaItems={mediaItems}
                onChangeFilter={setMediaFilter}
                onDeleteMedia={deleteMedia}
                onUploadMedia={uploadMedia}
              />
            ) : activeView === 'broadcast' ? (
              <BroadcastPage station={currentStation} />
            ) : (
              <StationSettings station={currentStation} />
            )}
          </div>
        </div>
        <PlayerBar
          channelName={stationName}
          programKind={currentOnAirBlock?.kind ?? 'broadcast'}
          programName={playerProgramName}
          streamUrl={currentStation?.streamUrl ?? ''}
        />
      </section>
    </main>
  )
}

function PageHeader({
  alignWithSidebar,
  isSidebarOpen,
  onToggleSidebar,
}: {
  alignWithSidebar: boolean
  isSidebarOpen: boolean
  onToggleSidebar: () => void
}) {
  const SidebarIcon = isSidebarOpen ? PanelLeftClose : PanelLeftOpen

  return (
    <header className={alignWithSidebar ? 'page-header has-sidebar' : 'page-header'}>
      <div className="page-header-lead">
        <button
          className="sidebar-toggle"
          type="button"
          onClick={onToggleSidebar}
          aria-expanded={isSidebarOpen}
          aria-label="Toggle sidebar"
        >
          <SidebarIcon aria-hidden="true" size={14} strokeWidth={1.8} />
        </button>
      </div>
      <div className="page-header-main">
        <div className="toolbar-spacer" />
        <div className="brand-mark">rdio</div>
      </div>
    </header>
  )
}

function AppSidebar({
  activeView,
  isMobileOverlay,
  onChangeView,
}: {
  activeView: ViewName
  isMobileOverlay: boolean
  onChangeView: (view: ViewName) => void
}) {
  return (
    <aside className={isMobileOverlay ? 'sidebar is-mobile-overlay' : 'sidebar'} aria-label="Library">
      <nav className="sidebar-nav" aria-label="Station views">
        <SidebarButton active={activeView === 'schedule'} icon={CalendarDays} label="Schedule" onClick={() => onChangeView('schedule')} />
        <SidebarButton active={activeView === 'broadcast'} icon={Radio} label="Broadcast" onClick={() => onChangeView('broadcast')} />
        <SidebarButton active={activeView === 'programs'} icon={BookOpen} label="Programs" onClick={() => onChangeView('programs')} />
        <SidebarButton active={activeView === 'hosts'} icon={Users} label="Hosts" onClick={() => onChangeView('hosts')} />
        <SidebarButton active={activeView === 'media'} icon={ListMusic} label="Media" onClick={() => onChangeView('media')} />
        <SidebarButton active={activeView === 'settings'} icon={Settings} label="Settings" onClick={() => onChangeView('settings')} />
      </nav>
      <div className="sidebar-footer">
        <span className="sidebar-studio-name">rdio</span>
        <span className="sidebar-copyright">© {new Date().getFullYear()}</span>
      </div>
    </aside>
  )
}

function SidebarButton({
  active,
  icon: Icon,
  label,
  onClick,
}: {
  active: boolean
  icon: React.ComponentType<React.SVGProps<SVGSVGElement> & { size?: number; strokeWidth?: number }>
  label: string
  onClick: () => void
}) {
  return (
    <button className={active ? 'is-active' : ''} type="button" onClick={onClick}>
      <Icon aria-hidden={true} size={14} strokeWidth={1.8} />
      {label}
    </button>
  )
}

function StationLoading({ failed }: { failed: boolean }) {
  return (
    <section className="empty-page" aria-label="Station loading">
      <p>{failed ? 'Could not connect to the API. Check that the API server is running.' : 'Loading station…'}</p>
    </section>
  )
}

function Modal({
  children,
  onClose,
  title,
}: {
  children: React.ReactNode
  onClose: () => void
  title: string
}) {
  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={onClose}>
      <section
        aria-label={title}
        aria-modal="true"
        className="modal-panel"
        role="dialog"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="modal-header">
          <strong>{title}</strong>
          <button type="button" onClick={onClose} aria-label="Close modal">
            <X aria-hidden="true" size={15} strokeWidth={1.8} />
          </button>
        </div>
        {children}
      </section>
    </div>
  )
}

function findMediaIdForFile(file: UploadedFileSummary | undefined, mediaItems: MediaItem[]) {
  if (!file) {
    return null
  }

  const match = mediaItems.find((item) => item.name === file.name && item.size === file.size)
  return match?.id ?? null
}

function slotPanelTitle(request: CreationRequest | null, editingBlock?: ScheduleBlock) {
  if (editingBlock) {
    return 'Edit slot'
  }

  if (!request?.kind) {
    return 'Add to schedule'
  }

  return request.kind === 'broadcast' ? 'Live Broadcast' : 'New Recording'
}

function ScheduleSlotPanel({
  children,
  isMobile,
  isOpen,
  onClose,
  title,
}: {
  children: React.ReactNode
  isMobile: boolean
  isOpen: boolean
  onClose: () => void
  title: string
}) {
  const [sheetEntered, setSheetEntered] = useState(false)

  useEffect(() => {
    if (!isMobile || !isOpen) {
      setSheetEntered(false)
      return
    }

    const frame = requestAnimationFrame(() => setSheetEntered(true))

    return () => cancelAnimationFrame(frame)
  }, [isMobile, isOpen])

  if (!isOpen) {
    return null
  }

  if (isMobile) {
    return (
      <>
        <button
          className={['slot-sheet-backdrop', sheetEntered ? 'is-visible' : ''].filter(Boolean).join(' ')}
          type="button"
          aria-label="Close slot editor"
          onClick={onClose}
        />
        <aside
          className={['slot-editor-sheet', sheetEntered ? 'is-open' : ''].filter(Boolean).join(' ')}
          aria-label={title}
        >
          <div className="slot-editor-header">
            <strong>{title}</strong>
            <button type="button" onClick={onClose} aria-label="Close slot editor">
              <X aria-hidden="true" size={15} strokeWidth={1.8} />
            </button>
          </div>
          <div className="slot-editor-body">{children}</div>
        </aside>
      </>
    )
  }

  return (
    <aside className="slot-editor-panel" aria-label={title}>
      <div className="slot-editor-header">
        <strong>{title}</strong>
        <button type="button" onClick={onClose} aria-label="Close slot editor">
          <X aria-hidden="true" size={15} strokeWidth={1.8} />
        </button>
      </div>
      <div className="slot-editor-body">{children}</div>
    </aside>
  )
}

function DailyCalendar({
  blocks,
  creationRequest,
  datePickerMonth,
  dragDropPreview,
  draggedBlockId,
  focusNowToken,
  hosts,
  isDatePickerOpen,
  isMobileLayout,
  mediaItems,
  programs,
  selectedBlockId,
  selectedDate,
  selectedDateKey,
  onAddHost,
  onBeginCreate,
  onChangeCreationKind,
  onCloseSlotPanel,
  onDatePickerMonthChange,
  onDuplicateBlock,
  onMoveBlock,
  onMoveDay,
  onRemoveBlock,
  onSaveBlock,
  onSelectBlock,
  onSelectDate,
  onSetDragDropPreview,
  onSetDraggedBlockId,
  onToggleDatePicker,
  onUpdateBlock,
  onUploadMedia,
}: {
  blocks: ScheduleBlock[]
  creationRequest: CreationRequest | null
  datePickerMonth: Date
  dragDropPreview: DragDropPreview | null
  draggedBlockId: string | null
  focusNowToken: number
  hosts: string[]
  isDatePickerOpen: boolean
  isMobileLayout: boolean
  mediaItems: MediaItem[]
  programs: Program[]
  selectedBlockId: string | null
  selectedDate: Date
  selectedDateKey: string
  onAddHost: (host: string) => void
  onBeginCreate: (hour: number, kind?: ScheduleBlock['kind'] | null) => void
  onChangeCreationKind: (kind: ScheduleBlock['kind']) => void
  onCloseSlotPanel: () => void
  onDatePickerMonthChange: (date: Date) => void
  onDuplicateBlock: (blockId: string) => void
  onMoveBlock: (blockId: string, startMinutes: number) => void
  onMoveDay: (offset: number) => void
  onRemoveBlock: (blockId: string) => void
  onSaveBlock: (block: ScheduleBlockDraft) => void
  onSelectBlock: (blockId: string | null) => void
  onSelectDate: (date: Date) => void
  onSetDragDropPreview: (preview: DragDropPreview | null) => void
  onSetDraggedBlockId: (blockId: string | null) => void
  onToggleDatePicker: () => void
  onUpdateBlock: (blockId: string, block: ScheduleBlockDraft) => void
  onUploadMedia: (file: File) => Promise<MediaItem>
}) {
  const calendarRef = useRef<HTMLElement>(null)
  const gridRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLDivElement>(null)
  const lastFocusNowTokenRef = useRef(0)
  const [nowIndicator, setNowIndicator] = useState<{ time: string; top: number } | null>(null)

  const selectedBlock = selectedBlockId ? blocks.find((block) => block.id === selectedBlockId) : undefined
  const editingBlock = creationRequest ? undefined : selectedBlock
  const activeRequest =
    creationRequest ??
    (selectedBlock
      ? {
          dateKey: selectedBlock.dateKey,
          hour: Math.floor(selectedBlock.startMinutes / 60),
          kind: selectedBlock.kind,
        }
      : null)
  const isSlotPanelOpen = activeRequest !== null
  const isToday = isSameCalendarDay(selectedDate, new Date())

  useLayoutEffect(() => {
    const calendar = calendarRef.current
    const grid = gridRef.current

    if (!calendar || !grid) {
      return
    }

    const scrollRoot = calendar
    const sticky = calendar.querySelector('.calendar-sticky')
    const stickyOffset = sticky instanceof HTMLElement ? sticky.offsetHeight + 12 : 96
    const gridTop = grid.offsetTop

    if (lastFocusNowTokenRef.current !== focusNowToken) {
      lastFocusNowTokenRef.current = focusNowToken

      if (isToday) {
        const offsetInGrid = getMinutesOffsetInGrid(grid, getNowMinutes())
        scrollRoot.scrollTop = Math.max(0, gridTop + offsetInGrid - stickyOffset - 24)
      } else {
        scrollRoot.scrollTop = Math.max(0, gridTop - stickyOffset)
      }

      return
    }

    scrollRoot.scrollTop = Math.max(0, gridTop - stickyOffset)
  }, [focusNowToken, isToday, selectedDateKey])

  useLayoutEffect(() => {
    const grid = gridRef.current

    if (!grid || !isToday) {
      setNowIndicator(null)
      return
    }

    const tick = () => {
      const now = new Date()
      setNowIndicator({
        time: formatNowClock(now),
        top: getMinutesOffsetInGrid(grid, getNowMinutes(now)),
      })
    }

    tick()
    const interval = window.setInterval(tick, 1000)
    window.addEventListener('resize', tick)

    return () => {
      window.clearInterval(interval)
      window.removeEventListener('resize', tick)
    }
  }, [blocks, isToday, selectedDateKey])

  return (
    <div
      className={isSlotPanelOpen && !isMobileLayout ? 'schedule-workbench has-slot-panel' : 'schedule-workbench'}
    >
      <section className="calendar-view" ref={calendarRef} aria-label="Daily schedule">
      <div className="calendar-sticky">
        <div className="day-toggle" aria-label="Schedule day">
          <button type="button" onClick={() => onMoveDay(-1)} aria-label="Previous day">
            <ChevronLeft aria-hidden="true" size={18} strokeWidth={1.8} />
          </button>
          <div className="date-popover-anchor">
            <button className="date-button" type="button" onClick={onToggleDatePicker}>
              <CalendarClock aria-hidden="true" size={16} strokeWidth={1.8} />
              <span>{formatDayTitle(selectedDate)}</span>
            </button>
            {isDatePickerOpen ? (
              <DatePickerPopover
                monthDate={datePickerMonth}
                selectedDateKey={selectedDateKey}
                onChangeMonth={(offset) =>
                  onDatePickerMonthChange(new Date(datePickerMonth.getFullYear(), datePickerMonth.getMonth() + offset, 1))
                }
                onSelectDate={onSelectDate}
              />
            ) : null}
          </div>
          <button type="button" onClick={() => onMoveDay(1)} aria-label="Next day">
            <ChevronRight aria-hidden="true" size={18} strokeWidth={1.8} />
          </button>
        </div>
      </div>

      <div className="daily-grid" ref={gridRef} aria-label={`${formatDayTitle(selectedDate)} schedule`}>
        <div className="time-gutter" aria-hidden="true">
          {hours.map((hour) => (
            <time
              className="hour-label"
              dateTime={`${String(hour).padStart(2, '0')}:00`}
              key={hour}
              style={{ top: `${(hour / 24) * 100}%` }}
            >
              {formatHour(hour)}
            </time>
          ))}
        </div>
        <div
          className="schedule-canvas"
          ref={canvasRef}
          onDragLeave={(event) => {
            if (!draggedBlockId || event.currentTarget.contains(event.relatedTarget as Node)) {
              return
            }

            onSetDragDropPreview(null)
          }}
        >
          <div className="schedule-lines" aria-hidden="true" />
          {hours.map((hour) => {
            const hourHasBlock = blocks.some((block) => blockOverlapsHour(block, hour))
            const isActiveHour =
              activeRequest?.dateKey === selectedDateKey &&
              (creationRequest || editingBlock) &&
              (editingBlock ? blockOverlapsHour(editingBlock, hour) : activeRequest.hour === hour)

            return (
              <button
                aria-label={`Add at ${formatHour(hour)}`}
                className={['hour-drop-zone', isActiveHour ? 'is-active-hour' : ''].filter(Boolean).join(' ')}
                data-hour={hour}
                key={hour}
                style={{ top: `${(hour / 24) * 100}%`, height: `${100 / 24}%` }}
                type="button"
                onClick={() => onBeginCreate(hour)}
                onDragOver={(event) => {
                  if (!draggedBlockId || !canvasRef.current) {
                    return
                  }

                  event.preventDefault()
                  event.dataTransfer.dropEffect = dragDropPreview?.canDrop ? 'move' : 'none'

                  const preview = buildDragDropPreview(blocks, draggedBlockId, canvasRef.current, event.clientY)

                  if (preview) {
                    onSetDragDropPreview(preview)
                  }
                }}
                onDrop={(event) => {
                  event.preventDefault()

                  if (!draggedBlockId || !canvasRef.current) {
                    return
                  }

                  const preview = buildDragDropPreview(blocks, draggedBlockId, canvasRef.current, event.clientY)

                  if (preview?.canDrop) {
                    onMoveBlock(draggedBlockId, preview.startMinutes)
                  }

                  onSetDraggedBlockId(null)
                  onSetDragDropPreview(null)
                }}
              >
                {hourHasBlock ? null : <span className="slot-hint">Click to add</span>}
              </button>
            )
          })}
          {dragDropPreview && draggedBlockId ? (
            <div
              aria-hidden="true"
              className={[
                'schedule-drag-preview',
                dragDropPreview.canDrop ? 'can-drop' : 'cannot-drop',
              ].join(' ')}
              style={{
                top: `${(dragDropPreview.startMinutes / 1440) * 100}%`,
                height: `${(dragDropPreview.durationMinutes / 1440) * 100}%`,
              }}
            />
          ) : null}
          <ScheduleBlocksLayer
            blocks={blocks}
            draggedBlockId={draggedBlockId}
            selectedBlockId={selectedBlockId}
            onDuplicateBlock={onDuplicateBlock}
            onRemoveBlock={onRemoveBlock}
            onSelectBlock={onSelectBlock}
            onSetDragDropPreview={onSetDragDropPreview}
            onSetDraggedBlockId={onSetDraggedBlockId}
          />
        </div>
        {isToday && nowIndicator ? (
          <div
            className="calendar-now-indicator"
            style={{ top: `${nowIndicator.top}px` }}
            aria-hidden="true"
          >
            <time className="calendar-now-label">{nowIndicator.time}</time>
            <div className="calendar-now-line" />
          </div>
        ) : null}
      </div>
      </section>

      <ScheduleSlotPanel
        isMobile={isMobileLayout}
        isOpen={isSlotPanelOpen}
        title={slotPanelTitle(creationRequest, editingBlock)}
        onClose={onCloseSlotPanel}
      >
        {activeRequest ? (
          <CreationPanel
            className="creation-panel"
            editingBlock={editingBlock}
            hosts={hosts}
            key={editingBlock?.id ?? `${activeRequest.dateKey}-${activeRequest.hour}-${activeRequest.kind ?? 'pick'}`}
            mediaItems={mediaItems}
            programs={programs}
            request={activeRequest}
            onAddHost={onAddHost}
            onChangeKind={onChangeCreationKind}
            onSave={(blockInput) => {
              if (editingBlock) {
                onUpdateBlock(editingBlock.id, blockInput)
                return
              }

              onSaveBlock(blockInput)
            }}
            onDelete={
              editingBlock
                ? () => {
                    onRemoveBlock(editingBlock.id)
                    onCloseSlotPanel()
                  }
                : undefined
            }
            onUploadMedia={onUploadMedia}
          />
        ) : null}
      </ScheduleSlotPanel>
    </div>
  )
}

function DatePickerPopover({
  monthDate,
  selectedDateKey,
  onChangeMonth,
  onSelectDate,
}: {
  monthDate: Date
  selectedDateKey: string
  onChangeMonth: (offset: number) => void
  onSelectDate: (date: Date) => void
}) {
  const days = buildDatePickerDays(monthDate)

  return (
    <div className="date-picker-popover">
      <div className="date-picker-header">
        <button type="button" onClick={() => onChangeMonth(-1)} aria-label="Previous month">
          <ChevronLeft aria-hidden="true" size={15} strokeWidth={1.8} />
        </button>
        <strong>{formatMonthLabel(monthDate)}</strong>
        <button type="button" onClick={() => onChangeMonth(1)} aria-label="Next month">
          <ChevronRight aria-hidden="true" size={15} strokeWidth={1.8} />
        </button>
      </div>
      <div className="date-picker-weekdays" aria-hidden="true">
        {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, index) => (
          <span key={`${day}-${index}`}>{day}</span>
        ))}
      </div>
      <div className="date-picker-grid">
        {days.map((day) => {
          const dayKey = formatDateKey(day)
          const isSelected = dayKey === selectedDateKey
          const isOutsideMonth = day.getMonth() !== monthDate.getMonth()

          return (
            <button
              className={[isSelected ? 'is-selected' : '', isOutsideMonth ? 'is-muted' : ''].filter(Boolean).join(' ')}
              key={dayKey}
              type="button"
              onClick={() => onSelectDate(day)}
            >
              {day.getDate()}
            </button>
          )
        })}
      </div>
    </div>
  )
}

function CreationPanel({
  className,
  editingBlock,
  hosts,
  mediaItems,
  programs,
  request,
  onAddHost,
  onChangeKind,
  onDelete,
  onSave,
  onUploadMedia,
}: {
  className?: string
  editingBlock?: ScheduleBlock
  hosts: string[]
  mediaItems: MediaItem[]
  programs: Program[]
  request: CreationRequest
  onAddHost: (host: string) => void
  onChangeKind: (kind: ScheduleBlock['kind']) => void
  onDelete?: () => void
  onSave: (block: ScheduleBlockDraft) => void
  onUploadMedia: (file: File) => Promise<MediaItem>
}) {
  const defaultStartMinutes = request.hour * 60
  const defaultEndMinutes = Math.min(1439, defaultStartMinutes + 60)
  const initialMediaId = editingBlock?.mediaId ?? findMediaIdForFile(editingBlock?.file, mediaItems)
  const [title, setTitle] = useState(editingBlock?.title ?? (request.kind === 'broadcast' ? 'Live Broadcast' : 'New Recording'))
  const [description, setDescription] = useState(editingBlock?.description ?? '')
  const [startTime, setStartTime] = useState(minutesToTimeInput(editingBlock?.startMinutes ?? defaultStartMinutes))
  const [endTime, setEndTime] = useState(minutesToTimeInput(editingBlock?.endMinutes ?? defaultEndMinutes))
  const [selectedHosts, setSelectedHosts] = useState<string[]>(editingBlock?.hosts ?? [])
  const [selectedProgramId, setSelectedProgramId] = useState(editingBlock?.programId ?? '')
  const [selectedMediaId, setSelectedMediaId] = useState<string | null>(initialMediaId)
  const [mediaFile, setMediaFile] = useState<File | null>(null)
  const [mediaDuration, setMediaDuration] = useState<number | undefined>(editingBlock?.file?.duration)
  const [saveError, setSaveError] = useState('')
  const selectedProgram = programs.find((program) => program.id === selectedProgramId)

  // Load duration from library item URL when selection changes
  useEffect(() => {
    if (!selectedMediaId || mediaFile) {
      return
    }

    const item = mediaItems.find((entry) => entry.id === selectedMediaId)

    if (!item || item.type !== 'audio') {
      setMediaDuration(undefined)
      return
    }

    let cancelled = false
    loadAudioDuration(mediaUrl(item.url)).then((d) => { if (!cancelled) setMediaDuration(d) }).catch(() => { if (!cancelled) setMediaDuration(undefined) })
    return () => { cancelled = true }
  }, [selectedMediaId, mediaFile, mediaItems])

  // Load duration from local file when upload selection changes
  useEffect(() => {
    if (!mediaFile) {
      return
    }

    if (!mediaFile.type.startsWith('audio/')) {
      setMediaDuration(undefined)
      return
    }

    const objectUrl = URL.createObjectURL(mediaFile)
    let cancelled = false

    loadAudioDuration(objectUrl)
      .then((d) => { if (!cancelled) setMediaDuration(d) })
      .catch(() => { if (!cancelled) setMediaDuration(undefined) })
      .finally(() => URL.revokeObjectURL(objectUrl))

    return () => { cancelled = true }
  }, [mediaFile])

  useEffect(() => {
    if (editingBlock) {
      return
    }

    setTitle(request.kind === 'broadcast' ? 'Live Broadcast' : 'New Recording')
  }, [editingBlock, request.kind])

  useEffect(() => {
    if (editingBlock || !selectedProgram) {
      return
    }

    setTitle(selectedProgram.title)
    setDescription(selectedProgram.description)
    setSelectedHosts([selectedProgram.host])
  }, [editingBlock, selectedProgram])

  if (!request.kind) {
    return (
      <div className={[className, 'creation-choice'].filter(Boolean).join(' ')}>
        <button type="button" onClick={() => onChangeKind('broadcast')}>
          <Mic2 aria-hidden="true" size={15} strokeWidth={1.8} />
          Live Broadcast
        </button>
        <button type="button" onClick={() => onChangeKind('recording')}>
          <ListMusic aria-hidden="true" size={15} strokeWidth={1.8} />
          Recording
        </button>
      </div>
    )
  }

  const kind = request.kind
  const isEditing = Boolean(editingBlock)
  const linkedProgram = editingBlock?.programId ? programs.find((program) => program.id === editingBlock.programId) : undefined
  const programContext = isEditing ? linkedProgram : selectedProgram
  const showBroadcastProgramDetails = kind === 'broadcast' && (isEditing || Boolean(selectedProgram))
  const showDescriptionField = !isEditing && !selectedProgram
  const mediaSlotMetadata =
    kind === 'recording' && (isEditing || selectedProgram)
      ? {
          programTitle: isEditing ? editingBlock!.title : selectedProgram!.title,
          description: isEditing ? editingBlock!.description : selectedProgram!.description,
          author: isEditing
            ? editingBlock!.hosts.join(', ') || linkedProgram?.host || '—'
            : selectedProgram!.host,
        }
      : undefined

  const resolveMediaSelection = async () => {
    if (kind !== 'recording') {
      return { file: undefined, mediaId: undefined }
    }

    if (selectedMediaId && !mediaFile) {
      const item = mediaItems.find((entry) => entry.id === selectedMediaId)

      if (item) {
        return {
          file: { name: item.name, size: item.size, duration: mediaDuration },
          mediaId: item.id,
        }
      }
    }

    if (mediaFile) {
      const uploadedMedia = await onUploadMedia(mediaFile)

      return {
        file: { name: uploadedMedia.name, size: uploadedMedia.size, duration: mediaDuration },
        mediaId: uploadedMedia.id,
      }
    }

    if (editingBlock?.file) {
      return {
        file: editingBlock.file,
        mediaId: editingBlock.mediaId,
      }
    }

    return { file: undefined, mediaId: undefined }
  }

  return (
    <form
      className={[className, 'creation-form'].filter(Boolean).join(' ')}
      onSubmit={(event) => {
        event.preventDefault()
        setSaveError('')

        void (async () => {
          try {
            const startMinutes = timeInputToMinutes(startTime)
            const rawEndMinutes = timeInputToMinutes(endTime)
            const endMinutes = rawEndMinutes > startMinutes ? rawEndMinutes : Math.min(1439, startMinutes + 30)
            const mediaSelection = await resolveMediaSelection()

            onSave({
              kind,
              title: isEditing
                ? editingBlock!.title
                : selectedProgram?.title ?? (title.trim() || (kind === 'broadcast' ? 'Live Broadcast' : 'New Recording')),
              description: isEditing ? editingBlock!.description : selectedProgram?.description ?? description.trim(),
              startMinutes,
              endMinutes,
              hosts: isEditing ? editingBlock!.hosts : selectedProgram ? [selectedProgram.host] : selectedHosts,
              programId: isEditing ? editingBlock!.programId : selectedProgram?.id,
              file: mediaSelection.file,
              mediaId: mediaSelection.mediaId,
            })
          } catch {
            setSaveError('Could not save slot. Please try again.')
          }
        })()
      }}
    >
      <div className="creation-form-body">
        {!isEditing ? (
          <>
            <label>
              <span>Program</span>
              <select value={selectedProgramId} onChange={(event) => setSelectedProgramId(event.target.value)}>
                <option value="">No program</option>
                {programs.map((program) => (
                  <option key={program.id} value={program.id}>
                    {program.title}
                  </option>
                ))}
              </select>
            </label>
            <MultiSelect
              label="Host"
              options={hosts}
              placeholder="Select hosts"
              value={selectedProgram ? [selectedProgram.host] : selectedHosts}
              disabled={selectedProgram !== undefined}
              onChange={setSelectedHosts}
              onCreateOption={selectedProgram ? undefined : onAddHost}
              createPlaceholder="New host name"
            />
            <label>
              <span>Title</span>
              <input disabled={selectedProgram !== undefined} value={title} onChange={(event) => setTitle(event.target.value)} />
            </label>
          </>
        ) : null}
        <div className="creation-form-times">
          <label>
            <span>Start time</span>
            <input type="time" value={startTime} onChange={(event) => setStartTime(event.target.value)} />
          </label>
          <label>
            <span>End time</span>
            <input type="time" value={endTime} onChange={(event) => setEndTime(event.target.value)} />
          </label>
        </div>
        {showBroadcastProgramDetails ? (
          <div className="slot-program-details">
            <div className="media-slot-divider" role="separator" />
            <div className="media-slot-meta">
              <div className="media-slot-meta-item">
                <span>Program</span>
                <p>{(isEditing ? editingBlock!.title : programContext!.title) || '—'}</p>
              </div>
              <div className="media-slot-meta-item">
                <span>Host</span>
                <p>
                  {isEditing
                    ? editingBlock!.hosts.join(', ') || programContext!.host || '—'
                    : programContext!.host || '—'}
                </p>
              </div>
              <div className="media-slot-meta-item">
                <span>About</span>
                <p>{(isEditing ? editingBlock!.description : programContext!.description) || '—'}</p>
              </div>
            </div>
          </div>
        ) : null}
        {kind === 'recording' ? (
          <MediaSlotField
            mediaItems={mediaItems}
            selectedMediaId={selectedMediaId}
            slotMetadata={mediaSlotMetadata}
            uploadFile={mediaFile}
            onSelectMedia={setSelectedMediaId}
            onChangeUploadFile={(nextFile) => {
              setMediaFile(nextFile)

              if (nextFile && !selectedProgram && (title === 'New Recording' || title.trim() === '')) {
                setTitle(nextFile.name)
              }
            }}
          />
        ) : null}
        {showDescriptionField ? (
          <label>
            <span>Description</span>
            <textarea value={description} onChange={(event) => setDescription(event.target.value)} />
          </label>
        ) : null}
      </div>
      {saveError ? <p className="form-error">{saveError}</p> : null}
      <div className={['form-actions', 'creation-form-actions', isEditing ? 'form-actions--split' : ''].filter(Boolean).join(' ')}>
        {isEditing && onDelete ? (
          <button className="form-actions-delete" type="button" onClick={onDelete}>
            Delete
          </button>
        ) : null}
        <div className="form-actions-end">
          <button className="primary-action" type="submit">
            {editingBlock ? 'Update' : 'Save'}
          </button>
        </div>
      </div>
    </form>
  )
}

function ScheduleBlocksLayer({
  blocks,
  draggedBlockId,
  selectedBlockId,
  onDuplicateBlock,
  onRemoveBlock,
  onSelectBlock,
  onSetDragDropPreview,
  onSetDraggedBlockId,
}: {
  blocks: ScheduleBlock[]
  draggedBlockId: string | null
  selectedBlockId: string | null
  onDuplicateBlock: (blockId: string) => void
  onRemoveBlock: (blockId: string) => void
  onSelectBlock: (blockId: string | null) => void
  onSetDragDropPreview: (preview: DragDropPreview | null) => void
  onSetDraggedBlockId: (blockId: string | null) => void
}) {
  return (
    <div
      className={['schedule-blocks-layer', draggedBlockId ? 'is-reordering' : ''].filter(Boolean).join(' ')}
      aria-hidden={blocks.length === 0}
    >
      <div className="schedule-blocks-lane">
        {blocks.map((block) => {
          const top = (Math.max(0, Math.min(1440, block.startMinutes)) / 1440) * 100
          const height = (Math.max(1, Math.min(1440, block.endMinutes) - Math.max(0, block.startMinutes)) / 1440) * 100

          return (
            <ScheduleBlockCard
              block={block}
              isDragging={draggedBlockId === block.id}
              isSelected={selectedBlockId === block.id}
              key={block.id}
              layout={{ top: `${top}%`, height: `${height}%` }}
              onDuplicate={() => onDuplicateBlock(block.id)}
              onDragEnd={() => {
                onSetDraggedBlockId(null)
                onSetDragDropPreview(null)
              }}
              onDragStart={() => onSetDraggedBlockId(block.id)}
              onRemove={() => onRemoveBlock(block.id)}
              onSelect={() => onSelectBlock(block.id)}
            />
          )
        })}
      </div>
    </div>
  )
}

function ScheduleBlockCard({
  block,
  isDragging,
  isSelected,
  layout,
  onDragEnd,
  onDragStart,
  onDuplicate,
  onRemove,
  onSelect,
}: {
  block: ScheduleBlock
  isDragging: boolean
  isSelected: boolean
  layout: { top: string; height: string }
  onDragEnd: () => void
  onDragStart: () => void
  onDuplicate: () => void
  onRemove: () => void
  onSelect: () => void
}) {
  const Icon = block.kind === 'broadcast' ? Mic2 : ListMusic
  const durationMinutes = Math.max(30, block.endMinutes - block.startMinutes)
  const metaParts = [
    block.hosts.length > 0 ? block.hosts.join(', ') : '',
    formatSlotDuration(durationMinutes),
  ].filter(Boolean)

  return (
    <article
      className={[
        'schedule-block',
        block.kind === 'broadcast' ? 'is-broadcast' : 'is-media',
        isSelected ? 'is-selected' : '',
        isDragging ? 'is-dragging' : '',
      ]
        .filter(Boolean)
        .join(' ')}
      draggable
      onClick={(event) => {
        event.stopPropagation()
        onSelect()
      }}
      onDoubleClick={(event) => {
        event.stopPropagation()
        onSelect()
      }}
      onDragEnd={onDragEnd}
      onDragStart={(event) => {
        event.dataTransfer.effectAllowed = 'move'
        onDragStart()
      }}
      style={layout}
    >
      <button className="block-handle" type="button" aria-label="Drag block">
        <GripVertical aria-hidden="true" size={16} strokeWidth={1.8} />
      </button>
      <div className="block-copy">
        <strong>
          <Icon aria-hidden="true" size={12} strokeWidth={1.8} />
          {block.title}
        </strong>
        {metaParts.length > 0 ? <span>{metaParts.join(' · ')}</span> : null}
      </div>
      {isSelected ? (
        <div className="block-actions">
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation()
              onDuplicate()
            }}
            aria-label="Duplicate block"
          >
            <Copy aria-hidden="true" size={14} strokeWidth={1.8} />
          </button>
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation()
              onRemove()
            }}
            aria-label="Remove block"
          >
            <Trash2 aria-hidden="true" size={14} strokeWidth={1.8} />
          </button>
        </div>
      ) : null}
    </article>
  )
}

function ProgramsPage({
  hosts,
  programs,
  onAddHost,
  onCreateProgram,
  onUpdateProgram,
  onDeleteProgram,
}: {
  hosts: HostRecord[]
  programs: Program[]
  onAddHost: (hostName: string) => void
  onCreateProgram: (program: Omit<Program, 'id'>) => void
  onUpdateProgram: (programId: string, program: Omit<Program, 'id'>) => void
  onDeleteProgram: (programId: string) => void
}) {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingProgramId, setEditingProgramId] = useState<string | null>(null)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const hostNames = getHostNames(hosts)
  const [host, setHost] = useState<string[]>(hostNames[0] ? [hostNames[0]] : [])

  const openCreateModal = () => {
    setEditingProgramId(null)
    setTitle('')
    setDescription('')
    setHost(hostNames[0] ? [hostNames[0]] : [])
    setIsModalOpen(true)
  }

  const openEditModal = (program: Program) => {
    setEditingProgramId(program.id)
    setTitle(program.title)
    setDescription(program.description)
    setHost([program.host])
    setIsModalOpen(true)
  }

  const closeModal = () => {
    setIsModalOpen(false)
    setEditingProgramId(null)
    setTitle('')
    setDescription('')
    setHost(hostNames[0] ? [hostNames[0]] : [])
  }

  useEffect(() => {
    if (isModalOpen || host.length > 0) {
      return
    }

    if (hostNames[0]) {
      setHost([hostNames[0]])
    }
  }, [host.length, hostNames, isModalOpen])

  const saveProgram = () => {
    const normalizedTitle = title.trim()
    const normalizedDescription = description.trim()
    const selectedHost = host[0]?.trim()

    if (!normalizedTitle || !selectedHost) {
      return
    }

    const programInput = {
      title: normalizedTitle,
      description: normalizedDescription,
      host: selectedHost,
    }

    if (editingProgramId) {
      onUpdateProgram(editingProgramId, programInput)
    } else {
      onCreateProgram(programInput)
    }

    closeModal()
  }

  return (
    <section className="library-view" aria-label="Programs">
      <div className="library-header">
        <div>
          <BookOpen aria-hidden="true" size={18} strokeWidth={1.8} />
          <strong>Programs</strong>
        </div>
        <button type="button" onClick={openCreateModal}>
          <Plus aria-hidden="true" size={15} strokeWidth={1.8} />
          New program
        </button>
      </div>
      {isModalOpen ? (
        <Modal title={editingProgramId ? 'Edit program' : 'New program'} onClose={closeModal}>
          <form
            className="program-create-form"
            onSubmit={(event) => {
              event.preventDefault()
              saveProgram()
            }}
          >
            <label>
              <span>Program</span>
              <input value={title} onChange={(event) => setTitle(event.target.value)} />
            </label>
            <label>
              <span>Description</span>
              <textarea value={description} onChange={(event) => setDescription(event.target.value)} />
            </label>
            <MultiSelect
              label="Host"
              multiple={false}
              options={hostNames}
              placeholder="Select host"
              value={host}
              onChange={setHost}
              onCreateOption={onAddHost}
              createPlaceholder="New host name"
            />
            <div className="form-actions">
              <button className="primary-action" type="submit">
                {editingProgramId ? 'Update program' : 'Save program'}
              </button>
            </div>
          </form>
        </Modal>
      ) : null}
      <div className="library-list">
        {programs.map((program) => {
          const hostRecord = findHost(hosts, program.host)

          return (
          <article className="library-row program-row" key={program.id}>
            <div className="program-row-body">
              <HostAvatar colorId={hostRecord?.colorId} name={program.host} title={program.host} />
              <div className="program-row-copy">
                <strong>{program.title}</strong>
                <p className="program-row-meta">
                  <span className="program-row-host">{program.host}</span>
                  {program.description ? (
                    <>
                      <span className="program-row-meta-sep" aria-hidden="true">
                        ·
                      </span>
                      <span className="program-row-description">{program.description}</span>
                    </>
                  ) : null}
                </p>
              </div>
            </div>
            <div className="library-actions">
              <button type="button" onClick={() => openEditModal(program)} aria-label={`Edit ${program.title}`}>
                <Settings aria-hidden="true" size={14} strokeWidth={1.8} />
              </button>
              <button type="button" onClick={() => onDeleteProgram(program.id)} aria-label={`Delete ${program.title}`}>
                <Trash2 aria-hidden="true" size={14} strokeWidth={1.8} />
              </button>
            </div>
          </article>
          )
        })}
      </div>
    </section>
  )
}

function MediaPage({
  filter,
  mediaItems,
  onChangeFilter,
  onDeleteMedia,
  onUploadMedia,
}: {
  filter: 'all' | MediaItem['type']
  mediaItems: MediaItem[]
  onChangeFilter: (filter: 'all' | MediaItem['type']) => void
  onDeleteMedia: (mediaId: string) => void
  onUploadMedia: (file: File) => Promise<MediaItem>
}) {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [error, setError] = useState('')
  const [isUploading, setIsUploading] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const visibleItems = mediaItems.filter((item) => filter === 'all' || item.type === filter)

  const uploadMedia = async () => {
    if (!selectedFile) {
      return
    }

    setError('')
    setIsUploading(true)

    try {
      await onUploadMedia(selectedFile)
      setSelectedFile(null)
      setIsModalOpen(false)
    } catch {
      setError('Upload failed. Please try again.')
    } finally {
      setIsUploading(false)
    }
  }

  return (
    <section className="library-view" aria-label="Media">
      <div className="library-header">
        <div>
          <ListMusic aria-hidden="true" size={18} strokeWidth={1.8} />
          <strong>Media</strong>
        </div>
        <button type="button" onClick={() => setIsModalOpen(true)}>
          <Plus aria-hidden="true" size={15} strokeWidth={1.8} />
          Upload media
        </button>
      </div>
      <div className="library-tabs" aria-label="Media type">
        <button className={filter === 'all' ? 'is-active' : ''} type="button" onClick={() => onChangeFilter('all')}>
          All
        </button>
        <button className={filter === 'audio' ? 'is-active' : ''} type="button" onClick={() => onChangeFilter('audio')}>
          Audio
        </button>
        <button className={filter === 'image' ? 'is-active' : ''} type="button" onClick={() => onChangeFilter('image')}>
          Images
        </button>
      </div>
      {isModalOpen ? (
        <Modal
          title="Upload media"
          onClose={() => {
            setIsModalOpen(false)
            setSelectedFile(null)
            setError('')
          }}
        >
          <form
            className="media-upload-form"
            onSubmit={(event) => {
              event.preventDefault()
              uploadMedia()
            }}
          >
            <FileUploadField
              accept="audio/*,image/*"
              emptyLabel="Choose audio or image"
              file={selectedFile}
              label="Media file"
              onChange={(nextFile) => {
                setError('')
                setSelectedFile(nextFile)
              }}
            />
            {error ? <p className="form-error">{error}</p> : null}
            <div className="form-actions">
              <button className="primary-action" disabled={!selectedFile || isUploading} type="submit">
                {isUploading ? 'Uploading' : 'Upload'}
              </button>
            </div>
          </form>
        </Modal>
      ) : null}
      <div className="library-list">
        {visibleItems.length === 0 ? <p className="library-empty">No media uploaded</p> : null}
        {visibleItems.map((item) => (
          <article className="library-row media-row" key={item.id}>
            <div className="media-row-body">
              <MediaPreviewThumb apiBaseUrl={apiBaseUrl} name={item.name} type={item.type} url={item.url} />
              <div className="media-row-copy">
                <strong>{item.name}</strong>
                <span>
                  {item.type} · {formatUploadTime(item.uploadedAt)} · {formatFileSize(item.size)}
                </span>
              </div>
            </div>
            <div className="library-actions">
              <button type="button" onClick={() => onDeleteMedia(item.id)} aria-label={`Delete ${item.name}`}>
                <Trash2 aria-hidden="true" size={14} strokeWidth={1.8} />
              </button>
            </div>
          </article>
        ))}
      </div>
    </section>
  )
}

function BroadcastPage({ station }: { station: StationSummary }) {
  const [isConnected, setIsConnected] = useState(false)
  const { broadcastIcecast: icecast } = station
  const mount = icecast.mount.replace(/^\//, '')

  return (
    <section className="broadcast-view" aria-label="Broadcast">
      <div className="library-header">
        <div>
          <Radio aria-hidden="true" size={18} strokeWidth={1.8} />
          <strong>Broadcast</strong>
        </div>
      </div>
      <div className="broadcast-console">
        <section className="broadcast-status-panel" aria-label="Broadcast source status">
          <div className={isConnected ? 'source-light is-on' : 'source-light'} aria-hidden="true" />
          <div>
            <strong>{isConnected ? 'Source connected' : 'Waiting for source'}</strong>
            <span>{isConnected ? 'BUTT is connected to the station input.' : 'Connect BUTT with the settings below.'}</span>
          </div>
          <label className="connection-toggle">
            <input checked={isConnected} type="checkbox" onChange={(event) => setIsConnected(event.target.checked)} />
            <span>Connection test</span>
          </label>
        </section>
        <section className="broadcast-settings" aria-label="BUTT settings">
          <div className="settings-list">
            <SettingsRow label="Application" value="BUTT" />
            <SettingsRow label="Server type" value="Icecast" />
            <SettingsRow label="Address" value={icecast.host} />
            <SettingsRow label="Port" value={String(icecast.port)} />
            <SettingsRow label="Password" value={icecast.sourcePassword} />
            <SettingsRow label="Mount" value={mount} />
            <SettingsRow label="Station name" value={station.name} />
            <SettingsRow label="Public stream" value={station.streamUrl} />
          </div>
        </section>
      </div>
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
      <div className="settings-list">
        <SettingsRow label="Name" value={station.name} />
        <SettingsRow label="Station ID" value={station.id} />
        <SettingsRow label="Slug" value={station.slug} />
        <SettingsRow label="Timezone" value={station.timezone} />
        <SettingsRow label="Mount" value={station.mount} />
        <SettingsRow label="Stream URL" value={station.streamUrl} />
        <SettingsRow label="Fallback type" value={station.fallbackSource.kind} />
        <SettingsRow label="Fallback source" value={fallbackDetail} />
        <SettingsLink label="API" href={apiBaseUrl} />
        <SettingsLink label="Icecast" href={`http://${station.icecast.host}:${station.icecast.port}`} />
      </div>
    </section>
  )
}

function SettingsRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="settings-row">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  )
}

function SettingsLink({ href, label }: { href: string; label: string }) {
  return (
    <a className="settings-row settings-link" href={href}>
      <span>{label}</span>
      <strong>{href}</strong>
    </a>
  )
}

createRoot(document.getElementById('root')!).render(<App />)
