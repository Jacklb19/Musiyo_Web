import test from 'node:test'
import assert from 'node:assert/strict'
import { nextCameraOrbit, validateModelAccess, webModelResourceId } from '../src/model-controls.ts'

test('only an explicitly published Web GLB variant is selected', () => {
  const resource = { id: 'original', kind: 'model_3d', mime: 'model/gltf-binary', variants: [{ id: 'quest-only', profile: 'quest' }] }
  assert.equal(webModelResourceId(resource), null)
  assert.equal(webModelResourceId({ ...resource, variants: [] }), null)
  assert.equal(webModelResourceId({ ...resource, variants: [...resource.variants, { id: 'web-approved', profile: 'web' }] }), 'web-approved')
  assert.equal(webModelResourceId({ ...resource, kind: 'image' }), null)
})

test('expired, incompatible and oversized accesses cannot start model loading', () => {
  const now = Date.parse('2026-10-05T12:00:00Z')
  const access = { mime: 'model/gltf-binary', expires_at: '2026-10-05T12:05:00Z', byte_count: 10_000_000 }
  assert.equal(validateModelAccess(access, now), access)
  assert.throws(() => validateModelAccess({ ...access, expires_at: '2026-10-05T12:00:00Z' }, now), /caducó/)
  assert.throws(() => validateModelAccess({ ...access, expires_at: 'invalid' }, now), /caducó/)
  assert.throws(() => validateModelAccess({ ...access, mime: 'text/html' }, now), /GLB/)
  assert.throws(() => validateModelAccess({ ...access, byte_count: 10_000_001 }, now), /tamaño/)
})

test('camera buttons retain elevation and bounded positive distance after user gestures', () => {
  const orbit = { theta: Math.PI / 2, phi: 1.1, radius: 3 }
  const parse = (action, radius = orbit.radius) => nextCameraOrbit({ ...orbit, radius }, action, 3).split(' ').map(parseFloat)
  assert.ok(parse('left')[0] < orbit.theta)
  assert.ok(parse('right')[0] > orbit.theta)
  assert.equal(parse('left')[1], orbit.phi)
  assert.ok(parse('closer')[2] < orbit.radius)
  assert.ok(parse('farther')[2] > orbit.radius)
  assert.equal(parse('closer', 0.01)[2], 3 * 0.4)
  assert.equal(parse('farther', 100)[2], 7.5)
})
