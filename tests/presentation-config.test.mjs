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

test('editorial selections validate record identifiers without accepting URLs or query injection', () => {
  const config = parsePresentationConfig({ VITE_FEATURED_ELEMENT_SLUG: 'approved-model', VITE_INTRODUCTION_SLUG: 'approved-story' })
  assert.equal(config.featuredElementSlug, 'approved-model')
  assert.equal(config.introductionSlug, 'approved-story')
  for (const value of ['https://example.test', '../private', 'record?x=y', 'a'.repeat(101), 'bad key']) {
    assert.throws(() => parsePresentationConfig({ VITE_FEATURED_ELEMENT_SLUG: value }), /Invalid editorial element slug/)
    assert.throws(() => parsePresentationConfig({ VITE_INTRODUCTION_SLUG: value }), /Invalid editorial element slug/)
  }
})
