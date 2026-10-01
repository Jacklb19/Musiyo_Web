import { test } from 'node:test'
import assert from 'node:assert/strict'
import { catalogRequest, changeCatalogFilter } from '../src/catalog-params.ts'

test('catalog URLs preserve English filter keys and compute bounded pagination', () => {
  const request = catalogRequest(new URLSearchParams('query=Kam%C3%ABnts%C3%A1&category=objects&collection=test&page=2'))
  assert.equal(request.get('offset'), '24')
  assert.equal(request.get('query'), 'Kamëntsá')
  assert.equal(request.get('category'), 'objects')
  assert.equal(request.get('collection'), 'test')
  for (const page of ['-1', 'NaN', '2.5', '999999999', '0']) {
    assert.equal(catalogRequest(new URLSearchParams({ page })).get('offset'), '0')
  }
})

test('changing a filter resets pagination and preserves other filters', () => {
  const current = new URLSearchParams('query=prueba&category=objects&collection=test&page=3')
  const next = changeCatalogFilter(current, 'query', ' técnica ')
  assert.equal(next.get('query'), 'técnica')
  assert.equal(next.get('collection'), 'test')
  assert.equal(next.has('page'), false)
  assert.equal(current.get('page'), '3')
  assert.equal(changeCatalogFilter(next, 'query', '').has('query'), false)
})
