import type { Task } from '@/types'
import { Priority, TaskStatus, TaskType } from '@/types'
import { dataStore } from '@/repositories'
import { DEMO_USER_ID } from '@/lib/constants'

const TASK_CSV_HEADERS = [
  'title',
  'subjectId',
  'type',
  'description',
  'dueDate',
  'dueTime',
  'priority',
  'status',
  'tentative',
  'estimatedMinutes',
  'tags',
  'notes',
] as const

function escapeCsv(value: string): string {
  if (/[",\n\r]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`
  }
  return value
}

function downloadBlob(filename: string, blob: Blob) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export function exportTasksCsv(tasks: Task[], filename = 'studentos-tasks.csv') {
  const rows = [
    TASK_CSV_HEADERS.join(','),
    ...tasks.map((t) =>
      [
        t.title,
        t.subjectId ?? '',
        t.type,
        t.description ?? '',
        t.dueDate,
        t.dueTime ?? '',
        t.priority,
        t.status,
        String(t.tentative),
        t.estimatedMinutes != null ? String(t.estimatedMinutes) : '',
        t.tags.join(';'),
        t.notes ?? '',
      ]
        .map((cell) => escapeCsv(cell))
        .join(','),
    ),
  ]
  downloadBlob(filename, new Blob([rows.join('\n')], { type: 'text/csv;charset=utf-8' }))
}

export async function exportAllJson(
  userId = DEMO_USER_ID,
  filename = 'studentos-backup.json',
) {
  await dataStore.ensureSeeded(userId)
  const [
    profile,
    subjects,
    tasks,
    notes,
    roadmaps,
    dsaProblems,
    projects,
    resources,
    sessions,
    goals,
    notifications,
  ] = await Promise.all([
    dataStore.getProfile(userId),
    dataStore.listSubjects(userId),
    dataStore.listTasks(userId),
    dataStore.listNotes(userId),
    dataStore.listRoadmaps(userId),
    dataStore.listDsaProblems(userId),
    dataStore.listProjects(userId),
    dataStore.listLearningResources(userId),
    dataStore.listStudySessions(userId),
    dataStore.listWeeklyGoals(userId),
    dataStore.listNotifications(userId),
  ])

  const payload = {
    exportedAt: new Date().toISOString(),
    version: 1,
    profile,
    subjects,
    tasks,
    notes,
    roadmaps,
    dsaProblems,
    projects,
    resources,
    sessions,
    goals,
    notifications,
  }

  downloadBlob(
    filename,
    new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' }),
  )
}

function parseCsvLine(line: string): string[] {
  const result: string[] = []
  let current = ''
  let inQuotes = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]!
    if (inQuotes) {
      if (ch === '"') {
        if (line[i + 1] === '"') {
          current += '"'
          i++
        } else {
          inQuotes = false
        }
      } else {
        current += ch
      }
    } else if (ch === '"') {
      inQuotes = true
    } else if (ch === ',') {
      result.push(current)
      current = ''
    } else {
      current += ch
    }
  }
  result.push(current)
  return result
}

export interface TaskCsvPreviewRow {
  title: string
  subjectId: string | null
  type: Task['type']
  description?: string
  dueDate: string
  dueTime?: string
  priority: Task['priority']
  status: Task['status']
  tentative: boolean
  estimatedMinutes?: number
  tags: string[]
  notes?: string
}

export interface ImportTasksPreview {
  rows: TaskCsvPreviewRow[]
  errors: string[]
}

const VALID_TYPES = new Set(Object.values(TaskType))
const VALID_PRIORITIES = new Set(Object.values(Priority))
const VALID_STATUSES = new Set(Object.values(TaskStatus))

export function previewTasksCsv(csvText: string): ImportTasksPreview {
  const lines = csvText
    .replace(/^\uFEFF/, '')
    .split(/\r?\n/)
    .filter((l) => l.trim().length > 0)

  if (lines.length < 2) {
    return { rows: [], errors: ['CSV must include a header row and at least one data row'] }
  }

  const headers = parseCsvLine(lines[0]!).map((h) => h.trim().toLowerCase())
  const idx = (name: string) => headers.indexOf(name)
  const titleIdx = idx('title')
  if (titleIdx < 0) {
    return { rows: [], errors: ['Missing required column: title'] }
  }

  const rows: TaskCsvPreviewRow[] = []
  const errors: string[] = []

  for (let i = 1; i < lines.length; i++) {
    const cols = parseCsvLine(lines[i]!)
    const title = (cols[titleIdx] ?? '').trim()
    if (!title) {
      errors.push(`Row ${i + 1}: empty title — skipped`)
      continue
    }

    const typeRaw = (cols[idx('type')] ?? 'Assignment').trim() || 'Assignment'
    const priorityRaw = (cols[idx('priority')] ?? 'Medium').trim() || 'Medium'
    const statusRaw = (cols[idx('status')] ?? 'Not Started').trim() || 'Not Started'
    const dueDate =
      (cols[idx('duedate')] ?? cols[idx('due_date')] ?? '').trim() ||
      new Date().toISOString().slice(0, 10)

    if (!VALID_TYPES.has(typeRaw as Task['type'])) {
      errors.push(`Row ${i + 1}: unknown type "${typeRaw}" — using Assignment`)
    }
    if (!VALID_PRIORITIES.has(priorityRaw as Task['priority'])) {
      errors.push(`Row ${i + 1}: unknown priority "${priorityRaw}" — using Medium`)
    }
    if (!VALID_STATUSES.has(statusRaw as Task['status'])) {
      errors.push(`Row ${i + 1}: unknown status "${statusRaw}" — using Not Started`)
    }

    const estRaw = (cols[idx('estimatedminutes')] ?? '').trim()
    const tagsRaw = (cols[idx('tags')] ?? '').trim()
    const tentativeRaw = (cols[idx('tentative')] ?? 'false').trim().toLowerCase()

    rows.push({
      title,
      subjectId: (cols[idx('subjectid')] ?? '').trim() || null,
      type: VALID_TYPES.has(typeRaw as Task['type'])
        ? (typeRaw as Task['type'])
        : TaskType.Assignment,
      description: (cols[idx('description')] ?? '').trim() || undefined,
      dueDate,
      dueTime: (cols[idx('duetime')] ?? '').trim() || undefined,
      priority: VALID_PRIORITIES.has(priorityRaw as Task['priority'])
        ? (priorityRaw as Task['priority'])
        : Priority.Medium,
      status: VALID_STATUSES.has(statusRaw as Task['status'])
        ? (statusRaw as Task['status'])
        : TaskStatus.NotStarted,
      tentative: tentativeRaw === 'true' || tentativeRaw === '1' || tentativeRaw === 'yes',
      estimatedMinutes: estRaw ? Number(estRaw) || undefined : undefined,
      tags: tagsRaw
        ? tagsRaw.split(/[;|]/).map((t) => t.trim()).filter(Boolean)
        : [],
      notes: (cols[idx('notes')] ?? '').trim() || undefined,
    })
  }

  return { rows, errors }
}

/** Append imported tasks — never silently overwrite existing data. */
export async function importTasksCsv(
  preview: ImportTasksPreview,
  userId = DEMO_USER_ID,
): Promise<{ imported: number }> {
  let imported = 0
  for (const row of preview.rows) {
    await dataStore.createTask({
      userId,
      title: row.title,
      subjectId: row.subjectId,
      type: row.type,
      description: row.description,
      dueDate: row.dueDate,
      dueTime: row.dueTime,
      priority: row.priority,
      status: row.status,
      tentative: row.tentative,
      estimatedMinutes: row.estimatedMinutes,
      tags: row.tags,
      notes: row.notes,
      subtasks: [],
    })
    imported += 1
  }
  return { imported }
}
