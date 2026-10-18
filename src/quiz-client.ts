import { parseQuiz, parseQuizAnswer } from './contract-validation.ts'
import type { GuideQuizAnswer, GuideQuizAnswerResult, GuideQuiz } from './contracts.ts'
import { GuideRequestError } from './guide-client.ts'

async function request(base: string, path: string, signal: AbortSignal, timeoutMs: number,
  body: GuideQuizAnswer | null, fetcher: typeof fetch): Promise<unknown> {
  const deadline = AbortSignal.timeout(timeoutMs)
  try {
    const response = await fetcher(base + path, { signal: AbortSignal.any([signal, deadline]),
      method: body ? 'POST' : 'GET', cache: 'no-store', credentials: 'same-origin',
      headers: body ? { 'Content-Type': 'application/json' } : undefined, body: body ? JSON.stringify(body) : undefined })
    if (!response.ok) {
      const seconds = Number(response.headers.get('Retry-After'))
      throw new GuideRequestError(response.status, response.status === 429
        ? (Number.isInteger(seconds) && seconds > 0 && seconds <= 3600 ? seconds : 60) : null)
    }
    const value = await response.json()
    signal.throwIfAborted(); deadline.throwIfAborted()
    return value
  } catch (error) {
    signal.throwIfAborted()
    if (error instanceof GuideRequestError) throw error
    throw new GuideRequestError(deadline.aborted ? 408 : null)
  }
}

export async function requestQuiz(base: string, tourKey: string, signal: AbortSignal, timeoutMs: number,
  fetcher: typeof fetch = fetch): Promise<GuideQuiz> {
  const value = parseQuiz(await request(base, '/guide/quiz?' + new URLSearchParams({ schema_version: '1', tour_key: tourKey }), signal, timeoutMs, null, fetcher))
  if (value.tour_key !== tourKey || value.room_key !== null) throw new Error('Unexpected quiz context')
  return value
}

export async function requestQuizAnswer(base: string, answer: GuideQuizAnswer, signal: AbortSignal,
  timeoutMs: number, fetcher: typeof fetch = fetch): Promise<GuideQuizAnswerResult> {
  const value = parseQuizAnswer(await request(base, '/guide/quiz/answers', signal, timeoutMs, answer, fetcher))
  if (value.id !== answer.id) throw new Error('Unexpected quiz answer')
  return value
}
