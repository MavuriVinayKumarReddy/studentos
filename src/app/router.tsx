import { useEffect, useState } from 'react'
import { BrowserRouter, Navigate, Outlet, Route, Routes } from 'react-router-dom'
import { AppShell } from '@/components/layout/AppShell'
import { CommandPalette } from '@/components/search/CommandPalette'
import { useAuth } from '@/context/AuthContext'
import { WelcomePage } from '@/pages/WelcomePage'
import { HomePage } from '@/pages/HomePage'
import { TimelinePage } from '@/pages/TimelinePage'
import { NotesPage } from '@/pages/NotesPage'
import { GrowthPage } from '@/pages/GrowthPage'
import { SubjectsPage } from '@/pages/SubjectsPage'
import { AnalyticsPage } from '@/pages/AnalyticsPage'
import { StudyPage } from '@/pages/StudyPage'
import { SettingsPage } from '@/pages/SettingsPage'
import { AuthPage } from '@/pages/AuthPage'
import { TaskDetailPage } from '@/pages/TaskDetailPage'
import { NotFoundPage } from '@/pages/NotFoundPage'
import { Skeleton } from '@/components/ui/skeleton'

function ProtectedLayout() {
  const { loading, user, isDemo, isGuest } = useAuth()
  const [cmdOpen, setCmdOpen] = useState(false)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setCmdOpen((v) => !v)
      }
    }
    const onOpen = () => setCmdOpen(true)
    window.addEventListener('keydown', onKey)
    window.addEventListener('studentos:command-palette', onOpen)
    return () => {
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('studentos:command-palette', onOpen)
    }
  }, [])

  if (loading) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-[var(--background)] p-6">
        <div className="w-full max-w-sm space-y-3">
          <Skeleton className="h-10 w-40" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
      </div>
    )
  }

  const allowed = Boolean(user) || isDemo || isGuest
  if (!allowed) return <Navigate to="/welcome" replace />

  return (
    <>
      <AppShell>
        <Outlet />
      </AppShell>
      <CommandPalette open={cmdOpen} onOpenChange={setCmdOpen} />
    </>
  )
}

export function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/welcome" element={<WelcomePage />} />
        <Route path="/auth" element={<AuthPage />} />
        <Route element={<ProtectedLayout />}>
          <Route index element={<HomePage />} />
          <Route path="timeline" element={<TimelinePage />} />
          <Route path="notes" element={<NotesPage />} />
          <Route path="growth" element={<GrowthPage />} />
          <Route path="subjects" element={<SubjectsPage />} />
          <Route path="analytics" element={<AnalyticsPage />} />
          <Route path="study" element={<StudyPage />} />
          <Route path="settings" element={<SettingsPage />} />
          <Route path="tasks/:id" element={<TaskDetailPage />} />
        </Route>
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </BrowserRouter>
  )
}
