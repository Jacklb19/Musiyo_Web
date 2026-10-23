import { parseSurvey, parseSurveyStored } from './contract-validation.ts'
import type { GuideSurvey, GuideSurveyResponse, GuideSurveyStored } from './contracts.ts'
import { GuideRequestError } from './guide-client.ts'

// The visitor's explicit choice to keep the answers; without it nothing is sent.
export const SURVEY_CONSENT = 'anonymous-v1'

async function request(url: string, init: RequestInit, signal: AbortSignal, timeoutMs: number, fetcher: typeof fetch): Promise<unknown> {
  const deadline = AbortSignal.timeout(timeoutMs)
  try {
    const response = await fetcher(url, { ...init, signal: AbortSignal.any([signal, deadline]), cache: 'no-store', credentials: 'same-origin' })
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

export async function requestSurvey(base: string, tourKey: string, signal: AbortSignal, timeoutMs: number,
  fetcher: typeof fetch = fetch): Promise<GuideSurvey> {
  const query = new URLSearchParams({ schema_version: '1', tour_key: tourKey })
  const value = parseSurvey(await request(base + '/guide/survey?' + query, { method: 'GET' }, signal, timeoutMs, fetcher))
  if (value.tour_key !== tourKey) throw new Error('Unexpected survey context')
  return value
}

export async function storeSurveyResponse(base: string, response: GuideSurveyResponse, signal: AbortSignal, timeoutMs: number,
  fetcher: typeof fetch = fetch): Promise<GuideSurveyStored> {
  return parseSurveyStored(await request(base + '/guide/survey/responses', {
    method: 'POST', body: JSON.stringify(response),
    headers: { 'Content-Type': 'application/json', 'X-Musiyo-Survey-Consent': SURVEY_CONSENT },
  }, signal, timeoutMs, fetcher))
}

/** The answers as the survey contract expects them, in the order the questions were asked. */
export function surveyResponse(survey: GuideSurvey, chosen: Record<string, string>): GuideSurveyResponse {
  const answers = survey.questions.filter(question => chosen[question.id] && question.options.some(option => option.id === chosen[question.id]))
    .map(question => ({ question_id: question.id, option_id: chosen[question.id] }))
  return { schema_version: 1, survey_key: survey.survey_key, version: survey.version, platform: 'web', answers }
}
