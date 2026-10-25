import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { dataStore, getDB, DB_NAME, resetDBCache } from '@/repositories'
import { DEMO_USER_ID } from '@/lib/constants'
import { useAuth } from '@/context/AuthContext'
import type {
  AppNotification,
  DsaProblem,
  LearningResource,
  Note,
  Profile,
  Project,
  Roadmap,
  StudySession,
  Subject,
  Task,
  WeeklyGoal,
} from '@/types'

type TaskInput = Parameters<typeof dataStore.createTask>[0]
type SubjectInput = Parameters<typeof dataStore.createSubject>[0]
type NoteInput = Parameters<typeof dataStore.createNote>[0]
type RoadmapInput = Parameters<typeof dataStore.createRoadmap>[0]
type DsaInput = Parameters<typeof dataStore.createDsaProblem>[0]
type ProjectInput = Parameters<typeof dataStore.createProject>[0]
type ResourceInput = Parameters<typeof dataStore.createLearningResource>[0]
type SessionInput = Parameters<typeof dataStore.createStudySession>[0]
type GoalInput = Parameters<typeof dataStore.createWeeklyGoal>[0]
type ProfileInput = Parameters<typeof dataStore.upsertProfile>[0]

interface AppDataContextValue {
  loading: boolean
  userId: string
  profile: Profile | null
  subjects: Subject[]
  tasks: Task[]
  notes: Note[]
  roadmaps: Roadmap[]
  dsaProblems: DsaProblem[]
  projects: Project[]
  resources: LearningResource[]
  sessions: StudySession[]
  goals: WeeklyGoal[]
  notifications: AppNotification[]
  refresh: () => Promise<void>
  createTask: (input: TaskInput) => Promise<Task>
  updateTask: (id: string, patch: Partial<Task>) => Promise<Task>
  deleteTask: (id: string) => Promise<void>
  toggleTaskComplete: (id: string) => Promise<Task>
  createSubject: (input: SubjectInput) => Promise<Subject>
  updateSubject: (id: string, patch: Partial<Subject>) => Promise<Subject>
  deleteSubject: (id: string) => Promise<void>
  createNote: (input: NoteInput) => Promise<Note>
  updateNote: (id: string, patch: Partial<Note>) => Promise<Note>
  deleteNote: (id: string) => Promise<void>
  createRoadmap: (input: RoadmapInput) => Promise<Roadmap>
  updateRoadmap: (id: string, patch: Partial<Roadmap>) => Promise<Roadmap>
  deleteRoadmap: (id: string) => Promise<void>
  createDsaProblem: (input: DsaInput) => Promise<DsaProblem>
  updateDsaProblem: (id: string, patch: Partial<DsaProblem>) => Promise<DsaProblem>
  deleteDsaProblem: (id: string) => Promise<void>
  createProject: (input: ProjectInput) => Promise<Project>
  updateProject: (id: string, patch: Partial<Project>) => Promise<Project>
  deleteProject: (id: string) => Promise<void>
  createResource: (input: ResourceInput) => Promise<LearningResource>
  updateResource: (id: string, patch: Partial<LearningResource>) => Promise<LearningResource>
  deleteResource: (id: string) => Promise<void>
  createSession: (input: SessionInput) => Promise<StudySession>
  updateSession: (id: string, patch: Partial<StudySession>) => Promise<StudySession>
  deleteSession: (id: string) => Promise<void>
  createGoal: (input: GoalInput) => Promise<WeeklyGoal>
  updateGoal: (id: string, patch: Partial<WeeklyGoal>) => Promise<WeeklyGoal>
  deleteGoal: (id: string) => Promise<void>
  markNotificationRead: (id: string) => Promise<void>
  markAllNotificationsRead: () => Promise<void>
  upsertProfile: (input: ProfileInput) => Promise<Profile>
  addTaskAttachment: (taskId: string, file: File) => Promise<void>
  removeTaskAttachment: (taskId: string, attachmentId: string) => Promise<void>
  resetAllData: () => Promise<void>
  getSubject: (id: string | null | undefined) => Subject | undefined
}

const AppDataContext = createContext<AppDataContextValue | null>(null)

export function AppDataProvider({ children }: { children: ReactNode }) {
  const { user, isDemo, isGuest } = useAuth()
  const userId = user?.id ?? DEMO_USER_ID

  const [loading, setLoading] = useState(true)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [tasks, setTasks] = useState<Task[]>([])
  const [notes, setNotes] = useState<Note[]>([])
  const [roadmaps, setRoadmaps] = useState<Roadmap[]>([])
  const [dsaProblems, setDsaProblems] = useState<DsaProblem[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [resources, setResources] = useState<LearningResource[]>([])
  const [sessions, setSessions] = useState<StudySession[]>([])
  const [goals, setGoals] = useState<WeeklyGoal[]>([])
  const [notifications, setNotifications] = useState<AppNotification[]>([])

  const refresh = useCallback(async () => {
    await dataStore.ensureSeeded(userId)
    const [
      p,
      subs,
      tks,
      nts,
      rms,
      dsa,
      prjs,
      res,
      sess,
      gls,
      notifs,
    ] = await Promise.all([
      dataStore.getProfile(userId),
      dataStore.listSubjects(userId),
      dataStore.listTasks(userId),
      dataStore.listNotes(userId),
      dataStore.listRoadmaps(userId),
      dataStore.listDsaProblems(userId),
      dataStore.listProjects(userId),
      dataStore.listLearningResources(userId),
      dataStore.listStudySessions(userId),
      dataStore.listWeeklyGoals(userId),
      dataStore.listNotifications(userId),
    ])
    setProfile(p ?? null)
    setSubjects(subs)
    setTasks(tks)
    setNotes(nts)
    setRoadmaps(rms)
    setDsaProblems(dsa)
    setProjects(prjs)
    setResources(res)
    setSessions(sess)
    setGoals(gls)
    setNotifications(notifs)
  }, [userId])

  useEffect(() => {
    let mounted = true
    setLoading(true)
    refresh()
      .catch(console.error)
      .finally(() => {
        if (mounted) setLoading(false)
      })
    return () => {
      mounted = false
    }
  }, [refresh, isDemo, isGuest, user?.id])

  const after = useCallback(
    async <T,>(op: () => Promise<T>): Promise<T> => {
      const result = await op()
      await refresh()
      return result
    },
    [refresh],
  )

  const value = useMemo<AppDataContextValue>(
    () => ({
      loading,
      userId,
      profile,
      subjects,
      tasks,
      notes,
      roadmaps,
      dsaProblems,
      projects,
      resources,
      sessions,
      goals,
      notifications,
      refresh,
      createTask: (input) =>
        after(() => dataStore.createTask({ ...input, userId: input.userId ?? userId })),
      updateTask: (id, patch) => after(() => dataStore.updateTask(id, patch)),
      deleteTask: (id) => after(() => dataStore.deleteTask(id)),
      toggleTaskComplete: (id) =>
        after(async () => {
          const task = await dataStore.getTask(id)
          if (!task) throw new Error('Task not found')
          if (task.status === 'Completed') {
            return dataStore.updateTask(id, {
              status: 'Not Started',
              completedAt: undefined,
            })
          }
          return dataStore.completeTask(id)
        }),
      createSubject: (input) =>
        after(() => dataStore.createSubject({ ...input, userId: input.userId ?? userId })),
      updateSubject: (id, patch) => after(() => dataStore.updateSubject(id, patch)),
      deleteSubject: (id) => after(() => dataStore.deleteSubject(id)),
      createNote: (input) =>
        after(() => dataStore.createNote({ ...input, userId: input.userId ?? userId })),
      updateNote: (id, patch) => after(() => dataStore.updateNote(id, patch)),
      deleteNote: (id) => after(() => dataStore.deleteNote(id)),
      createRoadmap: (input) =>
        after(() => dataStore.createRoadmap({ ...input, userId: input.userId ?? userId })),
      updateRoadmap: (id, patch) => after(() => dataStore.updateRoadmap(id, patch)),
      deleteRoadmap: (id) => after(() => dataStore.deleteRoadmap(id)),
      createDsaProblem: (input) =>
        after(() => dataStore.createDsaProblem({ ...input, userId: input.userId ?? userId })),
      updateDsaProblem: (id, patch) => after(() => dataStore.updateDsaProblem(id, patch)),
      deleteDsaProblem: (id) => after(() => dataStore.deleteDsaProblem(id)),
      createProject: (input) =>
        after(() => dataStore.createProject({ ...input, userId: input.userId ?? userId })),
      updateProject: (id, patch) => after(() => dataStore.updateProject(id, patch)),
      deleteProject: (id) => after(() => dataStore.deleteProject(id)),
      createResource: (input) =>
        after(() =>
          dataStore.createLearningResource({ ...input, userId: input.userId ?? userId }),
        ),
      updateResource: (id, patch) => after(() => dataStore.updateLearningResource(id, patch)),
      deleteResource: (id) => after(() => dataStore.deleteLearningResource(id)),
      createSession: (input) =>
        after(() =>
          dataStore.createStudySession({ ...input, userId: input.userId ?? userId }),
        ),
      updateSession: (id, patch) => after(() => dataStore.updateStudySession(id, patch)),
      deleteSession: (id) => after(() => dataStore.deleteStudySession(id)),
      createGoal: (input) =>
        after(() => dataStore.createWeeklyGoal({ ...input, userId: input.userId ?? userId })),
      updateGoal: (id, patch) => after(() => dataStore.updateWeeklyGoal(id, patch)),
      deleteGoal: (id) => after(() => dataStore.deleteWeeklyGoal(id)),
      markNotificationRead: (id) =>
        after(async () => {
          await dataStore.markNotificationRead(id)
        }),
      markAllNotificationsRead: () =>
        after(async () => {
          const list = await dataStore.listNotifications(userId)
          await Promise.all(
            list.filter((n) => !n.read).map((n) => dataStore.markNotificationRead(n.id)),
          )
        }),
      upsertProfile: (input) =>
        after(() => dataStore.upsertProfile({ ...input, userId: input.userId ?? userId })),
      addTaskAttachment: (taskId, file) =>
        after(async () => {
          await dataStore.addTaskAttachment(taskId, file)
        }),
      removeTaskAttachment: (taskId, attachmentId) =>
        after(async () => {
          await dataStore.removeTaskAttachment(taskId, attachmentId)
        }),
      resetAllData: () =>
        after(async () => {
          const db = await getDB()
          db.close()
          resetDBCache()
          await new Promise<void>((resolve, reject) => {
            const req = indexedDB.deleteDatabase(DB_NAME)
            req.onsuccess = () => resolve()
            req.onerror = () => reject(req.error ?? new Error('Failed to reset database'))
            req.onblocked = () => resolve()
          })
          await dataStore.ensureSeeded(userId)
        }),
      getSubject: (id) => subjects.find((s) => s.id === id),
    }),
    [
      loading,
      userId,
      profile,
      subjects,
      tasks,
      notes,
      roadmaps,
      dsaProblems,
      projects,
      resources,
      sessions,
      goals,
      notifications,
      refresh,
      after,
    ],
  )

  return <AppDataContext.Provider value={value}>{children}</AppDataContext.Provider>
}

export function useAppData() {
  const ctx = useContext(AppDataContext)
  if (!ctx) throw new Error('useAppData must be used within AppDataProvider')
  return ctx
}
