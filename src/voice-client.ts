import { parseGuideResponse } from './contract-validation.ts'
import type { GuideQuestion, GuideVoiceAnswer, GuideTranscription, VoiceCapabilities } from './contracts.ts'
import { GuideRequestError } from './guide-client.ts'

const consent = { 'X-Musiyo-Voice-Consent': 'request-only-v1' }

export async function voiceRequest(base: string, path: string, signal: AbortSignal, timeoutMs: number,
  body?: GuideQuestion | Blob, fetcher: typeof fetch = fetch): Promise<unknown> {
  const deadline = AbortSignal.timeout(timeoutMs)
  try {
    const response = await fetcher(base + path, { method: body ? 'POST' : 'GET',
      signal: AbortSignal.any([signal, deadline]), cache: 'no-store', credentials: 'same-origin',
      headers: body ? { ...consent, 'Content-Type': body instanceof Blob ? 'audio/wav' : 'application/json' } : {},
      body: body instanceof Blob ? body : body ? JSON.stringify(body) : undefined })
    if (!response.ok) {
      const delay = Number(response.headers.get('Retry-After'))
      throw new GuideRequestError(response.status, response.status === 429 ? (Number.isInteger(delay) && delay > 0 && delay <= 3600 ? delay : 60) : null)
    }
    const value: unknown = await response.json()
    signal.throwIfAborted(); deadline.throwIfAborted()
    return value
  } catch (failure) {
    signal.throwIfAborted()
    if (failure instanceof GuideRequestError) throw failure
    throw new GuideRequestError(deadline.aborted ? 408 : null)
  }
}

function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Invalid voice contract')
  return value as Record<string, unknown>
}
function keys(value: Record<string, unknown>, expected: string[]) {
  if (Object.keys(value).length !== expected.length || expected.some(key => !(key in value))) throw new Error('Invalid voice fields')
}

export function parseVoiceCapabilities(value: unknown): VoiceCapabilities {
  const item = record(value)
  keys(item, ['schema_version', 'transcription', 'synthesis', 'processing', 'retention', 'input_mime', 'max_input_bytes', 'max_input_seconds', 'request_timeout_seconds'])
  if (item.schema_version !== 1 || !['disabled', 'configured'].includes(String(item.transcription))
    || !['disabled', 'configured'].includes(String(item.synthesis)) || item.processing !== 'backend_local'
    || item.retention !== 'request_only' || item.input_mime !== 'audio/wav'
    || !Number.isInteger(item.max_input_bytes) || Number(item.max_input_bytes) < 1000 || Number(item.max_input_bytes) > 5000000
    || !Number.isInteger(item.max_input_seconds) || Number(item.max_input_seconds) < 1 || Number(item.max_input_seconds) > 30
    || !Number.isInteger(item.request_timeout_seconds) || Number(item.request_timeout_seconds) < 5 || Number(item.request_timeout_seconds) > 55) throw new Error('Invalid voice capability limits')
  return item as unknown as VoiceCapabilities
}

export function parseVoiceAnswer(value: unknown): GuideVoiceAnswer {
  const item = record(value)
  keys(item, ['schema_version', 'response', 'speech_status', 'audio'])
  const response = parseGuideResponse(item.response)
  if (item.schema_version !== 1 || !['ready', 'disabled', 'unavailable', 'not_applicable'].includes(String(item.speech_status))
    || (item.speech_status === 'ready') !== (item.audio !== null)
    || (response.status !== 'answered') !== (item.speech_status === 'not_applicable')) throw new Error('Inconsistent voice answer')
  if (item.audio !== null) {
    const audio = record(item.audio)
    keys(audio, ['mime', 'data_base64'])
    if (audio.mime !== 'audio/wav' || typeof audio.data_base64 !== 'string' || !audio.data_base64.length
      || audio.data_base64.length > 4000000 || !/^[A-Za-z0-9+/]*={0,2}$/.test(audio.data_base64)
      || audio.data_base64.length % 4 !== 0) throw new Error('Invalid voice audio')
  }
  return item as unknown as GuideVoiceAnswer
}

export function parseTranscription(value: unknown): GuideTranscription {
  const item = record(value)
  keys(item, ['schema_version', 'text'])
  if (item.schema_version !== 1 || typeof item.text !== 'string' || item.text.trim().length < 3 || item.text.length > 500) throw new Error('Invalid transcription')
  return item as unknown as GuideTranscription
}

export function speechBlob(answer: GuideVoiceAnswer): Blob | null {
  if (!answer.audio) return null
  const bytes = Uint8Array.from(atob(answer.audio.data_base64), character => character.charCodeAt(0))
  return new Blob([bytes], { type: answer.audio.mime })
}
