import { useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Copy, Paperclip, Trash2 } from 'lucide-react'
import { useAppData } from '@/context/AppDataContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  formatDueCountdown,
  formatLocalDate,
  formatLocalDateTime,
  isOverdue,
  toLocalDateString,
} from '@/lib/dates'
import { computePrepProgress } from '@/lib/task-logic'
import { TASK_TYPES, PRIORITIES, TASK_STATUSES, MAX_FILE_SIZE, ALLOWED_MIME_TYPES } from '@/lib/constants'
import type { Priority, TaskStatus, TaskType } from '@/types'
import { toast } from 'sonner'
import { dataStore } from '@/repositories'
import { PdfViewerModal } from '@/components/attachments/PdfViewerModal'

export function TaskDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const {
    tasks,
    subjects,
    loading,
    updateTask,
    deleteTask,
    toggleTaskComplete,
    createTask,
    addTaskAttachment,
    removeTaskAttachment,
    getSubject,
    userId,
  } = useAppData()

  const task = tasks.find((t) => t.id === id)
  const subject = getSubject(task?.subjectId)
  const [uploading, setUploading] = useState(false)
  const [pdfViewer, setPdfViewer] = useState<{
    open: boolean
    blobId?: string
    filename: string
  }>({
    open: false,
    filename: '',
  })

  const related = useMemo(() => {
    if (!task) return []
    return tasks
      .filter(
        (t) =>
          t.id !== task.id &&
          t.status !== 'Completed' &&
          (t.subjectId === task.subjectId || t.tags.some((tag) => task.tags.includes(tag))),
      )
      .slice(0, 4)
  }, [tasks, task])

  if (loading) return <Skeleton className="m-4 h-64" />
  if (!task) {
    return (
      <div className="p-6 text-center">
        <p>Task not found.</p>
        <Button className="mt-4" onClick={() => navigate('/timeline')}>
          Back to timeline
        </Button>
      </div>
    )
  }

  const prep = computePrepProgress(task)
  const overdue = task.status !== 'Completed' && isOverdue(task.dueDate, task.dueTime)

  const patch = async (partial: Parameters<typeof updateTask>[1]) => {
    try {
      await updateTask(task.id, partial)
      toast.success('Saved')
    } catch {
      toast.error('Update failed')
    }
  }

  const onFile = async (fileList: FileList | null) => {
    const file = fileList?.[0]
    if (!file) return
    if (file.size > MAX_FILE_SIZE) {
      toast.error(`File too large (max ${Math.round(MAX_FILE_SIZE / 1024 / 1024)}MB)`)
      return
    }
    if (
      ALLOWED_MIME_TYPES.length &&
      file.type !== '' &&
      !(ALLOWED_MIME_TYPES as readonly string[]).includes(file.type)
    ) {
      // allow unknown empty type for some OS; still check extension loosely
      const okExt = /\.(pdf|png|jpe?g|gif|webp|docx?|pptx?|txt|md)$/i.test(file.name)
      if (!okExt) {
        toast.error('Unsupported file type')
        return
      }
    }
    setUploading(true)
    try {
      await addTaskAttachment(task.id, file)
      toast.success('File attached')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Upload failed')
    } finally {
      setUploading(false)
    }
  }

  const openAttachment = async (blobId?: string, filename?: string) => {
    if (!blobId) return
    const isPdf = (filename || '').toLowerCase().endsWith('.pdf')
    if (isPdf) {
      setPdfViewer({
        open: true,
        blobId,
        filename: filename || 'document.pdf',
      })
      return
    }

    const rec = await dataStore.getFileBlob(blobId)
    if (!rec) {
      toast.error('File not found in local storage')
      return
    }
    const url = URL.createObjectURL(rec.blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename || rec.filename
    a.target = '_blank'
    a.click()
    setTimeout(() => URL.revokeObjectURL(url), 30_000)
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6 pb-10">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="size-5" />
        </Button>
        <div className="min-w-0 flex-1">
          <p className="text-xs text-muted-foreground">
            <Link to="/timeline" className="hover:text-primary">
              Timeline
            </Link>{' '}
            / Task
          </p>
          <h1 className="font-display text-2xl font-bold leading-tight">{task.title}</h1>
        </div>
      </div>

      <div
        className="rounded-2xl border border-border/60 bg-card p-4 shadow-sm"
        style={{
          borderLeftWidth: 6,
          borderLeftColor: subject?.colorFrom ?? '#4F46E5',
        }}
      >
        <div className="flex flex-wrap gap-2">
          {subject && (
            <Badge
              className="text-white"
              style={{ background: `linear-gradient(135deg, ${subject.colorFrom}, ${subject.colorTo})` }}
            >
              {subject.name}
            </Badge>
          )}
          <Badge variant="secondary">{task.type}</Badge>
          <Badge variant="secondary">{task.priority}</Badge>
          {task.tentative && <Badge variant="outline">Tentative</Badge>}
          {overdue && <Badge variant="destructive">Overdue</Badge>}
        </div>
        <p className="mt-3 text-sm">
          Due {formatLocalDate(task.dueDate, 'EEEE, MMM d')}
          {task.dueTime ? ` at ${task.dueTime}` : ''}
        </p>
        <p className={`text-sm font-medium ${overdue ? 'text-destructive' : 'text-primary'}`}>
          {formatDueCountdown(task.dueDate, task.dueTime)}
        </p>
        <div className="mt-3">
          <div className="mb-1 flex justify-between text-xs text-muted-foreground">
            <span>Prep: {prep}% Complete</span>
            <span>{task.status}</span>
          </div>
          <Progress value={prep} />
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button onClick={() => toggleTaskComplete(task.id)}>
            {task.status === 'Completed' ? 'Reopen' : 'Mark complete'}
          </Button>
          <Button
            variant="outline"
            onClick={async () => {
              const copy = await createTask({
                userId,
                title: `${task.title} (copy)`,
                subjectId: task.subjectId,
                type: task.type,
                description: task.description,
                dueDate: task.dueDate,
                dueTime: task.dueTime,
                priority: task.priority,
                status: 'Not Started',
                tentative: task.tentative,
                estimatedMinutes: task.estimatedMinutes,
                tags: [...task.tags],
                subtasks: task.subtasks.map((s) => ({
                  ...s,
                  id: crypto.randomUUID(),
                  completed: false,
                })),
                notes: task.notes,
              })
              toast.success('Duplicated')
              navigate(`/tasks/${copy.id}`)
            }}
          >
            <Copy className="size-4" /> Duplicate
          </Button>
          <Button
            variant="destructive"
            onClick={async () => {
              if (!confirm('Delete this task permanently?')) return
              await deleteTask(task.id)
              toast.success('Deleted')
              navigate('/timeline')
            }}
          >
            <Trash2 className="size-4" /> Delete
          </Button>
        </div>
      </div>

      <section className="space-y-3 rounded-2xl bg-card p-4 shadow-sm">
        <h2 className="font-display font-semibold">Details</h2>
        <label className="block text-sm">
          Title
          <Input
            className="mt-1"
            defaultValue={task.title}
            onBlur={(e) => e.target.value !== task.title && patch({ title: e.target.value })}
          />
        </label>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block text-sm">
            Subject
            <Select
              className="mt-1"
              value={task.subjectId ?? ''}
              onChange={(e) => patch({ subjectId: e.target.value || null })}
            >
              <option value="">None</option>
              {subjects.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </Select>
          </label>
          <label className="block text-sm">
            Type
            <Select
              className="mt-1"
              value={task.type}
              onChange={(e) => patch({ type: e.target.value as TaskType })}
            >
              {TASK_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </Select>
          </label>
          <label className="block text-sm">
            Due date
            <Input
              type="date"
              className="mt-1"
              value={task.dueDate}
              onChange={(e) => patch({ dueDate: e.target.value || toLocalDateString() })}
            />
          </label>
          <label className="block text-sm">
            Due time
            <Input
              type="time"
              className="mt-1"
              value={task.dueTime ?? ''}
              onChange={(e) => patch({ dueTime: e.target.value || undefined })}
            />
          </label>
          <label className="block text-sm">
            Priority
            <Select
              className="mt-1"
              value={task.priority}
              onChange={(e) => patch({ priority: e.target.value as Priority })}
            >
              {PRIORITIES.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </Select>
          </label>
          <label className="block text-sm">
            Status
            <Select
              className="mt-1"
              value={task.status}
              onChange={(e) =>
                patch({
                  status: e.target.value as TaskStatus,
                  completedAt:
                    e.target.value === 'Completed' ? new Date().toISOString() : undefined,
                })
              }
            >
              {TASK_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </Select>
          </label>
        </div>
        <label className="flex items-center gap-2 text-sm">
          <Checkbox
            checked={task.tentative}
            onChange={(e) => patch({ tentative: e.target.checked })}
          />
          Tentative deadline
        </label>
        <label className="block text-sm">
          Description
          <Textarea
            className="mt-1"
            defaultValue={task.description ?? ''}
            onBlur={(e) => patch({ description: e.target.value })}
          />
        </label>
        <label className="block text-sm">
          Notes
          <Textarea
            className="mt-1"
            defaultValue={task.notes ?? ''}
            onBlur={(e) => patch({ notes: e.target.value })}
          />
        </label>
      </section>

      <section className="space-y-3 rounded-2xl bg-card p-4 shadow-sm">
        <h2 className="font-display font-semibold">Checklist</h2>
        {task.subtasks.map((s) => (
          <label key={s.id} className="flex items-center gap-2 text-sm">
            <Checkbox
              checked={s.completed}
              onChange={() =>
                patch({
                  subtasks: task.subtasks.map((x) =>
                    x.id === s.id ? { ...x, completed: !x.completed } : x,
                  ),
                })
              }
            />
            <span className={s.completed ? 'line-through text-muted-foreground' : ''}>{s.title}</span>
          </label>
        ))}
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            const title = prompt('Subtask title')
            if (!title?.trim()) return
            patch({
              subtasks: [
                ...task.subtasks,
                { id: crypto.randomUUID(), title: title.trim(), completed: false },
              ],
            })
          }}
        >
          Add subtask
        </Button>
      </section>

      <section className="space-y-3 rounded-2xl bg-card p-4 shadow-sm">
        <div className="flex items-center justify-between">
          <h2 className="font-display font-semibold">Attachments</h2>
          <label className="inline-flex cursor-pointer items-center gap-2 text-sm text-primary">
            <Paperclip className="size-4" />
            {uploading ? 'Uploading…' : 'Add file'}
            <input
              type="file"
              className="hidden"
              accept=".pdf,.png,.jpg,.jpeg,.gif,.webp,.doc,.docx,.ppt,.pptx,.txt,.md"
              onChange={(e) => onFile(e.target.files)}
            />
          </label>
        </div>
        {(task.attachments?.length ?? 0) === 0 ? (
          <p className="text-sm text-muted-foreground">No files yet. PDFs and docs stay in IndexedDB locally.</p>
        ) : (
          <ul className="space-y-2">
            {task.attachments!.map((a) => (
              <li
                key={a.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border px-3 py-2 text-sm"
              >
                <div>
                  <p className="font-medium">{a.filename}</p>
                  <p className="text-xs text-muted-foreground">
                    {a.mimeType} · {(a.size / 1024).toFixed(1)} KB ·{' '}
                    {formatLocalDateTime(a.createdAt)}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => openAttachment(a.blobId, a.filename)}>
                    Open
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={async () => {
                      await removeTaskAttachment(task.id, a.id)
                      toast.success('Removed')
                    }}
                  >
                    Remove
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {related.length > 0 && (
        <section className="space-y-2">
          <h2 className="font-display font-semibold">Related</h2>
          {related.map((t) => (
            <Link
              key={t.id}
              to={`/tasks/${t.id}`}
              className="block rounded-xl bg-card px-3 py-2 text-sm shadow-sm hover:bg-muted"
            >
              {t.title}
            </Link>
          ))}
        </section>
      )}

      <PdfViewerModal
        open={pdfViewer.open}
        onClose={() => setPdfViewer((v) => ({ ...v, open: false }))}
        blobId={pdfViewer.blobId}
        filename={pdfViewer.filename}
      />
    </div>
  )
}
