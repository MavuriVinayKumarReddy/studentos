import { useMemo, useState } from 'react'
import {
  Plus,
  Trash2,
  Edit3,
  Calendar,
  CheckCircle2,
  Circle,
  ChevronUp,
  ChevronDown,
  Sparkles,
  Layers,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select } from '@/components/ui/select'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { EmptyState } from '@/components/ui/empty-state'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useAppData } from '@/context/AppDataContext'
import { formatLocalDate } from '@/lib/dates'
import { MilestoneStatus, RoadmapStatus, type Roadmap, type RoadmapMilestone } from '@/types'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

const STARTER_ROADMAPS = [
  {
    title: 'Data Structures and Algorithms',
    description: 'Arrays, Linked Lists, Trees, Graphs, DP & LeetCode practice',
    milestones: [
      'Arrays & Hashing (Two Pointers, Sliding Window)',
      'Linked Lists & Fast/Slow Pointers',
      'Stacks, Queues & Monotonic Stack',
      'Binary Search & Divide and Conquer',
      'Trees, BST & Traversals',
      'Heap & Priority Queue',
      'Graph Algorithms (BFS, DFS, Dijkstra)',
      'Dynamic Programming & Backtracking',
    ],
  },
  {
    title: 'Full-Stack Web Development',
    description: 'Modern HTML, CSS, React, Node.js, Express & PostgreSQL',
    milestones: [
      'HTML5, Modern CSS & Responsive Design',
      'JavaScript ES6+ & Async/Await',
      'React & Modern State Management',
      'Tailwind CSS & Component Libraries',
      'Node.js & Express REST APIs',
      'Databases (PostgreSQL, SQLite, Prisma)',
      'Authentication, JWT & Security',
      'Full-Stack Deployment & CI/CD',
    ],
  },
  {
    title: 'Python for Developers & AI',
    description: 'From core fundamentals to OOP, NumPy, Pandas, and APIs',
    milestones: [
      'Python Syntax, Data Structures & Comprehensions',
      'Functions, Lambdas & Error Handling',
      'Object-Oriented Programming in Python',
      'File I/O, JSON & Web Requests',
      'NumPy & Pandas for Data Analysis',
      'Building FastAPIs and CLI Tools',
    ],
  },
  {
    title: 'Semester Exam Prep Roadmap',
    description: 'Targeted syllabus revision and past paper practice',
    milestones: [
      'Collect all lecture notes and exam syllabus',
      'Finish Unit 1 & Unit 2 core problem practice',
      'Finish Unit 3 & Unit 4 revision and formulas',
      'Solve previous 3 years exam question papers',
      'Final revision and self-test mock exam',
    ],
  },
]

export function RoadmapManager() {
  const { userId, roadmaps, createRoadmap, updateRoadmap, deleteRoadmap } = useAppData()

  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')

  // Create Custom Roadmap Modal
  const [createModalOpen, setCreateModalOpen] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [newDesc, setNewDesc] = useState('')
  const [newTag, setNewTag] = useState('')
  const [newTargetDate, setNewTargetDate] = useState('')
  const [draftMilestones, setDraftMilestones] = useState<string[]>([])
  const [stepInput, setStepInput] = useState('')
  const [savingRoadmap, setSavingRoadmap] = useState(false)

  // Edit Roadmap Modal
  const [editingRoadmap, setEditingRoadmap] = useState<Roadmap | null>(null)
  const [editTitle, setEditTitle] = useState('')
  const [editDesc, setEditDesc] = useState('')
  const [editStatus, setEditStatus] = useState<RoadmapStatus>(RoadmapStatus.Active)
  const [editTargetDate, setEditTargetDate] = useState('')

  // Inline "Add Step" inputs per roadmap card: roadmapId -> text
  const [inlineStepInputs, setInlineStepInputs] = useState<Record<string, string>>({})

  // Delete Roadmap confirmation state
  const [roadmapToDelete, setRoadmapToDelete] = useState<Roadmap | null>(null)

  // Filtered roadmaps
  const filteredRoadmaps = useMemo(() => {
    return roadmaps.filter((r) => {
      if (filterStatus !== 'all' && r.status !== filterStatus) return false
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase()
        const matchTitle = r.title.toLowerCase().includes(q)
        const matchDesc = (r.description ?? '').toLowerCase().includes(q)
        const matchSteps = r.milestones.some((m) => m.title.toLowerCase().includes(q))
        return matchTitle || matchDesc || matchSteps
      }
      return true
    })
  }, [roadmaps, filterStatus, searchQuery])

  // Open Create Modal
  const handleOpenCreate = () => {
    setNewTitle('')
    setNewDesc('')
    setNewTag('')
    setNewTargetDate('')
    setDraftMilestones([])
    setStepInput('')
    setCreateModalOpen(true)
  }

  // Add draft step to Create modal
  const handleAddDraftStep = () => {
    if (!stepInput.trim()) return
    setDraftMilestones((prev) => [...prev, stepInput.trim()])
    setStepInput('')
  }

  // Remove draft step in Create modal
  const handleRemoveDraftStep = (idx: number) => {
    setDraftMilestones((prev) => prev.filter((_, i) => i !== idx))
  }

  // Submit Create Custom Roadmap
  const handleCreateCustom = async () => {
    if (!newTitle.trim()) {
      toast.error('Roadmap title is required')
      return
    }

    setSavingRoadmap(true)
    try {
      const stepsToSave =
        draftMilestones.length > 0
          ? draftMilestones
          : stepInput.trim()
            ? [stepInput.trim()]
            : ['Getting Started']

      const milestones: RoadmapMilestone[] = stepsToSave.map((title, idx) => ({
        id: crypto.randomUUID(),
        title,
        status: MilestoneStatus.NotStarted,
        sortOrder: idx,
      }))

      await createRoadmap({
        userId,
        title: newTitle.trim(),
        description: newDesc.trim() || undefined,
        status: RoadmapStatus.Active,
        targetDate: newTargetDate || undefined,
        tags: newTag.trim() ? [newTag.trim()] : [],
        milestones,
      })

      toast.success('Custom roadmap created successfully!')
      setCreateModalOpen(false)
    } catch {
      toast.error('Failed to create roadmap')
    } finally {
      setSavingRoadmap(false)
    }
  }

  // Add Starter Roadmap
  const handleAddStarter = async (starter: (typeof STARTER_ROADMAPS)[0]) => {
    try {
      await createRoadmap({
        userId,
        title: starter.title,
        description: starter.description,
        status: RoadmapStatus.Active,
        tags: ['starter'],
        milestones: starter.milestones.map((title, i) => ({
          id: crypto.randomUUID(),
          title,
          status: MilestoneStatus.NotStarted,
          sortOrder: i,
        })),
      })
      toast.success(`Added roadmap: "${starter.title}"`)
    } catch {
      toast.error('Failed to add starter roadmap')
    }
  }

  // Open Edit Modal
  const handleOpenEdit = (r: Roadmap) => {
    setEditingRoadmap(r)
    setEditTitle(r.title)
    setEditDesc(r.description ?? '')
    setEditStatus(r.status)
    setEditTargetDate(r.targetDate ?? '')
  }

  // Save Edit Roadmap
  const handleSaveEdit = async () => {
    if (!editingRoadmap) return
    if (!editTitle.trim()) {
      toast.error('Title is required')
      return
    }
    try {
      await updateRoadmap(editingRoadmap.id, {
        title: editTitle.trim(),
        description: editDesc.trim() || undefined,
        status: editStatus,
        targetDate: editTargetDate || undefined,
      })
      toast.success('Roadmap updated')
      setEditingRoadmap(null)
    } catch {
      toast.error('Failed to update roadmap')
    }
  }

  // Delete Roadmap
  const handleConfirmDelete = async () => {
    if (!roadmapToDelete) return
    try {
      await deleteRoadmap(roadmapToDelete.id)
      toast.success('Roadmap deleted')
      setRoadmapToDelete(null)
    } catch {
      toast.error('Failed to delete roadmap')
    }
  }

  // Inline Add Step to Existing Roadmap
  const handleAddInlineStep = async (roadmapId: string) => {
    const text = (inlineStepInputs[roadmapId] ?? '').trim()
    if (!text) return

    const r = roadmaps.find((x) => x.id === roadmapId)
    if (!r) return

    const newMilestone: RoadmapMilestone = {
      id: crypto.randomUUID(),
      title: text,
      status: MilestoneStatus.NotStarted,
      sortOrder: r.milestones.length,
    }

    try {
      await updateRoadmap(roadmapId, {
        milestones: [...r.milestones, newMilestone],
      })
      toast.success(`Added step: "${text}"`)
      setInlineStepInputs((prev) => ({ ...prev, [roadmapId]: '' }))
    } catch {
      toast.error('Failed to add step')
    }
  }

  // Toggle milestone completion
  const handleToggleMilestone = async (r: Roadmap, m: RoadmapMilestone) => {
    const isCompleted = m.status === MilestoneStatus.Completed
    const newStatus = isCompleted ? MilestoneStatus.NotStarted : MilestoneStatus.Completed
    const completedAt = isCompleted ? undefined : new Date().toISOString()

    const updatedMilestones = r.milestones.map((item) =>
      item.id === m.id ? { ...item, status: newStatus, completedAt } : item,
    )

    try {
      await updateRoadmap(r.id, { milestones: updatedMilestones })
    } catch {
      toast.error('Failed to update milestone')
    }
  }

  // Delete a milestone from existing roadmap
  const handleDeleteMilestone = async (r: Roadmap, milestoneId: string) => {
    const updated = r.milestones.filter((m) => m.id !== milestoneId)
    try {
      await updateRoadmap(r.id, { milestones: updated })
      toast.success('Step deleted')
    } catch {
      toast.error('Failed to delete step')
    }
  }

  // Reorder milestone
  const handleMoveMilestone = async (r: Roadmap, index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1
    if (targetIndex < 0 || targetIndex >= r.milestones.length) return

    const cloned = [...r.milestones]
    const temp = cloned[index]!
    cloned[index] = cloned[targetIndex]!
    cloned[targetIndex] = temp

    // re-assign sortOrder
    const reordered = cloned.map((m, i) => ({ ...m, sortOrder: i }))
    try {
      await updateRoadmap(r.id, { milestones: reordered })
    } catch {
      toast.error('Failed to reorder steps')
    }
  }

  return (
    <div className="space-y-6">
      {/* Top Action Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-xl font-bold flex items-center gap-2">
            <Layers className="size-5 text-primary" /> Learning & Exam Roadmaps
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Build custom study paths, syllabus checkpoints, and skill roadmaps according to your will.
          </p>
        </div>

        <Button onClick={handleOpenCreate} className="rounded-xl shadow-xs">
          <Plus className="size-4 mr-1.5" /> Create Custom Roadmap
        </Button>
      </div>

      {/* Starter Roadmaps Suggestions */}
      <section className="rounded-2xl border border-primary/20 bg-primary/5 p-4 space-y-2.5">
        <div className="flex items-center gap-2 text-xs font-semibold text-primary">
          <Sparkles className="size-4" /> Quick Starters (Tap to add and customize freely):
        </div>
        <div className="flex flex-wrap gap-2">
          {STARTER_ROADMAPS.map((starter) => (
            <Button
              key={starter.title}
              variant="outline"
              size="sm"
              className="rounded-xl text-xs bg-card hover:bg-muted border-border/80"
              onClick={() => handleAddStarter(starter)}
            >
              + {starter.title}
            </Button>
          ))}
        </div>
      </section>

      {/* Filter and Search Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2.5">
        <div className="flex items-center gap-1 rounded-xl bg-card p-1 border border-border/70 text-xs">
          {(['all', 'Active', 'Completed'] as const).map((st) => (
            <button
              key={st}
              type="button"
              onClick={() => setFilterStatus(st)}
              className={cn(
                'rounded-lg px-3 py-1 font-semibold transition',
                filterStatus === st
                  ? 'bg-primary text-primary-foreground shadow-xs'
                  : 'text-muted-foreground hover:bg-muted',
              )}
            >
              {st === 'all' ? 'All Roadmaps' : st}
            </button>
          ))}
        </div>

        <Input
          placeholder="Search roadmaps or steps…"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="max-w-xs text-xs h-8 rounded-xl bg-card"
        />
      </div>

      {/* Roadmaps List */}
      {filteredRoadmaps.length === 0 ? (
        <EmptyState
          title="No roadmaps match your criteria"
          description="Create your own custom roadmap with any steps, topics, or goals you wish to track."
          actionLabel="Create Custom Roadmap"
          onAction={handleOpenCreate}
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {filteredRoadmaps.map((r) => {
            const completedCount = r.milestones.filter(
              (m) => m.status === MilestoneStatus.Completed,
            ).length
            const totalCount = r.milestones.length
            const pct = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0

            return (
              <div
                key={r.id}
                className="flex flex-col justify-between rounded-2xl border border-border/80 bg-card p-4 sm:p-5 shadow-xs transition hover:border-primary/40 space-y-4"
              >
                {/* Header */}
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-display font-bold text-base text-foreground truncate">
                          {r.title}
                        </h3>
                        <Badge
                          variant={r.status === 'Completed' ? 'success' : 'outline'}
                          className="text-[10px] uppercase font-semibold px-2 py-0.5"
                        >
                          {r.status}
                        </Badge>
                      </div>
                      {r.description && (
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                          {r.description}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="size-7 text-muted-foreground hover:text-foreground"
                        onClick={() => handleOpenEdit(r)}
                        aria-label="Edit roadmap"
                      >
                        <Edit3 className="size-3.5" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="size-7 text-destructive hover:bg-destructive/10"
                        onClick={() => setRoadmapToDelete(r)}
                        aria-label="Delete roadmap"
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    </div>
                  </div>

                  {/* Target date & progress */}
                  <div className="space-y-1.5 pt-1">
                    <div className="flex items-center justify-between text-xs font-medium text-muted-foreground">
                      <span>
                        {completedCount} of {totalCount} steps completed ({pct}%)
                      </span>
                      {r.targetDate && (
                        <span className="flex items-center gap-1 text-[11px] text-primary">
                          <Calendar className="size-3" /> Target: {formatLocalDate(r.targetDate)}
                        </span>
                      )}
                    </div>
                    <Progress
                      value={pct}
                      className="h-2"
                      indicatorClassName={pct === 100 ? 'bg-emerald-500' : 'bg-primary'}
                    />
                  </div>
                </div>

                {/* Milestones / Steps List */}
                <div className="space-y-1.5 max-h-64 overflow-y-auto pr-1">
                  {r.milestones.length === 0 ? (
                    <p className="text-xs text-muted-foreground italic py-2">
                      No steps in this roadmap yet. Add your first step below!
                    </p>
                  ) : (
                    r.milestones.map((m, idx) => {
                      const done = m.status === MilestoneStatus.Completed
                      return (
                        <div
                          key={m.id}
                          className={cn(
                            'group flex items-center justify-between gap-2 rounded-xl border px-3 py-2 text-xs transition',
                            done
                              ? 'border-border/40 bg-muted/30 text-muted-foreground'
                              : 'border-border/70 bg-card text-foreground hover:border-border',
                          )}
                        >
                          <div
                            className="flex items-center gap-2.5 min-w-0 flex-1 cursor-pointer"
                            onClick={() => handleToggleMilestone(r, m)}
                          >
                            <button
                              type="button"
                              className="shrink-0 text-primary transition focus:outline-hidden"
                            >
                              {done ? (
                                <CheckCircle2 className="size-4 text-emerald-500" />
                              ) : (
                                <Circle className="size-4 text-muted-foreground/60 group-hover:text-primary" />
                              )}
                            </button>
                            <span
                              className={cn(
                                'font-medium select-none truncate',
                                done && 'line-through text-muted-foreground',
                              )}
                            >
                              {m.title}
                            </span>
                          </div>

                          <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition shrink-0">
                            {/* Reorder Buttons */}
                            <button
                              type="button"
                              disabled={idx === 0}
                              onClick={() => handleMoveMilestone(r, idx, 'up')}
                              className="p-1 text-muted-foreground hover:text-foreground disabled:opacity-20"
                              title="Move step up"
                            >
                              <ChevronUp className="size-3" />
                            </button>
                            <button
                              type="button"
                              disabled={idx === r.milestones.length - 1}
                              onClick={() => handleMoveMilestone(r, idx, 'down')}
                              className="p-1 text-muted-foreground hover:text-foreground disabled:opacity-20"
                              title="Move step down"
                            >
                              <ChevronDown className="size-3" />
                            </button>

                            {/* Delete step button */}
                            <button
                              type="button"
                              onClick={() => handleDeleteMilestone(r, m.id)}
                              className="p-1 text-muted-foreground hover:text-destructive"
                              title="Delete step"
                            >
                              <Trash2 className="size-3" />
                            </button>
                          </div>
                        </div>
                      )
                    })
                  )}
                </div>

                {/* Inline "Add Step / Milestone" Control */}
                <div className="pt-2 border-t border-border/50">
                  <form
                    onSubmit={(e) => {
                      e.preventDefault()
                      handleAddInlineStep(r.id)
                    }}
                    className="flex items-center gap-2"
                  >
                    <Input
                      placeholder="Add a step to this roadmap…"
                      value={inlineStepInputs[r.id] ?? ''}
                      onChange={(e) =>
                        setInlineStepInputs((prev) => ({ ...prev, [r.id]: e.target.value }))
                      }
                      className="text-xs h-8.5 rounded-xl bg-muted/40"
                    />
                    <Button
                      type="submit"
                      size="sm"
                      className="h-8.5 rounded-xl px-3 text-xs font-semibold shrink-0"
                    >
                      <Plus className="size-3.5 mr-1" /> Add Step
                    </Button>
                  </form>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Create Custom Roadmap Dialog */}
      <Dialog open={createModalOpen} onOpenChange={setCreateModalOpen}>
        <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-display text-lg">Create Custom Roadmap</DialogTitle>
            <p className="text-xs text-muted-foreground">
              Define your own roadmap goals, syllabus topics, and steps according to your will.
            </p>
          </DialogHeader>

          <div className="space-y-4 py-2 text-xs">
            <div>
              <label className="font-semibold block mb-1">Roadmap Title *</label>
              <Input
                placeholder="e.g. Master Machine Learning, Semester 5 Exam Prep, Full-Stack Dev"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                autoFocus
                className="text-xs h-9 rounded-xl"
              />
            </div>

            <div>
              <label className="font-semibold block mb-1">Description / Goal (Optional)</label>
              <Textarea
                placeholder="What do you plan to achieve with this roadmap?"
                value={newDesc}
                onChange={(e) => setNewDesc(e.target.value)}
                rows={2}
                className="text-xs rounded-xl"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="font-semibold block mb-1">Category / Tag</label>
                <Input
                  placeholder="e.g. Career, Web, Academics"
                  value={newTag}
                  onChange={(e) => setNewTag(e.target.value)}
                  className="text-xs h-9 rounded-xl"
                />
              </div>

              <div>
                <label className="font-semibold block mb-1">Target Completion Date</label>
                <Input
                  type="date"
                  value={newTargetDate}
                  onChange={(e) => setNewTargetDate(e.target.value)}
                  className="text-xs h-9 rounded-xl"
                />
              </div>
            </div>

            {/* Custom Milestones / Steps Builder */}
            <div className="space-y-2 pt-2 border-t border-border/60">
              <label className="font-semibold block">
                Roadmap Steps / Milestones ({draftMilestones.length})
              </label>
              <div className="flex gap-2">
                <Input
                  placeholder="Enter a step (e.g. Learn Basics, Build Practice App…)"
                  value={stepInput}
                  onChange={(e) => setStepInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      handleAddDraftStep()
                    }
                  }}
                  className="text-xs h-9 rounded-xl flex-1"
                />
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={handleAddDraftStep}
                  className="h-9 px-3 rounded-xl text-xs"
                >
                  <Plus className="size-3.5 mr-1" /> Add Step
                </Button>
              </div>

              {draftMilestones.length > 0 && (
                <div className="space-y-1.5 max-h-40 overflow-y-auto mt-2 pr-1">
                  {draftMilestones.map((step, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between gap-2 rounded-xl bg-muted/40 px-3 py-1.5 text-xs border border-border/50"
                    >
                      <span className="font-medium text-foreground">
                        {idx + 1}. {step}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleRemoveDraftStep(idx)}
                        className="text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => setCreateModalOpen(false)}
              className="rounded-xl"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleCreateCustom}
              disabled={savingRoadmap}
              className="rounded-xl"
            >
              {savingRoadmap ? 'Creating…' : 'Create Roadmap'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Roadmap Dialog */}
      <Dialog open={!!editingRoadmap} onOpenChange={(open) => !open && setEditingRoadmap(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display">Edit Roadmap</DialogTitle>
          </DialogHeader>

          <div className="space-y-3 py-2 text-xs">
            <div>
              <label className="font-semibold block mb-1">Title *</label>
              <Input
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                className="text-xs h-9 rounded-xl"
              />
            </div>

            <div>
              <label className="font-semibold block mb-1">Description</label>
              <Textarea
                value={editDesc}
                onChange={(e) => setEditDesc(e.target.value)}
                rows={2}
                className="text-xs rounded-xl"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="font-semibold block mb-1">Status</label>
                <Select
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value as RoadmapStatus)}
                  className="text-xs h-9 rounded-xl"
                >
                  <option value={RoadmapStatus.Active}>Active</option>
                  <option value={RoadmapStatus.Paused}>Paused</option>
                  <option value={RoadmapStatus.Completed}>Completed</option>
                  <option value={RoadmapStatus.Archived}>Archived</option>
                </Select>
              </div>

              <div>
                <label className="font-semibold block mb-1">Target Date</label>
                <Input
                  type="date"
                  value={editTargetDate}
                  onChange={(e) => setEditTargetDate(e.target.value)}
                  className="text-xs h-9 rounded-xl"
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingRoadmap(null)} className="rounded-xl">
              Cancel
            </Button>
            <Button onClick={handleSaveEdit} className="rounded-xl">
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!roadmapToDelete} onOpenChange={(open) => !open && setRoadmapToDelete(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-display text-destructive flex items-center gap-2">
              <Trash2 className="size-4" /> Delete Roadmap?
            </DialogTitle>
          </DialogHeader>
          <p className="text-xs text-muted-foreground">
            Are you sure you want to delete &quot;{roadmapToDelete?.title}&quot; and all of its
            milestones? This action cannot be undone.
          </p>
          <DialogFooter className="gap-2 sm:gap-0 mt-2">
            <Button variant="outline" onClick={() => setRoadmapToDelete(null)} className="rounded-xl">
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleConfirmDelete} className="rounded-xl">
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
