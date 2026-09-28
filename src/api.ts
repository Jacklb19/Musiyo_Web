export interface Elemento {
  id: string
  titulo: string
  descripcion: string
  interpretacion: string
  creditos: string
  fuentes: string
  restricciones: string
}

export interface Punto {
  anclajeId: string
  elementoIds: string[]
}

export interface Sala {
  id: string
  orden: number
  puntos: Punto[]
}

export interface Recorrido {
  schemaVersion: 1
  recorridoId: string
  salas: Sala[]
}

const base = (import.meta.env.VITE_API_BASE_URL || '/api/v1').replace(/\/$/, '')

async function get<T>(path: string, signal?: AbortSignal): Promise<T> {
  const response = await fetch(base + path, { signal })
  if (!response.ok) {
    throw new Error(response.status === 404 ? 'Contenido no disponible' : 'No fue posible consultar la API')
  }
  return response.json() as Promise<T>
}

export const api = {
  elementos: (signal?: AbortSignal) => get<Elemento[]>('/elementos', signal),
  elemento: (id: string, signal?: AbortSignal) => get<Elemento>('/elementos/' + encodeURIComponent(id), signal),
  recorrido: (id: string, signal?: AbortSignal) => get<Recorrido>('/recorridos/' + encodeURIComponent(id), signal),
}
