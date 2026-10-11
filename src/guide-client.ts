import { parseGuideResponse } from './contract-validation.ts'
import type { GuideQuestion, GuideResponse } from './contracts.ts'

export class GuideRequestError extends Error {
  status: number | null
  constructor(status: number | null) {
    super('Guide request failed')
    this.status = status
  }
}

export async function requestGuide(base: string, question: GuideQuestion, signal: AbortSignal,
  timeoutMs: number, fetcher: typeof fetch = fetch): Promise<GuideResponse> {
  const deadline = AbortSignal.timeout(timeoutMs)
  const response = await fetcher(base + '/guide/questions', {
    method: 'POST', signal: AbortSignal.any([signal, deadline]), cache: 'no-store', credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(question),
  }).catch(error => {
    if (signal.aborted) throw error
    throw new GuideRequestError(deadline.aborted ? 408 : null)
  })
  if (!response.ok) throw new GuideRequestError(response.status)
  return parseGuideResponse(await response.json())
}
