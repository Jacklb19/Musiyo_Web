import { useEffect, useId, useRef, useState } from 'react'
import type { ModelViewerElement } from '@google/model-viewer'
import { api } from './api'
import type { Resource } from './contracts'
import { initialFieldOfView, initialOrbit, nextCameraOrbit, validateModelAccess, webModelResourceId } from './model-controls'
import type { CameraAction } from './model-controls'

export function ModelViewer({ resource, title }: { resource: Resource; title: string }) {
  const instructions = useId()
  const host = useRef<HTMLDivElement>(null)
  const viewer = useRef<ModelViewerElement | null>(null)
  const initialRadius = useRef(1)
  const [attempt, setAttempt] = useState(0)
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading')
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState('')
  const resourceId = webModelResourceId(resource)

  useEffect(() => {
    const controller = new AbortController()
    const container = host.current
    let element: ModelViewerElement | null = null
    let timer: ReturnType<typeof setTimeout> | undefined

    function fail(reason: unknown) {
      if (controller.signal.aborted) return
      clearTimeout(timer)
      // Removing the source stops rendering an unavailable model and permits a fresh signed access.
      element?.removeAttribute('src')
      setError(reason instanceof Error ? reason.message : 'No fue posible cargar el modelo. Vuelve a intentarlo.')
      setStatus('error')
      controller.abort()
    }
    function loaded() {
      if (controller.signal.aborted || !element) return
      clearTimeout(timer)
      initialRadius.current = element.getCameraOrbit().radius
      setProgress(1)
      setStatus('ready')
    }
    function reportProgress(event: Event) {
      if (controller.signal.aborted) return
      const value = (event as CustomEvent<{ totalProgress: number }>).detail.totalProgress
      if (Number.isFinite(value)) setProgress(Math.max(0, Math.min(1, value)))
    }
    function loadError() { fail(new Error('No fue posible cargar el modelo. Vuelve a intentarlo.')) }

    async function load() {
      if (!resourceId) throw new Error('No hay una variante de este modelo disponible para la Web.')
      const { ModelViewerElement: constructor } = await import('@google/model-viewer')
      if (controller.signal.aborted) return
      constructor.modelCacheSize = 0
      constructor.dracoDecoderLocation = new URL(import.meta.env.BASE_URL + 'model-decoders/draco/', location.origin).href
      // Request access after loading the renderer so its five-minute lifetime covers the download.
      const access = validateModelAccess(await api.resourceAccess(resourceId, controller.signal))
      if (controller.signal.aborted || !container) return
      element = document.createElement('model-viewer')
      viewer.current = element
      element.setAttribute('alt', resource.alternative_text || 'Modelo 3D de ' + title)
      element.setAttribute('aria-describedby', instructions)
      element.a11y = {
        left: 'Vista desde la izquierda', right: 'Vista desde la derecha',
        front: 'Vista frontal', back: 'Vista posterior',
        'upper-left': 'Vista superior izquierda', 'upper-right': 'Vista superior derecha',
        'upper-front': 'Vista superior frontal', 'upper-back': 'Vista superior posterior',
        'lower-left': 'Vista inferior izquierda', 'lower-right': 'Vista inferior derecha',
        'lower-front': 'Vista inferior frontal', 'lower-back': 'Vista inferior posterior',
        'interaction-prompt': 'Usa el ratón, la pantalla táctil o las flechas para mover el modelo.',
      }
      element.setAttribute('camera-controls', '')
      element.setAttribute('disable-pan', '')
      element.setAttribute('touch-action', 'pan-y')
      element.setAttribute('interaction-prompt', 'none')
      element.setAttribute('camera-orbit', initialOrbit)
      element.setAttribute('field-of-view', initialFieldOfView)
      element.setAttribute('min-camera-orbit', 'auto auto 40%')
      element.setAttribute('max-camera-orbit', 'auto auto 262.5%')
      element.setAttribute('loading', 'eager')
      element.addEventListener('load', loaded)
      element.addEventListener('progress', reportProgress)
      element.addEventListener('error', loadError)
      container.append(element)
      element.src = access.url
    }
    timer = setTimeout(() => fail(new Error('La carga está tardando demasiado. Vuelve a intentarlo.')), 60_000)
    void load().catch(fail)
    return () => {
      controller.abort()
      clearTimeout(timer)
      if (element) {
        element.removeEventListener('load', loaded)
        element.removeEventListener('progress', reportProgress)
        element.removeEventListener('error', loadError)
        element.removeAttribute('src')
        element.remove()
      }
      viewer.current = null
    }
  }, [resourceId, resource.alternative_text, title, instructions, attempt])

  function move(action: CameraAction) {
    const element = viewer.current
    if (!element || status !== 'ready') return
    element.cameraOrbit = nextCameraOrbit(element.getCameraOrbit(), action, initialRadius.current)
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) element.jumpCameraToGoal()
  }
  function reset() {
    const element = viewer.current
    if (!element) return
    element.cameraOrbit = initialOrbit
    element.fieldOfView = initialFieldOfView
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) element.jumpCameraToGoal()
  }

  return <div className="model-viewer">
    <p id={instructions}>Arrastra para rotar; usa la rueda o pellizca para acercar y alejar. También puedes usar los botones con el teclado. La ficha permanece disponible.</p>
    {status === 'loading' && <div className="model-progress"><output aria-live="polite">Cargando modelo 3D…</output><progress value={progress} max={1} aria-label="Carga del modelo 3D" /></div>}
    {status === 'error' && <p className="status error" role="alert">{error} <button type="button" onClick={() => { setStatus('loading'); setProgress(0); setError(''); setAttempt((value) => value + 1) }}>Reintentar modelo</button></p>}
    <div className="model-canvas" ref={host} hidden={status === 'error'} aria-busy={status === 'loading'} />
    {status === 'ready' && <output className="visually-hidden" aria-live="polite">Modelo 3D disponible.</output>}
    <div className="model-controls" aria-label="Controles del modelo 3D">
      <button type="button" disabled={status !== 'ready'} onClick={() => move('left')}>Rotar izquierda</button>
      <button type="button" disabled={status !== 'ready'} onClick={() => move('right')}>Rotar derecha</button>
      <button type="button" disabled={status !== 'ready'} onClick={() => move('closer')}>Acercar</button>
      <button type="button" disabled={status !== 'ready'} onClick={() => move('farther')}>Alejar</button>
      <button type="button" disabled={status !== 'ready'} onClick={reset}>Restablecer vista</button>
    </div>
  </div>
}
