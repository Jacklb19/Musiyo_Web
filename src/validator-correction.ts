import type { DetailCorrection, Element } from './contracts'

export type CorrectionDraft = { title: string; description: string; interpretations: Record<string, string> }

export function editableInterpretations(element: Element) {
  return (element.blocks || []).filter((block) => block.kind === 'interpretation' && (block.source_id || block.context?.trim()))
}

export function correctionDraft(element: Element): CorrectionDraft {
  return { title: element.title, description: element.description,
    interpretations: Object.fromEntries(editableInterpretations(element).map((block) => [block.id, block.text])) }
}

export function changedCorrection(element: Element, draft: CorrectionDraft): DetailCorrection | null {
  const changes: DetailCorrection = {}
  if (draft.title !== element.title) {
    if (!draft.title.trim() || draft.title.length > 160) throw new Error('El título debe tener entre 1 y 160 caracteres')
    changes.title = draft.title
  }
  if (draft.description !== element.description) {
    if (draft.description.length > 5000) throw new Error('La descripción no puede superar 5000 caracteres')
    changes.description = draft.description
  }
  const interpretations = editableInterpretations(element).flatMap((block) => {
    const text = draft.interpretations[block.id]
    if (text === undefined || text === block.text) return []
    if (!text.trim() || text.length > 3000) throw new Error('Cada interpretación debe tener entre 1 y 3000 caracteres')
    return [{ block_id: block.id, text }]
  })
  if (interpretations.length) changes.interpretations = interpretations
  return Object.keys(changes).length ? changes : null
}
