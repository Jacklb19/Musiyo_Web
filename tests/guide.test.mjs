import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { parseGuideResponse } from '../src/contract-validation.ts'
import { requestGuide, GuideRequestError } from '../src/guide-client.ts'
import { parseGuideConfig } from '../src/guide-config.ts'

const fixture = name => JSON.parse(readFileSync(new URL('../contracts/examples/' + name + '.json', import.meta.url), 'utf8'))

test('guide accepts the three functional states and rejects incompatible evidence', () => {
  for (const name of ['guide_answered', 'guide_abstained', 'guide_unavailable']) {
    assert.deepEqual(parseGuideResponse(fixture(name)), fixture(name))
  }
  const answered = fixture('guide_answered')
  for (const patch of [{ schema_version: true }, { schema_version: 2 }, { answer: ' ' }, { citations: [] },
    { reason: 'insufficient_evidence' }, { private_path: 'private' }, { citations: [...answered.citations, ...answered.citations] }]) {
    assert.throws(() => parseGuideResponse({ ...answered, ...patch }))
  }
  for (const name of ['guide_abstained', 'guide_unavailable']) {
    const response = fixture(name)
    for (const patch of [{ answer: 'Uncited' }, { citations: answered.citations }, { reason: null }]) {
      assert.throws(() => parseGuideResponse({ ...response, ...patch }))
    }
  }
  assert.throws(() => parseGuideResponse({ ...fixture('guide_abstained'), reason: 'provider_unavailable' }))
})

test('guide client posts the versioned body without caching and validates citations', async () => {
  const controller = new AbortController()
  const question = { schema_version: 1, question: 'Pregunta de prueba', element_slug: null }
  const response = await requestGuide('/api/v1', question, controller.signal, 15000, async (url, options) => {
    assert.equal(url, '/api/v1/guide/questions')
    assert.equal(options.method, 'POST')
    assert.equal(options.cache, 'no-store')
    assert.deepEqual(JSON.parse(options.body), question)
    return new Response(JSON.stringify(fixture('guide_answered')))
  })
  assert.equal(response.status, 'answered')
  await assert.rejects(requestGuide('/api/v1', question, controller.signal, 15000,
    async () => new Response(JSON.stringify({ status: 'answered' }))))
})

test('guide distinguishes throttling, validation, network errors and cancellation', async () => {
  const question = { schema_version: 1, question: 'Pregunta de prueba' }
  for (const status of [422, 429, 503]) {
    await assert.rejects(requestGuide('/api/v1', question, new AbortController().signal, 15000,
      async () => new Response('', { status })), error => error instanceof GuideRequestError && error.status === status)
  }
  await assert.rejects(requestGuide('/api/v1', question, new AbortController().signal, 15000,
    async () => { throw new TypeError('Network unavailable') }), error => error instanceof GuideRequestError && error.status === null)
  const controller = new AbortController()
  controller.abort()
  await assert.rejects(requestGuide('/api/v1', question, controller.signal, 15000,
    async () => { throw new DOMException('Aborted', 'AbortError') }), error => error.name === 'AbortError')
})

test('guide timeouts must be bounded and cannot be fractional or invalid', () => {
  assert.equal(parseGuideConfig({}).requestTimeoutMs, 15000)
  assert.equal(parseGuideConfig({ VITE_GUIDE_TIMEOUT_MS: '1000' }).requestTimeoutMs, 1000)
  for (const value of ['NaN', '0', '60001', '1500.5']) {
    assert.throws(() => parseGuideConfig({ VITE_GUIDE_TIMEOUT_MS: value }))
  }
})
