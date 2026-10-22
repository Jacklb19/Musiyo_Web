import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { runInNewContext } from 'node:vm'
import { objectMetadata } from '../scripts/static-deployment.mjs'

const rewrite = readFileSync(new URL('../deployment/spa-rewrite.js', import.meta.url), 'utf8')

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
