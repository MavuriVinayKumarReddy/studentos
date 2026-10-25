import { useCallback, useEffect, useRef, useState } from 'react'
import { Pause, Play, RotateCcw, SkipForward } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Select } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'
import type { Subject } from '@/types'

type Phase = 'focus' | 'shortBreak' | 'longBreak'

const STORAGE_KEY = 'studentos-pomodoro-state'

const DEFAULTS = {
  focus: 25 * 60,
  shortBreak: 5 * 60,
  longBreak: 15 * 60,
}

interface PersistedTimer {
  phase: Phase
  secondsLeft: number
  running: boolean
  completedFocus: number
  subjectId: string
  updatedAt: number
}

function formatTime(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60)
  const s = totalSeconds % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

interface PomodoroTimerProps {
  subjects?: Subject[]
  focusMinutes?: number
  onComplete?: (payload: {
    phase: Phase
    durationMinutes: number
    subjectId: string | null
  }) => void
  className?: string
}

export function PomodoroTimer({
  subjects = [],
  focusMinutes,
  onComplete,
  className,
}: PomodoroTimerProps) {
  const focusSecs = (focusMinutes ?? 25) * 60
  const restored = useRef<PersistedTimer | null>(null)
  if (restored.current === null && typeof window !== 'undefined') {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      restored.current = raw ? (JSON.parse(raw) as PersistedTimer) : null
      if (restored.current) {
        const elapsed = Math.floor((Date.now() - restored.current.updatedAt) / 1000)
        if (restored.current.running && elapsed > 0) {
          restored.current.secondsLeft = Math.max(0, restored.current.secondsLeft - elapsed)
        }
      }
    } catch {
      restored.current = null
    }
  }
  const r = restored.current
  const [phase, setPhase] = useState<Phase>(r?.phase ?? 'focus')
  const [secondsLeft, setSecondsLeft] = useState(r?.secondsLeft ?? focusSecs)
  const [running, setRunning] = useState(Boolean(r?.running && (r?.secondsLeft ?? 0) > 0))
  const [completedFocus, setCompletedFocus] = useState(r?.completedFocus ?? 0)
  const [subjectId, setSubjectId] = useState(r?.subjectId ?? '')
  const tickRef = useRef<number | null>(null)

  useEffect(() => {
    const payload: PersistedTimer = {
      phase,
      secondsLeft,
      running,
      completedFocus,
      subjectId,
      updatedAt: Date.now(),
    }
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(payload))
    } catch {
      /* ignore */
    }
  }, [phase, secondsLeft, running, completedFocus, subjectId])

  const phaseDuration =
    phase === 'focus'
      ? focusSecs
      : phase === 'shortBreak'
        ? DEFAULTS.shortBreak
        : DEFAULTS.longBreak

  const resetPhase = useCallback(
    (next: Phase) => {
      setPhase(next)
      setSecondsLeft(
        next === 'focus'
          ? focusSecs
          : next === 'shortBreak'
            ? DEFAULTS.shortBreak
            : DEFAULTS.longBreak,
      )
      setRunning(false)
    },
    [focusSecs],
  )

  useEffect(() => {
    if (!running) {
      if (tickRef.current) window.clearInterval(tickRef.current)
      return
    }
    tickRef.current = window.setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          window.clearInterval(tickRef.current!)
          setRunning(false)
          return 0
        }
        return prev - 1
      })
    }, 1000)
    return () => {
      if (tickRef.current) window.clearInterval(tickRef.current)
    }
  }, [running])

  useEffect(() => {
    if (secondsLeft !== 0 || running) return
    const minutes = Math.round(phaseDuration / 60)
    onComplete?.({
      phase,
      durationMinutes: minutes,
      subjectId: subjectId || null,
    })
    if (phase === 'focus') {
      const nextCount = completedFocus + 1
      setCompletedFocus(nextCount)
      resetPhase(nextCount % 4 === 0 ? 'longBreak' : 'shortBreak')
    } else {
      resetPhase('focus')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- fire once when timer hits 0
  }, [secondsLeft])

  const progress =
    phaseDuration === 0
      ? 0
      : Math.round(((phaseDuration - secondsLeft) / phaseDuration) * 100)

  const phaseLabel =
    phase === 'focus'
      ? 'Focus'
      : phase === 'shortBreak'
        ? 'Short break'
        : 'Long break'

  const accent =
    phase === 'focus'
      ? 'from-indigo-500 to-violet-600'
      : phase === 'shortBreak'
        ? 'from-emerald-400 to-teal-500'
        : 'from-sky-400 to-blue-500'

  return (
    <div
      className={cn(
        'mx-auto flex w-full max-w-md flex-col items-center rounded-3xl border border-border/60 bg-card p-6 shadow-card',
        className,
      )}
    >
      <div
        className={cn(
          'mb-4 rounded-full bg-gradient-to-r px-4 py-1 text-xs font-semibold text-white',
          accent,
        )}
      >
        {phaseLabel} · Session {completedFocus + (phase === 'focus' ? 1 : 0)}
      </div>

      <p
        className="font-display text-6xl font-extrabold tracking-tight text-[var(--heading,#1E3A5F)] tabular-nums dark:text-foreground"
        aria-live="polite"
      >
        {formatTime(secondsLeft)}
      </p>

      <Progress
        value={progress}
        className="mt-6 h-2 w-full"
        indicatorClassName={
          phase === 'focus'
            ? 'bg-indigo-500'
            : phase === 'shortBreak'
              ? 'bg-emerald-500'
              : 'bg-sky-500'
        }
      />

      {subjects.length > 0 ? (
        <div className="mt-5 w-full space-y-1.5">
          <Label className="text-xs text-muted-foreground">Link subject</Label>
          <Select
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
      ) : null}

      <div className="mt-6 flex items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="icon"
          aria-label="Reset"
          onClick={() => resetPhase(phase)}
        >
          <RotateCcw className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          size="lg"
          className="min-w-[8rem] rounded-2xl"
          onClick={() => setRunning((r) => !r)}
        >
          {running ? (
            <>
              <Pause className="h-5 w-5" /> Pause
            </>
          ) : (
            <>
              <Play className="h-5 w-5" /> Start
            </>
          )}
        </Button>
        <Button
          type="button"
          variant="outline"
          size="icon"
          aria-label="Skip phase"
          onClick={() => {
            if (phase === 'focus') {
              const next = completedFocus + 1
              setCompletedFocus(next)
              resetPhase(next % 4 === 0 ? 'longBreak' : 'shortBreak')
            } else {
              resetPhase('focus')
            }
          }}
        >
          <SkipForward className="h-4 w-4" />
        </Button>
      </div>

      <div className="mt-4 flex gap-2">
        {(['focus', 'shortBreak', 'longBreak'] as Phase[]).map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => resetPhase(p)}
            className={cn(
              'rounded-full px-3 py-1 text-[11px] font-medium transition',
              phase === p
                ? 'bg-primary/15 text-primary'
                : 'text-muted-foreground hover:bg-muted',
            )}
          >
            {p === 'focus' ? 'Focus' : p === 'shortBreak' ? 'Break' : 'Long'}
          </button>
        ))}
      </div>
    </div>
  )
}
