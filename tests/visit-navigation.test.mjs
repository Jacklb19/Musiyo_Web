import test from 'node:test'
import assert from 'node:assert/strict'
import { safeCatalogReturn, shouldAutoLoadModel, uniqueElements } from '../src/visit-navigation.ts'

test('detail return preserves validated catalogue context without accepting external or different routes', () => {
  const result = new URL(safeCatalogReturn('/catalogo?query=m%C3%A1scara&category=mascaras&collection=local&page=2&unexpected=discard'), 'https://museum.invalid')
  assert.equal(result.searchParams.get('query'), 'máscara')
  assert.equal(result.searchParams.get('collection'), 'local')
  assert.equal(result.searchParams.get('page'), '2')
  assert.equal(result.searchParams.has('unexpected'), false)
  for (const input of [null, {}, 'https://outside.test/catalogo', '//outside.test/catalogo', '/catalogo-other', '/catalogo/../privado', '/catalogo?category=x&page=-1']) {
    const path = safeCatalogReturn(input)
    assert.equal(new URL(path, 'https://museum.invalid').pathname, '/catalogo')
    assert.equal(new URL(path, 'https://museum.invalid').origin, 'https://museum.invalid')
    assert.equal(new URL(path, 'https://museum.invalid').searchParams.has('page'), false)
  }
})

test('automatic model requests honor data saving and reported slow connections', () => {
  for (const effectiveType of ['slow-2g', '2g', '3g']) assert.equal(shouldAutoLoadModel({ effectiveType }), false)
  assert.equal(shouldAutoLoadModel({ saveData: true, effectiveType: '4g' }), false)
  assert.equal(shouldAutoLoadModel({ saveData: false, effectiveType: '4g' }), true)
  assert.equal(shouldAutoLoadModel(), true)
})

test('room reading lists each record once when the shared tour assigns it to multiple points', () => {
  const first = { slug: 'shared-record', title: 'First published reference' }
  const second = { slug: 'another-record', title: 'Another reference' }
  const input = [first, second, { ...first }]
  assert.deepEqual(uniqueElements(input), [first, second])
  assert.equal(input.length, 3)
  assert.equal(uniqueElements(input)[0], first)
})

test('the text rooms open the requested room or else the first one with published records', async () => {
  const { defaultRoomKey, recordCount } = await import('../src/visit-navigation.ts')
  const rooms = [{ key: 'arrival', points: [{ elements: [] }] }, { key: 'welcome', points: [{ elements: [] }, { elements: [{}] }] }, { key: 'hearth', points: [] }]
  assert.equal(defaultRoomKey(rooms, null), 'welcome')
  assert.equal(defaultRoomKey(rooms, 'hearth'), 'hearth')
  assert.equal(defaultRoomKey(rooms, 'unknown'), 'welcome')
  assert.equal(defaultRoomKey([{ key: 'empty', points: [] }], null), 'empty')
  assert.equal(defaultRoomKey([], null), '')
  assert.equal(recordCount(1), '1 ficha')
  assert.equal(recordCount(0), '0 fichas')
  assert.equal(recordCount(3), '3 fichas')
})
