import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { parseSurvey, parseSurveyStored } from '../src/contract-validation.ts'
import { requestSurvey, storeSurveyResponse, surveyResponse, SURVEY_CONSENT } from '../src/survey-client.ts'
import { GuideRequestError } from '../src/guide-client.ts'
const fixture = name => JSON.parse(readFileSync(new URL('../contracts/examples/' + name + '.json', import.meta.url), 'utf8'))

test('survey v1 accepts the canonical example and refuses repeated questions or options', () => {
  const survey = fixture('guide_survey')
  assert.deepEqual(parseSurvey(survey), survey)
  assert.throws(() => parseSurvey({ ...survey, schema_version: 2 }))
  assert.throws(() => parseSurvey({ ...survey, questions: [...survey.questions, survey.questions[0]] }))
  const repeated = structuredClone(survey)
  repeated.questions[0].options.push(repeated.questions[0].options[0])
  assert.throws(() => parseSurvey(repeated))
  assert.deepEqual(parseSurveyStored(fixture('guide_survey_stored')), { schema_version: 1, status: 'stored' })
})

test('the questions come from the public endpoint without caching and for the visited tour', async () => {
  const survey = fixture('guide_survey')
  const signal = new AbortController().signal
  const result = await requestSurvey('/api/v1', survey.tour_key, signal, 15000, async (url, options) => {
    const query = new URL(url, 'https://test.invalid').searchParams
    assert.equal(query.get('tour_key'), survey.tour_key); assert.equal(query.get('schema_version'), '1')
    assert.equal(options.cache, 'no-store'); assert.equal(options.method, 'GET')
    return new Response(JSON.stringify(survey))
  })
  assert.equal(result.survey_key, survey.survey_key)
  await assert.rejects(requestSurvey('/api/v1', 'other-tour', signal, 15000, async () => new Response(JSON.stringify(survey))))
  await assert.rejects(requestSurvey('/api/v1', survey.tour_key, signal, 15000, async () => new Response('', { status: 404 })),
    error => error instanceof GuideRequestError && error.status === 404)
})

test('storing sends only the chosen options, from the web, with the consent header', async () => {
  const survey = fixture('guide_survey')
  const response = surveyResponse(survey, { liked: 'a-lot', noticed: 'not-an-option', unknown: 'x' })
  assert.deepEqual(response, { schema_version: 1, survey_key: survey.survey_key, version: survey.version, platform: 'web',
    answers: [{ question_id: 'liked', option_id: 'a-lot' }] })
  const stored = await storeSurveyResponse('/api/v1', response, new AbortController().signal, 15000, async (url, options) => {
    assert.equal(url, '/api/v1/guide/survey/responses'); assert.equal(options.method, 'POST')
    assert.equal(options.headers['X-Musiyo-Survey-Consent'], SURVEY_CONSENT)
    assert.deepEqual(JSON.parse(options.body), response)
    return new Response(JSON.stringify({ schema_version: 1, status: 'stored' }), { status: 201 })
  })
  assert.equal(stored.status, 'stored')
  await assert.rejects(storeSurveyResponse('/api/v1', response, new AbortController().signal, 15000,
    async () => new Response('', { status: 429, headers: { 'Retry-After': '30' } })), error => error.retryAfterSeconds === 30)
})

test('the conversation stays a quiet part of the closing page', () => {
  const component = readFileSync(new URL('../src/ClosingConversation.tsx', import.meta.url), 'utf8')
  const quiz = readFileSync(new URL('../src/VisitQuiz.tsx', import.meta.url), 'utf8')
  assert.match(quiz, /<ClosingConversation\/>/)
  // Answers are sent only in the store mode the visitor chose; failures never block the visit.
  assert.match(component, /if \(mode !== 'store' \|\| !survey\) return/)
  assert.match(component, /setStage\('hidden'\)/)
})
