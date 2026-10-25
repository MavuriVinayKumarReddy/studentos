import { useEffect, useState } from 'react'
import { Pin, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import type { Note, Subject } from '@/types'
import { cn } from '@/lib/utils'

export interface NoteEditorValues {
  title: string
  content: string
  subjectId: string | null
  tags: string
  pinned: boolean
  folder: string
}

interface NoteEditorProps {
  note?: Note | null
  subjects: Subject[]
  onSave: (values: NoteEditorValues) => Promise<void> | void
  onDelete?: () => Promise<void> | void
  onCancel?: () => void
  className?: string
}

export function NoteEditor({
  note,
  subjects,
  onSave,
  onDelete,
  onCancel,
  className,
}: NoteEditorProps) {
  const [title, setTitle] = useState(note?.title ?? '')
  const [content, setContent] = useState(note?.content ?? '')
  const [subjectId, setSubjectId] = useState<string>(note?.subjectId ?? '')
  const [tags, setTags] = useState(note?.tags?.join(', ') ?? '')
  const [pinned, setPinned] = useState(Boolean(note?.pinned))
  const [folder, setFolder] = useState(note?.folder ?? '')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    setTitle(note?.title ?? '')
    setContent(note?.content ?? '')
    setSubjectId(note?.subjectId ?? '')
    setTags(note?.tags?.join(', ') ?? '')
    setPinned(Boolean(note?.pinned))
    setFolder(note?.folder ?? '')
  }, [note])

  const handleSave = async () => {
    setSaving(true)
    try {
      await onSave({
        title: title.trim() || 'Untitled',
        content,
        subjectId: subjectId || null,
        tags,
        pinned,
        folder: folder.trim(),
      })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className={cn('space-y-4', className)}>
      <div className="space-y-2">
        <Label htmlFor="note-title">Title</Label>
        <Input
          id="note-title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Note title"
          autoFocus
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="note-subject">Subject</Label>
          <Select
            id="note-subject"
            value={subjectId}
            onChange={(e) => setSubjectId(e.target.value)}
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
          <Label htmlFor="note-folder">Folder</Label>
          <Input
            id="note-folder"
            value={folder}
            onChange={(e) => setFolder(e.target.value)}
            placeholder="e.g. Lectures"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="note-tags">Tags</Label>
        <Input
          id="note-tags"
          value={tags}
          onChange={(e) => setTags(e.target.value)}
          placeholder="comma-separated"
        />
      </div>

      <div className="flex items-center justify-between rounded-xl border border-border/60 px-3 py-2">
        <div className="flex items-center gap-2 text-sm font-medium">
          <Pin className="h-4 w-4 text-primary" />
          Pin note
        </div>
        <Switch checked={pinned} onChange={(e) => setPinned(e.target.checked)} />
      </div>

      <div className="space-y-2">
        <Label htmlFor="note-content">Content</Label>
        <Textarea
          id="note-content"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={12}
          placeholder="Write your notes… Markdown-friendly."
          className="min-h-[220px] font-mono text-sm"
        />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        {onDelete ? (
          <Button
            type="button"
            variant="destructive"
            onClick={() => void onDelete()}
          >
            <Trash2 className="h-4 w-4" />
            Delete
          </Button>
        ) : (
          <span />
        )}
        <div className="flex gap-2">
          {onCancel ? (
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancel
            </Button>
          ) : null}
          <Button type="button" onClick={() => void handleSave()} disabled={saving}>
            {saving ? 'Saving…' : 'Save note'}
          </Button>
        </div>
      </div>
    </div>
  )
}
