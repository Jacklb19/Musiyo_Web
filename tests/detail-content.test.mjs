import { test } from 'node:test'
import assert from 'node:assert/strict'
import { groupedBlocks, safeSourceUrl, subtitlesFor } from '../src/detail-content.ts'

test('public source links cannot execute scripts or open local paths', () => {
  assert.equal(safeSourceUrl('https://example.test/source'), 'https://example.test/source')
  for (const value of ['javascript:alert(1)', 'data:text/html,test', 'file:///C:/test', 'not a URL', null]) {
    assert.equal(safeSourceUrl(value), null)
  }
})

test('blocks retain their text and attribution in distinct ordered groups', () => {
  const block = (kind, id) => ({ id, kind, text: 'Synthetic text', attribution: 'Synthetic source' })
  const groups = groupedBlocks({ blocks: [block('interpretation', 'a'), block('testimony', 'b'), block('documented_fact', 'c')] })
  assert.deepEqual(groups.map((group) => group.kind), ['documented_fact', 'testimony', 'interpretation'])
  assert.equal(groups[2].blocks[0].attribution, 'Synthetic source')
  assert.deepEqual(groupedBlocks({ blocks: [] }), [])
})

test('video captions must refer to an available WebVTT subtitle resource', () => {
  const video = { subtitles_resource_id: 'captions' }
  const captions = { id: 'captions', kind: 'subtitles', mime: 'text/vtt' }
  assert.equal(subtitlesFor(video, [captions]), captions)
  assert.equal(subtitlesFor(video, []), null)
  assert.equal(subtitlesFor(video, [{ ...captions, kind: 'image' }]), null)
  assert.equal(subtitlesFor(video, [{ ...captions, mime: 'text/plain' }]), null)
})
