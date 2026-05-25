export interface MockProgram {
  id: string
  title: string
  description: string
  host: string
}

export interface MockUploadedFile {
  name: string
  size: number
}

export interface MockHost {
  name: string
  colorId: string
}

export interface MockScheduleBlock {
  id: string
  kind: 'media' | 'broadcast'
  title: string
  description: string
  dateKey: string
  startMinutes: number
  endMinutes: number
  hosts: string[]
  programId?: string
  file?: MockUploadedFile
}

export const mockAnchorDate = new Date(2026, 4, 25)

export const mockHosts: MockHost[] = [
  { name: 'Obum Ijere', colorId: 'cyan' },
  { name: 'Lady Kay', colorId: 'rose' },
  { name: 'John Eni-ibukun', colorId: 'green' },
  { name: 'Khorage', colorId: 'violet' },
  { name: 'Tushar', colorId: 'gold' },
  { name: 'June Sometimes', colorId: 'gray' },
  { name: 'Metalfaceboom', colorId: 'cyan' },
  { name: 'Feyi', colorId: 'green' },
  { name: 'Toke', colorId: 'rose' },
  { name: 'Mariko', colorId: 'violet' },
]

export const mockPrograms: MockProgram[] = [
  {
    id: 'le-son-voyage',
    title: 'Le Son Voyage',
    description: 'Global grooves, tributes, and rare mixes from the diaspora.',
    host: 'Obum Ijere',
  },
  {
    id: 'love-and-shege',
    title: 'Love and Shege',
    description: 'Stories, music, and conversation at the intersection of heart and hustle.',
    host: 'Lady Kay',
  },
  {
    id: 'poetry-radio',
    title: 'Poetry Radio',
    description: 'Spoken word, live readings, and poetic responses to the moment.',
    host: 'John Eni-ibukun',
  },
  {
    id: 'moodswing-essentials',
    title: 'Moodswing Essentials',
    description: 'Curated sets for late-afternoon drift and reflection.',
    host: 'Khorage',
  },
  {
    id: 'first-conversations',
    title: 'First Conversations',
    description: 'Unscripted dialogues with guests and collaborators.',
    host: 'Tushar',
  },
  {
    id: 'tea-time',
    title: 'Tea Time',
    description: 'Mid-morning check-ins, listening, and loose conversation.',
    host: 'Tushar',
  },
]

const may24 = '2026-05-24'
const may25 = '2026-05-25'

export const mockBlocks: MockScheduleBlock[] = [
  {
    id: 'sat-tea-time',
    kind: 'broadcast',
    title: 'Tea Time',
    description: '',
    dateKey: may24,
    startMinutes: 11 * 60,
    endMinutes: 12 * 60,
    hosts: ['Tushar'],
    programId: 'tea-time',
  },
  {
    id: 'sat-musings',
    kind: 'media',
    title: 'Musings on Urbanism and the Built Environment',
    description: '',
    dateKey: may24,
    startMinutes: 12 * 60,
    endMinutes: 13 * 60,
    hosts: ['Tushar', 'Feyi', 'Toke', 'Mariko'],
  },
  {
    id: 'sat-poetry-radio',
    kind: 'media',
    title: 'Poetry Radio',
    description: '',
    dateKey: may24,
    startMinutes: 13 * 60,
    endMinutes: 14 * 60,
    hosts: ['John Eni-ibukun'],
    programId: 'poetry-radio',
  },
  {
    id: 'sat-brazilian-jazz',
    kind: 'media',
    title: 'Le Son Voyage: Brazilian Jazz Vol. 1',
    description: '',
    dateKey: may24,
    startMinutes: 14 * 60,
    endMinutes: 14 * 60 + 30,
    hosts: ['Obum Ijere (MetalfaceBoom)'],
    programId: 'le-son-voyage',
  },
  {
    id: 'sat-love-and-shege-live',
    kind: 'broadcast',
    title: 'Love and Shege',
    description: '',
    dateKey: may24,
    startMinutes: 14 * 60,
    endMinutes: 14 * 60 + 30,
    hosts: ['Lady Kay'],
    programId: 'love-and-shege',
  },
  {
    id: 'sat-untitled',
    kind: 'broadcast',
    title: 'Untitled',
    description: '',
    dateKey: may24,
    startMinutes: 14 * 60,
    endMinutes: 14 * 60 + 30,
    hosts: ['June Sometimes'],
  },
  {
    id: 'mon-le-son-tribute',
    kind: 'broadcast',
    title: 'Le Son Voyage: Tribute to Moya Brennan',
    description: '',
    dateKey: may25,
    startMinutes: 12 * 60,
    endMinutes: 14 * 60 + 30,
    hosts: ['Obum Ijere'],
    programId: 'le-son-voyage',
  },
  {
    id: 'mon-first-conversations',
    kind: 'broadcast',
    title: 'First Conversations: Feyi & Marcel',
    description: '',
    dateKey: may25,
    startMinutes: 13 * 60,
    endMinutes: 14 * 60,
    hosts: ['Tushar'],
    programId: 'first-conversations',
  },
  {
    id: 'mon-poetry-3ma',
    kind: 'media',
    title:
      "Poetry Radio: Spontaneous Poetry On Rajery, Ballaké Sissoko and Driss El Maloumi's '3MA' Composition",
    description: '',
    dateKey: may25,
    startMinutes: 14 * 60,
    endMinutes: 14 * 60 + 30,
    hosts: ['June Sometimes'],
    programId: 'poetry-radio',
  },
  {
    id: 'mon-love-and-shege-live',
    kind: 'broadcast',
    title: 'Love and Shege',
    description: '',
    dateKey: may25,
    startMinutes: 14 * 60 + 30,
    endMinutes: 15 * 60 + 30,
    hosts: ['Lady Kay'],
    programId: 'love-and-shege',
  },
  {
    id: 'mon-love-and-shege-media',
    kind: 'media',
    title: 'Love and Shege',
    description: '',
    dateKey: may25,
    startMinutes: 14 * 60 + 30,
    endMinutes: 15 * 60 + 30,
    hosts: ['Lady Kay'],
    programId: 'love-and-shege',
  },
  {
    id: 'mon-poetry-radio-live',
    kind: 'broadcast',
    title: 'Poetry Radio',
    description: '',
    dateKey: may25,
    startMinutes: 15 * 60 + 30,
    endMinutes: 16 * 60 + 30,
    hosts: ['John Eni-ibukun'],
    programId: 'poetry-radio',
  },
  {
    id: 'mon-rare-groove',
    kind: 'media',
    title: 'Le Son Voyage: Rare Groove Mix',
    description: '',
    dateKey: may25,
    startMinutes: 15 * 60 + 30,
    endMinutes: 16 * 60 + 30,
    hosts: ['Metalfaceboom'],
    programId: 'le-son-voyage',
  },
  {
    id: 'mon-moodswing',
    kind: 'broadcast',
    title: 'Moodswing Essentials',
    description: '',
    dateKey: may25,
    startMinutes: 16 * 60 + 30,
    endMinutes: 17 * 60 + 30,
    hosts: ['Khorage'],
    programId: 'moodswing-essentials',
  },
]
