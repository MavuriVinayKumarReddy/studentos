import { useState } from 'react'
import { Download, Upload, Trash2, Bell, Cloud, HardDrive } from 'lucide-react'
import { useAppData } from '@/context/AppDataContext'
import { useAuth } from '@/context/AuthContext'
import { useTheme } from '@/hooks/useTheme'
import { ThemeToggle } from '@/components/layout/ThemeToggle'
import { InstallPrompt } from '@/components/layout/InstallPrompt'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { dataStore } from '@/repositories'
import {
  exportAllJson,
  exportTasksCsv,
  importTasksCsv,
  previewTasksCsv,
  type ImportTasksPreview,
} from '@/utils/export-import'
import { toast } from 'sonner'

export function SettingsPage() {
  const { profile, tasks, upsertProfile, resetAllData, userId, notifications, markAllNotificationsRead } =
    useAppData()
  const { signOut, isDemo, isConfigured, user } = useAuth()
  const { theme, setTheme } = useTheme()
  const [displayName, setDisplayName] = useState(profile?.displayName ?? '')
  const [csvPreview, setCsvPreview] = useState<ImportTasksPreview | null>(null)
  const [notifPerm, setNotifPerm] = useState(
    typeof Notification !== 'undefined' ? Notification.permission : 'denied',
  )
  const mode = dataStore.getMode()

  const saveProfile = async () => {
    await upsertProfile({
      userId,
      displayName: displayName.trim() || 'Student',
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      email: profile?.email ?? user?.email,
    })
    toast.success('Profile saved')
  }

  const requestNotifs = async () => {
    if (!('Notification' in window)) {
      toast.error('Notifications not supported in this browser')
      return
    }
    const perm = await Notification.requestPermission()
    setNotifPerm(perm)
    if (perm === 'granted') {
      toast.success('Browser notifications enabled')
      new Notification('StudentOS', { body: 'Reminders will appear when the app is open or supported by your browser.' })
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-4 pb-8">
      <div>
        <h1 className="font-display text-2xl font-bold">Settings</h1>
        <p className="text-sm text-muted-foreground">Profile, data, and installation</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Profile</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Input
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="Display name"
          />
          <Button onClick={saveProfile}>Save profile</Button>
          <p className="text-xs text-muted-foreground">
            Mode: {isDemo ? 'Demo / local' : user ? `Signed in as ${user.email}` : 'Guest'}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Appearance</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-medium">Theme</p>
            <p className="text-xs text-muted-foreground">Current: {theme}</p>
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" variant={theme === 'light' ? 'default' : 'outline'} onClick={() => setTheme('light')}>
              Light
            </Button>
            <Button size="sm" variant={theme === 'dark' ? 'default' : 'outline'} onClick={() => setTheme('dark')}>
              Dark
            </Button>
            <ThemeToggle />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            {mode === 'cloud' ? <Cloud className="size-4" /> : <HardDrive className="size-4" />}
            Data storage
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>
            Active mode: <strong className="text-foreground">{mode === 'cloud' ? 'Cloud-ready (Supabase configured)' : 'Local only (IndexedDB)'}</strong>
          </p>
          {!isConfigured && (
            <p>
              Supabase credentials are not set. Data stays on this device. Add{' '}
              <code className="text-xs">VITE_SUPABASE_URL</code> and{' '}
              <code className="text-xs">VITE_SUPABASE_ANON_KEY</code> to enable auth/cloud sync.
              The app never claims cloud sync unless it is actually implemented and configured.
            </p>
          )}
          <p>Attachment files are stored as blobs in IndexedDB (or Supabase Storage when wired), not as text in the database.</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Import / Export</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => exportTasksCsv(tasks)}>
              <Download className="size-4" /> Export tasks CSV
            </Button>
            <Button
              variant="outline"
              onClick={async () => {
                await exportAllJson()
                toast.success('JSON backup downloaded (metadata; attachment blobs not embedded)')
              }}
            >
              <Download className="size-4" /> Export JSON backup
            </Button>
            <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-border px-3 py-2 text-sm">
              <Upload className="size-4" />
              Import CSV…
              <input
                type="file"
                accept=".csv,text/csv"
                className="hidden"
                onChange={async (e) => {
                  const file = e.target.files?.[0]
                  if (!file) return
                  const text = await file.text()
                  const preview = previewTasksCsv(text)
                  setCsvPreview(preview)
                  if (preview.errors.length) toast.message(preview.errors[0])
                  toast.message(`Previewing ${preview.rows.length} rows — confirm import below`)
                }}
              />
            </label>
          </div>
          {csvPreview && (
            <div className="rounded-xl border border-border p-3 text-sm">
              <p className="mb-2 font-medium">Import preview ({csvPreview.rows.length} tasks)</p>
              <ul className="mb-3 max-h-40 space-y-1 overflow-y-auto text-xs text-muted-foreground">
                {csvPreview.rows.slice(0, 10).map((t, i) => (
                  <li key={i}>
                    {t.title} · {t.dueDate}
                  </li>
                ))}
              </ul>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={async () => {
                    const { imported } = await importTasksCsv(csvPreview, userId)
                    setCsvPreview(null)
                    toast.success(`Imported ${imported} tasks (appended, existing data kept)`)
                  }}
                >
                  Confirm append import
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setCsvPreview(null)}>
                  Cancel
                </Button>
              </div>
            </div>
          )}
          <p className="text-xs text-muted-foreground">
            Exports include attachment metadata/references, not raw file bytes unless separately backed up.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Bell className="size-4" /> Notifications
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <p className="text-muted-foreground">
            Browser notifications need permission and may not fire when the app is closed, depending on
            the browser and service worker. StudentOS does not promise reliable background alarms without
            a push backend.
          </p>
          <p>Permission: {notifPerm}</p>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={requestNotifs}>
              Request permission
            </Button>
            <Button
              variant="outline"
              onClick={async () => {
                await markAllNotificationsRead()
                toast.success(`Marked ${notifications.length} notifications`)
              }}
            >
              Mark in-app as read
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Install StudentOS (PWA)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>
            On Android Chrome: open the hosted HTTPS URL → menu → <strong>Install app</strong> / Add to
            Home screen. Local LAN IP access may need HTTPS or browser flags.
          </p>
          <InstallPrompt />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base text-destructive">Danger zone</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <Button
            variant="destructive"
            onClick={async () => {
              if (!confirm('Reset ALL local StudentOS data and reseed demo? This cannot be undone.'))
                return
              await resetAllData()
              toast.success('Data reset')
            }}
          >
            <Trash2 className="size-4" /> Reset local data
          </Button>
          <Button variant="outline" onClick={() => signOut()}>
            Sign out / return to demo
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
