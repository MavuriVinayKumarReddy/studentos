/** Shared entity base — every persisted record includes these fields. */
export interface BaseEntity {
  id: string
  userId: string
  createdAt: string
  updatedAt: string
}

/* -------------------------------------------------------------------------- */
/* Enums (const objects — compatible with erasableSyntaxOnly)                 */
/* -------------------------------------------------------------------------- */

export const TaskType = {
  Assignment: 'Assignment',
  Exam: 'Exam',
  Quiz: 'Quiz',
  Project: 'Project',
  Lab: 'Lab',
  Presentation: 'Presentation',
  Reading: 'Reading',
  Personal: 'Personal',
  DSAPractice: 'DSA Practice',
  Course: 'Course',
  Other: 'Other',
} as const
export type TaskType = (typeof TaskType)[keyof typeof TaskType]

export const Priority = {
  Low: 'Low',
  Medium: 'Medium',
  High: 'High',
  Urgent: 'Urgent',
} as const
export type Priority = (typeof Priority)[keyof typeof Priority]

export const TaskStatus = {
  NotStarted: 'Not Started',
  InProgress: 'In Progress',
  Completed: 'Completed',
} as const
export type TaskStatus = (typeof TaskStatus)[keyof typeof TaskStatus]

export const DsaStatus = {
  ToSolve: 'To Solve',
  Attempted: 'Attempted',
  Solved: 'Solved',
  Revisit: 'Revisit',
} as const
export type DsaStatus = (typeof DsaStatus)[keyof typeof DsaStatus]

export const ProjectStatus = {
  Planning: 'Planning',
  InProgress: 'In Progress',
  OnHold: 'On Hold',
  Completed: 'Completed',
  Archived: 'Archived',
} as const
export type ProjectStatus = (typeof ProjectStatus)[keyof typeof ProjectStatus]

export const MilestoneStatus = {
  NotStarted: 'Not Started',
  InProgress: 'In Progress',
  Completed: 'Completed',
} as const
export type MilestoneStatus = (typeof MilestoneStatus)[keyof typeof MilestoneStatus]

export const RoadmapStatus = {
  Active: 'Active',
  Paused: 'Paused',
  Completed: 'Completed',
  Archived: 'Archived',
} as const
export type RoadmapStatus = (typeof RoadmapStatus)[keyof typeof RoadmapStatus]

export const ResourceType = {
  Video: 'Video',
  Article: 'Article',
  Course: 'Course',
  Book: 'Book',
  Doc: 'Documentation',
  Practice: 'Practice',
  Other: 'Other',
} as const
export type ResourceType = (typeof ResourceType)[keyof typeof ResourceType]

export const NotificationType = {
  Reminder: 'Reminder',
  Deadline: 'Deadline',
  Streak: 'Streak',
  Achievement: 'Achievement',
  System: 'System',
} as const
export type NotificationType = (typeof NotificationType)[keyof typeof NotificationType]

export const ReminderChannel = {
  InApp: 'InApp',
  Push: 'Push',
  Email: 'Email',
} as const
export type ReminderChannel = (typeof ReminderChannel)[keyof typeof ReminderChannel]

export const RecurrenceFrequency = {
  Daily: 'Daily',
  Weekly: 'Weekly',
  BiWeekly: 'BiWeekly',
  Monthly: 'Monthly',
  Custom: 'Custom',
} as const
export type RecurrenceFrequency =
  (typeof RecurrenceFrequency)[keyof typeof RecurrenceFrequency]

export const DsaDifficulty = {
  Easy: 'Easy',
  Medium: 'Medium',
  Hard: 'Hard',
} as const
export type DsaDifficulty = (typeof DsaDifficulty)[keyof typeof DsaDifficulty]

export const StudySessionType = {
  Focus: 'Focus',
  Review: 'Review',
  Practice: 'Practice',
  Lecture: 'Lecture',
  Other: 'Other',
} as const
export type StudySessionType =
  (typeof StudySessionType)[keyof typeof StudySessionType]

/* -------------------------------------------------------------------------- */
/* Domain entities                                                            */
/* -------------------------------------------------------------------------- */

export interface Profile extends BaseEntity {
  displayName: string
  email?: string
  avatarUrl?: string
  major?: string
  university?: string
  year?: string
  timezone: string
  preferences?: ProfilePreferences
}

export interface ProfilePreferences {
  theme?: 'light' | 'dark' | 'system'
  weekStartsOn?: 0 | 1
  defaultReminderMinutes?: number
  focusSessionMinutes?: number
  notificationsEnabled?: boolean
}

export interface SubjectColor {
  id: string
  name: string
  from: string
  to: string
  text: string
}

export interface Subject extends BaseEntity {
  name: string
  code?: string
  colorId: string
  /** Hex / CSS gradient start */
  colorFrom: string
  /** Hex / CSS gradient end */
  colorTo: string
  instructor?: string
  credits?: number
  semester?: string
  archived?: boolean
  sortOrder?: number
}

export interface TaskSubtask {
  id: string
  title: string
  completed: boolean
  sortOrder?: number
}

export interface TaskAttachment {
  id: string
  /** References fileBlobs store id when stored locally */
  blobId?: string
  filename: string
  mimeType: string
  size: number
  url?: string
  createdAt: string
}

export interface ReminderPrefs {
  enabled: boolean
  /** Minutes before due datetime */
  offsetsMinutes: number[]
  channels?: ReminderChannel[]
}

export interface RecurrenceRule {
  frequency: RecurrenceFrequency
  interval?: number
  daysOfWeek?: number[]
  endDate?: string
  count?: number
}

export interface Task extends BaseEntity {
  title: string
  subjectId: string | null
  type: TaskType
  description?: string
  /** ISO date YYYY-MM-DD (local calendar day) */
  dueDate: string
  /** HH:mm local time */
  dueTime?: string
  priority: Priority
  status: TaskStatus
  tentative: boolean
  estimatedMinutes?: number
  reminderPrefs?: ReminderPrefs
  tags: string[]
  subtasks: TaskSubtask[]
  notes?: string
  recurrence?: RecurrenceRule
  attachments?: TaskAttachment[]
  completedAt?: string
  projectId?: string
  roadmapMilestoneId?: string
}

export interface NoteAttachment {
  id: string
  blobId?: string
  filename: string
  mimeType: string
  size: number
  url?: string
  createdAt: string
}

export interface Note extends BaseEntity {
  title: string
  content: string
  subjectId?: string | null
  taskId?: string | null
  tags: string[]
  pinned?: boolean
  attachments?: NoteAttachment[]
  folder?: string
}

export interface RoadmapMilestone {
  id: string
  title: string
  description?: string
  status: MilestoneStatus
  targetDate?: string
  completedAt?: string
  sortOrder: number
  resourceIds?: string[]
}

export interface Roadmap extends BaseEntity {
  title: string
  description?: string
  subjectId?: string | null
  status: RoadmapStatus
  targetDate?: string
  milestones: RoadmapMilestone[]
  tags: string[]
}

export interface LearningResource extends BaseEntity {
  title: string
  url?: string
  type: ResourceType
  subjectId?: string | null
  roadmapId?: string | null
  description?: string
  estimatedMinutes?: number
  completed?: boolean
  tags: string[]
}

export interface DsaProblem extends BaseEntity {
  title: string
  platform?: string
  url?: string
  difficulty: DsaDifficulty
  status: DsaStatus
  topics: string[]
  notes?: string
  attempts?: number
  solvedAt?: string
  timeSpentMinutes?: number
  tags: string[]
}

export interface ProjectMilestone {
  id: string
  title: string
  description?: string
  status: MilestoneStatus
  dueDate?: string
  completedAt?: string
  sortOrder: number
}

export interface Project extends BaseEntity {
  title: string
  description?: string
  status: ProjectStatus
  subjectId?: string | null
  startDate?: string
  targetDate?: string
  completedAt?: string
  milestones: ProjectMilestone[]
  techStack: string[]
  repoUrl?: string
  demoUrl?: string
  tags: string[]
}

export interface StudySession extends BaseEntity {
  title?: string
  subjectId?: string | null
  taskId?: string | null
  type: StudySessionType
  /** ISO datetime */
  startedAt: string
  endedAt?: string
  durationMinutes: number
  notes?: string
  focusScore?: number
}

export interface WeeklyGoal extends BaseEntity {
  /** ISO date of the Monday (or configured week start) */
  weekStart: string
  title: string
  targetMinutes?: number
  targetTasks?: number
  completedMinutes?: number
  completedTasks?: number
  notes?: string
}

export interface Reminder extends BaseEntity {
  title: string
  body?: string
  /** ISO datetime when reminder should fire */
  fireAt: string
  taskId?: string | null
  projectId?: string | null
  channels: ReminderChannel[]
  dismissed?: boolean
  fired?: boolean
}

export interface AppNotification extends BaseEntity {
  title: string
  body: string
  type: NotificationType
  read: boolean
  href?: string
  relatedId?: string
  relatedType?: string
}

/* -------------------------------------------------------------------------- */
/* File blobs (IndexedDB)                                                     */
/* -------------------------------------------------------------------------- */

export interface FileBlobRecord {
  id: string
  blob: Blob
  mimeType: string
  filename: string
  createdAt: string
}

/* -------------------------------------------------------------------------- */
/* Filter / sort helpers                                                      */
/* -------------------------------------------------------------------------- */

export type TaskSortBy =
  | 'dueDate'
  | 'priority'
  | 'urgency'
  | 'title'
  | 'createdAt'
  | 'status'

export interface TaskFilters {
  status?: TaskStatus | TaskStatus[]
  priority?: Priority | Priority[]
  type?: TaskType | TaskType[]
  subjectId?: string | null
  tags?: string[]
  search?: string
  dueBefore?: string
  dueAfter?: string
  overdueOnly?: boolean
  tentative?: boolean
  includeCompleted?: boolean
}
