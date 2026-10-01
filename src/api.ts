import { parseCatalog, parseFacets, parseElement, parseTour } from './contract-validation'

const base = (import.meta.env.VITE_API_BASE_URL || '/api/v1').replace(/\/$/, '')

async function get<T>(path: string, signal?: AbortSignal): Promise<T> {
  const response = await fetch(base + path, { signal })
  if (!response.ok) {
    throw new Error(response.status === 404 ? 'Contenido no disponible' : 'No fue posible consultar la API')
  }
  return response.json() as Promise<T>
}

export const api = {
  resourceUrl: (element: string, resource: string) => `${base}/elements/${encodeURIComponent(element)}/resources/${encodeURIComponent(resource)}`,
  catalog: async (params: URLSearchParams, signal?: AbortSignal) => parseCatalog(await get<unknown>('/catalog?' + params.toString(), signal)),
  categories: async (signal?: AbortSignal) => parseFacets(await get<unknown>('/categories', signal)),
  collections: async (signal?: AbortSignal) => parseFacets(await get<unknown>('/collections', signal)),
  elements: async (signal?: AbortSignal) => {
    const items = await get<unknown>('/elements', signal)
    if (!Array.isArray(items)) throw new Error('Catálogo incompatible')
    return items.map(parseElement)
  },
  element: async (id: string, signal?: AbortSignal) => parseElement(await get<unknown>('/elements/' + encodeURIComponent(id), signal)),
  tour: async (id: string, signal?: AbortSignal) =>
    parseTour(await get<unknown>('/tours/' + encodeURIComponent(id) + '?schema_version=1', signal)),
}
