import test from 'node:test'
import assert from 'node:assert/strict'
import { pageTitle } from '../src/page-titles.ts'

test('each page has its own tab title', () => {
  const paths = ['/', '/catalogo', '/recorrido', '/recorrido/texto', '/recorrido/cierre', '/guia', '/acerca', '/privacidad', '/creditos', '/no-existe']
  const titles = paths.map(pageTitle)
  assert.equal(new Set(titles).size, paths.length)
  assert.equal(pageTitle('/recorrido'), 'Museo 3D · Musiyo Bëtsknaté')
  assert.equal(pageTitle('/recorrido/texto/'), 'Salas en texto · Musiyo Bëtsknaté')
  assert.equal(pageTitle('/elementos/flauta'), 'Pieza · Musiyo Bëtsknaté')
  assert.equal(pageTitle('/otra'), 'Página no encontrada · Musiyo Bëtsknaté')
  assert.ok(titles.every(title => title.includes('Musiyo Bëtsknaté')))
})
