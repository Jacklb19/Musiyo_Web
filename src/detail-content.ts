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
