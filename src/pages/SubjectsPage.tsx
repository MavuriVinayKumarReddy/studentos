import { useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { useAppData } from '@/context/AppDataContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select } from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { EmptyState } from '@/components/ui/empty-state'
import { SUBJECT_COLORS } from '@/lib/constants'
import { toast } from 'sonner'
import type { Subject } from '@/types'

export function SubjectsPage() {
  const {
    subjects,
    tasks,
    notes,
    userId,
    createSubject,
    updateSubject,
    deleteSubject,
  } = useAppData()
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<Subject | null>(null)
  const [name, setName] = useState('')
  const [code, setCode] = useState('')
  const [colorId, setColorId] = useState(SUBJECT_COLORS[0]!.id)
  const [semester, setSemester] = useState('')
  const [instructor, setInstructor] = useState('')
  const [description, setDescription] = useState('')

  const active = subjects.filter((s) => !s.archived)

  const openCreate = () => {
    setEditing(null)
    setName('')
    setCode('')
    setColorId(SUBJECT_COLORS[0]!.id)
    setSemester('')
    setInstructor('')
    setDescription('')
    setOpen(true)
  }

  const openEdit = (s: Subject) => {
    setEditing(s)
    setName(s.name)
    setCode(s.code ?? '')
    setColorId(s.colorId)
    setSemester(s.semester ?? '')
    setInstructor(s.instructor ?? '')
    setDescription('')
    setOpen(true)
  }

  const save = async () => {
    if (!name.trim()) {
      toast.error('Name required')
      return
    }
    const color = SUBJECT_COLORS.find((c) => c.id === colorId) ?? SUBJECT_COLORS[0]!
    const payload = {
      name: name.trim(),
      code: code.trim() || undefined,
      colorId: color.id,
      colorFrom: color.from,
      colorTo: color.to,
      semester: semester || undefined,
      instructor: instructor || undefined,
    }
    if (editing) {
      await updateSubject(editing.id, payload)
      toast.success('Subject updated')
    } else {
      await createSubject({ userId, ...payload })
      toast.success('Subject created')
    }
    setOpen(false)
  }

  const onDelete = async (s: Subject) => {
    const taskCount = tasks.filter((t) => t.subjectId === s.id).length
    const noteCount = notes.filter((n) => n.subjectId === s.id).length
    const ok = confirm(
      `Delete subject "${s.name}"?\n\n` +
        `This will NOT delete ${taskCount} task(s) or ${noteCount} note(s). ` +
        `They will keep their subject link as an orphan reference until you reassign them.\n\n` +
        `Prefer Archive if you want to hide the subject safely.`,
    )
    if (!ok) return
    await deleteSubject(s.id)
    toast.success('Subject deleted')
  }

  return (
    <div className="mx-auto max-w-5xl space-y-4 pb-8">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold">Subjects</h1>
          <p className="text-sm text-muted-foreground">Courses and color coding</p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="size-4" /> Add subject
        </Button>
      </div>

      {active.length === 0 ? (
        <EmptyState title="No subjects" actionLabel="Add subject" onAction={openCreate} />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {active.map((s) => {
            const taskCount = tasks.filter((t) => t.subjectId === s.id).length
            const completed = tasks.filter(
              (t) => t.subjectId === s.id && t.status === 'Completed',
            ).length
            return (
              <article
                key={s.id}
                className="rounded-2xl bg-card p-4 shadow-[var(--shadow-card)]"
              >
                <div
                  className="mb-3 h-2 rounded-full"
                  style={{
                    background: `linear-gradient(90deg, ${s.colorFrom}, ${s.colorTo})`,
                  }}
                />
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h2 className="font-display text-lg font-semibold">{s.name}</h2>
                    <p className="text-sm text-muted-foreground">
                      {s.code || '—'}
                      {s.semester ? ` · ${s.semester}` : ''}
                      {s.instructor ? ` · ${s.instructor}` : ''}
                    </p>
                    <p className="mt-2 text-xs text-muted-foreground">
                      {completed}/{taskCount} tasks completed
                    </p>
                  </div>
                  <div className="flex gap-1">
                    <Button size="sm" variant="outline" onClick={() => openEdit(s)}>
                      Edit
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => updateSubject(s.id, { archived: true })}
                    >
                      Archive
                    </Button>
                    <Button size="icon" variant="ghost" onClick={() => onDelete(s)}>
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                </div>
              </article>
            )
          })}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit subject' : 'New subject'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Input placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} />
            <Input placeholder="Code (e.g. DAA)" value={code} onChange={(e) => setCode(e.target.value)} />
            <Select value={colorId} onChange={(e) => setColorId(e.target.value)}>
              {SUBJECT_COLORS.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
            <Input
              placeholder="Semester"
              value={semester}
              onChange={(e) => setSemester(e.target.value)}
            />
            <Input
              placeholder="Instructor (optional)"
              value={instructor}
              onChange={(e) => setInstructor(e.target.value)}
            />
            <Textarea
              placeholder="Description (optional)"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button onClick={save}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
