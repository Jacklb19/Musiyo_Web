import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { runInNewContext } from 'node:vm'
import { objectMetadata } from '../scripts/static-deployment.mjs'
import { voiceRequest } from '../src/voice-client.ts'
import { storeSurveyResponse, surveyResponse } from '../src/survey-client.ts'

const rewrite = readFileSync(new URL('../deployment/spa-rewrite.js', import.meta.url), 'utf8')

test('CloudFront forwards the consent headers emitted by voice and survey clients', async () => {
  const template = JSON.parse(readFileSync(new URL('../deployment/static-site.cloudformation.json', import.meta.url), 'utf8'))
  const policy = template.Resources.ApiRequest.Properties.OriginRequestPolicyConfig
  const forwarded = new Set(policy.HeadersConfig.Headers.map(name => name.toLowerCase()))
  const fixture = name => JSON.parse(readFileSync(new URL('../contracts/examples/' + name + '.json', import.meta.url), 'utf8'))
  const capture = (body, status = 200) => async (_url, options) => {
    for (const name of Object.keys(options.headers)) {
      assert.ok(forwarded.has(name.toLowerCase()), `CloudFront would drop ${name} required by this client`)
    }
    return new Response(JSON.stringify(body), { status })
  }
  const signal = new AbortController().signal
  await voiceRequest('/api/v1', '/guide/voice-answers', signal, 1000,
    { schema_version: 1, question: 'Pregunta sintética' }, capture(fixture('guide_voice_disabled')))
  await storeSurveyResponse('/api/v1', surveyResponse(fixture('guide_survey'), { liked: 'a-lot' }),
    signal, 1000, capture({ schema_version: 1, status: 'stored' }, 201))
})

test('Unity MIME types and precompressed encodings are explicit', () => {
  assert.equal(objectMetadata('unity/Build/Museum.wasm.br').content_type, 'application/wasm')
  assert.equal(objectMetadata('unity/Build/Museum.wasm.br').content_encoding, 'br')
  assert.equal(objectMetadata('unity/Build/Museum.framework.js.gz').content_encoding, 'gzip')
  assert.equal(objectMetadata('unity/Build/Museum.framework.js.gz').content_type, 'text/javascript; charset=utf-8')
  assert.equal(objectMetadata('unity/Build/Museum.data').content_type, 'application/octet-stream')
  assert.equal(objectMetadata('unity/Build/Museum.data.unityweb').content_encoding, null)
  assert.equal(objectMetadata('unity/unity-build.json').cache_control, 'no-store')
  assert.equal(objectMetadata('index.html').cache_control, 'no-store')
  assert.equal(objectMetadata('unity/Build/Museum.wasm').cache_control, 'public, max-age=0, must-revalidate')
})

test('SPA routing never converts missing player or API resources into HTML', () => {
  const handler = runInNewContext(rewrite + '\nhandler')
  for (const uri of ['/guia', '/catalogo', '/elementos/test-item', '/recorrido/texto']) {
    assert.equal(handler({ request: { uri } }).uri, '/index.html')
  }
  for (const uri of ['/api/v1/guide/questions', '/unity/Build/missing.wasm.br', '/unity/missing', '/assets/missing.js']) {
    assert.equal(handler({ request: { uri } }).uri, uri)
  }
})

test('web fonts, the tab icon and the share image are served with their own types', () => {
  assert.equal(objectMetadata('fonts/BodoniModa-latin.woff').content_type, 'font/woff')
  assert.equal(objectMetadata('fonts/InstrumentSans.ttf').content_type, 'font/ttf')
  assert.equal(objectMetadata('favicon.svg').content_type, 'image/svg+xml')
  assert.equal(objectMetadata('og-image.png').content_type, 'image/png')
})
