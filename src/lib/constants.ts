import type { SubjectColor } from '@/types'

/** Soft gradient palettes for subject pill buttons (StudyFlow-inspired). */
export const SUBJECT_COLORS: SubjectColor[] = [
  {
    id: 'indigo',
    name: 'Indigo',
    from: '#6366F1',
    to: '#4F46E5',
    text: '#FFFFFF',
  },
  {
    id: 'violet',
    name: 'Violet',
    from: '#A78BFA',
    to: '#7C3AED',
    text: '#FFFFFF',
  },
  {
    id: 'sky',
    name: 'Sky',
    from: '#38BDF8',
    to: '#0284C7',
    text: '#FFFFFF',
  },
  {
    id: 'emerald',
    name: 'Emerald',
    from: '#34D399',
    to: '#059669',
    text: '#FFFFFF',
  },
  {
    id: 'amber',
    name: 'Amber',
    from: '#FBBF24',
    to: '#D97706',
    text: '#1E3A5F',
  },
  {
    id: 'rose',
    name: 'Rose',
    from: '#FB7185',
    to: '#E11D48',
    text: '#FFFFFF',
  },
  {
    id: 'teal',
    name: 'Teal',
    from: '#2DD4BF',
    to: '#0D9488',
    text: '#FFFFFF',
  },
  {
    id: 'orange',
    name: 'Orange',
    from: '#FB923C',
    to: '#EA580C',
    text: '#FFFFFF',
  },
  {
    id: 'slate',
    name: 'Slate',
    from: '#94A3B8',
    to: '#475569',
    text: '#FFFFFF',
  },
  {
    id: 'fuchsia',
    name: 'Fuchsia',
    from: '#E879F9',
    to: '#C026D3',
    text: '#FFFFFF',
  },
]

export const TASK_TYPES = [
  'Assignment',
  'Exam',
  'Quiz',
  'Project',
  'Lab',
  'Presentation',
  'Reading',
  'Personal',
  'DSA Practice',
  'Course',
  'Other',
] as const

export const PRIORITIES = ['Low', 'Medium', 'High', 'Urgent'] as const

export const TASK_STATUSES = [
  'Not Started',
  'In Progress',
  'Completed',
] as const

export const DSA_STATUSES = [
  'To Solve',
  'Attempted',
  'Solved',
  'Revisit',
] as const

export const PROJECT_STATUSES = [
  'Planning',
  'In Progress',
  'On Hold',
  'Completed',
  'Archived',
] as const

/** Demo subjects matching StudyFlow reference palette. */
export const DEMO_SUBJECTS = [
  {
    name: 'Mathematics',
    code: 'MATH',
    colorId: 'indigo',
    colorFrom: '#6366F1',
    colorTo: '#4F46E5',
  },
  {
    name: 'Chemistry',
    code: 'CHEM',
    colorId: 'rose',
    colorFrom: '#FB7185',
    colorTo: '#E11D48',
  },
  {
    name: 'Physics',
    code: 'PHYS',
    colorId: 'sky',
    colorFrom: '#38BDF8',
    colorTo: '#0284C7',
  },
  {
    name: 'Reasoning',
    code: 'REAS',
    colorId: 'amber',
    colorFrom: '#FBBF24',
    colorTo: '#D97706',
  },
  {
    name: 'Biology',
    code: 'BIO',
    colorId: 'emerald',
    colorFrom: '#34D399',
    colorTo: '#059669',
  },
  {
    name: 'Statistics',
    code: 'STAT',
    colorId: 'violet',
    colorFrom: '#A78BFA',
    colorTo: '#7C3AED',
  },
  {
    name: 'Computer Science',
    code: 'CS',
    colorId: 'teal',
    colorFrom: '#2DD4BF',
    colorTo: '#0D9488',
  },
  {
    name: 'Economics',
    code: 'ECON',
    colorId: 'orange',
    colorFrom: '#FB923C',
    colorTo: '#EA580C',
  },
] as const

export const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10 MB

export const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/svg+xml',
  'application/pdf',
  'text/plain',
  'text/markdown',
  'text/csv',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'application/zip',
] as const

export const DEMO_USER_ID = 'demo-user'

export const BRAND = {
  name: 'StudentOS',
  primary: '#4F46E5',
  navy: '#1E3A5F',
  background: '#F0F2F8',
} as const

export const DUE_SOON_DAYS = 3

export function getSubjectColor(colorId: string): SubjectColor {
  return SUBJECT_COLORS.find((c) => c.id === colorId) ?? SUBJECT_COLORS[0]!
}
