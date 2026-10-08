export const catalogPageSize = 24

export function catalogRequest(params: URLSearchParams): URLSearchParams {
  const result = new URLSearchParams({ limit: String(catalogPageSize), offset: '0', schema_version: '1' })
  for (const name of ['query', 'category', 'collection']) {
    const value = params.get(name)?.trim()
    if (value) result.set(name, value.slice(0, name === 'query' ? 200 : 100))
  }
  const page = Number(params.get('page') || 1)
  if (Number.isSafeInteger(page) && page > 1 && (page - 1) * catalogPageSize <= 100000) {
    result.set('offset', String((page - 1) * catalogPageSize))
  }
  return result
}

export function changeCatalogFilter(params: URLSearchParams, name: 'query' | 'category' | 'collection', value: string): URLSearchParams {
  const next = new URLSearchParams(params)
  next.delete('page')
  if (value.trim()) next.set(name, value.trim())
  else next.delete(name)
  return next
}
