import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { getSupabase, isSupabaseConfigured } from '@/lib/supabase'

const DEMO_KEY = 'studentos-demo-mode'
const GUEST_KEY = 'studentos-guest-mode'

interface AuthContextValue {
  user: User | null
  session: Session | null
  loading: boolean
  isGuest: boolean
  isDemo: boolean
  isConfigured: boolean
  signIn: (email: string, password: string) => Promise<void>
  signUp: (email: string, password: string, displayName?: string) => Promise<void>
  signOut: () => Promise<void>
  resetPassword: (email: string) => Promise<void>
  enterDemo: () => void
  enterGuest: () => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

function readFlag(key: string): boolean {
  try {
    return localStorage.getItem(key) === '1'
  } catch {
    return false
  }
}

function writeFlag(key: string, on: boolean) {
  try {
    if (on) localStorage.setItem(key, '1')
    else localStorage.removeItem(key)
  } catch {
    /* ignore */
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const [isDemo, setIsDemo] = useState(() =>
    typeof window === 'undefined' ? true : readFlag(DEMO_KEY) || !readFlag(GUEST_KEY),
  )
  const [isGuest, setIsGuest] = useState(() =>
    typeof window === 'undefined' ? false : readFlag(GUEST_KEY) && !readFlag(DEMO_KEY),
  )

  useEffect(() => {
    const supabase = getSupabase()
    if (!supabase) {
      // Default to demo so the app is usable offline without accounts
      if (!readFlag(DEMO_KEY) && !readFlag(GUEST_KEY)) {
        writeFlag(DEMO_KEY, true)
        setIsDemo(true)
      }
      setLoading(false)
      return
    }

    let mounted = true
    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return
      setSession(data.session)
      setUser(data.session?.user ?? null)
      if (data.session) {
        setIsDemo(false)
        setIsGuest(false)
        writeFlag(DEMO_KEY, false)
        writeFlag(GUEST_KEY, false)
      }
      setLoading(false)
    })

    const { data: sub } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next)
      setUser(next?.user ?? null)
      if (next) {
        setIsDemo(false)
        setIsGuest(false)
        writeFlag(DEMO_KEY, false)
        writeFlag(GUEST_KEY, false)
      }
    })

    return () => {
      mounted = false
      sub.subscription.unsubscribe()
    }
  }, [])

  const signIn = useCallback(async (email: string, password: string) => {
    const supabase = getSupabase()
    if (!supabase) throw new Error('Supabase is not configured')
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
  }, [])

  const signUp = useCallback(
    async (email: string, password: string, displayName?: string) => {
      const supabase = getSupabase()
      if (!supabase) throw new Error('Supabase is not configured')
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { display_name: displayName ?? email.split('@')[0] },
        },
      })
      if (error) throw error
    },
    [],
  )

  const signOut = useCallback(async () => {
    const supabase = getSupabase()
    if (supabase) {
      await supabase.auth.signOut()
    }
    setUser(null)
    setSession(null)
    writeFlag(DEMO_KEY, true)
    writeFlag(GUEST_KEY, false)
    setIsDemo(true)
    setIsGuest(false)
  }, [])

  const resetPassword = useCallback(async (email: string) => {
    const supabase = getSupabase()
    if (!supabase) throw new Error('Supabase is not configured')
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth`,
    })
    if (error) throw error
  }, [])

  const enterDemo = useCallback(() => {
    writeFlag(DEMO_KEY, true)
    writeFlag(GUEST_KEY, false)
    setIsDemo(true)
    setIsGuest(false)
  }, [])

  const enterGuest = useCallback(() => {
    writeFlag(GUEST_KEY, true)
    writeFlag(DEMO_KEY, false)
    setIsGuest(true)
    setIsDemo(false)
  }, [])

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      session,
      loading,
      isGuest,
      isDemo,
      isConfigured: isSupabaseConfigured,
      signIn,
      signUp,
      signOut,
      resetPassword,
      enterDemo,
      enterGuest,
    }),
    [
      user,
      session,
      loading,
      isGuest,
      isDemo,
      signIn,
      signUp,
      signOut,
      resetPassword,
      enterDemo,
      enterGuest,
    ],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
