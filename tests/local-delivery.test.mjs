import test from 'node:test'
import assert from 'node:assert/strict'
import { createServer } from 'node:http'
import { createHash } from 'node:crypto'
import { checkDelivery } from '../scripts/check-local-delivery.mjs'

test('local delivery verification detects changed player bytes without executing Unity', async () => {
  const bytes = Buffer.from('synthetic wasm payload')
  const expected = { bytes: bytes.length, sha256: createHash('sha256').update(bytes).digest('hex') }
  let tampered = false
  const server = createServer((request, response) => {
    if (request.url === '/unity/museum-build-manifest.json') {
      response.setHeader('Content-Type', 'application/json')
      response.end(JSON.stringify({ schema_version: 1, source_commit: 'synthetic', files: { 'Build/Test.wasm': expected } }))
    } else if (request.url === '/unity/Build/Test.wasm') {
      response.setHeader('Content-Type', 'application/wasm')
      response.end(tampered ? Buffer.from('changed') : bytes)
    } else if (request.url.startsWith('/unity/')) { response.statusCode = 404; response.end() }
    else if (request.url.startsWith('/api/')) { response.setHeader('Content-Type', 'application/json'); response.end('{}') }
    else { response.setHeader('Content-Type', 'text/html'); response.end('<html lang="es"></html>') }
  })
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve))
  try {
    const origin = `http://127.0.0.1:${server.address().port}`
    assert.equal((await checkDelivery(origin, 2)).state, 'passed_local_checks')
    tampered = true
    assert.equal((await checkDelivery(origin, 1)).state, 'failed_local_checks')
    await assert.rejects(checkDelivery('https://example.com'), /loopback/)
    await assert.rejects(checkDelivery(origin, 21), /loopback/)
  } finally { await new Promise(resolve => server.close(resolve)) }
})
