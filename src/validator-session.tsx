import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import { api, ApiError } from './api'
import type { ValidatorSession } from './contracts'

const anonymous: ValidatorSession = { schema_version: 1, authenticated: false, user: null, csrf_token: null }
type SessionContextValue = {
  session: ValidatorSession | null
  loading: boolean
  error: string
  refresh: () => void
  signIn: (username: string, password: string) => Promise<void>
  signOut: () => Promise<void>
  expire: () => void
}
const SessionContext = createContext<SessionContextValue | null>(null)

export function ValidatorSessionProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<ValidatorSession | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [attempt, setAttempt] = useState(0)
  const refresh = useCallback(() => {
    setLoading(true)
    setError('')
    setAttempt((value) => value + 1)
  }, [])
  const expire = useCallback(() => setSession(anonymous), [])

  useEffect(() => {
    const controller = new AbortController()
    api.session(controller.signal).then((value) => {
      if (!controller.signal.aborted) setSession(value)
    }).catch((reason: unknown) => {
      if (!controller.signal.aborted) {
        setSession(null)
        setError(reason instanceof Error ? reason.message : 'No fue posible consultar la sesión')
      }
    }).finally(() => { if (!controller.signal.aborted) setLoading(false) })
    return () => controller.abort()
  }, [attempt])

  async function signIn(username: string, password: string) {
    await api.login(username, password)
    const verified = await api.session()
    if (!verified.authenticated) throw new Error('El navegador no pudo conservar la sesión segura. Abre el sitio mediante HTTPS o localhost.')
    setSession(verified)
    setError('')
  }

  async function signOut() {
    if (session?.csrf_token) {
      try { await api.logout(session.csrf_token) }
      catch (reason) { if (!(reason instanceof ApiError) || reason.status !== 401) throw reason }
    }
    setSession(anonymous)
  }

  return <SessionContext value={{ session, loading, error, refresh, signIn, signOut, expire }}>{children}</SessionContext>
}

export function useValidatorSession() {
  const context = useContext(SessionContext)
  if (!context) throw new Error('Validator session provider is missing')
  return context
}
