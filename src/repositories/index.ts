import { isSupabaseConfigured } from '@/lib/supabase'
import { localRepo, LocalRepository } from '@/repositories/local-repository'
import type {
  AppNotification,
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

export type DataMode = 'local' | 'cloud'

/**
 * Data access layer — always reads/writes IndexedDB via localRepo.
 * When Supabase is configured, mode reports 'cloud' for future sync hooks.
 */
export class DataAccessLayer {
  private readonly local: LocalRepository

  constructor(local: LocalRepository = localRepo) {
    this.local = local
  }

  getMode(): DataMode {
    return isSupabaseConfigured ? 'cloud' : 'local'
  }

  isCloudEnabled(): boolean {
    return this.getMode() === 'cloud'
  }

  /** Placeholder for future bidirectional sync. */
  async syncToCloud(): Promise<{ synced: boolean; reason?: string }> {
    if (!isSupabaseConfigured) {
      return { synced: false, reason: 'Supabase not configured' }
    }
    // Cloud sync will be wired in a later phase; local remains source of truth.
    return { synced: false, reason: 'Cloud sync not yet implemented' }
  }

  ensureSeeded(userId?: string): Promise<void> {
    return this.local.ensureSeeded(userId)
  }

  /* Profile */
  getProfile(userId?: string): Promise<Profile | undefined> {
    return this.local.getProfile(userId)
  }
  upsertProfile(
    input: Parameters<LocalRepository['upsertProfile']>[0],
  ): Promise<Profile> {
    return this.local.upsertProfile(input)
  }

  /* Subjects */
  listSubjects(userId?: string): Promise<Subject[]> {
    return this.local.listSubjects(userId)
  }
  getSubject(id: string): Promise<Subject | undefined> {
    return this.local.getSubject(id)
  }
  createSubject(
    input: Parameters<LocalRepository['createSubject']>[0],
  ): Promise<Subject> {
    return this.local.createSubject(input)
  }
  updateSubject(
    id: string,
    patch: Parameters<LocalRepository['updateSubject']>[1],
  ): Promise<Subject> {
    return this.local.updateSubject(id, patch)
  }
  deleteSubject(id: string): Promise<void> {
    return this.local.deleteSubject(id)
  }

  /* Tasks */
  listTasks(userId?: string): Promise<Task[]> {
    return this.local.listTasks(userId)
  }
  getTask(id: string): Promise<Task | undefined> {
    return this.local.getTask(id)
  }
  createTask(input: Parameters<LocalRepository['createTask']>[0]): Promise<Task> {
    return this.local.createTask(input)
  }
  updateTask(
    id: string,
    patch: Parameters<LocalRepository['updateTask']>[1],
  ): Promise<Task> {
    return this.local.updateTask(id, patch)
  }
  deleteTask(id: string): Promise<void> {
    return this.local.deleteTask(id)
  }
  completeTask(id: string): Promise<Task> {
    return this.local.completeTask(id)
  }

  /* Attachments */
  saveFileBlob(
    file: File | Blob,
    filename: string,
    mimeType?: string,
  ): Promise<FileBlobRecord> {
    return this.local.saveFileBlob(file, filename, mimeType)
  }
  getFileBlob(id: string): Promise<FileBlobRecord | undefined> {
    return this.local.getFileBlob(id)
  }
  deleteFileBlob(id: string): Promise<void> {
    return this.local.deleteFileBlob(id)
  }
  addTaskAttachment(
    taskId: string,
    file: File,
  ): Promise<{ task: Task; attachment: TaskAttachment }> {
    return this.local.addTaskAttachment(taskId, file)
  }
  removeTaskAttachment(taskId: string, attachmentId: string): Promise<Task> {
    return this.local.removeTaskAttachment(taskId, attachmentId)
  }
  addNoteAttachment(
    noteId: string,
    file: File,
  ): Promise<{ note: Note; attachment: NoteAttachment }> {
    return this.local.addNoteAttachment(noteId, file)
  }

  /* Notes */
  listNotes(userId?: string): Promise<Note[]> {
    return this.local.listNotes(userId)
  }
  getNote(id: string): Promise<Note | undefined> {
    return this.local.getNote(id)
  }
  createNote(input: Parameters<LocalRepository['createNote']>[0]): Promise<Note> {
    return this.local.createNote(input)
  }
  updateNote(
    id: string,
    patch: Parameters<LocalRepository['updateNote']>[1],
  ): Promise<Note> {
    return this.local.updateNote(id, patch)
  }
  deleteNote(id: string): Promise<void> {
    return this.local.deleteNote(id)
  }

  /* Roadmaps */
  listRoadmaps(userId?: string): Promise<Roadmap[]> {
    return this.local.listRoadmaps(userId)
  }
  getRoadmap(id: string): Promise<Roadmap | undefined> {
    return this.local.getRoadmap(id)
  }
  createRoadmap(
    input: Parameters<LocalRepository['createRoadmap']>[0],
  ): Promise<Roadmap> {
    return this.local.createRoadmap(input)
  }
  updateRoadmap(
    id: string,
    patch: Parameters<LocalRepository['updateRoadmap']>[1],
  ): Promise<Roadmap> {
    return this.local.updateRoadmap(id, patch)
  }
  deleteRoadmap(id: string): Promise<void> {
    return this.local.deleteRoadmap(id)
  }

  /* Learning resources */
  listLearningResources(userId?: string): Promise<LearningResource[]> {
    return this.local.listLearningResources(userId)
  }
  createLearningResource(
    input: Parameters<LocalRepository['createLearningResource']>[0],
  ): Promise<LearningResource> {
    return this.local.createLearningResource(input)
  }
  updateLearningResource(
    id: string,
    patch: Parameters<LocalRepository['updateLearningResource']>[1],
  ): Promise<LearningResource> {
    return this.local.updateLearningResource(id, patch)
  }
  deleteLearningResource(id: string): Promise<void> {
    return this.local.deleteLearningResource(id)
  }

  /* DSA */
  listDsaProblems(userId?: string): Promise<DsaProblem[]> {
    return this.local.listDsaProblems(userId)
  }
  getDsaProblem(id: string): Promise<DsaProblem | undefined> {
    return this.local.getDsaProblem(id)
  }
  createDsaProblem(
    input: Parameters<LocalRepository['createDsaProblem']>[0],
  ): Promise<DsaProblem> {
    return this.local.createDsaProblem(input)
  }
  updateDsaProblem(
    id: string,
    patch: Parameters<LocalRepository['updateDsaProblem']>[1],
  ): Promise<DsaProblem> {
    return this.local.updateDsaProblem(id, patch)
  }
  deleteDsaProblem(id: string): Promise<void> {
    return this.local.deleteDsaProblem(id)
  }

  /* Projects */
  listProjects(userId?: string): Promise<Project[]> {
    return this.local.listProjects(userId)
  }
  getProject(id: string): Promise<Project | undefined> {
    return this.local.getProject(id)
  }
  createProject(
    input: Parameters<LocalRepository['createProject']>[0],
  ): Promise<Project> {
    return this.local.createProject(input)
  }
  updateProject(
    id: string,
    patch: Parameters<LocalRepository['updateProject']>[1],
  ): Promise<Project> {
    return this.local.updateProject(id, patch)
  }
  deleteProject(id: string): Promise<void> {
    return this.local.deleteProject(id)
  }

  /* Study sessions */
  listStudySessions(userId?: string): Promise<StudySession[]> {
    return this.local.listStudySessions(userId)
  }
  createStudySession(
    input: Parameters<LocalRepository['createStudySession']>[0],
  ): Promise<StudySession> {
    return this.local.createStudySession(input)
  }
  updateStudySession(
    id: string,
    patch: Parameters<LocalRepository['updateStudySession']>[1],
  ): Promise<StudySession> {
    return this.local.updateStudySession(id, patch)
  }
  deleteStudySession(id: string): Promise<void> {
    return this.local.deleteStudySession(id)
  }

  /* Weekly goals */
  listWeeklyGoals(userId?: string): Promise<WeeklyGoal[]> {
    return this.local.listWeeklyGoals(userId)
  }
  createWeeklyGoal(
    input: Parameters<LocalRepository['createWeeklyGoal']>[0],
  ): Promise<WeeklyGoal> {
    return this.local.createWeeklyGoal(input)
  }
  updateWeeklyGoal(
    id: string,
    patch: Parameters<LocalRepository['updateWeeklyGoal']>[1],
  ): Promise<WeeklyGoal> {
    return this.local.updateWeeklyGoal(id, patch)
  }
  deleteWeeklyGoal(id: string): Promise<void> {
    return this.local.deleteWeeklyGoal(id)
  }

  /* Reminders */
  listReminders(userId?: string): Promise<Reminder[]> {
    return this.local.listReminders(userId)
  }
  createReminder(
    input: Parameters<LocalRepository['createReminder']>[0],
  ): Promise<Reminder> {
    return this.local.createReminder(input)
  }
  updateReminder(
    id: string,
    patch: Parameters<LocalRepository['updateReminder']>[1],
  ): Promise<Reminder> {
    return this.local.updateReminder(id, patch)
  }
  deleteReminder(id: string): Promise<void> {
    return this.local.deleteReminder(id)
  }

  /* Notifications */
  listNotifications(userId?: string): Promise<AppNotification[]> {
    return this.local.listNotifications(userId)
  }
  createNotification(
    input: Parameters<LocalRepository['createNotification']>[0],
  ): Promise<AppNotification> {
    return this.local.createNotification(input)
  }
  updateNotification(
    id: string,
    patch: Parameters<LocalRepository['updateNotification']>[1],
  ): Promise<AppNotification> {
    return this.local.updateNotification(id, patch)
  }
  markNotificationRead(id: string): Promise<AppNotification> {
    return this.local.markNotificationRead(id)
  }
  deleteNotification(id: string): Promise<void> {
    return this.local.deleteNotification(id)
  }
  clearNotifications(userId?: string): Promise<void> {
    return this.local.clearNotifications(userId)
  }
  markAllNotificationsRead(userId?: string): Promise<void> {
    return this.local.markAllNotificationsRead(userId)
  }

  /* Aliases used by AppDataContext */
  listResources(userId?: string): Promise<LearningResource[]> {
    return this.listLearningResources(userId)
  }
  createResource(
    input: Parameters<LocalRepository['createLearningResource']>[0],
  ): Promise<LearningResource> {
    return this.createLearningResource(input)
  }
  updateResource(
    id: string,
    patch: Parameters<LocalRepository['updateLearningResource']>[1],
  ): Promise<LearningResource> {
    return this.updateLearningResource(id, patch)
  }
  deleteResource(id: string): Promise<void> {
    return this.deleteLearningResource(id)
  }

  listSessions(userId?: string): Promise<StudySession[]> {
    return this.listStudySessions(userId)
  }
  createSession(
    input: Parameters<LocalRepository['createStudySession']>[0],
  ): Promise<StudySession> {
    return this.createStudySession(input)
  }
  updateSession(
    id: string,
    patch: Parameters<LocalRepository['updateStudySession']>[1],
  ): Promise<StudySession> {
    return this.updateStudySession(id, patch)
  }
  deleteSession(id: string): Promise<void> {
    return this.deleteStudySession(id)
  }

  listGoals(userId?: string): Promise<WeeklyGoal[]> {
    return this.listWeeklyGoals(userId)
  }
  createGoal(
    input: Parameters<LocalRepository['createWeeklyGoal']>[0],
  ): Promise<WeeklyGoal> {
    return this.createWeeklyGoal(input)
  }
  updateGoal(
    id: string,
    patch: Parameters<LocalRepository['updateWeeklyGoal']>[1],
  ): Promise<WeeklyGoal> {
    return this.updateWeeklyGoal(id, patch)
  }
  deleteGoal(id: string): Promise<void> {
    return this.deleteWeeklyGoal(id)
  }

  resetAllData(): Promise<void> {
    return this.local.resetAllData()
  }
}

export const dataStore = new DataAccessLayer()

export { localRepo, LocalRepository } from '@/repositories/local-repository'
export { getDB, DB_NAME, DB_VERSION, resetDBCache } from '@/repositories/db'
export type { StudentOSDB } from '@/repositories/db'
