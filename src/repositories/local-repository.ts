import { DEMO_USER_ID, MAX_FILE_SIZE } from '@/lib/constants'
import { getDB } from '@/repositories/db'
import type {
  AppNotification,
  AttendanceRecord,
  DsaProblem,
  FileBlobRecord,
  LearningResource,
  Note,
  NoteAttachment,
  Profile,
  Project,
  Reminder,
  Roadmap,
  StudySession,
  Subject,
  Task,
  TaskAttachment,
  WeeklyGoal,
} from '@/types'
import {
  DsaDifficulty,
  DsaStatus,
  NotificationType,
  ProjectStatus,
  ReminderChannel,
  ResourceType,
  RoadmapStatus,
  StudySessionType,
  TaskStatus,
} from '@/types'

type CreateInput<T extends { id: string; createdAt: string; updatedAt: string }> =
  Omit<T, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }

function nowIso(): string {
  return new Date().toISOString()
}

function newId(): string {
  return crypto.randomUUID()
}

function withTimestamps<T extends object>(
  data: T & { createdAt?: string; updatedAt?: string },
  isNew: boolean,
): T & { createdAt: string; updatedAt: string } {
  const ts = nowIso()
  return {
    ...data,
    createdAt: isNew ? (data.createdAt ?? ts) : (data.createdAt as string),
    updatedAt: ts,
  }
}

async function getMeta<T>(key: string): Promise<T | undefined> {
  const db = await getDB()
  const row = await db.get('meta', key)
  return row?.value as T | undefined
}

async function setMeta(key: string, value: unknown): Promise<void> {
  const db = await getDB()
  await db.put('meta', { key, value })
}

export class LocalRepository {
  private seedPromise: Promise<void> | null = null

  /** Ensure demo data exists on first launch. */
  async ensureSeeded(userId = DEMO_USER_ID): Promise<void> {
    if (!this.seedPromise) {
      this.seedPromise = this.seedIfEmpty(userId).finally(() => {
        this.seedPromise = null
      })
    }
    return this.seedPromise
  }

  private async seedIfEmpty(userId: string): Promise<void> {
    const initialized =
      (await getMeta<boolean>('first-run-initialized')) ||
      (await getMeta<boolean>('seeded'))
    if (initialized) {
      // Clean up legacy template sample items for existing installs without touching user data
      await this.cleanupLegacySampleData(userId)
      return
    }

    const db = await getDB()
    const subjectCount = await db.count('subjects')
    const taskCount = await db.count('tasks')
    if (subjectCount > 0 || taskCount > 0) {
      // Existing user data found — never overwrite or inject samples
      await setMeta('first-run-initialized', true)
      await setMeta('seeded', true)
      await this.cleanupLegacySampleData(userId)
      return
    }

    const ts = nowIso()

    let initialName = 'Student'
    try {
      const stored = localStorage.getItem('studentos-display-name')?.trim()
      if (stored) initialName = stored
    } catch {
      /* ignore */
    }

    const profile: Profile = {
      id: newId(),
      userId,
      displayName: initialName,
      email: 'student@studentos.local',
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
      preferences: {
        theme: 'system',
        weekStartsOn: 1,
        defaultReminderMinutes: 60,
        focusSessionMinutes: 25,
        notificationsEnabled: true,
      },
      createdAt: ts,
      updatedAt: ts,
    }
    await db.put('profiles', profile)

    // IMPORTANT: As requested by the user, we start with a clean slate (0 sample subjects and 0 sample tasks).
    // Users start with an empty dashboard and add their own courses/tasks without needing to manually delete sample data.

    await setMeta('first-run-initialized', true)
    await setMeta('seeded', true)
    await setMeta('legacy-samples-cleaned-v1', true)
    await setMeta('demoUserId', userId)
    try {
      localStorage.setItem('studentos-first-run-done', '1')
    } catch {
      /* ignore */
    }
  }

  /**
   * Safely cleans up the initial template sample subject and sample task that were
   * previously auto-generated on first install, while strictly preserving 100% of user data.
   */
  async cleanupLegacySampleData(_userId: string): Promise<void> {
    const alreadyCleaned = await getMeta<boolean>('legacy-samples-cleaned-v1')
    if (alreadyCleaned) return

    try {
      const db = await getDB()

      // 1. Clean up only the specific sample subject
      const allSubjects = await db.getAll('subjects')
      const sampleSubjects = allSubjects.filter(
        (s) =>
          s.code === 'CS101' &&
          (s.name.includes('(Sample)') || s.name === 'Introduction to Computer Science (Sample)'),
      )

      for (const sampleSub of sampleSubjects) {
        await db.delete('subjects', sampleSub.id)

        // Delete attendance records tied strictly to the sample subject
        const allAtt = await db.getAll('attendance')
        for (const att of allAtt) {
          if (att.subjectId === sampleSub.id) {
            await db.delete('attendance', att.id)
          }
        }
      }

      // 2. Clean up only the specific initial sample task
      const allTasks = await db.getAll('tasks')
      const sampleTasks = allTasks.filter(
        (t) =>
          (t.tags && t.tags.includes('sample')) ||
          t.title.includes('(Sample)') ||
          t.title.includes('Welcome to StudentOS — Explore your dashboard'),
      )

      for (const sampleTask of sampleTasks) {
        await db.delete('tasks', sampleTask.id)
      }

      await setMeta('legacy-samples-cleaned-v1', true)
    } catch (err) {
      console.warn('Failed to clean up legacy sample items:', err)
    }
  }

  /* -------------------------------------------------------------------- */
  /* Profile                                                              */
  /* -------------------------------------------------------------------- */

  async getProfile(userId = DEMO_USER_ID): Promise<Profile | undefined> {
    await this.ensureSeeded(userId)
    const db = await getDB()
    const all = await db.getAllFromIndex('profiles', 'by-user', userId)
    let profile = all[all.length - 1] ?? all[0]

    // LocalStorage single source of truth synchronization
    try {
      const stored = localStorage.getItem('studentos-display-name')?.trim()
      if (stored) {
        if (!profile) {
          const ts = nowIso()
          profile = {
            id: newId(),
            userId,
            displayName: stored,
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
            createdAt: ts,
            updatedAt: ts,
          }
          await db.put('profiles', profile)
        } else if (profile.displayName !== stored) {
          profile.displayName = stored
          await db.put('profiles', profile)
        }
      }
    } catch {
      /* ignore */
    }
    return profile
  }

  async upsertProfile(
    input: CreateInput<Profile> & { userId?: string },
  ): Promise<Profile> {
    const db = await getDB()
    const userId = input.userId ?? DEMO_USER_ID
    let existing: Profile | undefined

    if (input.id) {
      existing = await db.get('profiles', input.id)
    }
    if (!existing) {
      const all = await db.getAllFromIndex('profiles', 'by-user', userId)
      existing = all[all.length - 1] ?? all[0]
    }

    const cleanName =
      (input.displayName ?? existing?.displayName ?? 'Student').trim() || 'Student'
    try {
      localStorage.setItem('studentos-display-name', cleanName)
    } catch {
      /* ignore */
    }

    const profile = withTimestamps(
      {
        ...existing,
        ...input,
        id: existing?.id ?? input.id ?? newId(),
        timezone:
          input.timezone ??
          existing?.timezone ??
          (Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'),
        userId,
        displayName: cleanName,
      },
      !existing,
    ) as Profile

    await db.put('profiles', profile)
    return profile
  }

  /* -------------------------------------------------------------------- */
  /* Subjects                                                             */
  /* -------------------------------------------------------------------- */

  async listSubjects(userId = DEMO_USER_ID): Promise<Subject[]> {
    await this.ensureSeeded(userId)
    const db = await getDB()
    const items = await db.getAllFromIndex('subjects', 'by-user', userId)
    return items
      .filter((s) => !s.archived)
      .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
  }

  async getSubject(id: string): Promise<Subject | undefined> {
    const db = await getDB()
    return db.get('subjects', id)
  }

  async createSubject(
    input: CreateInput<Subject>,
  ): Promise<Subject> {
    const db = await getDB()
    const subject = withTimestamps(
      { ...input, id: input.id ?? newId() },
      true,
    ) as Subject
    await db.put('subjects', subject)
    return subject
  }

  async updateSubject(
    id: string,
    patch: Partial<Omit<Subject, 'id' | 'createdAt'>>,
  ): Promise<Subject> {
    const db = await getDB()
    const existing = await db.get('subjects', id)
    if (!existing) throw new Error(`Subject not found: ${id}`)
    const updated = withTimestamps({ ...existing, ...patch, id }, false) as Subject
    await db.put('subjects', updated)
    return updated
  }

  async deleteSubject(id: string): Promise<void> {
    const db = await getDB()
    await db.delete('subjects', id)
    await this.deleteAttendanceBySubject(id)
  }

  /* -------------------------------------------------------------------- */
  /* Attendance                                                           */
  /* -------------------------------------------------------------------- */

  async listAttendance(userId = DEMO_USER_ID): Promise<AttendanceRecord[]> {
    await this.ensureSeeded(userId)
    const db = await getDB()
    return db.getAllFromIndex('attendance', 'by-user', userId)
  }

  async getAttendanceBySubject(subjectId: string): Promise<AttendanceRecord[]> {
    const db = await getDB()
    return db.getAllFromIndex('attendance', 'by-subject', subjectId)
  }

  async recordAttendance(
    input: CreateInput<AttendanceRecord> & { userId: string },
  ): Promise<AttendanceRecord> {
    const db = await getDB()
    const rec = withTimestamps(
      {
        ...input,
        id: input.id ?? newId(),
      },
      true,
    ) as AttendanceRecord
    await db.put('attendance', rec)
    return rec
  }

  async updateAttendance(
    id: string,
    patch: Partial<AttendanceRecord>,
  ): Promise<AttendanceRecord> {
    const db = await getDB()
    const existing = await db.get('attendance', id)
    if (!existing) throw new Error(`Attendance record not found: ${id}`)
    const updated = withTimestamps(
      {
        ...existing,
        ...patch,
      },
      false,
    ) as AttendanceRecord
    await db.put('attendance', updated)
    return updated
  }

  async deleteAttendance(id: string): Promise<void> {
    const db = await getDB()
    await db.delete('attendance', id)
  }

  async deleteAttendanceBySubject(subjectId: string): Promise<void> {
    const db = await getDB()
    const records = await db.getAllFromIndex('attendance', 'by-subject', subjectId)
    const tx = db.transaction('attendance', 'readwrite')
    for (const r of records) {
      await tx.store.delete(r.id)
    }
    await tx.done
  }

  /* -------------------------------------------------------------------- */
  /* Tasks                                                                */
  /* -------------------------------------------------------------------- */

  async listTasks(userId = DEMO_USER_ID): Promise<Task[]> {
    await this.ensureSeeded(userId)
    const db = await getDB()
    return db.getAllFromIndex('tasks', 'by-user', userId)
  }

  async getTask(id: string): Promise<Task | undefined> {
    const db = await getDB()
    return db.get('tasks', id)
  }

  async createTask(input: CreateInput<Task>): Promise<Task> {
    const db = await getDB()
    const task = withTimestamps(
      {
        ...input,
        id: input.id ?? newId(),
        tags: input.tags ?? [],
        subtasks: input.subtasks ?? [],
        tentative: input.tentative ?? false,
      },
      true,
    ) as Task
    await db.put('tasks', task)
    return task
  }

  async updateTask(
    id: string,
    patch: Partial<Omit<Task, 'id' | 'createdAt'>>,
  ): Promise<Task> {
    const db = await getDB()
    const existing = await db.get('tasks', id)
    if (!existing) throw new Error(`Task not found: ${id}`)
    const updated = withTimestamps({ ...existing, ...patch, id }, false) as Task
    await db.put('tasks', updated)
    return updated
  }

  async deleteTask(id: string): Promise<void> {
    const db = await getDB()
    const task = await db.get('tasks', id)
    if (task?.attachments) {
      for (const att of task.attachments) {
        if (att.blobId) await db.delete('fileBlobs', att.blobId)
      }
    }
    await db.delete('tasks', id)
  }

  async completeTask(id: string): Promise<Task> {
    return this.updateTask(id, {
      status: TaskStatus.Completed,
      completedAt: nowIso(),
    })
  }

  /* -------------------------------------------------------------------- */
  /* Attachments / file blobs                                             */
  /* -------------------------------------------------------------------- */

  async saveFileBlob(
    file: File | Blob,
    filename: string,
    mimeType?: string,
  ): Promise<FileBlobRecord> {
    if (file.size > MAX_FILE_SIZE) {
      throw new Error(`File exceeds max size of ${MAX_FILE_SIZE} bytes`)
    }
    const db = await getDB()
    const record: FileBlobRecord = {
      id: newId(),
      blob: file,
      mimeType: mimeType ?? (file instanceof File ? file.type : 'application/octet-stream'),
      filename,
      createdAt: nowIso(),
    }
    await db.put('fileBlobs', record)
    return record
  }

  async getFileBlob(id: string): Promise<FileBlobRecord | undefined> {
    const db = await getDB()
    return db.get('fileBlobs', id)
  }

  async deleteFileBlob(id: string): Promise<void> {
    const db = await getDB()
    await db.delete('fileBlobs', id)
  }

  async addTaskAttachment(
    taskId: string,
    file: File,
  ): Promise<{ task: Task; attachment: TaskAttachment }> {
    const blob = await this.saveFileBlob(file, file.name, file.type)
    const attachment: TaskAttachment = {
      id: newId(),
      blobId: blob.id,
      filename: file.name,
      mimeType: file.type || 'application/octet-stream',
      size: file.size,
      createdAt: nowIso(),
    }
    const task = await this.getTask(taskId)
    if (!task) throw new Error(`Task not found: ${taskId}`)
    const attachments = [...(task.attachments ?? []), attachment]
    const updated = await this.updateTask(taskId, { attachments })
    return { task: updated, attachment }
  }

  async removeTaskAttachment(taskId: string, attachmentId: string): Promise<Task> {
    const task = await this.getTask(taskId)
    if (!task) throw new Error(`Task not found: ${taskId}`)
    const target = task.attachments?.find((a) => a.id === attachmentId)
    if (target?.blobId) await this.deleteFileBlob(target.blobId)
    const attachments = (task.attachments ?? []).filter((a) => a.id !== attachmentId)
    return this.updateTask(taskId, { attachments })
  }

  async addNoteAttachment(
    noteId: string,
    file: File,
  ): Promise<{ note: Note; attachment: NoteAttachment }> {
    const blob = await this.saveFileBlob(file, file.name, file.type)
    const attachment: NoteAttachment = {
      id: newId(),
      blobId: blob.id,
      filename: file.name,
      mimeType: file.type || 'application/octet-stream',
      size: file.size,
      createdAt: nowIso(),
    }
    const note = await this.getNote(noteId)
    if (!note) throw new Error(`Note not found: ${noteId}`)
    const attachments = [...(note.attachments ?? []), attachment]
    const updated = await this.updateNote(noteId, { attachments })
    return { note: updated, attachment }
  }

  async removeNoteAttachment(noteId: string, attachmentId: string): Promise<Note> {
    const note = await this.getNote(noteId)
    if (!note) throw new Error(`Note not found: ${noteId}`)
    const att = (note.attachments ?? []).find((a) => a.id === attachmentId)
    if (att?.blobId) {
      await this.deleteFileBlob(att.blobId).catch(() => {})
    }
    const attachments = (note.attachments ?? []).filter((a) => a.id !== attachmentId)
    return this.updateNote(noteId, { attachments })
  }

  /* -------------------------------------------------------------------- */
  /* Notes                                                                */
  /* -------------------------------------------------------------------- */

  async listNotes(userId = DEMO_USER_ID): Promise<Note[]> {
    await this.ensureSeeded(userId)
    const db = await getDB()
    const notes = await db.getAllFromIndex('notes', 'by-user', userId)
    return notes.sort((a, b) => {
      if (a.pinned && !b.pinned) return -1
      if (!a.pinned && b.pinned) return 1
      return b.updatedAt.localeCompare(a.updatedAt)
    })
  }

  async getNote(id: string): Promise<Note | undefined> {
    const db = await getDB()
    return db.get('notes', id)
  }

  async createNote(input: CreateInput<Note>): Promise<Note> {
    const db = await getDB()
    const note = withTimestamps(
      {
        ...input,
        id: input.id ?? newId(),
        title: input.title ?? 'Untitled',
        content: input.content ?? '',
        tags: input.tags ?? [],
      },
      true,
    ) as Note
    await db.put('notes', note)
    return note
  }

  async updateNote(
    id: string,
    patch: Partial<Omit<Note, 'id' | 'createdAt'>>,
  ): Promise<Note> {
    const db = await getDB()
    const existing = await db.get('notes', id)
    if (!existing) throw new Error(`Note not found: ${id}`)
    const updated = withTimestamps({ ...existing, ...patch, id }, false) as Note
    await db.put('notes', updated)
    return updated
  }

  async deleteNote(id: string): Promise<void> {
    const db = await getDB()
    const note = await db.get('notes', id)
    if (note?.attachments) {
      for (const att of note.attachments) {
        if (att.blobId) await db.delete('fileBlobs', att.blobId)
      }
    }
    await db.delete('notes', id)
  }

  /* -------------------------------------------------------------------- */
  /* Roadmaps                                                             */
  /* -------------------------------------------------------------------- */

  async listRoadmaps(userId = DEMO_USER_ID): Promise<Roadmap[]> {
    await this.ensureSeeded(userId)
    const db = await getDB()
    return db.getAllFromIndex('roadmaps', 'by-user', userId)
  }

  async getRoadmap(id: string): Promise<Roadmap | undefined> {
    const db = await getDB()
    return db.get('roadmaps', id)
  }

  async createRoadmap(input: CreateInput<Roadmap>): Promise<Roadmap> {
    const db = await getDB()
    const roadmap = withTimestamps(
      {
        ...input,
        id: input.id ?? newId(),
        milestones: input.milestones ?? [],
        tags: input.tags ?? [],
        status: input.status ?? RoadmapStatus.Active,
      },
      true,
    ) as Roadmap
    await db.put('roadmaps', roadmap)
    return roadmap
  }

  async updateRoadmap(
    id: string,
    patch: Partial<Omit<Roadmap, 'id' | 'createdAt'>>,
  ): Promise<Roadmap> {
    const db = await getDB()
    const existing = await db.get('roadmaps', id)
    if (!existing) throw new Error(`Roadmap not found: ${id}`)
    const updated = withTimestamps({ ...existing, ...patch, id }, false) as Roadmap
    await db.put('roadmaps', updated)
    return updated
  }

  async deleteRoadmap(id: string): Promise<void> {
    const db = await getDB()
    await db.delete('roadmaps', id)
  }

  /* -------------------------------------------------------------------- */
  /* Learning resources                                                   */
  /* -------------------------------------------------------------------- */

  async listLearningResources(userId = DEMO_USER_ID): Promise<LearningResource[]> {
    await this.ensureSeeded(userId)
    const db = await getDB()
    return db.getAllFromIndex('learningResources', 'by-user', userId)
  }

  async createLearningResource(
    input: CreateInput<LearningResource>,
  ): Promise<LearningResource> {
    const db = await getDB()
    const resource = withTimestamps(
      {
        ...input,
        id: input.id ?? newId(),
        tags: input.tags ?? [],
        type: input.type ?? ResourceType.Other,
        completed: input.completed ?? false,
      },
      true,
    ) as LearningResource
    await db.put('learningResources', resource)
    return resource
  }

  async updateLearningResource(
    id: string,
    patch: Partial<Omit<LearningResource, 'id' | 'createdAt'>>,
  ): Promise<LearningResource> {
    const db = await getDB()
    const existing = await db.get('learningResources', id)
    if (!existing) throw new Error(`LearningResource not found: ${id}`)
    const updated = withTimestamps(
      { ...existing, ...patch, id },
      false,
    ) as LearningResource
    await db.put('learningResources', updated)
    return updated
  }

  async deleteLearningResource(id: string): Promise<void> {
    const db = await getDB()
    await db.delete('learningResources', id)
  }

  /* -------------------------------------------------------------------- */
  /* DSA                                                                  */
  /* -------------------------------------------------------------------- */

  async listDsaProblems(userId = DEMO_USER_ID): Promise<DsaProblem[]> {
    await this.ensureSeeded(userId)
    const db = await getDB()
    return db.getAllFromIndex('dsaProblems', 'by-user', userId)
  }

  async getDsaProblem(id: string): Promise<DsaProblem | undefined> {
    const db = await getDB()
    return db.get('dsaProblems', id)
  }

  async createDsaProblem(input: CreateInput<DsaProblem>): Promise<DsaProblem> {
    const db = await getDB()
    const problem = withTimestamps(
      {
        ...input,
        id: input.id ?? newId(),
        topics: input.topics ?? [],
        tags: input.tags ?? [],
        status: input.status ?? DsaStatus.ToSolve,
        difficulty: input.difficulty ?? DsaDifficulty.Medium,
        attempts: input.attempts ?? 0,
      },
      true,
    ) as DsaProblem
    await db.put('dsaProblems', problem)
    return problem
  }

  async updateDsaProblem(
    id: string,
    patch: Partial<Omit<DsaProblem, 'id' | 'createdAt'>>,
  ): Promise<DsaProblem> {
    const db = await getDB()
    const existing = await db.get('dsaProblems', id)
    if (!existing) throw new Error(`DsaProblem not found: ${id}`)
    const updated = withTimestamps({ ...existing, ...patch, id }, false) as DsaProblem
    await db.put('dsaProblems', updated)
    return updated
  }

  async deleteDsaProblem(id: string): Promise<void> {
    const db = await getDB()
    await db.delete('dsaProblems', id)
  }

  /* -------------------------------------------------------------------- */
  /* Projects                                                             */
  /* -------------------------------------------------------------------- */

  async listProjects(userId = DEMO_USER_ID): Promise<Project[]> {
    await this.ensureSeeded(userId)
    const db = await getDB()
    return db.getAllFromIndex('projects', 'by-user', userId)
  }

  async getProject(id: string): Promise<Project | undefined> {
    const db = await getDB()
    return db.get('projects', id)
  }

  async createProject(input: CreateInput<Project>): Promise<Project> {
    const db = await getDB()
    const project = withTimestamps(
      {
        ...input,
        id: input.id ?? newId(),
        milestones: input.milestones ?? [],
        techStack: input.techStack ?? [],
        tags: input.tags ?? [],
        status: input.status ?? ProjectStatus.Planning,
      },
      true,
    ) as Project
    await db.put('projects', project)
    return project
  }

  async updateProject(
    id: string,
    patch: Partial<Omit<Project, 'id' | 'createdAt'>>,
  ): Promise<Project> {
    const db = await getDB()
    const existing = await db.get('projects', id)
    if (!existing) throw new Error(`Project not found: ${id}`)
    const updated = withTimestamps({ ...existing, ...patch, id }, false) as Project
    await db.put('projects', updated)
    return updated
  }

  async deleteProject(id: string): Promise<void> {
    const db = await getDB()
    await db.delete('projects', id)
  }

  /* -------------------------------------------------------------------- */
  /* Study sessions                                                       */
  /* -------------------------------------------------------------------- */

  async listStudySessions(userId = DEMO_USER_ID): Promise<StudySession[]> {
    await this.ensureSeeded(userId)
    const db = await getDB()
    const sessions = await db.getAllFromIndex('studySessions', 'by-user', userId)
    return sessions.sort((a, b) => b.startedAt.localeCompare(a.startedAt))
  }

  async createStudySession(
    input: CreateInput<StudySession>,
  ): Promise<StudySession> {
    const db = await getDB()
    const session = withTimestamps(
      {
        ...input,
        id: input.id ?? newId(),
        type: input.type ?? StudySessionType.Focus,
        durationMinutes: input.durationMinutes ?? 0,
        startedAt: input.startedAt ?? nowIso(),
      },
      true,
    ) as StudySession
    await db.put('studySessions', session)
    return session
  }

  async updateStudySession(
    id: string,
    patch: Partial<Omit<StudySession, 'id' | 'createdAt'>>,
  ): Promise<StudySession> {
    const db = await getDB()
    const existing = await db.get('studySessions', id)
    if (!existing) throw new Error(`StudySession not found: ${id}`)
    const updated = withTimestamps(
      { ...existing, ...patch, id },
      false,
    ) as StudySession
    await db.put('studySessions', updated)
    return updated
  }

  async deleteStudySession(id: string): Promise<void> {
    const db = await getDB()
    await db.delete('studySessions', id)
  }

  /* -------------------------------------------------------------------- */
  /* Weekly goals                                                         */
  /* -------------------------------------------------------------------- */

  async listWeeklyGoals(userId = DEMO_USER_ID): Promise<WeeklyGoal[]> {
    await this.ensureSeeded(userId)
    const db = await getDB()
    return db.getAllFromIndex('weeklyGoals', 'by-user', userId)
  }

  async createWeeklyGoal(input: CreateInput<WeeklyGoal>): Promise<WeeklyGoal> {
    const db = await getDB()
    const goal = withTimestamps(
      {
        ...input,
        id: input.id ?? newId(),
        completedMinutes: input.completedMinutes ?? 0,
        completedTasks: input.completedTasks ?? 0,
      },
      true,
    ) as WeeklyGoal
    await db.put('weeklyGoals', goal)
    return goal
  }

  async updateWeeklyGoal(
    id: string,
    patch: Partial<Omit<WeeklyGoal, 'id' | 'createdAt'>>,
  ): Promise<WeeklyGoal> {
    const db = await getDB()
    const existing = await db.get('weeklyGoals', id)
    if (!existing) throw new Error(`WeeklyGoal not found: ${id}`)
    const updated = withTimestamps({ ...existing, ...patch, id }, false) as WeeklyGoal
    await db.put('weeklyGoals', updated)
    return updated
  }

  async deleteWeeklyGoal(id: string): Promise<void> {
    const db = await getDB()
    await db.delete('weeklyGoals', id)
  }

  /* -------------------------------------------------------------------- */
  /* Reminders                                                            */
  /* -------------------------------------------------------------------- */

  async listReminders(userId = DEMO_USER_ID): Promise<Reminder[]> {
    await this.ensureSeeded(userId)
    const db = await getDB()
    const items = await db.getAllFromIndex('reminders', 'by-user', userId)
    return items.sort((a, b) => a.fireAt.localeCompare(b.fireAt))
  }

  async createReminder(input: CreateInput<Reminder>): Promise<Reminder> {
    const db = await getDB()
    const reminder = withTimestamps(
      {
        ...input,
        id: input.id ?? newId(),
        channels: input.channels ?? [ReminderChannel.InApp],
        dismissed: input.dismissed ?? false,
        fired: input.fired ?? false,
      },
      true,
    ) as Reminder
    await db.put('reminders', reminder)
    return reminder
  }

  async updateReminder(
    id: string,
    patch: Partial<Omit<Reminder, 'id' | 'createdAt'>>,
  ): Promise<Reminder> {
    const db = await getDB()
    const existing = await db.get('reminders', id)
    if (!existing) throw new Error(`Reminder not found: ${id}`)
    const updated = withTimestamps({ ...existing, ...patch, id }, false) as Reminder
    await db.put('reminders', updated)
    return updated
  }

  async deleteReminder(id: string): Promise<void> {
    const db = await getDB()
    await db.delete('reminders', id)
  }

  /* -------------------------------------------------------------------- */
  /* Notifications                                                        */
  /* -------------------------------------------------------------------- */

  async listNotifications(userId = DEMO_USER_ID): Promise<AppNotification[]> {
    await this.ensureSeeded(userId)
    const db = await getDB()
    const items = await db.getAllFromIndex('notifications', 'by-user', userId)
    return items.sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  }

  async createNotification(
    input: CreateInput<AppNotification>,
  ): Promise<AppNotification> {
    const db = await getDB()
    const notification = withTimestamps(
      {
        ...input,
        id: input.id ?? newId(),
        read: input.read ?? false,
        type: input.type ?? NotificationType.System,
      },
      true,
    ) as AppNotification
    await db.put('notifications', notification)
    return notification
  }

  async updateNotification(
    id: string,
    patch: Partial<Omit<AppNotification, 'id' | 'createdAt'>>,
  ): Promise<AppNotification> {
    const db = await getDB()
    const existing = await db.get('notifications', id)
    if (!existing) throw new Error(`Notification not found: ${id}`)
    const updated = withTimestamps(
      { ...existing, ...patch, id },
      false,
    ) as AppNotification
    await db.put('notifications', updated)
    return updated
  }

  async markNotificationRead(id: string): Promise<AppNotification> {
    return this.updateNotification(id, { read: true })
  }

  async deleteNotification(id: string): Promise<void> {
    const db = await getDB()
    await db.delete('notifications', id)
  }

  async clearNotifications(userId = DEMO_USER_ID): Promise<void> {
    const items = await this.listNotifications(userId)
    const db = await getDB()
    const tx = db.transaction('notifications', 'readwrite')
    await Promise.all(items.map((n) => tx.store.delete(n.id)))
    await tx.done
  }

  async markAllNotificationsRead(userId = DEMO_USER_ID): Promise<void> {
    const items = await this.listNotifications(userId)
    await Promise.all(
      items.filter((n) => !n.read).map((n) => this.markNotificationRead(n.id)),
    )
  }

  /** Wipe all IndexedDB stores and clear seed flag so demo data can be reseeded. */
  async resetAllData(): Promise<void> {
    const db = await getDB()
    const stores = [
      'profiles',
      'subjects',
      'tasks',
      'notes',
      'roadmaps',
      'learningResources',
      'dsaProblems',
      'projects',
      'studySessions',
      'weeklyGoals',
      'reminders',
      'notifications',
      'fileBlobs',
      'meta',
    ] as const
    const tx = db.transaction([...stores], 'readwrite')
    await Promise.all(stores.map((name) => tx.objectStore(name).clear()))
    await tx.done
  }
}

export const localRepo = new LocalRepository()
