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
  kind: 'recording' | 'broadcast'
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

export const mockBlocks: MockScheduleBlock[] = []
