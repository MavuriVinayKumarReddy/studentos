import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Command } from 'cmdk'
import {
  BookOpen,
  CalendarDays,
  ChartColumn,
  FileText,
  Home,
  ListTodo,
  NotebookPen,
  Search,
  Settings,
  Sparkles,
  Timer,
} from 'lucide-react'
import { useAppData } from '@/context/AppDataContext'
import { cn } from '@/lib/utils'

interface CommandPaletteProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

const NAV_ITEMS = [
  { to: '/', label: 'Home', icon: Home },
  { to: '/timeline', label: 'Timeline', icon: ListTodo },
  { to: '/calendar', label: 'Calendar', icon: CalendarDays },
  { to: '/notes', label: 'Notes', icon: NotebookPen },
  { to: '/subjects', label: 'Subjects', icon: BookOpen },
  { to: '/growth', label: 'Growth', icon: Sparkles },
  { to: '/study', label: 'Study timer', icon: Timer },
  { to: '/analytics', label: 'Analytics', icon: ChartColumn },
  { to: '/settings', label: 'Settings', icon: Settings },
] as const

export function CommandPalette({ open, onOpenChange }: CommandPaletteProps) {
  const navigate = useNavigate()
  const { tasks, notes, subjects } = useAppData()
  const [query, setQuery] = useState('')

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        onOpenChange(!open)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onOpenChange])

  useEffect(() => {
    if (!open) setQuery('')
  }, [open])

  const filteredTasks = useMemo(() => {
    const q = query.trim().toLowerCase()
    const list = tasks.filter((t) => t.status !== 'Completed')
    if (!q) return list.slice(0, 8)
    return list
      .filter(
        (t) =>
          t.title.toLowerCase().includes(q) ||
          t.tags.some((tag) => tag.toLowerCase().includes(q)),
      )
      .slice(0, 8)
  }, [tasks, query])

  const filteredNotes = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return notes.slice(0, 6)
    return notes
      .filter(
        (n) =>
          n.title.toLowerCase().includes(q) ||
          n.content.toLowerCase().includes(q),
      )
      .slice(0, 6)
  }, [notes, query])

  const filteredSubjects = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return subjects.slice(0, 6)
    return subjects.filter((s) => s.name.toLowerCase().includes(q)).slice(0, 6)
  }, [subjects, query])

  if (!open) return null

  const go = (path: string) => {
    onOpenChange(false)
    navigate(path)
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-start justify-center px-4 pt-[12vh]">
      <button
        type="button"
        aria-label="Close search"
        className="absolute inset-0 bg-black/40 backdrop-blur-[2px]"
        onClick={() => onOpenChange(false)}
      />
      <Command
        className="relative z-10 w-full max-w-lg overflow-hidden rounded-2xl border border-border bg-card shadow-xl"
        label="Global search"
        shouldFilter={false}
      >
        <div className="flex items-center gap-2 border-b border-border/70 px-3">
          <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
          <Command.Input
            value={query}
            onValueChange={setQuery}
            placeholder="Search tasks, notes, pages…"
            className="h-12 w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
          <kbd className="hidden rounded-md border border-border px-1.5 py-0.5 text-[10px] text-muted-foreground sm:inline">
            esc
          </kbd>
        </div>
        <Command.List className="max-h-[min(60vh,420px)] overflow-y-auto p-2">
          <Command.Empty className="px-3 py-8 text-center text-sm text-muted-foreground">
            No matches
          </Command.Empty>

          <Command.Group heading="Navigate" className="text-xs">
            {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
              <Command.Item
                key={to}
                value={`nav-${label}`}
                onSelect={() => go(to)}
                className={cn(
                  'flex cursor-pointer items-center gap-2 rounded-xl px-3 py-2 text-sm aria-selected:bg-primary/10',
                )}
              >
                <Icon className="h-4 w-4 text-muted-foreground" />
                {label}
              </Command.Item>
            ))}
          </Command.Group>

          {filteredTasks.length > 0 ? (
            <Command.Group heading="Tasks" className="mt-2 text-xs">
              {filteredTasks.map((task) => (
                <Command.Item
                  key={task.id}
                  value={`task-${task.id}-${task.title}`}
                  onSelect={() => go(`/tasks/${task.id}`)}
                  className="flex cursor-pointer items-center gap-2 rounded-xl px-3 py-2 text-sm aria-selected:bg-primary/10"
                >
                  <ListTodo className="h-4 w-4 text-muted-foreground" />
                  <span className="truncate">{task.title}</span>
                </Command.Item>
              ))}
            </Command.Group>
          ) : null}

          {filteredNotes.length > 0 ? (
            <Command.Group heading="Notes" className="mt-2 text-xs">
              {filteredNotes.map((note) => (
                <Command.Item
                  key={note.id}
                  value={`note-${note.id}-${note.title}`}
                  onSelect={() => go(`/notes?id=${note.id}`)}
                  className="flex cursor-pointer items-center gap-2 rounded-xl px-3 py-2 text-sm aria-selected:bg-primary/10"
                >
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  <span className="truncate">{note.title || 'Untitled'}</span>
                </Command.Item>
              ))}
            </Command.Group>
          ) : null}

          {filteredSubjects.length > 0 ? (
            <Command.Group heading="Subjects" className="mt-2 text-xs">
              {filteredSubjects.map((s) => (
                <Command.Item
                  key={s.id}
                  value={`subject-${s.id}-${s.name}`}
                  onSelect={() => go('/subjects')}
                  className="flex cursor-pointer items-center gap-2 rounded-xl px-3 py-2 text-sm aria-selected:bg-primary/10"
                >
                  <span
                    className="h-3 w-3 rounded-full"
                    style={{
                      background: `linear-gradient(135deg, ${s.colorFrom}, ${s.colorTo})`,
                    }}
                  />
                  {s.name}
                </Command.Item>
              ))}
            </Command.Group>
          ) : null}
        </Command.List>
      </Command>
    </div>
  )
}
