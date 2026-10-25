import { useMemo } from 'react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { format, parseISO, subDays } from 'date-fns'
import { useAppData } from '@/context/AppDataContext'
import { PomodoroTimer } from '@/components/study-timer/PomodoroTimer'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/empty-state'
import { StudySessionType } from '@/types'
import { toLocalDateString } from '@/lib/dates'
import { toast } from 'sonner'

export function StudyPage() {
  const { subjects, sessions, createSession, userId, getSubject } = useAppData()

  const last7 = useMemo(() => {
    const days = Array.from({ length: 7 }, (_, i) => {
      const d = subDays(new Date(), 6 - i)
      const key = toLocalDateString(d)
      const minutes = sessions
        .filter((s) => toLocalDateString(parseISO(s.startedAt)) === key)
        .reduce((sum, s) => sum + (s.durationMinutes || 0), 0)
      return { day: format(d, 'EEE'), minutes, key }
    })
    return days
  }, [sessions])

  const bySubject = useMemo(() => {
    const map = new Map<string, number>()
    for (const s of sessions) {
      const id = s.subjectId || 'none'
      map.set(id, (map.get(id) || 0) + (s.durationMinutes || 0))
    }
    return [...map.entries()].map(([id, minutes]) => ({
      name: id === 'none' ? 'General' : getSubject(id)?.name || 'Unknown',
      minutes,
    }))
  }, [sessions, getSubject])

  const weekMinutes = last7.reduce((s, d) => s + d.minutes, 0)

  return (
    <div className="mx-auto max-w-5xl space-y-6 pb-8">
      <div>
        <h1 className="font-display text-2xl font-bold">Study</h1>
        <p className="text-sm text-muted-foreground">
          Pomodoro focus timer and session history · {weekMinutes} min this week
        </p>
      </div>

      <PomodoroTimer
        subjects={subjects}
        onComplete={async ({ phase, durationMinutes, subjectId }) => {
          if (phase !== 'focus') return
          await createSession({
            userId,
            title: 'Pomodoro focus',
            subjectId,
            type: StudySessionType.Focus,
            startedAt: new Date(Date.now() - durationMinutes * 60_000).toISOString(),
            endedAt: new Date().toISOString(),
            durationMinutes,
          })
          toast.success(`Logged ${durationMinutes} min study session`)
        }}
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Weekly study minutes</CardTitle>
          </CardHeader>
          <CardContent className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={last7}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="day" tickLine={false} />
                <YAxis allowDecimals={false} width={32} />
                <Tooltip />
                <Bar dataKey="minutes" fill="#4F46E5" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">By subject</CardTitle>
          </CardHeader>
          <CardContent className="h-56">
            {bySubject.length === 0 ? (
              <EmptyState title="No sessions yet" />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={bySubject} layout="vertical" margin={{ left: 24 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                  <XAxis type="number" allowDecimals={false} />
                  <YAxis type="category" dataKey="name" width={90} tickLine={false} />
                  <Tooltip />
                  <Bar dataKey="minutes" fill="#6366F1" radius={[0, 8, 8, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      <section className="space-y-2">
        <h2 className="font-display font-semibold">Session history</h2>
        {sessions.length === 0 ? (
          <EmptyState title="Complete a focus session to see history" />
        ) : (
          <ul className="space-y-2">
            {[...sessions]
              .sort((a, b) => b.startedAt.localeCompare(a.startedAt))
              .slice(0, 20)
              .map((s) => (
                <li
                  key={s.id}
                  className="flex items-center justify-between rounded-xl bg-card px-3 py-2 text-sm shadow-sm"
                >
                  <div>
                    <p className="font-medium">{s.title || s.type}</p>
                    <p className="text-xs text-muted-foreground">
                      {format(parseISO(s.startedAt), 'MMM d · h:mm a')}
                      {s.subjectId ? ` · ${getSubject(s.subjectId)?.name ?? ''}` : ''}
                    </p>
                  </div>
                  <span className="font-semibold text-primary">{s.durationMinutes} min</span>
                </li>
              ))}
          </ul>
        )}
      </section>
    </div>
  )
}
