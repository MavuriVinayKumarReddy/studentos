import { useMemo, useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { useAppData } from '@/context/AppDataContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Progress } from '@/components/ui/progress'
import { EmptyState } from '@/components/ui/empty-state'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { toLocalDateString, getWeekStart } from '@/lib/dates'
import {
  DsaDifficulty,
  DsaStatus,
  MilestoneStatus,
  ProjectStatus,
  ResourceType,
  RoadmapStatus,
} from '@/types'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

type Tab = 'roadmaps' | 'dsa' | 'courses' | 'projects' | 'goals'

const STARTER_ROADMAPS = [
  'Data Structures and Algorithms',
  'C++ and OOP',
  'Python',
  'Web Development',
  'Machine Learning',
  'Generative AI',
  'System Design',
  'Interview Preparation',
]

export function GrowthPage() {
  const {
    userId,
    roadmaps,
    dsaProblems,
    resources,
    projects,
    goals,
    createRoadmap,
    updateRoadmap,
    deleteRoadmap,
    createDsaProblem,
    updateDsaProblem,
    deleteDsaProblem,
    createResource,
    updateResource,
    deleteResource,
    createProject,
    updateProject,
    deleteProject,
    createGoal,
    updateGoal,
    deleteGoal,
  } = useAppData()
  const [tab, setTab] = useState<Tab>('roadmaps')

  const dsaStats = useMemo(() => {
    const solved = dsaProblems.filter((p) => p.status === 'Solved').length
    const attempted = dsaProblems.filter((p) => p.status === 'Attempted').length
    const revisit = dsaProblems.filter((p) => p.status === 'Revisit').length
    return { solved, attempted, revisit, total: dsaProblems.length }
  }, [dsaProblems])

  const weekStart = toLocalDateString(getWeekStart(new Date(), 1))

  return (
    <div className="mx-auto max-w-5xl space-y-4 pb-8">
      <div>
        <h1 className="font-display text-2xl font-bold text-[var(--navy)] dark:text-foreground">
          Growth
        </h1>
        <p className="text-sm text-muted-foreground">
          Roadmaps, DSA practice, courses, projects, and weekly goals
        </p>
      </div>

      <div className="flex gap-1 overflow-x-auto rounded-2xl bg-card p-1 shadow-sm">
        {(
          [
            ['roadmaps', 'Roadmaps'],
            ['dsa', 'DSA'],
            ['courses', 'Courses'],
            ['projects', 'Projects'],
            ['goals', 'Goals'],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={cn(
              'shrink-0 rounded-xl px-3 py-2 text-sm font-medium',
              tab === id ? 'bg-primary text-white' : 'text-muted-foreground hover:bg-muted',
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === 'roadmaps' && (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <Button
              onClick={async () => {
                const title = prompt('Roadmap title')
                if (!title?.trim()) return
                await createRoadmap({
                  userId,
                  title: title.trim(),
                  description: '',
                  status: RoadmapStatus.Active,
                  milestones: [
                    {
                      id: crypto.randomUUID(),
                      title: 'Getting started',
                      status: MilestoneStatus.NotStarted,
                      sortOrder: 0,
                    },
                  ],
                  tags: [],
                })
                toast.success('Roadmap created')
              }}
            >
              <Plus className="size-4" /> Custom roadmap
            </Button>
            {STARTER_ROADMAPS.map((name) => (
              <Button
                key={name}
                variant="outline"
                size="sm"
                onClick={async () => {
                  await createRoadmap({
                    userId,
                    title: name,
                    description: `Starter roadmap for ${name}`,
                    status: RoadmapStatus.Active,
                    milestones: ['Basics', 'Practice', 'Projects', 'Review'].map((t, i) => ({
                      id: crypto.randomUUID(),
                      title: t,
                      status: MilestoneStatus.NotStarted,
                      sortOrder: i,
                    })),
                    tags: ['starter'],
                  })
                  toast.success(`Added ${name}`)
                }}
              >
                + {name}
              </Button>
            ))}
          </div>
          {roadmaps.length === 0 ? (
            <EmptyState title="No roadmaps" description="Add a starter or create your own." />
          ) : (
            roadmaps.map((r) => {
              const done = r.milestones.filter((m) => m.status === 'Completed').length
              const pct = r.milestones.length
                ? Math.round((done / r.milestones.length) * 100)
                : 0
              return (
                <Card key={r.id}>
                  <CardHeader className="flex-row items-start justify-between gap-2 space-y-0">
                    <div>
                      <CardTitle>{r.title}</CardTitle>
                      <p className="mt-1 text-sm text-muted-foreground">{r.description}</p>
                    </div>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={async () => {
                        if (!confirm('Delete roadmap?')) return
                        await deleteRoadmap(r.id)
                      }}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <Progress value={pct} />
                    <p className="text-xs text-muted-foreground">
                      {pct}% · {done}/{r.milestones.length} milestones
                    </p>
                    <ul className="space-y-2">
                      {r.milestones.map((m) => (
                        <li key={m.id} className="flex items-center gap-2 text-sm">
                          <input
                            type="checkbox"
                            checked={m.status === 'Completed'}
                            onChange={() =>
                              updateRoadmap(r.id, {
                                milestones: r.milestones.map((x) =>
                                  x.id === m.id
                                    ? {
                                        ...x,
                                        status:
                                          x.status === 'Completed'
                                            ? MilestoneStatus.NotStarted
                                            : MilestoneStatus.Completed,
                                        completedAt:
                                          x.status === 'Completed'
                                            ? undefined
                                            : new Date().toISOString(),
                                      }
                                    : x,
                                ),
                              })
                            }
                          />
                          <span className={m.status === 'Completed' ? 'line-through' : ''}>
                            {m.title}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              )
            })
          )}
        </div>
      )}

      {tab === 'dsa' && (
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-2">
            <Stat label="Solved" value={dsaStats.solved} />
            <Stat label="Attempted" value={dsaStats.attempted} />
            <Stat label="Revisit" value={dsaStats.revisit} />
          </div>
          <DsaForm
            onSubmit={async (data) => {
              await createDsaProblem({ userId, ...data })
              toast.success('Problem added')
            }}
          />
          {dsaProblems.length === 0 ? (
            <EmptyState title="No DSA problems tracked" />
          ) : (
            <ul className="space-y-2">
              {dsaProblems.map((p) => (
                <li
                  key={p.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-2xl bg-card p-3 shadow-sm"
                >
                  <div>
                    <p className="font-medium">
                      {p.url ? (
                        <a href={p.url} target="_blank" rel="noreferrer" className="hover:text-primary">
                          {p.title}
                        </a>
                      ) : (
                        p.title
                      )}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {p.platform || '—'} · {p.difficulty} · {p.topics.join(', ') || 'general'}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Select
                      value={p.status}
                      onChange={(e) =>
                        updateDsaProblem(p.id, {
                          status: e.target.value as typeof p.status,
                          solvedAt:
                            e.target.value === 'Solved' ? new Date().toISOString() : p.solvedAt,
                        })
                      }
                    >
                      {Object.values(DsaStatus).map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </Select>
                    <Button size="icon" variant="ghost" onClick={() => deleteDsaProblem(p.id)}>
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {tab === 'courses' && (
        <div className="space-y-4">
          <Button
            onClick={async () => {
              const title = prompt('Course / resource name')
              if (!title?.trim()) return
              const url = prompt('URL (optional)') || undefined
              await createResource({
                userId,
                title: title.trim(),
                url,
                type: ResourceType.Course,
                tags: [],
                completed: false,
              })
              toast.success('Saved')
            }}
          >
            <Plus className="size-4" /> Add course / resource
          </Button>
          {resources.length === 0 ? (
            <EmptyState title="No courses saved" />
          ) : (
            resources.map((r) => (
              <Card key={r.id}>
                <CardContent className="flex items-center justify-between gap-3 pt-5">
                  <div>
                    <p className="font-medium">{r.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {r.type}
                      {r.url ? (
                        <>
                          {' · '}
                          <a href={r.url} className="text-primary" target="_blank" rel="noreferrer">
                            Open
                          </a>
                        </>
                      ) : null}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant={r.completed ? 'secondary' : 'outline'}
                      onClick={() => updateResource(r.id, { completed: !r.completed })}
                    >
                      {r.completed ? 'Done' : 'Mark done'}
                    </Button>
                    <Button size="icon" variant="ghost" onClick={() => deleteResource(r.id)}>
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      )}

      {tab === 'projects' && (
        <div className="space-y-4">
          <Button
            onClick={async () => {
              const title = prompt('Project name')
              if (!title?.trim()) return
              await createProject({
                userId,
                title: title.trim(),
                description: '',
                status: ProjectStatus.Planning,
                milestones: [],
                techStack: [],
                tags: [],
              })
              toast.success('Project created')
            }}
          >
            <Plus className="size-4" /> New project
          </Button>
          {projects.length === 0 ? (
            <EmptyState title="No projects yet" />
          ) : (
            projects.map((p) => (
              <Card key={p.id}>
                <CardHeader className="flex-row items-start justify-between space-y-0">
                  <div>
                    <CardTitle>{p.title}</CardTitle>
                    <p className="text-sm text-muted-foreground">{p.description || 'No description'}</p>
                  </div>
                  <Button size="icon" variant="ghost" onClick={() => deleteProject(p.id)}>
                    <Trash2 className="size-4" />
                  </Button>
                </CardHeader>
                <CardContent className="space-y-2">
                  <Select
                    value={p.status}
                    onChange={(e) =>
                      updateProject(p.id, { status: e.target.value as typeof p.status })
                    }
                  >
                    {Object.values(ProjectStatus).map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </Select>
                  <Input
                    placeholder="GitHub URL"
                    defaultValue={p.repoUrl ?? ''}
                    onBlur={(e) => updateProject(p.id, { repoUrl: e.target.value || undefined })}
                  />
                  <Input
                    placeholder="Demo URL"
                    defaultValue={p.demoUrl ?? ''}
                    onBlur={(e) => updateProject(p.id, { demoUrl: e.target.value || undefined })}
                  />
                  <Input
                    placeholder="Tech stack (comma separated)"
                    defaultValue={p.techStack.join(', ')}
                    onBlur={(e) =>
                      updateProject(p.id, {
                        techStack: e.target.value
                          .split(',')
                          .map((x) => x.trim())
                          .filter(Boolean),
                      })
                    }
                  />
                </CardContent>
              </Card>
            ))
          )}
        </div>
      )}

      {tab === 'goals' && (
        <div className="space-y-4">
          <Button
            onClick={async () => {
              const title = prompt('Weekly goal (e.g. Solve 10 DSA problems)')
              if (!title?.trim()) return
              await createGoal({
                userId,
                weekStart,
                title: title.trim(),
                targetTasks: 10,
                completedTasks: 0,
                targetMinutes: 0,
                completedMinutes: 0,
              })
              toast.success('Goal added')
            }}
          >
            <Plus className="size-4" /> Add weekly goal
          </Button>
          {goals.filter((g) => g.weekStart === weekStart).length === 0 ? (
            <EmptyState title="No goals this week" />
          ) : (
            goals
              .filter((g) => g.weekStart === weekStart)
              .map((g) => {
                const target = g.targetTasks || 1
                const pct = Math.min(100, Math.round(((g.completedTasks || 0) / target) * 100))
                return (
                  <Card key={g.id}>
                    <CardContent className="space-y-3 pt-5">
                      <div className="flex justify-between gap-2">
                        <p className="font-medium">{g.title}</p>
                        <Button size="icon" variant="ghost" onClick={() => deleteGoal(g.id)}>
                          <Trash2 className="size-4" />
                        </Button>
                      </div>
                      <Progress value={pct} />
                      <div className="flex items-center gap-2 text-sm">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            updateGoal(g.id, {
                              completedTasks: Math.max(0, (g.completedTasks || 0) - 1),
                            })
                          }
                        >
                          −
                        </Button>
                        <span>
                          {g.completedTasks || 0} / {g.targetTasks || 0}
                        </span>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            updateGoal(g.id, {
                              completedTasks: (g.completedTasks || 0) + 1,
                            })
                          }
                        >
                          +
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )
              })
          )}
        </div>
      )}
    </div>
  )
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl bg-card p-3 text-center shadow-sm">
      <p className="font-display text-xl font-bold">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  )
}

function DsaForm({
  onSubmit,
}: {
  onSubmit: (data: {
    title: string
    platform?: string
    url?: string
    difficulty: (typeof DsaDifficulty)[keyof typeof DsaDifficulty]
    status: (typeof DsaStatus)[keyof typeof DsaStatus]
    topics: string[]
    tags: string[]
  }) => Promise<void>
}) {
  const [title, setTitle] = useState('')
  const [platform, setPlatform] = useState('LeetCode')
  const [url, setUrl] = useState('')
  const [difficulty, setDifficulty] = useState<(typeof DsaDifficulty)[keyof typeof DsaDifficulty]>(
    DsaDifficulty.Easy,
  )
  const [topics, setTopics] = useState('')

  return (
    <form
      className="space-y-2 rounded-2xl bg-card p-4 shadow-sm"
      onSubmit={async (e) => {
        e.preventDefault()
        if (!title.trim()) return
        await onSubmit({
          title: title.trim(),
          platform,
          url: url || undefined,
          difficulty,
          status: DsaStatus.ToSolve,
          topics: topics
            .split(',')
            .map((t) => t.trim())
            .filter(Boolean),
          tags: [],
        })
        setTitle('')
        setUrl('')
        setTopics('')
      }}
    >
      <Input placeholder="Problem name" value={title} onChange={(e) => setTitle(e.target.value)} />
      <div className="grid gap-2 sm:grid-cols-3">
        <Input placeholder="Platform" value={platform} onChange={(e) => setPlatform(e.target.value)} />
        <Input placeholder="URL" value={url} onChange={(e) => setUrl(e.target.value)} />
        <Select
          value={difficulty}
          onChange={(e) =>
            setDifficulty(e.target.value as (typeof DsaDifficulty)[keyof typeof DsaDifficulty])
          }
        >
          {Object.values(DsaDifficulty).map((d) => (
            <option key={d} value={d}>
              {d}
            </option>
          ))}
        </Select>
      </div>
      <Input
        placeholder="Topics (comma separated)"
        value={topics}
        onChange={(e) => setTopics(e.target.value)}
      />
      <Button type="submit">
        <Plus className="size-4" /> Add problem
      </Button>
    </form>
  )
}
