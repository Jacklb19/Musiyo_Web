import test from 'node:test'
import assert from 'node:assert/strict'
import { loadEnv } from 'vite'
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { resolveDevApiTarget } from '../scripts/dev-proxy-config.ts'

test('session process target overrides a stale local file and stays server-only', () => {
  const directory = mkdtempSync(join(tmpdir(), 'musiyo-proxy-'))
  const previous = process.env.MUSIYO_DEV_API_TARGET
  try {
    writeFileSync(join(directory, '.env.local'), 'MUSIYO_DEV_API_TARGET=http://127.0.0.1:8002')
    process.env.MUSIYO_DEV_API_TARGET = 'http://127.0.0.1:8000'
    const environment = loadEnv('development', directory, 'MUSIYO_')
    assert.equal(resolveDevApiTarget(environment), 'http://127.0.0.1:8000')
    assert.equal(Object.hasOwn(loadEnv('development', directory, 'VITE_'), 'MUSIYO_DEV_API_TARGET'), false)
  } finally {
    if (previous === undefined) delete process.env.MUSIYO_DEV_API_TARGET
    else process.env.MUSIYO_DEV_API_TARGET = previous
    rmSync(directory, { recursive: true })
  }
})

test('development API target validates origins and retains its shared default', () => {
  assert.equal(resolveDevApiTarget({}), 'http://127.0.0.1:8000')
  for (const target of ['file:///private', 'http://user:secret@localhost:8000', 'http://localhost:8000/api/v1', 'http://localhost:8000?key=value', 'http://localhost:8000#fragment']) {
    assert.throws(() => resolveDevApiTarget({ MUSIYO_DEV_API_TARGET: target }))
  }
})
