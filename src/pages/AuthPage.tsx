import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'

type Mode = 'login' | 'signup' | 'reset'

export function AuthPage() {
  const navigate = useNavigate()
  const { signIn, signUp, resetPassword, enterDemo, isConfigured } = useAuth()
  const [mode, setMode] = useState<Mode>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!isConfigured) {
      toast.error('Supabase is not configured. Use demo mode instead.')
      return
    }
    setLoading(true)
    try {
      if (mode === 'login') {
        await signIn(email, password)
        toast.success('Signed in')
        navigate('/')
      } else if (mode === 'signup') {
        await signUp(email, password, name)
        toast.success('Check your email to confirm signup if required')
        navigate('/')
      } else {
        await resetPassword(email)
        toast.success('Password reset email sent')
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Auth failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-dvh items-center justify-center bg-[var(--background)] px-4">
      <div className="w-full max-w-md rounded-3xl bg-card p-6 shadow-[var(--shadow-card)]">
        <Link to="/welcome" className="font-display text-xl font-bold text-primary">
          StudentOS
        </Link>
        <h1 className="mt-4 font-display text-2xl font-bold">
          {mode === 'login' ? 'Log in' : mode === 'signup' ? 'Create account' : 'Reset password'}
        </h1>

        {!isConfigured && (
          <div className="mt-4 rounded-2xl bg-amber-50 p-3 text-sm text-amber-900 dark:bg-amber-950/40 dark:text-amber-100">
            Supabase is not configured. You can still use the full app in local demo mode.
            <Button
              className="mt-3 w-full"
              onClick={() => {
                enterDemo()
                navigate('/')
              }}
            >
              Continue in demo mode
            </Button>
          </div>
        )}

        <form className="mt-6 space-y-3" onSubmit={submit}>
          {mode === 'signup' && (
            <div>
              <Label htmlFor="name">Display name</Label>
              <Input id="name" value={name} onChange={(e) => setName(e.target.value)} className="mt-1" />
            </div>
          )}
          <div>
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1"
            />
          </div>
          {mode !== 'reset' && (
            <div>
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1"
              />
            </div>
          )}
          <Button type="submit" className="w-full" disabled={loading || !isConfigured}>
            {loading ? 'Please wait…' : mode === 'login' ? 'Log in' : mode === 'signup' ? 'Sign up' : 'Send reset link'}
          </Button>
        </form>

        <div className="mt-4 space-y-1 text-center text-sm text-muted-foreground">
          {mode !== 'login' && (
            <button type="button" className="block w-full hover:text-primary" onClick={() => setMode('login')}>
              Back to log in
            </button>
          )}
          {mode === 'login' && (
            <>
              <button type="button" className="block w-full hover:text-primary" onClick={() => setMode('signup')}>
                Create an account
              </button>
              <button type="button" className="block w-full hover:text-primary" onClick={() => setMode('reset')}>
                Forgot password?
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
