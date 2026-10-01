import { useCallback, useEffect, useState } from 'react'
import { Link, NavLink, Route, Routes, useParams, useSearchParams } from 'react-router-dom'
import { api } from './api'
import { parseSelection, parseClearedSelection } from './contract-validation'
import { UnityTour, type UnityInstance } from './UnityTour'
import { confirmedSelection, isAvailableSelection } from './tour-selection'

function useApi<T>(load: (signal: AbortSignal) => Promise<T>) {
  const [result, setResult] = useState<{ request: typeof load; data: T | null; error: string } | null>(null)

  useEffect(() => {
    const controller = new AbortController()
    load(controller.signal)
      .then((data) => {
        if (!controller.signal.aborted) setResult({ request: load, data, error: '' })
      })
      .catch((reason: unknown) => {
        if (!controller.signal.aborted) setResult({ request: load, data: null,
          error: reason instanceof Error ? reason.message : 'Error inesperado' })
      })
    return () => controller.abort()
  }, [load])

  return result?.request === load ? { ...result, loading: false } : { data: null, error: '', loading: true }
}

function Status({ loading, error }: { loading: boolean; error: string }) {
  if (loading) return <output className="status">Cargando contenido autorizado…</output>
  if (error) return <p className="status error" role="alert">{error}</p>
  return null
}

function Home() {
  return (
    <>
      <section className="hero">
        <div className="hero-copy">
          <p className="eyebrow">Museo virtual · prototipo técnico</p>
          <h1>Musiyo <em>Bëtsknaté</em></h1>
          <p className="lead">Un espacio digital en construcción para consultar contenidos culturales validados y recorrer salas virtuales.</p>
          <div className="actions">
            <Link className="button primary" to="/catalogo">Explorar catálogo <span aria-hidden="true">↗</span></Link>
            <Link className="button secondary" to="/recorrido">Ver recorrido <span aria-hidden="true">→</span></Link>
          </div>
        </div>
        <div className="hero-art" aria-hidden="true"><div className="orbit orbit-one" /><div className="orbit orbit-two" /><div className="center-mark">M</div></div>
      </section>
      <section className="intro-grid" aria-label="Secciones">
        <article><span className="section-num">01 / Archivo</span><h2>Catálogo</h2><p>Las fichas aparecen cuando cuentan con aprobación cultural y autorización vigente.</p><Link to="/catalogo">Abrir catálogo <span aria-hidden="true">↗</span></Link></article>
        <article><span className="section-num">02 / Experiencia</span><h2>Recorrido</h2><p>La estructura de salas y puntos se consulta desde la API con identificadores compartidos con Unity.</p><Link to="/recorrido">Abrir recorrido <span aria-hidden="true">↗</span></Link></article>
      </section>
    </>
  )
}

function Catalog() {
  const { data, error, loading } = useApi(api.elements)
  const [query, setQuery] = useState('')
  const visible = data?.filter((item) => (item.title + ' ' + item.description).toLocaleLowerCase('es').includes(query.toLocaleLowerCase('es'))) || []
  return (
    <section className="page">
      <p className="eyebrow">Archivo / catálogo</p>
      <h1>Elementos publicados</h1>
      <p className="page-intro">Solo se muestran fichas autorizadas por la API.</p>
      <Status loading={loading} error={error} />
      {data && <>
        <label className="search-label" htmlFor="buscar">Buscar en el catálogo</label>
        <input id="buscar" type="search" placeholder="Buscar por título o descripción" value={query} onChange={(event) => setQuery(event.target.value)} />
        {visible.length ? <div className="cards">{visible.map((item, index) => <Link className="card" key={item.slug} to={'/elementos/' + encodeURIComponent(item.slug)}><span className="section-num">Ficha / {String(index + 1).padStart(2, '0')}</span><h2>{item.title}</h2><p>{item.description}</p><span className="card-arrow" aria-hidden="true">↗</span></Link>)}</div> : <div className="empty"><span className="empty-symbol" aria-hidden="true">◇</span><h2>{query ? 'Sin resultados' : 'Aún no hay fichas publicadas'}</h2><p>{query ? 'Prueba con otra búsqueda.' : 'Los contenidos aparecerán aquí después de su aprobación y autorización.'}</p></div>}
      </>}
    </section>
  )
}

function Detail({ elementId }: { elementId?: string } = {}) {
  const { id: routeId = '' } = useParams()
  const id = elementId || routeId
  const load = useCallback((signal: AbortSignal) => api.element(id, signal), [id])
  const { data, error, loading } = useApi(load)
  const blockLabels = { documented_fact: 'Información documentada', testimony: 'Testimonio', interpretation: 'Interpretación' }
  return <section className="page">
    <Link className="back" to="/catalogo">← Volver al catálogo</Link>
    <Status loading={loading} error={error} />
    {data && <article className="ficha">
      <p className="eyebrow">Archivo / ficha</p><h1>{data.title}</h1><p className="lead">{data.description}</p>
      {(data.blocks || []).map((block) => <section key={block.id}><h2>{blockLabels[block.kind]}</h2><p>{block.text}</p>{block.attribution && <p>{block.attribution}</p>}{block.context && <p>{block.context}</p>}</section>)}
      {!!data.sources?.length && <section><h2>Fuentes</h2>{data.sources.map((source) => <p key={source.id}>{source.reference}</p>)}</section>}
      {!!data.credits?.length && <section><h2>Créditos</h2>{data.credits.map((credit, index) => <p key={index}>{credit.role ? credit.role + ': ' : ''}{credit.name}</p>)}</section>}
      {!!data.restrictions?.length && <section><h2>Restricciones de uso</h2>{data.restrictions.map((restriction, index) => <p key={index}>{restriction.description}</p>)}</section>}

      {!!data.resources?.some((resource) => resource.kind === 'narration') && <section id="narrations">
        <h2>Narraciones y transcripciones</h2>
        {data.resources.filter((resource) => resource.kind === 'narration').map((resource) => <details key={resource.id}>
          <summary>Leer transcripción{resource.duration_seconds ? ` · ${Math.round(resource.duration_seconds)} segundos` : ''}</summary>
          <p>{resource.transcription || 'La transcripción no está disponible.'}</p>
          {resource.credit && <p>Crédito: {resource.credit}</p>}
        </details>)}
      </section>}
    </article>}
  </section>
}

function TourPage() {
  const tourKey = import.meta.env.VITE_TOUR_KEY || 'museum-main'
  const load = useCallback((signal: AbortSignal) => api.tour(tourKey, signal), [tourKey])
  const { data, error, loading } = useApi(load)
  const [params, setParams] = useSearchParams()
  const point = params.get('point')
  const element = params.get('element')
  const validPoint = !!data && isAvailableSelection(data, point, element)
  const [instance, setInstance] = useState<UnityInstance | null>(null)
  const [desktopAvailable, setDesktopAvailable] = useState(false)

  useEffect(() => {
    const media = window.matchMedia('(min-width: 1024px) and (pointer: fine)')
    const update = () => {
      const probe = document.createElement('canvas')
      const context = media.matches ? probe.getContext('webgl2') : null
      setDesktopAvailable(!!context)
      context?.getExtension('WEBGL_lose_context')?.loseContext()
    }
    update()
    media.addEventListener('change', update)
    return () => media.removeEventListener('change', update)
  }, [])

  useEffect(() => {
    if (!instance || !data) return
    const query = new URLSearchParams({ tour: data.tour.key })
    if (validPoint) query.set('point', point!)
    if (validPoint && element) query.set('element', element)
    instance.SendMessage('MuseumBlockout', 'ApplySelection', query.toString())
  }, [instance, data, point, element, validPoint])

  useEffect(() => {
    function onSelection(event: Event) {
      const cleared = parseClearedSelection((event as CustomEvent<unknown>).detail)
      if (data && instance && cleared?.data.tour_key === data.tour.key) {
        setParams((current) => {
          const next = new URLSearchParams(current)
          next.delete('point'); next.delete('element')
          return next.toString() === current.toString() ? current : next
        }, { replace: true })
        return
      }
      const message = parseSelection((event as CustomEvent<unknown>).detail)
      if (!data || !instance || !message) return
      const selection = confirmedSelection(data, message)
      if (!selection) return
      setParams((current) => {
        const next = new URLSearchParams(current)
        next.set('tour', selection.get('tour')!)
        next.set('point', selection.get('point')!)
        if (selection.has('element')) next.set('element', selection.get('element')!)
        else next.delete('element')
        return next.toString() === current.toString() ? current : next
      }, { replace: true })
    }
    window.addEventListener('musiyo:selection', onSelection)
    return () => window.removeEventListener('musiyo:selection', onSelection)
  }, [data, instance, setParams])

  return <section className="page">
    <p className="eyebrow">Experiencia / recorrido</p>
    <h1>Recorrido virtual</h1>
    <p className="page-intro">Explora libremente las salas. La ruta sugerida dura unos 30 minutos; puedes detenerte en cada pieza y elegir tu propio camino.</p>
    <Status loading={loading} error={error} />
    {data && <>
      {point && !validPoint && <p className="status error" role="alert">El punto o elemento solicitado no está disponible.</p>}
      {desktopAvailable ? <UnityTour onReady={setInstance} /> : <p className="status">Puedes explorar <Link to="/recorrido/texto">el recorrido en texto</Link>. La visita 3D requiere un computador con WebGL 2.</p>}
      <div className="room-list">{data.rooms.map((room) => <article key={room.key}>
        <span className="section-num">Sala {room.order + 1}</span><h2>{room.name}</h2>
        <ul>{room.points.map((item) => <li key={item.key}>
          <Link to={'/recorrido?point=' + encodeURIComponent(item.key)}>{item.name}</Link>
          <span>{item.elements.length} elementos disponibles</span>
        </li>)}</ul>
      </article>)}</div>
      {validPoint && element && <div id="selected-element" className="tour-detail"><Detail elementId={element} /></div>}
    </>}
  </section>
}

function TextTour() {
  const tourKey = import.meta.env.VITE_TOUR_KEY || 'museum-main'
  const load = useCallback((signal: AbortSignal) => api.tour(tourKey, signal), [tourKey])
  const { data, error, loading } = useApi(load)
  return <section className="page text-tour">
    <p className="eyebrow">Experiencia / recorrido en texto</p>
    <h1>Explora el museo</h1>
    <p className="page-intro">Recorre las salas a tu ritmo y en el orden que prefieras. La ruta sugerida dura aproximadamente 30 minutos. Las fichas ofrecen los textos y transcripciones disponibles.</p>
    <Link className="back" to="/recorrido">Abrir recorrido 3D</Link>
    <Status loading={loading} error={error} />
    {data && <>
      <nav aria-label="Salas del recorrido" className="room-index">
        {data.rooms.map((room, index) => <a key={room.key} href={'#room-' + index}>{room.name}</a>)}
      </nav>
      {data.rooms.map((room, index) => <section key={room.key} id={'room-' + index} className="text-room" aria-labelledby={'room-title-' + index}>
        <h2 id={'room-title-' + index}>{room.name}</h2>
        {room.short_description && <p>{room.short_description}</p>}
        <ol>{room.points.map((point) => <li key={point.key}>
          <h3>{point.name}</h3>
          {point.elements.length ? <ul>{point.elements.map((element) => <li key={element.slug}>
            <Link to={'/elementos/' + encodeURIComponent(element.slug)}>{element.title}</Link>
            {element.has_narration && <> · <Link to={'/elementos/' + encodeURIComponent(element.slug) + '#narrations'}>Leer narración</Link></>}
          </li>)}</ul> : <p>No hay contenido disponible en este punto.</p>}
        </li>)}</ol>
        <a href="#main-content">Volver al comienzo</a>
      </section>)}
    </>}
  </section>
}

function About() {
  return <section className="page"><p className="eyebrow">Acerca del museo</p><h1>Musiyo Bëtsknaté</h1>
    <div className="ficha"><p className="lead">Un museo virtual para explorar contenidos sobre el Carnaval del Perdón del Valle de Sibundoy.</p>
      <section><h2>Una visita libre</h2><p>Puedes elegir tu propio camino, volver a una sala y consultar las fichas. La ruta sugerida pasa por Llegada, Bienvenida, Personajes, Instrumentos y Danza, Fogón y Mirador.</p></section>
      <section><h2>Fuentes y créditos</h2><p>Cada ficha presenta sus fuentes, créditos y restricciones disponibles. Los testimonios, la información documentada y las interpretaciones se muestran por separado. Las referencias a los pueblos Kamëntsá e Inga conservan su identificación propia.</p></section>
      <section><h2>Formas de explorar</h2><p>El catálogo y las fichas pueden consultarse en computador y celular. El recorrido 3D está previsto para computador y Meta Quest; <Link to="/recorrido/texto">la alternativa en texto</Link> permite explorar las salas sin cargar el entorno 3D.</p></section>
    </div>
  </section>
}

function Privacy() {
  return <section className="page"><p className="eyebrow">Privacidad</p><h1>Tu visita y tus datos</h1>
    <div className="ficha"><p className="lead">Puedes consultar el catálogo, las fichas y el recorrido público sin crear una cuenta.</p>
      <section><h2>Micrófono y guía</h2><p>La consulta por voz está en desarrollo. Cuando esté disponible, se solicitará tu aceptación antes de activar el micrófono y se identificará el servicio externo que procesa el audio. También podrás escribir tu pregunta.</p></section>
      <section><h2>Contenido y archivos</h2><p>Los créditos y restricciones de uso se indican en cada ficha. Poder consultar un material no implica permiso para reutilizarlo.</p></section>
      <section><h2>Servicios externos</h2><p>Las funciones de voz y asistencia pueden utilizar servicios externos. Su información de tratamiento y conservación deberá estar disponible antes de habilitarlas.</p></section>
    </div>
  </section>
}

function NotFound() {
  return <section className="page"><h1>Página no encontrada</h1><Link to="/">Volver al inicio</Link></section>
}

export default function App() {
  return <div className="site-shell"><header className="site-header"><Link className="brand" to="/" aria-label="Musiyo, ir al inicio"><span className="brand-mark">M</span><span>musiyo<span className="brand-sub"> Bëtsknaté</span></span></Link><nav aria-label="Navegación principal"><NavLink to="/" end>Inicio</NavLink><NavLink to="/catalogo">Catálogo</NavLink><NavLink to="/recorrido">Recorrido</NavLink></nav></header><a className="skip-link" href="#main-content">Saltar al contenido</a><main id="main-content" tabIndex={-1}><Routes><Route path="/" element={<Home />} /><Route path="/catalogo" element={<Catalog />} /><Route path="/elementos/:id" element={<Detail />} /><Route path="/recorrido" element={<TourPage />} /><Route path="/recorrido/texto" element={<TextTour />} /><Route path="/acerca" element={<About />} /><Route path="/privacidad" element={<Privacy />} /><Route path="*" element={<NotFound />} /></Routes></main><footer><span>Musiyo Bëtsknaté</span><nav aria-label="Información del museo"><Link to="/acerca">Acerca</Link><Link to="/privacidad">Privacidad</Link><Link to="/recorrido/texto">Recorrido en texto</Link></nav></footer></div>
}
