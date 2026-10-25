import { openDB, type DBSchema, type IDBPDatabase } from 'idb'

import type {
  AppNotification,
  DsaProblem,
  FileBlobRecord,
  LearningResource,
  Note,
  Profile,
  Project,
  Reminder,
  Roadmap,
  StudySession,
  Subject,
  Task,
  WeeklyGoal,
} from '@/types'

export const DB_NAME = 'StudentOSDB'
export const DB_VERSION = 1

export interface StudentOSDB extends DBSchema {
  profiles: {
    key: string
    value: Profile
    indexes: { 'by-user': string }
  }
  subjects: {
    key: string
    value: Subject
    indexes: { 'by-user': string }
  }
  tasks: {
    key: string
    value: Task
    indexes: {
      'by-user': string
      'by-subject': string
      'by-status': string
      'by-dueDate': string
    }
  }
  notes: {
    key: string
    value: Note
    indexes: { 'by-user': string; 'by-subject': string }
  }
  roadmaps: {
    key: string
    value: Roadmap
    indexes: { 'by-user': string }
  }
  learningResources: {
    key: string
    value: LearningResource
    indexes: { 'by-user': string; 'by-subject': string }
  }
  dsaProblems: {
    key: string
    value: DsaProblem
    indexes: { 'by-user': string; 'by-status': string }
  }
  projects: {
    key: string
    value: Project
    indexes: { 'by-user': string; 'by-status': string }
  }
  studySessions: {
    key: string
    value: StudySession
    indexes: { 'by-user': string; 'by-startedAt': string }
  }
  weeklyGoals: {
    key: string
    value: WeeklyGoal
    indexes: { 'by-user': string; 'by-weekStart': string }
  }
  reminders: {
    key: string
    value: Reminder
    indexes: { 'by-user': string; 'by-fireAt': string }
  }
  notifications: {
    key: string
    value: AppNotification
    indexes: { 'by-user': string; 'by-read': IDBValidKey }
  }
  fileBlobs: {
    key: string
    value: FileBlobRecord
  }
  meta: {
    key: string
    value: { key: string; value: unknown }
  }
}

export type StoreName = keyof StudentOSDB

let dbPromise: Promise<IDBPDatabase<StudentOSDB>> | null = null

export function getDB(): Promise<IDBPDatabase<StudentOSDB>> {
  if (!dbPromise) {
    dbPromise = openDB<StudentOSDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('profiles')) {
          const store = db.createObjectStore('profiles', { keyPath: 'id' })
          store.createIndex('by-user', 'userId')
        }

        if (!db.objectStoreNames.contains('subjects')) {
          const store = db.createObjectStore('subjects', { keyPath: 'id' })
          store.createIndex('by-user', 'userId')
        }

        if (!db.objectStoreNames.contains('tasks')) {
          const store = db.createObjectStore('tasks', { keyPath: 'id' })
          store.createIndex('by-user', 'userId')
          store.createIndex('by-subject', 'subjectId')
          store.createIndex('by-status', 'status')
          store.createIndex('by-dueDate', 'dueDate')
        }

        if (!db.objectStoreNames.contains('notes')) {
          const store = db.createObjectStore('notes', { keyPath: 'id' })
          store.createIndex('by-user', 'userId')
          store.createIndex('by-subject', 'subjectId')
        }

        if (!db.objectStoreNames.contains('roadmaps')) {
          const store = db.createObjectStore('roadmaps', { keyPath: 'id' })
          store.createIndex('by-user', 'userId')
        }

        if (!db.objectStoreNames.contains('learningResources')) {
          const store = db.createObjectStore('learningResources', {
            keyPath: 'id',
          })
          store.createIndex('by-user', 'userId')
          store.createIndex('by-subject', 'subjectId')
        }

        if (!db.objectStoreNames.contains('dsaProblems')) {
          const store = db.createObjectStore('dsaProblems', { keyPath: 'id' })
          store.createIndex('by-user', 'userId')
          store.createIndex('by-status', 'status')
        }

        if (!db.objectStoreNames.contains('projects')) {
          const store = db.createObjectStore('projects', { keyPath: 'id' })
          store.createIndex('by-user', 'userId')
          store.createIndex('by-status', 'status')
        }

        if (!db.objectStoreNames.contains('studySessions')) {
          const store = db.createObjectStore('studySessions', { keyPath: 'id' })
          store.createIndex('by-user', 'userId')
          store.createIndex('by-startedAt', 'startedAt')
        }

        if (!db.objectStoreNames.contains('weeklyGoals')) {
          const store = db.createObjectStore('weeklyGoals', { keyPath: 'id' })
          store.createIndex('by-user', 'userId')
          store.createIndex('by-weekStart', 'weekStart')
        }

        if (!db.objectStoreNames.contains('reminders')) {
          const store = db.createObjectStore('reminders', { keyPath: 'id' })
          store.createIndex('by-user', 'userId')
          store.createIndex('by-fireAt', 'fireAt')
        }

        if (!db.objectStoreNames.contains('notifications')) {
          const store = db.createObjectStore('notifications', { keyPath: 'id' })
          store.createIndex('by-user', 'userId')
          store.createIndex('by-read', 'read')
        }

        if (!db.objectStoreNames.contains('fileBlobs')) {
          db.createObjectStore('fileBlobs', { keyPath: 'id' })
        }

        if (!db.objectStoreNames.contains('meta')) {
          db.createObjectStore('meta', { keyPath: 'key' })
        }
      },
    })
  }
  return dbPromise
}

/** Reset the cached promise (useful in tests). */
export function resetDBCache(): void {
  dbPromise = null
}
