import { catalogRequest } from './catalog-params.ts'

export function safeCatalogReturn(value: unknown): string {
  if (typeof value !== 'string' || !value.startsWith('/catalogo')) return '/catalogo'
  try {
    const url = new URL(value, 'https://museum.invalid')
    if (url.origin !== 'https://museum.invalid' || url.pathname !== '/catalogo') return '/catalogo'
    const request = catalogRequest(url.searchParams)
    const params = new URLSearchParams()
    for (const key of ['query', 'category', 'collection']) {
      if (request.has(key)) params.set(key, request.get(key)!)
    }
    const page = Number(request.get('offset')) / Number(request.get('limit')) + 1
    if (page > 1) params.set('page', String(page))
    return '/catalogo' + (params.size ? '?' + params.toString() : '')
  } catch { return '/catalogo' }
}

export interface ConnectionInformation { saveData?: boolean; effectiveType?: string }
export function shouldAutoLoadModel(connection?: ConnectionInformation): boolean {
  return !connection?.saveData && !['slow-2g', '2g', '3g'].includes(connection?.effectiveType || '')
}

export function uniqueElements<T extends { slug: string }>(items: readonly T[]): T[] {
  const seen = new Set<string>()
  return items.filter(item => {
    if (seen.has(item.slug)) return false
    seen.add(item.slug)
    return true
  })
}

// Opening a room without published records first left visitors on an empty screen.
export function defaultRoomKey(rooms: readonly { key: string; points: readonly { elements: readonly unknown[] }[] }[], requested: string | null): string {
  if (requested && rooms.some(room => room.key === requested)) return requested
  return (rooms.find(room => room.points.some(point => point.elements.length > 0)) || rooms[0])?.key || ''
}

export function recordCount(count: number): string {
  return `${count} ${count === 1 ? 'ficha' : 'fichas'}`
}
