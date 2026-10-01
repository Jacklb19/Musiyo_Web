import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import { confirmedSelection, isAvailableSelection } from '../src/tour-selection.ts'
import { parseSelection, parseClearedSelection, parseTour } from '../src/contract-validation.ts'

const tour = parseTour(JSON.parse(readFileSync(new URL('../contracts/examples/tour_full.json', import.meta.url))))
const points = tour.rooms.flatMap(room => room.points)
const point = points.find(item => item.elements.length)
const element = point.elements[0]

test('selection requires tour membership and element membership at that point', () => {
  assert.equal(isAvailableSelection(tour, point.key, element.slug), true)
  assert.equal(isAvailableSelection(tour, point.key, 'unpublished'), false)
  assert.equal(isAvailableSelection(tour, 'unknown', element.slug), false)
  const message = parseSelection({ source: 'musiyo-unity', type: 'selection_confirmed', version: 1,
    data: { tour_key: tour.tour.key, point_key: point.key, element_slug: element.slug } })
  const params = confirmedSelection(tour, message)
  assert.equal(params.get('point'), point.key)
  assert.equal(params.get('element'), element.slug)
  message.data.tour_key = 'other-tour'
  assert.equal(confirmedSelection(tour, message), null)
})

test('point-only confirmation clears an old element selection', () => {
  const message = parseSelection({ source: 'musiyo-unity', type: 'selection_confirmed', version: 1,
    data: { tour_key: tour.tour.key, point_key: point.key, element_slug: null } })
  assert.equal(confirmedSelection(tour, message).has('element'), false)
})

test('closing a panel uses a distinct versioned message without stale point fields', () => {
  const message = { source: 'musiyo-unity', type: 'selection_cleared', version: 1, data: { tour_key: tour.tour.key } }
  assert.ok(parseClearedSelection(message))
  assert.equal(parseSelection(message), null)
  message.data.point_key = point.key
  assert.equal(parseClearedSelection(message), null)
})
