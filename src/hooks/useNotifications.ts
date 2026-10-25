import { useCallback, useEffect, useState } from 'react'

export type BrowserPermission = NotificationPermission | 'unsupported'

export interface InAppNotification {
  id: string
  title: string
  body: string
  createdAt: string
  read: boolean
  href?: string
}

const IN_APP_KEY = 'studentos-inapp-notifications'

function loadInApp(): InAppNotification[] {
  try {
    const raw = localStorage.getItem(IN_APP_KEY)
    if (!raw) return []
    return JSON.parse(raw) as InAppNotification[]
  } catch {
    return []
  }
}

function saveInApp(items: InAppNotification[]) {
  try {
    localStorage.setItem(IN_APP_KEY, JSON.stringify(items.slice(0, 50)))
  } catch {
    /* ignore */
  }
}

export function useNotifications() {
  const [permission, setPermission] = useState<BrowserPermission>(() => {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      return 'unsupported'
    }
    return Notification.permission
  })
  const [inApp, setInApp] = useState<InAppNotification[]>(() =>
    typeof window === 'undefined' ? [] : loadInApp(),
  )

  useEffect(() => {
    saveInApp(inApp)
  }, [inApp])

  const requestPermission = useCallback(async () => {
    if (!('Notification' in window)) {
      setPermission('unsupported')
      return 'unsupported' as const
    }
    const result = await Notification.requestPermission()
    setPermission(result)
    return result
  }, [])

  const pushBrowser = useCallback(
    (title: string, options?: NotificationOptions) => {
      if (!('Notification' in window) || Notification.permission !== 'granted') {
        return false
      }
      try {
        new Notification(title, {
          icon: '/icons/icon-192.png',
          badge: '/icons/icon-192.png',
          ...options,
        })
        return true
      } catch {
        return false
      }
    },
    [],
  )

  const pushInApp = useCallback(
    (title: string, body: string, href?: string) => {
      const item: InAppNotification = {
        id: crypto.randomUUID(),
        title,
        body,
        href,
        read: false,
        createdAt: new Date().toISOString(),
      }
      setInApp((prev) => [item, ...prev])
      return item
    },
    [],
  )

  const markRead = useCallback((id: string) => {
    setInApp((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n)),
    )
  }, [])

  const markAllRead = useCallback(() => {
    setInApp((prev) => prev.map((n) => ({ ...n, read: true })))
  }, [])

  const clearAll = useCallback(() => setInApp([]), [])

  const unreadCount = inApp.filter((n) => !n.read).length

  return {
    permission,
    requestPermission,
    pushBrowser,
    pushInApp,
    inApp,
    markRead,
    markAllRead,
    clearAll,
    unreadCount,
  }
}
