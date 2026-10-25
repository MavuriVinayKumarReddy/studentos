import { useCallback, useEffect, useState } from 'react'

export type ThemeMode = 'light' | 'dark' | 'system'

const STORAGE_KEY = 'studentos-theme'

function getSystemDark(): boolean {
  return (
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-color-scheme: dark)').matches
  )
}

function applyTheme(mode: ThemeMode) {
  const root = document.documentElement
  const dark = mode === 'dark' || (mode === 'system' && getSystemDark())
  root.classList.toggle('dark', dark)
  root.style.colorScheme = dark ? 'dark' : 'light'
}

function readStored(): ThemeMode {
  try {
    const v = localStorage.getItem(STORAGE_KEY)
    if (v === 'light' || v === 'dark' || v === 'system') return v
  } catch {
    /* ignore */
  }
  return 'system'
}

export function useTheme() {
  const [theme, setThemeState] = useState<ThemeMode>(() =>
    typeof window === 'undefined' ? 'system' : readStored(),
  )
  const [resolved, setResolved] = useState<'light' | 'dark'>(() => {
    if (typeof window === 'undefined') return 'light'
    const mode = readStored()
    return mode === 'dark' || (mode === 'system' && getSystemDark())
      ? 'dark'
      : 'light'
  })

  useEffect(() => {
    applyTheme(theme)
    setResolved(
      theme === 'dark' || (theme === 'system' && getSystemDark())
        ? 'dark'
        : 'light',
    )
    try {
      localStorage.setItem(STORAGE_KEY, theme)
    } catch {
      /* ignore */
    }
  }, [theme])

  useEffect(() => {
    if (theme !== 'system') return
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const handler = () => {
      applyTheme('system')
      setResolved(mq.matches ? 'dark' : 'light')
    }
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [theme])

  const setTheme = useCallback((mode: ThemeMode) => {
    setThemeState(mode)
  }, [])

  const toggle = useCallback(() => {
    setThemeState((prev) => {
      const current =
        prev === 'system' ? (getSystemDark() ? 'dark' : 'light') : prev
      return current === 'dark' ? 'light' : 'dark'
    })
  }, [])

  return { theme, setTheme, toggle, resolved }
}
