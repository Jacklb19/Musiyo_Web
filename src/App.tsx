import { useEffect, useRef, useState } from 'react'
import { Link, NavLink, Route, Routes, useParams, useSearchParams } from 'react-router-dom'
import { api } from './api'
import { parseSelection } from './contract-validation'

function useApi<T>(load: (signal: AbortSignal) => Promise<T>, key: string) {
  const [data, setData] = useState<T | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const controller = new AbortController()
    setLoading(true)
    setError('')
    setData(null)
    load(controller.signal)
      .then(setData)
      .catch((reason: unknown) => {
        if (!controller.signal.aborted) setError(reason instanceof Error ? reason.message : 'Error inesperado')
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false)
      })
    return () => controller.abort()
  }, [key])

  return { data, error, loading }
}

function Status({ loading, error }: { loading: boolean; error: string }) {
  if (loading) return <p className="status" role="status">Cargando contenido autorizado…</p>
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
  const { data, error, loading } = useApi(api.elements, 'elements')
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

function Detail() {
  const { id = '' } = useParams()
  const { data, error, loading } = useApi((signal) => api.element(id, signal), id)
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
  const tourId = 'recorrido-prueba'
  const { data, error, loading } = useApi((signal) => api.tour(tourId, signal), tourId)
  const [params, setParams] = useSearchParams()
  const point = params.get('point')
  const element = params.get('element')
  const validPoint = data?.rooms.some((room) =>
    room.points.some((item) => item.key === point && (!element || item.elements.some((entry) => entry.slug === element)),
  ))
  const desktopAvailable = window.matchMedia('(min-width: 1024px) and (pointer: fine)').matches
  const unityUrl = import.meta.env.VITE_UNITY_WEBGL_URL || '/unity/index.html'
  const frameRef = useRef<HTMLIFrameElement>(null)
  const [frameSrc, setFrameSrc] = useState('')

  useEffect(() => {
    if (!data || frameSrc) return
    const url = new URL(unityUrl, window.location.href)
    if (url.origin !== window.location.origin) return
    url.searchParams.set('tour', data.tour.key)
    if (point && validPoint) url.searchParams.set('point', point)
    if (element && validPoint) url.searchParams.set('element', element)
    setFrameSrc(url.toString())
  }, [data, frameSrc, unityUrl, point, element, validPoint])

  useEffect(() => {
    function onUnityMessage(event: MessageEvent) {
      if (event.origin !== window.location.origin || event.source !== frameRef.current?.contentWindow) return
      const message = parseSelection(event.data)
      if (!data || !message || message.data.tour_key !== data.tour.key) return
      const available = data.rooms.some((room) =>
        room.points.some((item) => item.key === message.data.point_key),
      )
      if (!available || (point === message.data.point_key && !element)) return
      setParams((current) => {
        const next = new URLSearchParams(current)
        next.set('point', message.data.point_key)
        next.delete('element')
        return next
      }, { replace: true })
    }
    window.addEventListener('message', onUnityMessage)
    return () => window.removeEventListener('message', onUnityMessage)
  }, [data, point, element, setParams])

  return <section className="page">
    <p className="eyebrow">Experiencia / recorrido</p>
    <h1>Recorrido virtual</h1>
    <p className="page-intro">La API define qué salas, puntos y elementos autorizados están disponibles.</p>
    <Status loading={loading} error={error} />
    {data && <>
      <div className="recorrido-meta"><span>Contrato v{data.schema_version}</span><span>{data.rooms.length} sala{data.rooms.length === 1 ? '' : 's'}</span></div>
      {point && !validPoint && <p className="status error" role="alert">El punto o elemento solicitado no está disponible.</p>}
      {!desktopAvailable && <p className="status">En este dispositivo puedes explorar <Link to="/recorrido/texto">el recorrido en texto</Link>.</p>}
      {desktopAvailable && (frameSrc ? <iframe ref={frameRef} title="Recorrido Unity" className="unity-frame" src={frameSrc} allowFullScreen /> :
        <div className="walkthrough-placeholder"><span aria-hidden="true">◎</span><h2>Recorrido no disponible</h2><p>Puedes explorar la alternativa en texto mientras se prepara la visita 3D.</p></div>)}
      <p><Link className="button secondary" to="/recorrido/texto">Explorar el recorrido en texto</Link></p>
      <div className="room-list">{data.rooms.map((room) => <article key={room.key}>
        <span className="section-num">Sala {room.order + 1}</span>
        <h2>{room.name}</h2>
        <ul>{room.points.map((item) => <li key={item.key}>
          <Link reloadDocument to={'/recorrido?point=' + encodeURIComponent(item.key)}>{item.name}</Link>
          <span>{item.elements.length} elementos disponibles</span>
        </li>)}</ul>
      </article>)}</div>
      {point && validPoint && data.rooms.flatMap((room) => room.points)
        .filter((item) => item.key === point)
        .flatMap((item) => item.elements)
        .map((item) => <p key={item.slug}><Link to={'/elementos/' + encodeURIComponent(item.slug)}>Abrir ficha: {item.title} ↗</Link></p>)}
    </>}
  </section>
}

function TextTour() {
  const tourKey = import.meta.env.VITE_TOUR_KEY || 'museum-main'
  const { data, error, loading } = useApi((signal) => api.tour(tourKey, signal), tourKey)
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
