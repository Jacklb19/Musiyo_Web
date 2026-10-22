import { parseCatalog, parseFacets, parseElement, parseMuseumCredits, parseRegistration, parseTour, parseResourceAccess, parseValidatorSession } from './contract-validation'

import { requestQuiz, requestQuizAnswer } from './quiz-client'
import type { GuideQuizAnswer } from './contracts'
import { parseVoiceAnswer, parseVoiceCapabilities, parseTranscription, voiceRequest } from './voice-client'
import { requestGuide } from './guide-client'
import { guideConfig } from './guide-config'
import type { GuideQuestion, DetailCorrection, RegistrationRequest } from './contracts'

export class ApiError extends Error {
  constructor(public status: number, message: string) { super(message) }
}

const base = (import.meta.env.VITE_API_BASE_URL || '/api/v1').replace(/\/$/, '')

async function get<T>(path: string, signal?: AbortSignal, method = 'GET'): Promise<T> {
  const response = await fetch(base + path, { signal, method })
  if (!response.ok) {
    throw new Error(response.status === 404 ? 'Contenido no disponible' : 'No fue posible consultar la API')
  }
  return response.json() as Promise<T>
}

async function validatorRequest(path: string, method = 'GET', body?: unknown, csrf?: string, signal?: AbortSignal): Promise<unknown> {
  const response = await fetch(base + path, { method, signal, credentials: 'same-origin', cache: 'no-store',
    headers: { ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}), ...(csrf ? { 'X-CSRF-Token': csrf } : {}) },
    body: body !== undefined ? JSON.stringify(body) : undefined })
  if (!response.ok) {
    const messages: Record<number, string> = {
      401: method === 'POST' && path === '/auth/login' ? 'No fue posible iniciar sesión. Revisa tus datos o espera si hubo varios intentos.' : 'La sesión terminó. Vuelve a iniciar sesión.',
      403: 'La sesión o esta ficha no están disponibles para corregir. Vuelve a iniciar sesión y consulta la ficha.',
      404: 'La ficha no está disponible', 422: 'Revisa la longitud de los textos y las interpretaciones de la ficha.',
      429: 'Demasiados intentos. Espera un minuto antes de volver a intentar.' }
    const registration: Record<number, string> = {
      401: 'El código de invitación no es válido. Pídelo de nuevo al responsable del museo.',
      403: 'El registro de validadores no está habilitado en este momento.',
      409: 'Ese usuario ya existe; elige otro.',
      422: 'Revisa los datos: usuario de 3 a 100 caracteres (letras, números, punto o guion), tu nombre y una contraseña de al menos 12 caracteres.' }
    const known = path === '/auth/register' ? registration[response.status] || messages[response.status] : messages[response.status]
    throw new ApiError(response.status, known || 'El servicio no está disponible. Inténtalo de nuevo.')
  }
  return response.status === 204 ? null : response.json()
}

export const api = {
  voiceCapabilities: async (signal: AbortSignal) => parseVoiceCapabilities(await voiceRequest(base, '/guide/voice-capabilities', signal, 10000)),
  guideVoiceAnswer: async (question: GuideQuestion, signal: AbortSignal) => parseVoiceAnswer(await voiceRequest(base, '/guide/voice-answers', signal, 60000, question)),
  guideTranscription: async (audio: Blob, signal: AbortSignal) => parseTranscription(await voiceRequest(base, '/guide/transcriptions?schema_version=1', signal, 60000, audio)),
  quiz: (tourKey: string, signal: AbortSignal) => requestQuiz(base, tourKey, signal, guideConfig.requestTimeoutMs),
  quizAnswer: (answer: GuideQuizAnswer, signal: AbortSignal) => requestQuizAnswer(base, answer, signal, guideConfig.requestTimeoutMs),
  guideQuestion: (question: GuideQuestion, signal: AbortSignal) => requestGuide(base, question, signal, guideConfig.requestTimeoutMs),
  session: async (signal?: AbortSignal) => parseValidatorSession(await validatorRequest('/auth/session', 'GET', undefined, undefined, signal)),
  login: async (username: string, password: string) => parseValidatorSession(await validatorRequest('/auth/login', 'POST', { username, password })),
  logout: async (csrf: string) => { await validatorRequest('/auth/logout', 'POST', undefined, csrf) },
  registration: async (signal?: AbortSignal) => parseRegistration(await validatorRequest('/auth/registration', 'GET', undefined, undefined, signal)),
  register: async (details: RegistrationRequest) => parseValidatorSession(await validatorRequest('/auth/register', 'POST', details)),
  correct: async (slug: string, correction: DetailCorrection, csrf: string) => parseElement(await validatorRequest('/validator/elements/' + encodeURIComponent(slug), 'PATCH', correction, csrf)),
  resourceAccess: async (resource: string, signal?: AbortSignal) => parseResourceAccess(await get<unknown>('/resources/' + encodeURIComponent(resource) + '/access?schema_version=1', signal, 'POST')),
  resourceUrl: (element: string, resource: string) => `${base}/elements/${encodeURIComponent(element)}/resources/${encodeURIComponent(resource)}`,
  catalog: async (params: URLSearchParams, signal?: AbortSignal) => parseCatalog(await get<unknown>('/catalog?' + params.toString(), signal)),
  categories: async (signal?: AbortSignal) => parseFacets(await get<unknown>('/categories', signal)),
  collections: async (signal?: AbortSignal) => parseFacets(await get<unknown>('/collections', signal)),
  credits: async (signal?: AbortSignal) => parseMuseumCredits(await get<unknown>('/credits?schema_version=1', signal)),
  elements: async (signal?: AbortSignal) => {
    const items = await get<unknown>('/elements', signal)
    if (!Array.isArray(items)) throw new Error('Catálogo incompatible')
    return items.map(parseElement)
  },
  element: async (id: string, signal?: AbortSignal) => parseElement(await get<unknown>('/elements/' + encodeURIComponent(id), signal)),
  tour: async (id: string, signal?: AbortSignal) =>
    parseTour(await get<unknown>('/tours/' + encodeURIComponent(id) + '?schema_version=1', signal)),
}
