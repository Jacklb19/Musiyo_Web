import { useCallback, useState } from 'react'
import { api } from './api'
import { presentation } from './presentation-config'
import { useApi } from './use-api'

export function useData<T>(load: (signal: AbortSignal) => Promise<T>) {
  const [attempt, setAttempt] = useState(0)
  const request = useCallback((signal: AbortSignal) => {
    void attempt
    return load(AbortSignal.any([signal, AbortSignal.timeout(15000)]))
  }, [load, attempt])
  return { ...useApi(request), retry: () => setAttempt(value => value + 1) }
}
export function useRecord(slug: string) {
  return useData(useCallback((signal: AbortSignal) => api.element(slug, signal), [slug]))
}
export function useTour() {
  return useData(useCallback((signal: AbortSignal) => api.tour(presentation.tourKey, signal), []))
}
