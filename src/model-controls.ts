import type { Resource, ResourceAccess } from './contracts'

export const initialOrbit = '0deg 75deg 105%'
export const initialFieldOfView = '30deg'
const maxModelBytes = 10_000_000

export function webModelResourceId(resource: Resource): string | null {
  if (resource.kind !== 'model_3d' || resource.mime !== 'model/gltf-binary') return null
  return resource.variants?.find((variant) => variant.profile === 'web')?.id || null
}

export function validateModelAccess(access: ResourceAccess, now = Date.now()): ResourceAccess {
  if (access.mime !== 'model/gltf-binary') throw new Error('El recurso disponible no es un modelo GLB.')
  if (!Number.isFinite(Date.parse(access.expires_at)) || Date.parse(access.expires_at) <= now) {
    throw new Error('El acceso al modelo caducó. Vuelve a intentarlo.')
  }
  if (access.byte_count != null && access.byte_count > maxModelBytes) {
    throw new Error('Este modelo supera el tamaño disponible para la Web.')
  }
  return access
}

export interface CameraOrbit { theta: number; phi: number; radius: number }
export type CameraAction = 'left' | 'right' | 'closer' | 'farther'

export function nextCameraOrbit(orbit: CameraOrbit, action: CameraAction, initialRadius: number): string {
  const theta = orbit.theta + (action === 'left' ? -1 : action === 'right' ? 1 : 0) * Math.PI / 12
  const scale = action === 'closer' ? 0.8 : action === 'farther' ? 1.25 : 1
  const radius = Math.min(initialRadius * 2.5, Math.max(initialRadius * 0.4, orbit.radius * scale))
  return `${theta}rad ${orbit.phi}rad ${radius}m`
}
