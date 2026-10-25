import { useMemo, useState } from 'react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { addDays, format, parseISO, subDays } from 'date-fns'
import { useAppData } from '@/context/AppDataContext'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { getCompletionPercentage } from '@/lib/task-logic'
import { isOverdue, toLocalDateString } from '@/lib/dates'

const COLORS = ['#4F46E5', '#06B6D4', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899']

export function AnalyticsPage() {
  const { tasks, subjects, sessions, dsaProblems, roadmaps, goals, getSubject } = useAppData()
  const [from, setFrom] = useState(toLocalDateString(subDays(new Date(), 30)))
  const [to, setTo] = useState(toLocalDateString())

  const inRange = (isoDate: string) => {
    const d = isoDate.slice(0, 10)
    return d >= from && d <= to
  }

  const rangeTasks = useMemo(
    () => tasks.filter((t) => inRange(t.dueDate) || (t.completedAt && inRange(t.completedAt))),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [tasks, from, to],
  )

  const completed = rangeTasks.filter((t) => t.status === 'Completed')
  const pending = tasks.filter((t) => t.status !== 'Completed')
  const overdue = pending.filter((t) => isOverdue(t.dueDate, t.dueTime))
  const onTime = completed.filter((t) => {
    if (!t.completedAt) return true
    return t.completedAt.slice(0, 10) <= t.dueDate
  }).length
  const onTimeRate = completed.length
    ? Math.round((onTime / completed.length) * 100)
    : 0

  const bySubject = subjects.map((s) => ({
    name: s.code || s.name,
    value: tasks.filter((t) => t.subjectId === s.id).length,
    color: s.colorFrom,
  })).filter((x) => x.value > 0)

  const weeklyHours = useMemo(() => {
    const days = Array.from({ length: 8 }, (_, i) => {
      const start = subDays(new Date(), (7 - i) * 7)
      const end = addDays(start, 6)
      const key = format(start, 'MMM d')
      const minutes = sessions
        .filter((s) => {
          const d = s.startedAt.slice(0, 10)
          return d >= toLocalDateString(start) && d <= toLocalDateString(end)
        })
        .reduce((sum, s) => sum + s.durationMinutes, 0)
      return { week: key, hours: Math.round((minutes / 60) * 10) / 10 }
    })
    return days
  }, [sessions])

  const productivityTrend = useMemo(() => {
    return Array.from({ length: 12 }, (_, i) => {
      const d = subDays(new Date(), 11 - i)
      const key = toLocalDateString(d)
      const count = tasks.filter(
        (t) => t.completedAt && toLocalDateString(parseISO(t.completedAt)) === key,
      ).length
      return { day: format(d, 'MMM d'), completed: count }
    })
  }, [tasks])

  const roadmapPct = roadmaps.length
    ? Math.round(
        roadmaps.reduce((sum, r) => {
          const done = r.milestones.filter((m) => m.status === 'Completed').length
          return sum + (r.milestones.length ? done / r.milestones.length : 0)
        }, 0) /
          roadmaps.length *
          100,
      )
    : 0

  const dsaSolved = dsaProblems.filter((p) => p.status === 'Solved').length
  const goalsDone = goals.filter(
    (g) => (g.targetTasks || 0) > 0 && (g.completedTasks || 0) >= (g.targetTasks || 0),
  ).length

  return (
    <div className="mx-auto max-w-5xl space-y-4 pb-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold">Analytics</h1>
          <p className="text-sm text-muted-foreground">Based on your saved data only</p>
        </div>
        <div className="flex gap-2">
          <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Metric label="Completed" value={String(completed.length)} />
        <Metric label="Pending" value={String(pending.length)} />
        <Metric label="Overdue" value={String(overdue.length)} />
        <Metric label="On-time rate" value={`${onTimeRate}%`} />
        <Metric label="Overall completion" value={`${getCompletionPercentage(tasks)}%`} />
        <Metric label="Roadmaps" value={`${roadmapPct}%`} />
        <Metric label="DSA solved" value={String(dsaSolved)} />
        <Metric label="Goals hit" value={String(goalsDone)} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Subject distribution</CardTitle>
          </CardHeader>
          <CardContent className="h-56">
            {bySubject.length === 0 ? (
              <p className="text-sm text-muted-foreground">No tasks yet</p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={bySubject} dataKey="value" nameKey="name" outerRadius={80} label>
                    {bySubject.map((entry, i) => (
                      <Cell key={entry.name} fill={entry.color || COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Weekly study hours</CardTitle>
          </CardHeader>
          <CardContent className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={weeklyHours}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="week" hide />
                <YAxis width={28} />
                <Tooltip />
                <Bar dataKey="hours" fill="#4F46E5" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Productivity trend (tasks completed / day)</CardTitle>
          </CardHeader>
          <CardContent className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={productivityTrend}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="day" tick={{ fontSize: 11 }} />
                <YAxis allowDecimals={false} width={28} />
                <Tooltip />
                <Line type="monotone" dataKey="completed" stroke="#4F46E5" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <p className="text-xs text-muted-foreground">
        Subject colors: {subjects.slice(0, 3).map((s) => getSubject(s.id)?.name).filter(Boolean).join(', ')}
        …
      </p>
    </div>
  )
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-card p-3 shadow-sm">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="font-display text-xl font-bold">{value}</p>
    </div>
  )
}
