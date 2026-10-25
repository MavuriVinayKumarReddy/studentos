import { Search } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { PRIORITIES, TASK_STATUSES, TASK_TYPES } from '@/lib/constants'
import { cn } from '@/lib/utils'
import type { Priority, Subject, TaskSortBy, TaskStatus, TaskType } from '@/types'

export interface TaskFilterState {
  search: string
  subjectId: string
  type: string
  priority: string
  status: string
  sortBy: TaskSortBy
}

export const DEFAULT_TASK_FILTERS: TaskFilterState = {
  search: '',
  subjectId: '',
  type: '',
  priority: '',
  status: '',
  sortBy: 'urgency',
}

interface TaskFiltersProps {
  value: TaskFilterState
  onChange: (next: TaskFilterState) => void
  subjects: Subject[]
  className?: string
  showSort?: boolean
}

export function TaskFiltersBar({
  value,
  onChange,
  subjects,
  className,
  showSort = true,
}: TaskFiltersProps) {
  const patch = (partial: Partial<TaskFilterState>) =>
    onChange({ ...value, ...partial })

  return (
    <div className={cn('space-y-3', className)}>
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={value.search}
          onChange={(e) => patch({ search: e.target.value })}
          placeholder="Search tasks…"
          className="pl-9"
          aria-label="Search tasks"
        />
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
        <div className="space-y-1">
          <Label className="text-[11px] text-muted-foreground">Subject</Label>
          <Select
            value={value.subjectId}
            onChange={(e) => patch({ subjectId: e.target.value })}
          >
            <option value="">All</option>
            {subjects.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </Select>
        </div>

        <div className="space-y-1">
          <Label className="text-[11px] text-muted-foreground">Type</Label>
          <Select
            value={value.type}
            onChange={(e) => patch({ type: e.target.value })}
          >
            <option value="">All</option>
            {TASK_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </Select>
        </div>

        <div className="space-y-1">
          <Label className="text-[11px] text-muted-foreground">Priority</Label>
          <Select
            value={value.priority}
            onChange={(e) => patch({ priority: e.target.value })}
          >
            <option value="">All</option>
            {PRIORITIES.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </Select>
        </div>

        <div className="space-y-1">
          <Label className="text-[11px] text-muted-foreground">Status</Label>
          <Select
            value={value.status}
            onChange={(e) => patch({ status: e.target.value })}
          >
            <option value="">Open</option>
            {TASK_STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
            <option value="__all">All</option>
          </Select>
        </div>

        {showSort ? (
          <div className="space-y-1">
            <Label className="text-[11px] text-muted-foreground">Sort</Label>
            <Select
              value={value.sortBy}
              onChange={(e) =>
                patch({ sortBy: e.target.value as TaskSortBy })
              }
            >
              <option value="urgency">Urgency</option>
              <option value="dueDate">Due date</option>
              <option value="priority">Priority</option>
              <option value="title">Title</option>
              <option value="createdAt">Created</option>
              <option value="status">Status</option>
            </Select>
          </div>
        ) : null}
      </div>
    </div>
  )
}

/** Map UI filter state into task-logic filters. */
export function toTaskLogicFilters(value: TaskFilterState) {
  const includeCompleted =
    value.status === 'Completed' ||
    value.status === '__all' ||
    Boolean(value.status)

  return {
    search: value.search || undefined,
    subjectId: value.subjectId || undefined,
    type: (value.type || undefined) as TaskType | undefined,
    priority: (value.priority || undefined) as Priority | undefined,
    status:
      value.status && value.status !== '__all'
        ? (value.status as TaskStatus)
        : undefined,
    includeCompleted:
      value.status === '__all' || value.status === 'Completed'
        ? true
        : value.status
          ? includeCompleted
          : false,
  }
}

/** @deprecated Use TaskFiltersBar — kept as named export for imports expecting TaskFilters */
export { TaskFiltersBar as TaskFilters }
