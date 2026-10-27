import { useEffect, useState, type ReactNode } from 'react'
import { Outlet } from 'react-router-dom'
import { WifiOff } from 'lucide-react'
import { Sidebar } from '@/components/layout/Sidebar'
import { BottomNav } from '@/components/layout/BottomNav'
import { Header } from '@/components/layout/Header'
import { InstallPrompt } from '@/components/layout/InstallPrompt'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { useAppData } from '@/context/AppDataContext'
import { Priority, TaskStatus, TaskType } from '@/types'
import { toLocalDateString } from '@/lib/dates'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

interface AppShellProps {
  children?: ReactNode
  title?: string
  showGreeting?: boolean
  showHeader?: boolean
  className?: string
}

export function AppShell({
  children,
  title,
  showGreeting = true,
  showHeader = true,
  className,
}: AppShellProps) {
  const { subjects, createTask, refresh, userId } = useAppData()
  const [addOpen, setAddOpen] = useState(false)
  const [titleInput, setTitleInput] = useState('')
  const [subjectId, setSubjectId] = useState<string>('')
  const [dueDate, setDueDate] = useState(toLocalDateString())
  const [saving, setSaving] = useState(false)
  const [isOffline, setIsOffline] = useState(
    () => typeof navigator !== 'undefined' && !navigator.onLine,
  )

  useEffect(() => {
    const onOffline = () => setIsOffline(true)
    const onOnline = () => setIsOffline(false)
    window.addEventListener('offline', onOffline)
    window.addEventListener('online', onOnline)
    return () => {
      window.removeEventListener('offline', onOffline)
      window.removeEventListener('online', onOnline)
    }
  }, [])

  const handleAdd = async () => {
    if (!titleInput.trim()) {
      toast.error('Enter a task title')
      return
    }
    setSaving(true)
    try {
      await createTask({
        title: titleInput.trim(),
        subjectId: subjectId || null,
        type: TaskType.Assignment,
        dueDate,
        priority: Priority.Medium,
        status: TaskStatus.NotStarted,
        tentative: false,
        tags: [],
        subtasks: [],
        userId,
      })
      toast.success('Task added')
      setTitleInput('')
      setAddOpen(false)
      await refresh()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to add task')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex min-h-dvh bg-[var(--background,#F0F2F8)] text-foreground">
      <div className="hidden lg:sticky lg:top-0 lg:flex lg:h-dvh lg:shrink-0">
        <Sidebar />
      </div>

      <div className="flex min-w-0 flex-1 flex-col">
        {showHeader ? (
          <Header
            title={title}
            showGreeting={showGreeting}
            onSearch={() =>
              window.dispatchEvent(new CustomEvent('studentos:command-palette'))
            }
          />
        ) : null}

        {isOffline && (
          <div className="flex items-center justify-center gap-1.5 border-b border-amber-500/20 bg-amber-500/10 px-4 py-1.5 text-xs font-medium text-amber-800 dark:text-amber-200">
            <WifiOff className="size-3.5 shrink-0" />
            <span>Offline mode — your student records and saved PDFs remain fully accessible.</span>
          </div>
        )}

        <main
          className={cn(
            'mx-auto w-full max-w-5xl flex-1 px-4 pb-24 pt-4 lg:px-8 lg:pb-8',
            className,
          )}
        >
          {children ?? <Outlet />}
        </main>
      </div>

      <BottomNav onAdd={() => setAddOpen(true)} />
      <InstallPrompt />

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogHeader onClose={() => setAddOpen(false)}>
          <DialogTitle>Quick add task</DialogTitle>
        </DialogHeader>
        <DialogContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="quick-title">Title</Label>
            <Input
              id="quick-title"
              placeholder="What do you need to do?"
              value={titleInput}
              onChange={(e) => setTitleInput(e.target.value)}
              autoFocus
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="quick-subject">Subject</Label>
              <Select
                id="quick-subject"
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
              <Label htmlFor="quick-due">Due date</Label>
              <Input
                id="quick-due"
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
              />
            </div>
          </div>
        </DialogContent>
        <DialogFooter>
          <Button variant="outline" onClick={() => setAddOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleAdd} disabled={saving}>
            {saving ? 'Saving…' : 'Add task'}
          </Button>
        </DialogFooter>
      </Dialog>
    </div>
  )
}
