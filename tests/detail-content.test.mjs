import { test } from 'node:test'
import assert from 'node:assert/strict'
import { blockNotes, creditLine, groupedBlocks, safeSourceUrl, shortCitation, subtitlesFor } from '../src/detail-content.ts'

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

test('citations are shortened to author and year, without initials', () => {
  assert.equal(shortCitation('Castaño, A. (2021). Algunas imágenes del sincretismo.'), 'Castaño (2021)')
  assert.equal(shortCitation('Gómez Montañez, P. F. (2020). El carnaval del perdón.'), 'Gómez Montañez (2020)')
  assert.equal(shortCitation('Jaramillo Guerrero, J., & Dávila Zambrano, L. (2013). Estéticas convergentes.'), 'Jaramillo Guerrero y Dávila Zambrano (2013)')
  assert.equal(shortCitation('Ministerio de Cultura de Colombia. (s. f.). Plan Especial de Salvaguardia.'), 'MinCultura (s. f.)')
  assert.equal(shortCitation('Ramírez, A. (2025, 15 de agosto). Cuando lo ancestral.'), 'Ramírez (2025)')
  assert.equal(shortCitation('Banco de Memoria del Bëtscnaté. Documentos de archivo comunitario.'), 'Banco de Memoria del Bëtscnaté')
  assert.equal(shortCitation('Bëtsknaté: Historia, Significado y Simbología. Documento facilitado.'), 'Bëtsknaté: Historia, Significado y Simbología')
})

test('each block with a source, attribution or context gets one numbered short note', () => {
  const element = {
    sources: [{ id: 'g', kind: 'publication', reference: 'Gómez Montañez, P. F. (2020). Título.' }],
    blocks: [
      { id: 'a', kind: 'documented_fact', text: 'Hecho.', source_id: 'g' },
      { id: 'b', kind: 'testimony', text: 'Relato.', source_id: 'g', attribution: 'Colaborador de la comunidad citado por Gómez Montañez (2020)', context: 'Entrevista etnográfica, Sibundoy.' },
      { id: 'c', kind: 'interpretation', text: 'Lectura.' },
    ],
    credits: [{ role: 'Texto', name: 'Autor' }, { role: 'Pertenencia colectiva', name: 'Cabildo indígena' }],
  }
  assert.deepEqual(blockNotes(element), [
    { blockId: 'a', number: 1, text: 'Gómez Montañez (2020).' },
    { blockId: 'b', number: 2, text: 'Testimonio: Colaborador de la comunidad citado por Gómez Montañez (2020). Entrevista etnográfica, Sibundoy.' },
  ])
  assert.equal(creditLine(element), 'Texto: Autor · Pertenencia colectiva: Cabildo indígena')
})

test('blocks citing the same work share one reference number', () => {
  const element = { sources: [{ id: 'g', kind: 'publication', reference: 'Gómez Montañez, P. F. (2020). Título.' }],
    blocks: [{ id: 'a', kind: 'documented_fact', text: 'A.', source_id: 'g' }, { id: 'b', kind: 'interpretation', text: 'B.', source_id: 'g' },
      { id: 'c', kind: 'interpretation', text: 'C.', source_id: 'g', context: 'Lectura etnográfica.' }] }
  assert.deepEqual(blockNotes(element).map((note) => note.number), [1, 1, 2])
})
