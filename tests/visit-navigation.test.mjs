import test from 'node:test'
import assert from 'node:assert/strict'
import { safeCatalogReturn, shouldAutoLoadModel } from '../src/visit-navigation.ts'

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
