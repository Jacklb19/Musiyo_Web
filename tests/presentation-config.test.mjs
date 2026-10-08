import test from 'node:test'
import assert from 'node:assert/strict'
import { parsePresentationConfig } from '../src/presentation-config.ts'

test('presentation configuration accepts alternative published category and tour keys', () => {
  const config = parsePresentationConfig({ VITE_EXHIBITION_CATEGORY: 'test-exhibition', VITE_TOUR_KEY: 'test-tour' })
  assert.equal(config.exhibitionCategory, 'test-exhibition')
  assert.equal(config.tourKey, 'test-tour')
})

test('presentation configuration rejects URLs, query injection and invalid keys', () => {
  for (const value of ['https://example.test', '../private', 'category&limit=1000', 'a'.repeat(101), 'bad key']) {
    assert.throws(() => parsePresentationConfig({ VITE_EXHIBITION_CATEGORY: value }), /Invalid exhibition category/)
    assert.throws(() => parsePresentationConfig({ VITE_TOUR_KEY: value }), /Invalid tour key/)
  }
})
