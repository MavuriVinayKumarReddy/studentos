import { Pin } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { formatLocalDate } from '@/lib/dates'
import { cn } from '@/lib/utils'
import type { Note, Subject } from '@/types'

interface NoteCardProps {
  note: Note
  subject?: Subject
  onClick?: () => void
  className?: string
}

function preview(content: string, max = 120): string {
  const plain = content.replace(/[#>*_`\[\]()]/g, '').replace(/\s+/g, ' ').trim()
  if (plain.length <= max) return plain
  return `${plain.slice(0, max).trim()}…`
}

export function NoteCard({ note, subject, onClick, className }: NoteCardProps) {
  return (
    <article
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onClick={onClick}
      onKeyDown={(e) => {
        if (!onClick) return
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onClick()
        }
      }}
      className={cn(
        'group flex cursor-pointer flex-col gap-2 rounded-2xl border border-border/60 bg-card p-4 shadow-soft transition hover:shadow-card',
        note.pinned && 'ring-1 ring-primary/25',
        className,
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <h3 className="line-clamp-2 text-sm font-semibold text-[var(--heading,#1E3A5F)] dark:text-foreground">
          {note.title || 'Untitled'}
        </h3>
        {note.pinned ? (
          <Pin className="h-3.5 w-3.5 shrink-0 fill-primary text-primary" />
        ) : null}
      </div>

      {note.content ? (
        <p className="line-clamp-3 text-xs leading-relaxed text-muted-foreground">
          {preview(note.content)}
        </p>
      ) : (
        <p className="text-xs italic text-muted-foreground">Empty note</p>
      )}

      <div className="mt-auto flex flex-wrap items-center gap-1.5 pt-1">
        {subject ? (
          <Badge
            variant="secondary"
            className="border-0 text-[10px] font-semibold text-white"
            style={{
              background: `linear-gradient(135deg, ${subject.colorFrom}, ${subject.colorTo})`,
            }}
          >
            {subject.name}
          </Badge>
        ) : null}
        {note.tags.slice(0, 3).map((tag) => (
          <Badge key={tag} variant="outline" className="text-[10px]">
            {tag}
          </Badge>
        ))}
        <span className="ml-auto text-[10px] text-muted-foreground">
          {formatLocalDate(note.updatedAt, 'MMM d')}
        </span>
      </div>
    </article>
  )
}
