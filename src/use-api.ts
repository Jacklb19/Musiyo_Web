import { useEffect, useState } from 'react'
import { ApiError } from './api'

export function useApi<T>(load: (signal: AbortSignal) => Promise<T>) {
  const [result, setResult] = useState<{ request: typeof load; data: T | null; error: string; notFound: boolean } | null>(null)
  useEffect(() => {
    const controller = new AbortController()
    load(controller.signal)
      .then((data) => {
        if (!controller.signal.aborted) setResult({ request: load, data, error: '', notFound: false })
      })
      .catch((reason: unknown) => {
        if (!controller.signal.aborted) setResult({ request: load, data: null,
          error: reason instanceof Error ? reason.message : 'Error inesperado',
          // A missing record is final; retrying only helps after a network or server failure.
          notFound: reason instanceof ApiError && reason.status === 404 })
      })
    return () => controller.abort()
  }, [load])
  return result?.request === load ? { ...result, loading: false } : { data: null, error: '', notFound: false, loading: true }
}
