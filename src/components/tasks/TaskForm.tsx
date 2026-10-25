import { useState } from 'react'
import { Plus, Trash2, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { PRIORITIES, TASK_STATUSES, TASK_TYPES } from '@/lib/constants'
import { toLocalDateString } from '@/lib/dates'
import { Priority, TaskStatus, TaskType, type Subject, type Task, type TaskSubtask } from '@/types'
import { cn } from '@/lib/utils'

export interface TaskFormValues {
  title: string
  subjectId: string | null
  type: Task['type']
  description: string
  dueDate: string
  dueTime: string
  priority: Task['priority']
  status: Task['status']
  tentative: boolean
  estimatedMinutes: string
  tags: string
  notes: string
  subtasks: TaskSubtask[]
}

export function taskToFormValues(task?: Task | null): TaskFormValues {
  return {
    title: task?.title ?? '',
    subjectId: task?.subjectId ?? null,
    type: task?.type ?? TaskType.Assignment,
    description: task?.description ?? '',
    dueDate: task?.dueDate ?? toLocalDateString(),
    dueTime: task?.dueTime ?? '',
    priority: task?.priority ?? Priority.Medium,
    status: task?.status ?? TaskStatus.NotStarted,
    tentative: task?.tentative ?? false,
    estimatedMinutes:
      task?.estimatedMinutes != null ? String(task.estimatedMinutes) : '',
    tags: task?.tags?.join(', ') ?? '',
    notes: task?.notes ?? '',
    subtasks: task?.subtasks?.map((s) => ({ ...s })) ?? [],
  }
}

export function formValuesToTaskPatch(values: TaskFormValues): Omit<
  Task,
  'id' | 'userId' | 'createdAt' | 'updatedAt' | 'attachments' | 'completedAt'
> {
  const tags = values.tags
    .split(/[,;]/)
    .map((t) => t.trim())
    .filter(Boolean)
  const estimated = values.estimatedMinutes.trim()
    ? Number(values.estimatedMinutes)
    : undefined

  return {
    title: values.title.trim(),
    subjectId: values.subjectId,
    type: values.type,
    description: values.description.trim() || undefined,
    dueDate: values.dueDate,
    dueTime: values.dueTime || undefined,
    priority: values.priority,
    status: values.status,
    tentative: values.tentative,
    estimatedMinutes:
      estimated != null && !Number.isNaN(estimated) ? estimated : undefined,
    tags,
    notes: values.notes.trim() || undefined,
    subtasks: values.subtasks,
  }
}

interface TaskFormProps {
  initial?: Task | null
  subjects: Subject[]
  onSubmit: (values: TaskFormValues) => Promise<void> | void
  onCancel?: () => void
  submitLabel?: string
  className?: string
}

export function TaskForm({
  initial,
  subjects,
  onSubmit,
  onCancel,
  submitLabel = 'Save task',
  className,
}: TaskFormProps) {
  const [values, setValues] = useState<TaskFormValues>(() =>
    taskToFormValues(initial),
  )
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [subtaskDraft, setSubtaskDraft] = useState('')

  const patch = (partial: Partial<TaskFormValues>) =>
    setValues((v) => ({ ...v, ...partial }))

  const addSubtask = () => {
    const title = subtaskDraft.trim()
    if (!title) return
    patch({
      subtasks: [
        ...values.subtasks,
        {
          id: crypto.randomUUID(),
          title,
          completed: false,
          sortOrder: values.subtasks.length,
        },
      ],
    })
    setSubtaskDraft('')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!values.title.trim()) {
      setError('Title is required')
      return
    }
    setError(null)
    setSaving(true)
    try {
      await onSubmit(values)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className={cn('space-y-4', className)}>
      <div className="space-y-2">
        <Label htmlFor="task-title">Title</Label>
        <Input
          id="task-title"
          value={values.title}
          onChange={(e) => patch({ title: e.target.value })}
          placeholder="e.g. Midterm prep — Chapter 5"
          autoFocus
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="task-subject">Subject</Label>
          <Select
            id="task-subject"
            value={values.subjectId ?? ''}
            onChange={(e) =>
              patch({ subjectId: e.target.value || null })
            }
          >
            <option value="">None</option>
            {subjects.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="task-type">Type</Label>
          <Select
            id="task-type"
            value={values.type}
            onChange={(e) => patch({ type: e.target.value as Task['type'] })}
          >
            {TASK_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </Select>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="space-y-2">
          <Label htmlFor="task-due">Due date</Label>
          <Input
            id="task-due"
            type="date"
            value={values.dueDate}
            onChange={(e) => patch({ dueDate: e.target.value })}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="task-time">Due time</Label>
          <Input
            id="task-time"
            type="time"
            value={values.dueTime}
            onChange={(e) => patch({ dueTime: e.target.value })}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="task-est">Est. minutes</Label>
          <Input
            id="task-est"
            type="number"
            min={0}
            value={values.estimatedMinutes}
            onChange={(e) => patch({ estimatedMinutes: e.target.value })}
            placeholder="60"
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="task-priority">Priority</Label>
          <Select
            id="task-priority"
            value={values.priority}
            onChange={(e) =>
              patch({ priority: e.target.value as Task['priority'] })
            }
          >
            {PRIORITIES.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="task-status">Status</Label>
          <Select
            id="task-status"
            value={values.status}
            onChange={(e) =>
              patch({ status: e.target.value as Task['status'] })
            }
          >
            {TASK_STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="task-desc">Description</Label>
        <Textarea
          id="task-desc"
          value={values.description}
          onChange={(e) => patch({ description: e.target.value })}
          rows={3}
          placeholder="Details, links, rubric notes…"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="task-tags">Tags</Label>
        <Input
          id="task-tags"
          value={values.tags}
          onChange={(e) => patch({ tags: e.target.value })}
          placeholder="exam, week-6 (comma-separated)"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="task-notes">Notes</Label>
        <Textarea
          id="task-notes"
          value={values.notes}
          onChange={(e) => patch({ notes: e.target.value })}
          rows={2}
        />
      </div>

      <label className="flex items-center gap-2 text-sm">
        <Checkbox
          checked={values.tentative}
          onChange={(e) =>
            patch({ tentative: (e.target as HTMLInputElement).checked })
          }
        />
        Tentative deadline
      </label>

      <div className="space-y-2">
        <Label>Prep checklist</Label>
        <ul className="space-y-1.5">
          {values.subtasks.map((st) => (
            <li
              key={st.id}
              className="flex items-center gap-2 rounded-xl border border-border/60 bg-card px-3 py-2"
            >
              <Checkbox
                checked={st.completed}
                onChange={(e) => {
                  const checked = (e.target as HTMLInputElement).checked
                  patch({
                    subtasks: values.subtasks.map((s) =>
                      s.id === st.id ? { ...s, completed: checked } : s,
                    ),
                  })
                }}
              />
              <span
                className={cn(
                  'flex-1 text-sm',
                  st.completed && 'text-muted-foreground line-through',
                )}
              >
                {st.title}
              </span>
              <button
                type="button"
                className="text-muted-foreground hover:text-destructive"
                aria-label="Remove subtask"
                onClick={() =>
                  patch({
                    subtasks: values.subtasks.filter((s) => s.id !== st.id),
                  })
                }
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </li>
          ))}
        </ul>
        <div className="flex gap-2">
          <Input
            value={subtaskDraft}
            onChange={(e) => setSubtaskDraft(e.target.value)}
            placeholder="Add prep step…"
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                addSubtask()
              }
            }}
          />
          <Button type="button" variant="outline" onClick={addSubtask}>
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {error ? (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        {onCancel ? (
          <Button type="button" variant="outline" onClick={onCancel}>
            <X className="h-4 w-4" />
            Cancel
          </Button>
        ) : null}
        <Button type="submit" disabled={saving}>
          {saving ? 'Saving…' : submitLabel}
        </Button>
      </div>
    </form>
  )
}
