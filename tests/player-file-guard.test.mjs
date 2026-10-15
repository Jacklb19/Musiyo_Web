import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { playerFileGuard } from '../scripts/player-file-guard.ts'

test('missing and escaped player paths stay 404 while real files and app routes pass', () => {
  const root = mkdtempSync(join(tmpdir(), 'musiyo-player-'))
  try {
    mkdirSync(join(root, 'Build'))
    writeFileSync(join(root, 'Build/Test.wasm'), 'synthetic')
    writeFileSync(join(root, 'index.html'), '<html></html>')
    const absent = playerFileGuard(join(root, 'absent-player'))
    const absentResponse = { setHeader() {}, end() {} }
    absent({ url: '/unity/Build/Test.wasm' }, absentResponse, () => assert.fail('Missing player cannot fall through'))
    assert.equal(absentResponse.statusCode, 404)
    const guard = playerFileGuard(root)
    for (const url of ['/unity/Build/missing.wasm', '/unity/missing', '/unity/../private.txt', '/unity/%ZZ']) {
      let continued = false
      const response = { setHeader() {}, end() {} }
      guard({ url }, response, () => { continued = true })
      assert.equal(continued, false)
      assert.equal(response.statusCode, 404)
    }
    for (const url of ['/unity/', '/unity/Build/Test.wasm?v=1', '/guia', '/api/v1/ready']) {
      let continued = false
      guard({ url }, { setHeader() {}, end() {} }, () => { continued = true })
      assert.equal(continued, true)
    }
  } finally { rmSync(root, { recursive: true, force: true }) }
})
