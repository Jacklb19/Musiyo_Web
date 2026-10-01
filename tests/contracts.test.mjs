import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { parseCatalog, parseFacets, parseElement, parseSelection, parseTour } from '../src/contract-validation.ts'

const example = (name) => JSON.parse(readFileSync(new URL('../contracts/examples/' + name, import.meta.url)))

test('catalog pages reject incompatible versions, impossible counts and duplicate entries', () => {
  const page = example('catalog.json')
  assert.equal(parseCatalog(page).items[0].slug, 'synthetic-item')
  for (const patch of [{ schema_version: true }, { schema_version: 2 }, { total: 0 }, { limit: 101 },
    { offset: -1 }, { items: [...page.items, ...page.items], total: 2 }]) {
    assert.throws(() => parseCatalog({ ...page, ...patch }))
  }
  assert.deepEqual(parseCatalog({ ...page, items: [], total: 0 }).items, [])
})

test('public facet counts must be positive and keys unique', () => {
  const facet = { slug: 'test', name: 'Prueba', element_count: 1 }
  assert.equal(parseFacets([facet]).length, 1)
  for (const value of [[{ ...facet, element_count: 0 }], [facet, facet], null, [{ ...facet, private: true }]]) {
    assert.throws(() => parseFacets(value))
  }
})

test('shared examples allow an empty point and one element at two points', () => {
  const tour = parseTour(example('tour_full.json'))
  assert.equal(tour.rooms[0].points[0].elements[0].slug, tour.rooms[0].points[1].elements[0].slug)
  assert.equal(parseTour(example('tour_empty_point.json')).rooms[0].points[0].elements.length, 0)
  assert.equal(parseElement(example('element.json')).blocks[0].kind, 'interpretation')
})

test('future versions and invalid structure are rejected', () => {
  assert.throws(() => parseTour(example('tour_version_2.json')))
  for (const mutation of [
    (tour) => { tour.rooms[0].points[1].key = tour.rooms[0].points[0].key },
    (tour) => { tour.rooms[0].points[0].elements.push(tour.rooms[0].points[0].elements[0]) },
    (tour) => { tour.rooms[0].points[0].activation = ['touch'] },
    (tour) => { tour.schema_version = '1' },
    (tour) => { tour.schema_version = true },
    (tour) => { tour.rooms[0].unexpected = true },
  ]) {
    const tour = example('tour_full.json')
    mutation(tour)
    assert.throws(() => parseTour(tour))
  }
})

test('selection messages require the versioned envelope', () => {
  const message = example('selection_confirmed.json')
  assert.equal(parseSelection(message).data.point_key, 'point-01')
  assert.equal(parseSelection({ ...message, version: 2 }), null)
  assert.equal(parseSelection({ ...message, type: 'unknown' }), null)
  assert.equal(parseSelection({ ...message, data: {} }), null)
})

test('element blocks cannot reference an unknown source', () => {
  const element = example('element.json')
  element.blocks[0].source_id = 'missing'
  assert.throws(() => parseElement(element))
})
