import test from 'node:test'
import assert from 'node:assert/strict'
import { installMediaExclusivity } from '../src/media-exclusivity.ts'

test('starting one media element pauses the others', () => {
  const media = name => ({ name, paused: false, pause() { this.paused = true } })
  const narration = media('narration'), guide = media('guide'), idle = { ...media('idle'), paused: true }
  let listener = null
  const root = { addEventListener: (type, fn, capture) => { assert.equal(capture, true); listener = fn },
    removeEventListener: () => { listener = null }, querySelectorAll: () => [narration, guide, idle] }
  const remove = installMediaExclusivity(root)
  listener({ target: guide })
  assert.equal(narration.paused, true); assert.equal(guide.paused, false)
  remove(); assert.equal(listener, null)
})
