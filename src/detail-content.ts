import type { Element, Resource, TextBlock } from './contracts'
import { copy } from './interface-copy.ts'

export function safeSourceUrl(value: string | null | undefined): string | null {
  if (!value) return null
  try {
    const url = new URL(value)
    return ['http:', 'https:'].includes(url.protocol) ? url.href : null
  } catch { return null }
}

export function groupedBlocks(element: Element): Array<{ kind: TextBlock['kind']; title: string; blocks: TextBlock[] }> {
  return [
    { kind: 'documented_fact' as const, title: copy.detail.documented },
    { kind: 'testimony' as const, title: copy.detail.testimony },
    { kind: 'interpretation' as const, title: copy.detail.interpretation },
  ].map((group) => ({ ...group, blocks: (element.blocks || []).filter((block) => block.kind === group.kind) }))
    .filter((group) => group.blocks.length > 0)
}

export function subtitlesFor(resource: Resource, resources: Resource[]): Resource | null {
  return resources.find((item) => item.id === resource.subtitles_resource_id && item.kind === 'subtitles' && item.mime === 'text/vtt') || null
}

// Reading text stays clean: each block carries a reference number and the citation sits at the end
// of the record in short form ("Castaño (2021)"); the full references remain in the sources list.
const ABBREVIATIONS: Array<[RegExp, string]> = [[/Ministerio de Cultura de Colombia/g, 'MinCultura'], [/Universidad de Antioquia/g, 'UdeA']]

export function shortCitation(reference: string): string {
  return ABBREVIATIONS.reduce((text, [pattern, short]) => text.replace(pattern, short), citation(reference))
}

function citation(reference: string): string {
  const dated = /^(.+?)\.?\s*\(((?:\d{4}|s\. ?f\.)[^)]*)\)/.exec(reference)
  if (dated) {
    const authors = dated[1].replace(/,\s*(?:[A-ZÁÉÍÓÚÑ]\.?\s*)+(?=,|\s*&|$)/g, '').replace(/,?\s*&\s*/g, ' y ').trim()
    return `${authors} (${dated[2].split(',')[0].trim()})`
  }
  const first = reference.split(/\.\s/)[0].trim()
  return first.length > 70 ? `${first.slice(0, 67).trimEnd()}…` : first
}

export interface BlockNote { blockId: string; number: number; text: string }

export function blockNotes(element: Element): BlockNote[] {
  const notes: BlockNote[] = []
  for (const block of element.blocks || []) {
    const source = element.sources?.find((item) => item.id === block.source_id)
    const parts = [
      block.kind === 'testimony' && block.attribution ? `Testimonio: ${block.attribution}` : block.attribution,
      source && !(block.attribution && block.attribution.includes(shortCitation(source.reference).replace(/ \(.*/, ''))) ? shortCitation(source.reference) : null,
      block.context,
    ].filter((part): part is string => Boolean(part && part.trim()))
    if (!parts.length) continue
    const text = parts.map((part) => part.trim().replace(/\.$/, '')).join('. ') + '.'
    // Blocks that cite exactly the same thing share one number instead of repeating the line.
    const same = notes.find((note) => note.text === text)
    notes.push({ blockId: block.id, number: same ? same.number : new Set(notes.map((note) => note.number)).size + 1, text })
  }
  return notes
}

export function creditLine(element: Element): string {
  return (element.credits || []).map((credit) => credit.role ? `${credit.role}: ${credit.name}` : credit.name).join(' · ')
}
