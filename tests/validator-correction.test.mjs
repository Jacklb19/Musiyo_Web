import test from 'node:test'
import assert from 'node:assert/strict'
import { changedCorrection, correctionDraft, editableInterpretations } from '../src/validator-correction.ts'

const element = { slug: 'synthetic-item', language: 'es', title: 'Synthetic title', description: 'Synthetic description',
  resources: [{ id: 'private-test' }], blocks: [
    { id: 'fact', kind: 'documented_fact', text: 'Fact test' },
    { id: 'legacy', kind: 'interpretation', text: 'Unsourced legacy' },
    { id: 'interpretation', kind: 'interpretation', text: 'Interpretation test', context: 'Synthetic context' }] }

test('corrections include only changed text and eligible interpretation membership', () => {
  const draft = correctionDraft(element)
  assert.deepEqual(editableInterpretations(element).map((block) => block.id), ['interpretation'])
  assert.equal(changedCorrection(element, draft), null)
  draft.title = 'New title'
  draft.interpretations.interpretation = 'Changed text'
  draft.interpretations.fact = 'Must never be sent'
  draft.interpretations.foreign = 'Must never be sent'
  assert.deepEqual(changedCorrection(element, draft), { title: 'New title', interpretations: [{ block_id: 'interpretation', text: 'Changed text' }] })
  assert.equal(element.title, 'Synthetic title')
})

test('bounded corrections reject blank and excessive text while allowing an empty description', () => {
  for (const title of [' ', 'x'.repeat(161)]) assert.throws(() => changedCorrection(element, { ...correctionDraft(element), title }))
  assert.throws(() => changedCorrection(element, { ...correctionDraft(element), description: 'x'.repeat(5001) }))
  for (const text of [' ', 'x'.repeat(3001)]) assert.throws(() => changedCorrection(element, { ...correctionDraft(element), interpretations: { interpretation: text } }))
  assert.deepEqual(changedCorrection(element, { ...correctionDraft(element), description: '' }), { description: '' })
})
