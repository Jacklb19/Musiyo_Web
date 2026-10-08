import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'

export interface UnityInstance {
  SendMessage(object: string, method: string, value: string): void
  Quit(): Promise<void>
}

interface Manifest {
  version: number
  loaderUrl: string
  dataUrl: string
  frameworkUrl: string
  codeUrl: string
  streamingAssetsUrl: string
  companyName: string
  productName: string
  productVersion: string
}

type UnityFactory = (canvas: HTMLCanvasElement, config: Omit<Manifest, 'version' | 'loaderUrl'>,
  progress: (value: number) => void) => Promise<UnityInstance>

declare global { interface Window { createUnityInstance?: UnityFactory } }

// A late startup must quit before another route or retry starts an engine.
let engineTail = Promise.resolve()
class UnityLoadError extends Error {}

export function UnityTour({ onReady }: { onReady: (instance: UnityInstance | null) => void }) {
  const canvas = useRef<HTMLCanvasElement>(null)
  const keyboardNavigation = useRef(false)
  const [attempt, setAttempt] = useState(0)
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState('')
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    let cancelled = false
    let instance: UnityInstance | null = null
    let release: (() => void) | undefined
    let script: HTMLScriptElement | undefined
    const controller = new AbortController()

    async function start() {
      try {
        const manifestUrl = new URL(import.meta.env.VITE_UNITY_MANIFEST_URL || '/unity/unity-build.json', window.location.href)
        if (manifestUrl.origin !== window.location.origin) throw new UnityLoadError('El recorrido debe cargarse desde este sitio.')
        const response = await fetch(manifestUrl, { signal: controller.signal })
        if (!response.ok || !response.headers.get('content-type')?.includes('application/json'))
          throw new UnityLoadError('El recorrido 3D todavía no está disponible.')
        const manifest: Manifest = await response.json()
        if (manifest.version !== 1) throw new UnityLoadError('El recorrido necesita una actualización.')
        for (const key of ['loaderUrl', 'dataUrl', 'frameworkUrl', 'codeUrl', 'streamingAssetsUrl'] as const) {
          if (typeof manifest[key] !== 'string' || !manifest[key]) throw new UnityLoadError('No fue posible cargar el recorrido.')
          const url = new URL(manifest[key], manifestUrl)
          if (url.origin !== window.location.origin) throw new UnityLoadError('Los archivos del recorrido deben estar en este sitio.')
          manifest[key] = url.href
        }
        const previous = engineTail
        engineTail = new Promise<void>((resolve) => { release = resolve })
        await previous
        if (cancelled) { release?.(); return }
        await new Promise<void>((resolve, reject) => {
          script = document.createElement('script')
          script.src = manifest.loaderUrl
          const cancel = () => { clearTimeout(timer); reject(Error('La carga del recorrido se interrumpió.')) }
          const finish = () => { clearTimeout(timer); controller.signal.removeEventListener('abort', cancel) }
          const timer = setTimeout(() => { finish(); reject(new UnityLoadError('El recorrido tardó demasiado en responder.')) }, 30000)
          controller.signal.addEventListener('abort', cancel, { once: true })
          script.onload = () => { finish(); resolve() }
          script.onerror = () => { finish(); reject(new UnityLoadError('No fue posible cargar el recorrido.')) }
          document.body.append(script)
        })
        if (cancelled) { release?.(); return }
        if (!window.createUnityInstance || !canvas.current) throw new UnityLoadError('No fue posible iniciar el recorrido.')
        const { loaderUrl: _loader, version: _version, ...config } = manifest
        const created = await window.createUnityInstance(canvas.current, config, (value) => {
          if (!cancelled) setProgress(Math.round(value * 100))
        })
        if (cancelled) { try { await created.Quit() } finally { release?.() }; return }
        instance = created
        setLoaded(true)
        onReady(created)
      } catch (reason) {
        script?.remove()
        release?.()
        if (!cancelled) setError(reason instanceof UnityLoadError ? reason.message : 'No fue posible iniciar el recorrido. Puedes reintentar o explorar la visita en texto.')
      }
    }
    void start()
    return () => {
      cancelled = true
      controller.abort()
      onReady(null)
      script?.remove()
      if (instance) void instance.Quit().catch(() => undefined).finally(() => release?.())
    }
  }, [attempt, onReady])

  return <div className="unity-host">
    {!loaded && !error && <output>Preparando recorrido… <progress max={100} value={progress}>{progress}%</progress></output>}
    {error && <div role="alert"><p>{error}</p><button className="button secondary" onClick={() => {
      setError(''); setProgress(0); setLoaded(false); setAttempt(attempt + 1)
    }}>Reintentar</button></div>}
    <canvas id="museum-unity-canvas" ref={canvas} className="unity-canvas" tabIndex={0}
      onFocus={() => { keyboardNavigation.current = true }}
      onBlur={() => { keyboardNavigation.current = false }}
      onKeyDown={(event) => {
        if (event.key === 'Escape') keyboardNavigation.current = false
        else if (keyboardNavigation.current && !event.ctrlKey && !event.altKey && !event.metaKey
          && ['Tab', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(event.key)) event.preventDefault()
      }}
      aria-label="Recorrido virtual. WASD o flechas para caminar; IJKL para mirar; Tab para puntos; Enter para activar; Escape para pausa y liberar el teclado." hidden={!loaded || !!error} />
    {loaded && <p>WASD o flechas: caminar · IJKL: mirar · Tab: puntos · Enter: activar · Esc: pausa. Para volver a los controles de la página, pulsa Esc y después Tab.</p>}
    <p><Link to="/recorrido/texto">Explorar el recorrido en texto</Link></p>
  </div>
}
