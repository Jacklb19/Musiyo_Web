import { useEffect, useState } from 'react'

export function useApi<T>(load: (signal: AbortSignal) => Promise<T>) {
  const [result, setResult] = useState<{ request: typeof load; data: T | null; error: string } | null>(null)
  useEffect(() => {
    const controller = new AbortController()
    load(controller.signal)
      .then((data) => {
        if (!controller.signal.aborted) setResult({ request: load, data, error: '' })
      })
      .catch((reason: unknown) => {
        if (!controller.signal.aborted) setResult({ request: load, data: null,
          error: reason instanceof Error ? reason.message : 'Error inesperado' })
      })
    return () => controller.abort()
  }, [load])
  return result?.request === load ? { ...result, loading: false } : { data: null, error: '', loading: true }
}
