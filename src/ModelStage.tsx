import { waitForUnityDisposal } from './UnityTour'
import { shouldAutoLoadModel } from './visit-navigation'
import { useEffect, useId, useRef, useState } from 'react'
import type { ModelViewerElement } from '@google/model-viewer'
import type { Resource } from './contracts'
import { api } from './api'
import { initialOrbit, initialFieldOfView, nextCameraOrbit, webModelResourceId, validateModelAccess } from './model-controls'

function shouldLoadAutomatically() {
  const connection = (navigator as Navigator & { connection?: { saveData?: boolean; effectiveType?: string } }).connection
  return shouldAutoLoadModel(connection)
}

export function ModelStage({ resource, title, large = false }: { resource: Resource; title: string; large?: boolean }) {
  const container = useRef<HTMLDivElement>(null)
  const viewer = useRef<ModelViewerElement | null>(null)
  const radius = useRef(1)
  const instructions = useId()
  const [visible, setVisible] = useState(false)
  const [enabled, setEnabled] = useState(shouldLoadAutomatically)
  const [attempt, setAttempt] = useState(0)
  const [status, setStatus] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle')
  const [progress, setProgress] = useState(0)
  const resourceId = webModelResourceId(resource)

  useEffect(() => {
    const target = container.current
    if (!target) return
    const observer = new IntersectionObserver(entries => {
      const active = entries[0].isIntersecting
      setVisible(active); setStatus(active ? 'loading' : 'idle'); setProgress(0)
    }, { threshold: 0.05 })
    observer.observe(target)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    if (!enabled || !visible) return
    const controller = new AbortController()
    let element: ModelViewerElement | null = null
    let timeout: ReturnType<typeof setTimeout> | undefined
    function fail() {
      if (controller.signal.aborted) return
      clearTimeout(timeout)
      element?.removeAttribute('src')
      setStatus('error')
      controller.abort()
    }
    function loaded() {
      if (!element || controller.signal.aborted) return
      clearTimeout(timeout)
      radius.current = element.getCameraOrbit().radius
      setStatus('ready')
    }
    function report(event: Event) {
      if (!controller.signal.aborted) setProgress(Math.max(0, Math.min(1, (event as CustomEvent<{ totalProgress: number }>).detail.totalProgress)))
    }
    async function load() {
      await waitForUnityDisposal()
      if (controller.signal.aborted) return
      if (!resourceId) throw new Error('No published Web variant')
      const { ModelViewerElement: constructor } = await import('@google/model-viewer')
      if (controller.signal.aborted) return
      constructor.modelCacheSize = 0
      constructor.dracoDecoderLocation = new URL(import.meta.env.BASE_URL + 'model-decoders/draco/', location.origin).href
      const access = validateModelAccess(await api.resourceAccess(resourceId, controller.signal))
      if (controller.signal.aborted || !container.current) return
      const url = new URL(access.url, location.origin)
      element = document.createElement('model-viewer')
      viewer.current = element
      element.setAttribute('alt', resource.alternative_text || title)
      element.a11y = {
        left: 'Vista desde la izquierda', right: 'Vista desde la derecha', front: 'Vista frontal', back: 'Vista posterior',
        'upper-left': 'Vista superior izquierda', 'upper-right': 'Vista superior derecha', 'upper-front': 'Vista superior frontal', 'upper-back': 'Vista superior posterior',
        'lower-left': 'Vista inferior izquierda', 'lower-right': 'Vista inferior derecha', 'lower-front': 'Vista inferior frontal', 'lower-back': 'Vista inferior posterior',
        'interaction-prompt': 'Usa el ratón, la pantalla táctil o las flechas para mover la pieza.',
      }
      element.setAttribute('aria-describedby', instructions)
      element.setAttribute('camera-controls', '')
      element.setAttribute('disable-pan', '')
      element.setAttribute('touch-action', 'pan-y')
      element.setAttribute('interaction-prompt', 'none')
      element.setAttribute('camera-orbit', initialOrbit)
      element.setAttribute('field-of-view', initialFieldOfView)
      element.setAttribute('min-camera-orbit', 'auto auto 40%')
      element.setAttribute('max-camera-orbit', 'auto auto 262.5%')
      element.setAttribute('shadow-intensity', '.35')
      element.setAttribute('exposure', '1')
      element.setAttribute('loading', 'eager')
      element.addEventListener('load', loaded)
      element.addEventListener('progress', report)
      element.addEventListener('error', fail)
      container.current.append(element)
      element.src = url.href
    }
    timeout = setTimeout(fail, 60000)
    void load().catch(fail)
    return () => {
      controller.abort()
      clearTimeout(timeout)
      if (element) {
        element.removeEventListener('load', loaded)
        element.removeEventListener('progress', report)
        element.removeEventListener('error', fail)
        element.removeAttribute('src')
        element.remove()
      }
      viewer.current = null
    }
  }, [enabled, visible, resourceId, resource.alternative_text, title, instructions, attempt])

  function move(action: 'left' | 'right' | 'closer' | 'farther' | 'reset') {
    const element = viewer.current
    if (!element) return
    element.cameraOrbit = action === 'reset' ? initialOrbit : nextCameraOrbit(element.getCameraOrbit(), action, radius.current)
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) element.jumpCameraToGoal()
  }

  return <div className={`model-stage ${large ? 'model-stage--hero' : ''}`}>
    <div className="model-host" ref={container} aria-busy={status === 'loading'} />
    {(!enabled || status === 'error') && <div className="model-message"><p>{status === 'error' ? 'El modelo no pudo cargarse.' : 'El modelo se carga cuando tú elijas.'}</p><button className="pill" onClick={() => { setEnabled(true); setStatus('loading'); setProgress(0); setAttempt(value => value + 1) }}>{status === 'error' ? 'Reintentar modelo' : 'Cargar modelo 3D'}</button></div>}
    {enabled && (status === 'idle' || status === 'loading') && <output className="model-loading"><span className="loading-ring"/><span>Cargando pieza{progress > 0 ? ` · ${Math.round(progress * 100)} %` : '…'}</span></output>}
    <div className="model-tools" aria-label="Controles de la pieza">
      <button className="circle" disabled={status !== 'ready'} aria-label="Rotar a la izquierda" onClick={() => move('left')}>↶</button>
      <button className="circle" disabled={status !== 'ready'} aria-label="Rotar a la derecha" onClick={() => move('right')}>↷</button>
      <span className="tool-divider"/>
      <button className="circle" disabled={status !== 'ready'} aria-label="Acercar pieza" onClick={() => move('closer')}>+</button>
      <button className="circle" disabled={status !== 'ready'} aria-label="Alejar pieza" onClick={() => move('farther')}>−</button>
      <button className="circle" disabled={status !== 'ready'} aria-label="Restablecer vista" onClick={() => move('reset')}>⟲</button>
    </div>
    <p id={instructions} className="model-instructions">Arrastra para girar · Pellizca para acercar</p>
  </div>
}
