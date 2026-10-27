import { useMemo, useState } from 'react'
import {
  FileText,
  Paperclip,
  Pin,
  Plus,
  Search,
  Trash2,
  Upload,
  Eye,
} from 'lucide-react'
import { useAppData } from '@/context/AppDataContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { EmptyState } from '@/components/ui/empty-state'
import { Select } from '@/components/ui/select'
import { PdfViewerModal } from '@/components/attachments/PdfViewerModal'
import { formatLocalDate } from '@/lib/dates'
import { MAX_FILE_SIZE } from '@/lib/constants'
import { toast } from 'sonner'
import type { Note } from '@/types'

const TEMPLATES: { name: string; title: string; content: string }[] = [
  {
    name: 'Lecture notes',
    title: 'Lecture — ',
    content: '## Topic\n\n### Key points\n- \n\n### Questions & Summary\n- \n',
  },
  {
    name: 'Exam revision',
    title: 'Revision — ',
    content: '## Syllabus coverage\n\n## Key Formulas & Concepts\n\n## Weak areas to practice\n',
  },
  {
    name: 'Assignment notes',
    title: 'Assignment — ',
    content: '## Requirements\n\n## Approach & Outline\n\n## References\n',
  },
  {
    name: 'Project docs',
    title: 'Project — ',
    content: '## Goal\n\n## Architecture & Tech Stack\n\n## Milestones & Next steps\n',
  },
  {
    name: 'Weekly review',
    title: 'Weekly review',
    content: '## Wins & Completed Tasks\n\n## Challenges & Misses\n\n## Focus next week\n',
  },
]

export function NotesPage() {
  const {
    notes,
    subjects,
    createNote,
    updateNote,
    deleteNote,
    addNoteAttachment,
    removeNoteAttachment,
    userId,
  } = useAppData()

  const [search, setSearch] = useState('')
  const [selectedSubjectFilter, setSelectedSubjectFilter] = useState('')
  const [editing, setEditing] = useState<Note | null>(null)
  const [creating, setCreating] = useState(false)
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [subjectId, setSubjectId] = useState('')
  const [initialState, setInitialState] = useState({ title: '', content: '', subjectId: '' })
  const [uploading, setUploading] = useState(false)

  // PDF Viewer modal state
  const [activePdf, setActivePdf] = useState<{
    open: boolean
    blobId?: string
    filename: string
  }>({
    open: false,
    filename: '',
  })

  const activeSubjects = useMemo(() => subjects.filter((s) => !s.archived), [subjects])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return notes
      .filter((n) => {
        if (selectedSubjectFilter && n.subjectId !== selectedSubjectFilter) {
          return false
        }
        if (!q) return true
        return (
          n.title.toLowerCase().includes(q) ||
          n.content.toLowerCase().includes(q) ||
          (n.tags && n.tags.some((t) => t.toLowerCase().includes(q)))
        )
      })
      .sort(
        (a, b) =>
          Number(!!b.pinned) - Number(!!a.pinned) ||
          b.updatedAt.localeCompare(a.updatedAt),
      )
  }, [notes, search, selectedSubjectFilter])

  const openCreate = (template?: (typeof TEMPLATES)[0]) => {
    const initT = template?.title ?? ''
    const initC = template?.content ?? ''
    setCreating(true)
    setEditing(null)
    setTitle(initT)
    setContent(initC)
    setSubjectId('')
    setInitialState({ title: initT, content: initC, subjectId: '' })
  }

  const openEdit = (note: Note) => {
    setCreating(false)
    setEditing(note)
    setTitle(note.title)
    setContent(note.content)
    setSubjectId(note.subjectId ?? '')
    setInitialState({ title: note.title, content: note.content, subjectId: note.subjectId ?? '' })
  }

  const isDirty = useMemo(() => {
    return (
      title !== initialState.title ||
      content !== initialState.content ||
      subjectId !== initialState.subjectId
    )
  }, [title, content, subjectId, initialState])

  const handleClose = () => {
    if (isDirty) {
      const ok = confirm('You have unsaved changes in this note. Are you sure you want to discard them?')
      if (!ok) return
    }
    setCreating(false)
    setEditing(null)
  }

  const save = async () => {
    if (!title.trim()) {
      toast.error('Title is required')
      return
    }
    try {
      if (editing) {
        await updateNote(editing.id, {
          title: title.trim(),
          content,
          subjectId: subjectId || null,
        })
        toast.success('Note updated')
      } else {
        await createNote({
          userId,
          title: title.trim(),
          content,
          subjectId: subjectId || null,
          tags: [],
          pinned: false,
        })
        toast.success('Note created')
      }
      setEditing(null)
      setCreating(false)
    } catch {
      toast.error('Failed to save note')
    }
  }

  const handleFileUpload = async (files: FileList | null) => {
    const file = files?.[0]
    if (!file) return
    if (!editing) {
      toast.error('Please save the note first before attaching files')
      return
    }
    if (file.size > MAX_FILE_SIZE) {
      toast.error(`File is too large (max ${Math.round(MAX_FILE_SIZE / 1024 / 1024)}MB)`)
      return
    }

    setUploading(true)
    try {
      await addNoteAttachment(editing.id, file)
      // refresh editing instance
      const refreshedNote = notes.find((n) => n.id === editing.id)
      if (refreshedNote) setEditing(refreshedNote)
      toast.success('Attachment added')
    } catch (err: any) {
      toast.error(err.message || 'Failed to attach file')
    } finally {
      setUploading(false)
    }
  }

  const handleRemoveAttachment = async (attachmentId: string) => {
    if (!editing) return
    try {
      await removeNoteAttachment(editing.id, attachmentId)
      const refreshedNote = notes.find((n) => n.id === editing.id)
      if (refreshedNote) setEditing(refreshedNote)
      toast.success('Attachment removed')
    } catch {
      toast.error('Failed to remove attachment')
    }
  }

  const dialogOpen = creating || !!editing

  return (
    <div className="mx-auto max-w-5xl space-y-5 pb-12">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold">Notes & Study Materials</h1>
          <p className="text-sm text-muted-foreground">
            Capture lectures, revise topics, and attach PDF study slides
          </p>
        </div>
        <Button className="rounded-xl shadow-xs" onClick={() => openCreate()}>
          <Plus className="size-4 mr-1" /> New note
        </Button>
      </div>

      {/* Search and Subject Filter */}
      <div className="grid gap-2 sm:grid-cols-3">
        <div className="relative sm:col-span-2">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="rounded-xl bg-card pl-9 text-xs h-9"
            placeholder="Search notes by title, content or tags…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select
          value={selectedSubjectFilter}
          onChange={(e) => setSelectedSubjectFilter(e.target.value)}
          className="rounded-xl text-xs h-9"
        >
          <option value="">All subjects</option>
          {activeSubjects.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </Select>
      </div>

      {/* Templates Row */}
      <div className="flex gap-2 overflow-x-auto pb-1 text-xs">
        {TEMPLATES.map((t) => (
          <button
            key={t.name}
            type="button"
            onClick={() => openCreate(t)}
            className="shrink-0 rounded-full border border-border/70 bg-card px-3.5 py-1.5 font-medium hover:bg-muted transition"
          >
            + {t.name}
          </button>
        ))}
      </div>

      {/* Notes Grid */}
      {filtered.length === 0 ? (
        <EmptyState
          title="No notes found"
          description="Create your first study note or select a template above."
          actionLabel="Create note"
          onAction={() => openCreate()}
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {filtered.map((n) => {
            const sub = activeSubjects.find((s) => s.id === n.subjectId)
            const hasAttachments = (n.attachments?.length ?? 0) > 0

            return (
              <button
                key={n.id}
                type="button"
                onClick={() => openEdit(n)}
                className="group relative rounded-2xl border border-border/70 bg-card p-4 text-left shadow-[var(--shadow-soft)] transition hover:shadow-md hover:border-primary/40"
              >
                <div className="mb-2 flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <h3 className="font-display font-bold text-base line-clamp-1 group-hover:text-primary transition">
                      {n.title}
                    </h3>
                    {sub && (
                      <span
                        className="mt-1 inline-block rounded-md px-2 py-0.5 text-[10px] font-semibold text-white"
                        style={{
                          background: `linear-gradient(135deg, ${sub.colorFrom}, ${sub.colorTo})`,
                        }}
                      >
                        {sub.name}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    {hasAttachments && (
                      <span className="flex items-center gap-0.5 text-[11px] text-muted-foreground font-medium bg-muted px-1.5 py-0.5 rounded">
                        <Paperclip className="size-3" />
                        {n.attachments!.length}
                      </span>
                    )}
                    {n.pinned && <Pin className="size-3.5 text-primary" />}
                  </div>
                </div>

                <p className="line-clamp-3 text-xs text-muted-foreground whitespace-pre-wrap font-sans">
                  {n.content}
                </p>

                <p className="mt-3 text-[10px] text-muted-foreground/80">
                  Updated {formatLocalDate(n.updatedAt, 'MMM d, yyyy')}
                </p>
              </button>
            )
          })}
        </div>
      )}

      {/* Edit / Create Note Dialog */}
      <Dialog open={dialogOpen} onOpenChange={(open) => !open && handleClose()}>
        <DialogContent className="max-h-[92dvh] overflow-y-auto sm:max-w-xl">
          <DialogHeader>
            <DialogTitle className="font-display">
              {editing ? 'Edit Note' : 'New Note'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-3.5 py-1 text-xs">
            <div>
              <label className="font-semibold block mb-1">Title *</label>
              <Input
                placeholder="Note title…"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                autoFocus
              />
            </div>

            <div>
              <label className="font-semibold block mb-1">Subject (optional)</label>
              <Select value={subjectId} onChange={(e) => setSubjectId(e.target.value)}>
                <option value="">No subject</option>
                {activeSubjects.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </Select>
            </div>

            <div>
              <label className="font-semibold block mb-1">Note Content</label>
              <Textarea
                className="min-h-[220px] font-mono text-xs leading-relaxed"
                placeholder="Type your notes here… Markdown headings (#, ##), bullets (-), and code blocks are supported."
                value={content}
                onChange={(e) => setContent(e.target.value)}
              />
            </div>

            {/* Note PDF Attachments */}
            {editing && (
              <div className="rounded-xl border border-border p-3 space-y-2 bg-muted/20">
                <div className="flex items-center justify-between">
                  <h4 className="font-semibold flex items-center gap-1.5 text-xs">
                    <Paperclip className="size-3.5 text-primary" /> Attached Study Files & PDFs
                  </h4>
                  <label className="cursor-pointer inline-flex items-center gap-1 text-[11px] font-semibold text-primary hover:underline">
                    <Upload className="size-3" />
                    {uploading ? 'Uploading…' : 'Attach PDF…'}
                    <input
                      type="file"
                      accept=".pdf,.png,.jpg,.jpeg,.doc,.docx,.txt"
                      className="hidden"
                      onChange={(e) => handleFileUpload(e.target.files)}
                      disabled={uploading}
                    />
                  </label>
                </div>

                {(editing.attachments?.length ?? 0) === 0 ? (
                  <p className="text-[11px] text-muted-foreground">
                    No files attached yet. You can attach lecture slide PDFs or homework docs.
                  </p>
                ) : (
                  <ul className="space-y-1.5">
                    {editing.attachments!.map((att) => {
                      const isPdf = att.filename.toLowerCase().endsWith('.pdf')
                      return (
                        <li
                          key={att.id}
                          className="flex items-center justify-between gap-2 rounded-lg border border-border/80 bg-card p-2 text-xs"
                        >
                          <div className="flex items-center gap-2 min-w-0 flex-1">
                            <FileText className="size-4 shrink-0 text-primary" />
                            <span className="truncate font-medium">{att.filename}</span>
                            <span className="text-[10px] text-muted-foreground shrink-0">
                              ({(att.size / 1024).toFixed(1)} KB)
                            </span>
                          </div>

                          <div className="flex items-center gap-1 shrink-0">
                            {isPdf && att.blobId && (
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="h-7 px-2 text-[11px] text-primary"
                                onClick={() =>
                                  setActivePdf({
                                    open: true,
                                    blobId: att.blobId,
                                    filename: att.filename,
                                  })
                                }
                              >
                                <Eye className="size-3.5 mr-1" /> Open
                              </Button>
                            )}
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="size-7 text-destructive"
                              onClick={() => handleRemoveAttachment(att.id)}
                              aria-label="Remove attachment"
                            >
                              <Trash2 className="size-3.5" />
                            </Button>
                          </div>
                        </li>
                      )
                    })}
                  </ul>
                )}
              </div>
            )}
          </div>

          <DialogFooter className="flex-wrap gap-2 pt-2">
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
                  {editing.pinned ? 'Unpin' : 'Pin note'}
                </Button>
                <Button
                  variant="destructive"
                  onClick={async () => {
                    if (!confirm('Are you sure you want to delete this note?')) return
                    await deleteNote(editing.id)
                    toast.success('Note deleted')
                    setEditing(null)
                  }}
                >
                  Delete
                </Button>
              </>
            )}
            <Button variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button onClick={save}>Save Note</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* In-App PDF Viewer Modal */}
      <PdfViewerModal
        open={activePdf.open}
        onClose={() => setActivePdf((p) => ({ ...p, open: false }))}
        blobId={activePdf.blobId}
        filename={activePdf.filename}
      />
    </div>
  )
}
