import { useMemo, useState } from 'react'
import { Pin, Plus, Search, Star } from 'lucide-react'
import { useAppData } from '@/context/AppDataContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { EmptyState } from '@/components/ui/empty-state'
import { Select } from '@/components/ui/select'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import type { Note } from '@/types'

const TEMPLATES: { name: string; title: string; content: string }[] = [
  { name: 'Lecture notes', title: 'Lecture — ', content: '## Topic\n\n### Key points\n- \n\n### Questions\n- \n' },
  { name: 'Exam revision', title: 'Revision — ', content: '## Syllabus coverage\n\n## Formulas\n\n## Weak areas\n' },
  { name: 'Assignment notes', title: 'Assignment — ', content: '## Requirements\n\n## Outline\n\n## Resources\n' },
  { name: 'Project docs', title: 'Project — ', content: '## Goal\n\n## Architecture\n\n## Next steps\n' },
  { name: 'DSA problem', title: 'DSA — ', content: '## Problem\n\n## Approach\n\n## Complexity\n\n## Code notes\n' },
  { name: 'Interview prep', title: 'Interview — ', content: '## Company\n\n## Questions practiced\n\n## Feedback\n' },
  { name: 'Weekly review', title: 'Weekly review', content: '## Wins\n\n## Misses\n\n## Focus next week\n' },
]

export function NotesPage() {
  const { notes, subjects, createNote, updateNote, deleteNote, userId } = useAppData()
  const [search, setSearch] = useState('')
  const [editing, setEditing] = useState<Note | null>(null)
  const [creating, setCreating] = useState(false)
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [subjectId, setSubjectId] = useState('')
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved'>('idle')

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return notes
      .filter((n) => {
        if (!q) return true
        return (
          n.title.toLowerCase().includes(q) ||
          n.content.toLowerCase().includes(q) ||
          n.tags.some((t) => t.toLowerCase().includes(q))
        )
      })
      .sort((a, b) => Number(!!b.pinned) - Number(!!a.pinned) || b.updatedAt.localeCompare(a.updatedAt))
  }, [notes, search])

  const openCreate = (template?: (typeof TEMPLATES)[0]) => {
    setCreating(true)
    setEditing(null)
    setTitle(template?.title ?? '')
    setContent(template?.content ?? '')
    setSubjectId('')
  }

  const openEdit = (note: Note) => {
    setCreating(false)
    setEditing(note)
    setTitle(note.title)
    setContent(note.content)
    setSubjectId(note.subjectId ?? '')
  }

  const save = async () => {
    if (!title.trim()) {
      toast.error('Title is required')
      return
    }
    setSaveState('saving')
    try {
      if (editing) {
        await updateNote(editing.id, {
          title: title.trim(),
          content,
          subjectId: subjectId || null,
        })
      } else {
        await createNote({
          userId,
          title: title.trim(),
          content,
          subjectId: subjectId || null,
          tags: [],
          pinned: false,
        })
      }
      setSaveState('saved')
      toast.success('Note saved')
      setEditing(null)
      setCreating(false)
    } catch {
      toast.error('Failed to save note')
      setSaveState('idle')
    }
  }

  const dialogOpen = creating || !!editing

  return (
    <div className="mx-auto max-w-5xl space-y-4 pb-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold">Notes</h1>
          <p className="text-sm text-muted-foreground">Capture lectures, revision, and ideas</p>
        </div>
        <Button className="rounded-xl" onClick={() => openCreate()}>
          <Plus className="size-4" /> New note
        </Button>
      </div>

      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          className="rounded-2xl bg-card pl-10"
          placeholder="Search notes…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1">
        {TEMPLATES.map((t) => (
          <button
            key={t.name}
            type="button"
            onClick={() => openCreate(t)}
            className="shrink-0 rounded-full border border-border bg-card px-3 py-1.5 text-xs font-medium hover:bg-muted"
          >
            {t.name}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <EmptyState title="No notes yet" description="Start with a template or blank note." actionLabel="Create note" onAction={() => openCreate()} />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {filtered.map((n) => (
            <button
              key={n.id}
              type="button"
              onClick={() => openEdit(n)}
              className="rounded-2xl border border-border/60 bg-card p-4 text-left shadow-sm transition hover:shadow-md"
            >
              <div className="mb-2 flex items-start justify-between gap-2">
                <h3 className="font-display font-semibold line-clamp-1">{n.title}</h3>
                <div className="flex gap-1">
                  {n.pinned && <Pin className="size-3.5 text-primary" />}
                  {n.tags.includes('favorite') && <Star className="size-3.5 text-amber-500" />}
                </div>
              </div>
              <p className="line-clamp-3 text-sm text-muted-foreground whitespace-pre-wrap">{n.content}</p>
            </button>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={(o) => !o && (setCreating(false), setEditing(null))}>
        <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit note' : 'New note'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Input placeholder="Title" value={title} onChange={(e) => setTitle(e.target.value)} />
            <Select value={subjectId} onChange={(e) => setSubjectId(e.target.value)}>
              <option value="">No subject</option>
              {subjects.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </Select>
            <Textarea
              className="min-h-[220px] font-mono text-sm"
              placeholder="Markdown supported…"
              value={content}
              onChange={(e) => setContent(e.target.value)}
            />
            <p className={cn('text-xs text-muted-foreground', saveState === 'saved' && 'text-success')}>
              {saveState === 'saving' ? 'Saving…' : saveState === 'saved' ? 'Saved' : 'Autosave on Save'}
            </p>
          </div>
          <DialogFooter className="flex-wrap gap-2">
            {editing && (
              <>
                <Button
                  variant="outline"
                  onClick={async () => {
                    await updateNote(editing.id, { pinned: !editing.pinned })
                    toast.success(editing.pinned ? 'Unpinned' : 'Pinned')
                    setEditing(null)
                  }}
                >
                  {editing.pinned ? 'Unpin' : 'Pin'}
                </Button>
                <Button
                  variant="destructive"
                  onClick={async () => {
                    if (!confirm('Delete this note?')) return
                    await deleteNote(editing.id)
                    toast.success('Deleted')
                    setEditing(null)
                  }}
                >
                  Delete
                </Button>
              </>
            )}
            <Button onClick={save}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
