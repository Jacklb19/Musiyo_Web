import { parseGuideResponse } from './contract-validation.ts'
import type { GuideQuestion, GuideResponse } from './contracts.ts'

export class GuideRequestError extends Error {
  status: number | null
  retryAfterSeconds: number | null
  constructor(status: number | null, retryAfterSeconds: number | null = null) {
    super('Guide request failed')
    this.status = status
    this.retryAfterSeconds = retryAfterSeconds
  }
}

export async function requestGuide(base: string, question: GuideQuestion, signal: AbortSignal,
  timeoutMs: number, fetcher: typeof fetch = fetch): Promise<GuideResponse> {
  const deadline = AbortSignal.timeout(timeoutMs)
  try {
    const response = await fetcher(base + '/guide/questions', {
      method: 'POST', signal: AbortSignal.any([signal, deadline]), cache: 'no-store', credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(question),
    })
    if (!response.ok) {
      const seconds = Number(response.headers.get('Retry-After'))
      const retryAfter = response.status === 429
        ? (Number.isInteger(seconds) && seconds > 0 && seconds <= 3600 ? seconds : 60) : null
      throw new GuideRequestError(response.status, retryAfter)
    }
    const body = await response.json()
    signal.throwIfAborted()
    deadline.throwIfAborted()
    return parseGuideResponse(body)
  } catch (error) {
    signal.throwIfAborted()
    if (error instanceof GuideRequestError) throw error
    throw new GuideRequestError(deadline.aborted ? 408 : null)
  }
}
